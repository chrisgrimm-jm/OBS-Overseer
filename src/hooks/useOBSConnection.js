import { useState, useEffect, useRef, useCallback } from 'react'
import OBSWebSocket from 'obs-websocket-js'

const STORAGE_KEY = 'obs-overseer-settings'
const POLL_INTERVAL = 1000
const MAX_BACKOFF = 30000

export function loadSettings() {
  const params = new URLSearchParams(window.location.search)
  const stored = (() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') } catch { return {} }
  })()
  return {
    host: params.get('host') || stored.host || 'localhost',
    port: params.get('port') || stored.port || '4455',
    password: params.get('password') || stored.password || '',
  }
}

export function persistSettings(s) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
}

export function useOBSConnection() {
  const [status, setStatus] = useState('connecting') // connecting | connected | disconnected | error
  const [obsVersion, setObsVersion] = useState(null)
  const [stats, setStats] = useState(null)
  const [streamStatus, setStreamStatus] = useState(null)
  const [recordStatus, setRecordStatus] = useState(null)
  const [outputList, setOutputList] = useState([])
  const [settings, setSettingsState] = useState(loadSettings)

  const obsRef = useRef(null)
  const pollTimerRef = useRef(null)
  const reconnectTimerRef = useRef(null)
  const backoffRef = useRef(1000)
  const mountedRef = useRef(true)
  const connectRef = useRef(null)

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
      setStats(s)
      setStreamStatus(stream)
      setRecordStatus(record)
      // Filter to branch/ISO outputs only — exclude built-in, replay buffer, virtual cam, vertical backtrack
      const excludedKinds = new Set(['simple_file_output', 'adv_file_output', 'simple_stream', 'adv_stream_output', 'replay_buffer', 'virtualcam_output'])
      const excludedNamePatterns = /replay.?buffer|virtual.?cam|vertical.?backtrack/i
      const branchOutputs = (outputs.outputs || []).filter(o =>
        !excludedKinds.has(o.outputKind) &&
        !excludedKinds.has(o.outputName) &&
        !excludedNamePatterns.test(o.outputName)
      )
      // Fetch settings + status for each branch output
      const withDetails = await Promise.all(
        branchOutputs.map(async o => {
          const [settingsRes, statusRes] = await Promise.all([
            obs.call('GetOutputSettings', { outputName: o.outputName }).catch(() => ({ outputSettings: {} })),
            obs.call('GetOutputStatus', { outputName: o.outputName }).catch(() => ({})),
          ])
          return {
            ...o,
            settings: settingsRes.outputSettings || {},
            // GetOutputStatus uses different field names than GetOutputList
            outputTotalBytes: statusRes.outputBytes ?? o.outputTotalBytes ?? 0,
            outputTotalFrames: statusRes.outputTotalFrames ?? o.outputTotalFrames ?? 0,
            outputDroppedFrames: statusRes.outputSkippedFrames ?? o.outputDroppedFrames ?? 0,
            outputTimecode: statusRes.outputTimecode ?? null,
          }
        })
      )
      setOutputList(withDetails)
    } catch {
      // disconnect handler will fire
    }
  }, [])

  const connect = useCallback(async () => {
    if (!mountedRef.current) return
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }
    stopPolling()

    if (obsRef.current) {
      try { await obsRef.current.disconnect() } catch {}
      obsRef.current = null
    }

    const obs = new OBSWebSocket()
    obsRef.current = obs

    obs.on('ConnectionClosed', () => {
      if (!mountedRef.current) return
      setStatus('disconnected')
      setStats(null)
      setStreamStatus(null)
      setRecordStatus(null)
      setOutputList([])
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
      setObsVersion(ver)
      setStatus('connected')
      poll(obs)
      pollTimerRef.current = setInterval(() => poll(obs), POLL_INTERVAL)
    } catch {
      if (!mountedRef.current) return
      setStatus('error')
      const delay = backoffRef.current
      backoffRef.current = Math.min(backoffRef.current * 2, MAX_BACKOFF)
      reconnectTimerRef.current = setTimeout(() => {
        if (mountedRef.current) connectRef.current?.()
      }, delay)
    }
  }, [poll, stopPolling])

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

  return { status, obsVersion, stats, streamStatus, recordStatus, outputList, settings, saveSettings, reconnect }
}
