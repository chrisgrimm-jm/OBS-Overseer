import { useState, useEffect, useRef, useCallback } from 'react'
import OBSWebSocket from 'obs-websocket-js'

const STORAGE_KEY = 'obs-overseer-settings'
const KEY_SESSION_KEY = 'obs-overseer-groq-key'
const POLL_INTERVAL = 1000
const MAX_BACKOFF = 30000

// Branch Output plugin (OPENSPHERE) filter kind. Its recording/replay output is named after the filter;
// its streaming outputs are named "<filter> (<n>)". Encoder settings live on the filter, not the output.
const BRANCH_FILTER_KIND = 'osi_branch_output'

const EXCLUDED_KINDS = new Set(['simple_file_output', 'adv_file_output', 'simple_stream', 'adv_stream_output', 'replay_buffer', 'virtualcam_output'])
const EXCLUDED_NAMES = /replay.?buffer|virtual.?cam|vertical.?backtrack/i
const isBranchOutput = o => !EXCLUDED_KINDS.has(o.outputKind) && !EXCLUDED_KINDS.has(o.outputName) && !EXCLUDED_NAMES.test(o.outputName)

const AUDIO_INPUT_KINDS = new Set([
  'wasapi_input_capture', 'wasapi_output_capture',
  'coreaudio_input_capture', 'coreaudio_output_capture',
  'pulse_input_capture', 'pulse_output_capture',
])

// Map of filterName → { ...filterSettings, _source, _enabled } for every Branch Output filter on any input or scene.
// ponytail: one GetSourceFilterList per source on connect/refresh; batch with CallBatch if source counts get huge.
async function fetchBranchFilters(obs) {
  const [{ inputs }, { scenes }] = await Promise.all([obs.call('GetInputList'), obs.call('GetSceneList')])
  const sources = [...inputs.map(i => i.inputName), ...scenes.map(s => s.sceneName)]
  const map = {}
  await Promise.all(sources.map(async sourceName => {
    const { filters } = await obs.call('GetSourceFilterList', { sourceName }).catch(() => ({ filters: [] }))
    for (const f of filters) {
      if (f.filterKind === BRANCH_FILTER_KIND) map[f.filterName] = { ...f.filterSettings, _source: sourceName, _enabled: f.filterEnabled }
    }
  }))
  return map
}

export function loadSettings() {
  const params = new URLSearchParams(window.location.search)
  const stored = (() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') } catch { return {} }
  })()
  if (stored.claudeApiKey) { // scrub the old persisted key
    delete stored.claudeApiKey
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
  }
  let groqApiKey = ''
  try { groqApiKey = sessionStorage.getItem(KEY_SESSION_KEY) || '' } catch {}
  return {
    host: params.get('host') || stored.host || 'localhost',
    port: params.get('port') || stored.port || '4455',
    password: params.get('password') || stored.password || '',
    groqApiKey,
  }
}

// The AI key stays in sessionStorage only: localStorage on chrisgrimm-jm.github.io is readable by every Pages app on that origin.
export function persistSettings({ groqApiKey, ...rest }) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rest))
  try { groqApiKey ? sessionStorage.setItem(KEY_SESSION_KEY, groqApiKey) : sessionStorage.removeItem(KEY_SESSION_KEY) } catch {}
}

