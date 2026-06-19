import React, { useState, useCallback } from 'react'

function DetailTile({ label, value, borderColor, valueColor, tooltip }) {
  const [visible, setVisible] = useState(false)
  return (
    <div
      className="branch-detail-tile"
      style={{ background: '#2e2e2e', borderLeftColor: borderColor || '#666', cursor: tooltip ? 'help' : 'default' }}
      onMouseEnter={() => tooltip && setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      <span className="branch-detail-label" style={{ color: '#888' }}>{label}</span>
      <span className="branch-detail-value" style={{ color: valueColor || '#e0e0e0', fontSize: value && value.length > 8 ? 11 : undefined }}>
        {value || '—'}
      </span>
      {tooltip && visible && <div className="tooltip">{tooltip}</div>}
    </div>
  )
}

function formatBytes(bytes) {
  if (bytes == null) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

function droppedStatus(dropped, total) {
  if (!total) return 'neutral'
  const pct = dropped / total
  if (pct > 0.01) return 'red'
  if (pct > 0.001) return 'yellow'
  return 'green'
}

// Returns { label, isHardware, preset, resourceSummary, resourceTooltip }
function encoderInfo(settings) {
  // Branch outputs don't store their encoder in output settings —
  // we inject _profileEncoder from the OBS profile (AdvOut/SimpleOutput RecEncoder)
  const enc = settings?._profileEncoder
    || settings?.encoder
    || settings?.video_encoder
    || settings?.['video-encoder']
    || settings?.videoEncoder
    || ''
  if (!enc) {
    return { label: 'Unknown', isHardware: false, preset: null, resourceSummary: 'Unknown', resourceTooltip: `Could not detect encoder type.\n\nOBS did not return an encoder ID for this output. Check your Recording encoder in OBS Settings → Output.` }
  }

  const hwEncoders = {
    'jim_nvenc':                                      { label: 'NVENC H.264',      hw: true,  brand: 'NVIDIA GPU' },
    'jim_hevc_nvenc':                                 { label: 'NVENC HEVC',        hw: true,  brand: 'NVIDIA GPU' },
    'jim_av1_nvenc':                                  { label: 'NVENC AV1',         hw: true,  brand: 'NVIDIA GPU' },
    'com.apple.videotoolbox.videoencoder.ave.avc':    { label: 'Apple VT H.264',    hw: true,  brand: 'Apple Silicon' },
    'com.apple.videotoolbox.videoencoder.ave.hevc':   { label: 'Apple VT HEVC',     hw: true,  brand: 'Apple Silicon' },
    'h264_texture_amf':                               { label: 'AMD H.264',         hw: true,  brand: 'AMD GPU' },
    'hevc_texture_amf':                               { label: 'AMD HEVC',          hw: true,  brand: 'AMD GPU' },
    'av1_texture_amf':                                { label: 'AMD AV1',           hw: true,  brand: 'AMD GPU' },
    'obs_qsv11':                                      { label: 'QSV H.264',         hw: true,  brand: 'Intel iGPU' },
    'obs_qsv11_av1':                                  { label: 'QSV AV1',           hw: true,  brand: 'Intel iGPU' },
    'obs_x264':                                       { label: 'x264',              hw: false, brand: 'CPU' },
    'ffmpeg_svt_av1':                                 { label: 'SVT-AV1',           hw: false, brand: 'CPU' },
    'obs_ffmpeg_openh264':                            { label: 'OpenH264',          hw: false, brand: 'CPU' },
  }

  const info = hwEncoders[enc] || { label: enc, hw: false, brand: 'CPU' }

  // Preset field varies by encoder
  const preset = settings?.preset || settings?.preset2 || settings?.Preset || null

  // x264 preset → resource impact
  const x264PresetImpact = {
    ultrafast: 'Very low CPU (~5%)',
    superfast: 'Low CPU (~8%)',
    veryfast:  'Low CPU (~12%)',
    faster:    'Moderate CPU (~20%)',
    fast:      'Moderate CPU (~30%)',
    medium:    'High CPU (~45%)',
    slow:      'Very high CPU (~65%)',
    slower:    'Extreme CPU (~80%)',
    veryslow:  'Max CPU (~95%)',
  }

  let resourceSummary, resourceTooltip
  const profileNote = `\n\n⚠ This reflects your profile's default recording encoder.\nIf this branch output uses a different encoder, OBS WebSocket does not expose per-output overrides — verify in OBS Settings → Output.`

  if (info.hw) {
    resourceSummary = `HW · ${info.brand}`
    resourceTooltip = `Hardware encoder (${info.brand})\n\nUses dedicated encode hardware — minimal CPU impact, typically <2% CPU overhead.\n\nBest for recording high bitrate ISO files without affecting stream performance.${profileNote}`
  } else {
    resourceSummary = `SW · ${preset || 'CPU'}`
    resourceTooltip = `Software encoder (${info.brand})\n\n${preset ? `Preset: ${preset}\n${x264PresetImpact[preset.toLowerCase()] || 'Unknown CPU impact'}\n\n` : ''}Software encoders compete with OBS rendering for CPU time.\n\nFor ISO recording, consider switching to a hardware encoder (NVENC/AMF/Apple VT) to reduce CPU load.${profileNote}`
  }

  return { label: info.label, isHardware: info.hw, preset, resourceSummary, resourceTooltip }
}

function encodeLagColor(pct) {
  if (pct == null) return '#888'
  if (pct <= 0) return '#4caf50'
  if (pct < 1) return '#ffb74d'
  return '#ef5350'
}

function encodeLagBorder(pct) {
  if (pct == null) return undefined
  if (pct <= 0) return '#4caf50'
  if (pct < 1) return '#ffb74d'
  return '#ef5350'
}

function congestionColor(val) {
  if (val == null) return '#888'
  if (val < 0.25) return '#4caf50'
  if (val < 0.6) return '#ffb74d'
  return '#ef5350'
}

function OutputDetail({ output }) {
  const active = output.outputActive
  const skipped = output.outputSkippedFrames ?? 0
  const total = output.outputTotalFrames ?? 0
  const skippedPct = total > 0 ? parseFloat(((skipped / total) * 100).toFixed(2)) : 0
  const s = output.settings || {}
  const duration = output.outputTimecode ? output.outputTimecode.split('.')[0] : null
  const width = output.outputWidth || s.width || null
  const height = output.outputHeight || s.height || null
  const resolution = (width && height) ? `${width}×${height}` : null
  const liveBitrate = output.liveBitrateKbps
  const congestion = output.outputCongestion ?? null

  const lagAdvice = skippedPct >= 2
    ? `The encoder cannot keep up with the recording demand.\n\nTry: switching to a hardware encoder (NVENC/AMF/Apple VT), lowering the bitrate, or using a faster preset.`
    : skippedPct >= 0.5
    ? `Minor encoder lag — watch for increases during heavy scenes.`
    : `Encoder is keeping up. No lag detected.`

  return (
    <div className="branch-detail-grid">
      <DetailTile
        label="Encode Lag"
        value={active ? `${skippedPct.toFixed(2)}%` : '—'}
        borderColor={active ? encodeLagBorder(skippedPct) : undefined}
        valueColor={active ? encodeLagColor(skippedPct) : '#888'}
        tooltip={active
          ? `${skipped} frames skipped out of ${total} (${skippedPct.toFixed(2)}%)\n\nEncoder lag means the encoder couldn't process frames fast enough and had to drop them.\n\nThresholds: 0% great · <1% warning · ≥1% critical\n\n${lagAdvice}`
          : 'Output not currently recording.'}
      />
      <DetailTile
        label="Bitrate"
        value={active && liveBitrate != null ? `${liveBitrate} kbps` : '—'}
        tooltip={active
          ? `Live bitrate calculated from bytes written over the last poll interval.\n\nThis reflects actual encoder output, not the target bitrate setting.\n\nDrops below target can indicate the encoder is struggling or the drive can't keep up.`
          : 'Output not currently recording.'}
      />
      <DetailTile
        label="Congestion"
        value={active && congestion != null ? `${(congestion * 100).toFixed(0)}%` : '—'}
        valueColor={active ? congestionColor(congestion) : '#888'}
        borderColor={active ? congestionColor(congestion) : undefined}
        tooltip={active
          ? `Encoder queue congestion: ${congestion != null ? (congestion * 100).toFixed(0) : '—'}%\n\nReflects how backed up the encoder's internal frame queue is. High congestion means frames are piling up faster than the encoder can process them.\n\nThresholds: <25% good · 25–60% warning · >60% critical\n\nFor software encoders, high congestion usually means the CPU preset is too slow for the frame rate.`
          : 'Output not currently recording.'}
      />
      {resolution && <DetailTile label="Resolution" value={resolution} tooltip="Output resolution for this branch recording." />}
      <DetailTile label="Written" value={formatBytes(output.outputTotalBytes)} tooltip="Total data written to disk for this ISO recording." />
      <DetailTile label="Frames" value={total > 0 ? total.toLocaleString() : '—'} tooltip="Total frames written to this ISO output since recording started." />
      <DetailTile label="Duration" value={duration || '—'} tooltip="Time elapsed since this ISO recording started." />
    </div>
  )
}

export function BranchOutputPanel({ outputList, onRefresh }) {
  const [selected, setSelected] = useState(null)
  const [spinning, setSpinning] = useState(false)

  const handleRefresh = useCallback((e) => {
    e.stopPropagation()
    if (spinning) return
    setSpinning(true)
    onRefresh?.()
    setTimeout(() => setSpinning(false), 800)
  }, [spinning, onRefresh])

  if (!outputList || outputList.length === 0) return null

  const selectedOutput = outputList.find(o => o.outputName === selected) || null

  return (
    <div className="panel" style={{ background: '#252525', color: '#e0e0e0' }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
        <span className="panel-title" style={{ marginBottom: 0 }}>Branch Outputs</span>
        <button
          onClick={handleRefresh}
          title="Refresh output list"
          style={{
            background: 'none', border: '1px solid #3a3a3a', borderRadius: 4,
            color: '#888', cursor: 'pointer', padding: '1px 6px', fontSize: 9,
            fontFamily: 'inherit', fontWeight: 600, letterSpacing: '0.5px',
            textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 3,
            opacity: spinning ? 0.5 : 1, transition: 'opacity 0.15s',
          }}
        >
          <svg width="9" height="9" viewBox="0 0 12 12" fill="none"
            style={{ animation: spinning ? 'branch-spin 0.6s linear infinite' : 'none' }}>
            <path d="M10.5 6a4.5 4.5 0 1 1-1.02-2.85M10.5 1.5V4H8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Refresh
        </button>
      </div>

      {/* Output chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {outputList.map(output => {
          const isSelected = selected === output.outputName
          const active = output.outputActive
          return (
            <button
              key={output.outputName}
              onClick={() => setSelected(isSelected ? null : output.outputName)}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '3px 7px', borderRadius: 4, cursor: 'pointer',
                fontFamily: 'inherit', fontSize: 10, fontWeight: 600,
                background: isSelected ? (active ? 'rgba(198,40,40,0.25)' : '#333') : (active ? 'rgba(198,40,40,0.12)' : '#2e2e2e'),
                border: isSelected
                  ? (active ? '1px solid rgba(198,40,40,0.7)' : '1px solid #666')
                  : (active ? '1px solid rgba(198,40,40,0.3)' : '1px solid #3a3a3a'),
                color: active ? '#ef9a9a' : '#888',
                maxWidth: '100%', overflow: 'hidden',
                transition: 'background 0.15s, border-color 0.15s',
              }}
            >
              <span className={`dot dot-${active ? 'green' : 'gray'}`} style={{ flexShrink: 0 }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {output.outputName}
              </span>
              {active && <span style={{ fontSize: 8, background: '#c62828', color: '#fff', borderRadius: 2, padding: '0 3px', flexShrink: 0 }}>REC</span>}
              <span style={{ fontSize: 9, color: '#555', flexShrink: 0 }}>{isSelected ? '▾' : '▸'}</span>
            </button>
          )
        })}
      </div>

      {/* Expanded detail for selected output */}
      {selectedOutput && (
        <div style={{ marginTop: 6, borderTop: '1px solid #3a3a3a', paddingTop: 6 }}>
          <div className="branch-output-header">
            <span className="branch-output-name">{selectedOutput.outputName}</span>
            <span className={`badge ${selectedOutput.outputActive ? 'badge-rec' : 'badge-idle'}`}>
              {selectedOutput.outputActive ? 'REC' : 'IDLE'}
            </span>
          </div>
          <OutputDetail output={selectedOutput} />
        </div>
      )}
    </div>
  )
}