export function useOBSConnection() {
  const [status, setStatus] = useState('connecting') // connecting | connected | disconnected | error
  const [obsVersion, setObsVersion] = useState(null)
  const [stats, setStats] = useState(null)
  const [streamStatus, setStreamStatus] = useState(null)
  const [recordStatus, setRecordStatus] = useState(null)
  const [outputList, setOutputList] = useState([])
  const [audioInputs, setAudioInputs] = useState([])
  const [settings, setSettingsState] = useState(loadSettings)

  const obsRef = useRef(null)
  const pollTimerRef = useRef(null)
  const reconnectTimerRef = useRef(null)
  const backoffRef = useRef(1000)
  const mountedRef = useRef(true)
  const connectRef = useRef(null)
  // Baseline for encode lag delta — reset on each connect so we only show current-session lag
  const encodeLagBaseRef = useRef(null)
  // Previous poll's skipped/total frames to detect active skipping between polls
  const prevStatsRef = useRef(null)
  // Previous bytes + timestamp per output for live bitrate calculation
  const outputBytesRef = useRef({})
  // Branch Output filter settings (encoder, bitrate, preset…), fetched on connect / refresh
  const branchFiltersRef = useRef({})

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current)
      pollTimerRef.current = null
    }
  }, [])

  const poll = useCallback(async (obs) => {
    if (!mountedRef.current) return
    try {
      const [s, stream, record, outputs] = await Promise.all([
        obs.call('GetStats'),
        obs.call('GetStreamStatus'),
        obs.call('GetRecordStatus'),
        obs.call('GetOutputList'),
      ])
      if (!mountedRef.current) return
      // Set baseline on first poll so encode lag is relative to this session only
      if (encodeLagBaseRef.current === null) {
        encodeLagBaseRef.current = {
          skipped: s.outputSkippedFrames ?? 0,
          total: s.outputTotalFrames ?? 0,
        }
      }
      const base = encodeLagBaseRef.current
      const deltaTotal = (s.outputTotalFrames ?? 0) - base.total
      const deltaSkipped = (s.outputSkippedFrames ?? 0) - base.skipped
      // Calculate poll-to-poll skipped rate (frames skipped since last poll)
      const prev = prevStatsRef.current
      let pollSkippedRate = null
      if (prev) {
        const pollSkipped = (s.outputSkippedFrames ?? 0) - prev.skipped
        const pollTotal = (s.outputTotalFrames ?? 0) - prev.total
        if (pollTotal > 0 && pollSkipped > 0) {
          pollSkippedRate = (pollSkipped / pollTotal) * 100
        }
      }
      prevStatsRef.current = {
        skipped: s.outputSkippedFrames ?? 0,
        total: s.outputTotalFrames ?? 0,
      }

      setStats({
        ...s,
        outputSkippedFrames: Math.max(0, deltaSkipped),
        outputTotalFrames: Math.max(0, deltaTotal),
        pollSkippedRate, // rate of skipping in the most recent poll interval
      })
      setStreamStatus(stream)
      setRecordStatus(record)

      const branchOutputs = (outputs.outputs || []).filter(isBranchOutput)
      const filters = branchFiltersRef.current
      const now = Date.now()

      const withDetails = await Promise.all(
        branchOutputs.map(async o => {
          const statusRes = await obs.call('GetOutputStatus', { outputName: o.outputName }).catch(() => ({}))
          const active = statusRes.outputActive ?? o.outputActive ?? false
          const totalBytes = statusRes.outputBytes ?? 0

          // Calculate live bitrate from bytes delta
          let liveBitrateKbps = null
          if (active) {
            const prev = outputBytesRef.current[o.outputName]
            if (prev && prev.bytes != null) {
              const deltaBytes = totalBytes - prev.bytes
              const deltaSec = (now - prev.time) / 1000
              if (deltaSec > 0 && deltaBytes >= 0) {
                liveBitrateKbps = Math.round((deltaBytes * 8) / deltaSec / 1000)
              }
            }
            outputBytesRef.current[o.outputName] = { bytes: totalBytes, time: now }
          } else {
            delete outputBytesRef.current[o.outputName]
          }

          return {
            ...o,
            settings: filters[o.outputName] || filters[o.outputName.replace(/ \(\d+\)$/, '')] || {},
            outputActive: active,
            outputTotalBytes: totalBytes,
            outputTotalFrames: statusRes.outputTotalFrames ?? o.outputTotalFrames ?? 0,
            outputSkippedFrames: active ? (statusRes.outputSkippedFrames ?? 0) : 0,
            outputCongestion: statusRes.outputCongestion ?? null,
            outputTimecode: statusRes.outputTimecode ?? null,
            liveBitrateKbps,
          }
        })
      )

      // Branch Output only creates its outputs while running — list idle filters too so every branch is visible
      const seen = new Set(withDetails.map(o => o.outputName.replace(/ \(\d+\)$/, '')))
      for (const [name, settings] of Object.entries(filters)) {
        if (!seen.has(name)) withDetails.push({ outputName: name, outputActive: false, settings, idle: true })
      }
      setOutputList(withDetails)
    } catch {
      // disconnect handler will fire
    }
  }, [])

  const loadBranchFilters = useCallback(async (obs) => {
    branchFiltersRef.current = await fetchBranchFilters(obs).catch(() => ({}))
  }, [])

  const connect = useCallback(async () => {
    if (!mountedRef.current) return
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }
    stopPolling()

    if (obsRef.current) {
      const old = obsRef.current
      obsRef.current = null  // clear before disconnect so ConnectionClosed guard fires
      try { await old.disconnect() } catch {}
    }

    const obs = new OBSWebSocket()
    obsRef.current = obs

    obs.on('InputVolumeMeters', ({ inputs }) => {
      if (!mountedRef.current) return
      setAudioInputs(prev => {
        const levelMap = {}
        for (const inp of inputs) {
          levelMap[inp.inputName] = inp.inputLevelsMul?.[0]?.[0] ?? 0
        }
        return prev.map(a => levelMap[a.inputName] !== undefined
          ? { ...a, level: levelMap[a.inputName] }
          : a
        )
      })
    })

    obs.on('InputMuteStateChanged', ({ inputName, inputMuted }) => {
      if (!mountedRef.current) return
      setAudioInputs(prev => prev.map(a => a.inputName === inputName ? { ...a, inputMuted } : a))
    })

    obs.on('RecordStateChanged', ({ outputState }) => {
      if (outputState === 'OBS_WEBSOCKET_OUTPUT_STOPPED') {
        setTimeout(() => location.reload(), 10000)
      }
    })

    obs.on('ConnectionClosed', () => {
      if (!mountedRef.current) return
      if (obsRef.current !== obs) return // stale handler — fired by a manually-disconnected instance
      setStatus('disconnected')
      setStats(null)
      setStreamStatus(null)
      setRecordStatus(null)
      setOutputList([])
      setAudioInputs([])
      stopPolling()
      const delay = backoffRef.current
      backoffRef.current = Math.min(backoffRef.current * 2, MAX_BACKOFF)
      reconnectTimerRef.current = setTimeout(() => {
        if (mountedRef.current) connectRef.current?.()
      }, delay)
    })

    if (!mountedRef.current) return
    setStatus('connecting')

    const s = loadSettings()
    const url = `ws://${s.host}:${s.port}`
    try {
      const { obsVersion: ver } = await obs.connect(url, s.password || undefined)
      if (!mountedRef.current) return
      backoffRef.current = 1000
      encodeLagBaseRef.current = null
      prevStatsRef.current = null
      outputBytesRef.current = {}
      setObsVersion(ver)
      setStatus('connected')

      await loadBranchFilters(obs)

      poll(obs)
      pollTimerRef.current = setInterval(() => poll(obs), POLL_INTERVAL)

      // Initialize audio inputs; mute changes arrive via InputMuteStateChanged
      try {
        const { inputs } = await obs.call('GetInputList')
        const audioList = (inputs || []).filter(i => AUDIO_INPUT_KINDS.has(i.inputKind))
        const withMute = await Promise.all(
          audioList.map(async i => {
            const { inputMuted } = await obs.call('GetInputMuteStatus', { inputName: i.inputName }).catch(() => ({ inputMuted: false }))
            return { inputName: i.inputName, inputMuted, level: 0 }
          })
        )
        if (mountedRef.current) setAudioInputs(withMute)
      } catch {
        // audio init failed, non-fatal
      }
    } catch {
      if (!mountedRef.current) return
      setStatus('error')
      const delay = backoffRef.current
      backoffRef.current = Math.min(backoffRef.current * 2, MAX_BACKOFF)
      reconnectTimerRef.current = setTimeout(() => {
        if (mountedRef.current) connectRef.current?.()
      }, delay)
    }
  }, [poll, stopPolling, loadBranchFilters])

  connectRef.current = connect

  const saveSettings = useCallback((newSettings) => {
    const merged = { ...loadSettings(), ...newSettings }
    persistSettings(merged)
    setSettingsState(merged)
  }, [])

  const reconnect = useCallback(() => {
    backoffRef.current = 1000
    connect()
  }, [connect])

  // Re-read Branch Output filters so new/changed branches (and encoder changes) are picked up
  const refreshOutputs = useCallback(async () => {
    const obs = obsRef.current
    if (!obs) return
    await loadBranchFilters(obs)
    poll(obs)
  }, [poll, loadBranchFilters])

  useEffect(() => {
    mountedRef.current = true
    connect()
    return () => {
      mountedRef.current = false
      stopPolling()
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
      if (obsRef.current) obsRef.current.disconnect().catch(() => {})
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return { status, obsVersion, stats, streamStatus, recordStatus, outputList, audioInputs, settings, saveSettings, reconnect, refreshOutputs }
}
