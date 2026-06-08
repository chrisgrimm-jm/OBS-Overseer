import React, { useState } from 'react'

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
  const enc = settings?.encoder || settings?.video_encoder || settings?.['video-encoder'] || ''
  if (!enc) return null

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
  if (info.hw) {
    resourceSummary = `HW · ${info.brand}`
    resourceTooltip = `Hardware encoder (${info.brand})\n\nUses dedicated encode hardware — minimal CPU impact, typically <2% CPU overhead.\n\nBest for recording high bitrate ISO files without affecting stream performance.`
  } else {
    const impact = (preset && x264PresetImpact[preset.toLowerCase()]) || 'Moderate CPU'
    resourceSummary = `SW · ${preset || 'CPU'}`
    resourceTooltip = `Software encoder (${info.brand})\n\n${preset ? `Preset: ${preset}\n${x264PresetImpact[preset.toLowerCase()] || 'Unknown CPU impact'}\n\n` : ''}Software encoders compete with OBS rendering for CPU time.\n\nFor ISO recording, consider switching to a hardware encoder (NVENC/AMF/Apple VT) to reduce CPU load.`
  }

  return { label: info.label, isHardware: info.hw, preset, resourceSummary, resourceTooltip }
}

function OutputDetail({ output }) {
  const active = output.outputActive
  const dropped = output.outputDroppedFrames ?? 0
  const total = output.outputTotalFrames ?? 0
  const droppedPct = total > 0 ? ((dropped / total) * 100).toFixed(2) : '0.00'
  const s = output.settings || {}
  const duration = output.outputTimecode ? output.outputTimecode.split('.')[0] : null
  const dropSt = active ? droppedStatus(dropped, total) : 'neutral'
  const colorMap = { green: 'var(--green)', yellow: 'var(--yellow)', red: 'var(--red)', neutral: 'var(--text-dim)' }
  const enc = encoderInfo(s)
  const bitrate = s.bitrate || s.videoBitrate || s.video_bitrate || null
  const width = output.outputWidth || s.width || null
  const height = output.outputHeight || s.height || null
  const resolution = (width && height) ? `${width}×${height}` : null

  return (
    <div className="branch-detail-grid">
      {enc && (
        <div
          className="branch-detail-tile"
          style={{ borderLeftColor: enc.isHardware ? 'var(--green)' : 'var(--yellow)' }}
          title={enc.resourceTooltip}
        >
          <span className="branch-detail-label">Encoder</span>
          <span className="branch-detail-value" style={{ fontSize: 11 }}>{enc.label}</span>
        </div>
      )}
      {enc && (
        <div
          className="branch-detail-tile"
          style={{ borderLeftColor: enc.isHardware ? 'var(--green)' : 'var(--yellow)' }}
          title={enc.resourceTooltip}
        >
          <span className="branch-detail-label">Resources</span>
          <span className="branch-detail-value" style={{ fontSize: 11, color: enc.isHardware ? 'var(--green)' : 'var(--yellow)' }}>
            {enc.resourceSummary}
          </span>
        </div>
      )}
      {bitrate && (
        <div className="branch-detail-tile" title="Target recording bitrate.">
          <span className="branch-detail-label">Bitrate</span>
          <span className="branch-detail-value">{bitrate} kbps</span>
        </div>
      )}
      {resolution && (
        <div className="branch-detail-tile" title="Output resolution for this branch recording.">
          <span className="branch-detail-label">Resolution</span>
          <span className="branch-detail-value" style={{ fontSize: 11 }}>{resolution}</span>
        </div>
      )}
      <div className="branch-detail-tile" title="Total data written to disk for this ISO recording.">
        <span className="branch-detail-label">Written</span>
        <span className="branch-detail-value">{formatBytes(output.outputTotalBytes)}</span>
      </div>
      <div
        className="branch-detail-tile"
        style={{ borderLeftColor: colorMap[dropSt] }}
        title={`${dropped} frames dropped out of ${total} (${droppedPct}%)\n\nFor local recordings, drops usually mean your drive cannot keep up with the write speed.\n\nTry: recording to an SSD, lowering bitrate, or changing encoder preset.`}
      >
        <span className="branch-detail-label">Dropped</span>
        <span className="branch-detail-value" style={{ color: colorMap[dropSt] }}>
          {dropped} ({droppedPct}%)
        </span>
      </div>
      <div className="branch-detail-tile" title="Total frames written to this ISO output since recording started.">
        <span className="branch-detail-label">Frames</span>
        <span className="branch-detail-value">{total.toLocaleString()}</span>
      </div>
      <div className="branch-detail-tile" title="Time elapsed since this ISO recording started.">
        <span className="branch-detail-label">Duration</span>
        <span className="branch-detail-value">{duration || '—'}</span>
      </div>
    </div>
  )
}

export function BranchOutputPanel({ outputList }) {
  const [expanded, setExpanded] = useState(false)

  if (!outputList || outputList.length === 0) return null

  return (
    <div className="panel accordion-panel">
      <div className="accordion-header" onClick={() => setExpanded(e => !e)}>
        <span className="panel-title" style={{ marginBottom: 0 }}>
          Branch Outputs
          <span className="accordion-arrow">{expanded ? '▾' : '▸'}</span>
        </span>
        <div className="accordion-badges">
          {outputList.map(output => (
            <span key={output.outputName} className={`status-badge ${output.outputActive ? 'status-badge-active' : 'status-badge-idle'}`}>
              <span className={`dot dot-${output.outputActive ? 'green' : 'gray'}`} />
              {output.outputName}
              {output.outputActive && <span className="badge badge-rec" style={{ fontSize: 9, padding: '0 3px' }}>REC</span>}
            </span>
          ))}
        </div>
      </div>
      {expanded && (
        <div className="accordion-body">
          {outputList.map((output) => (
            <div key={output.outputName} className="branch-output">
              <div className="branch-output-header">
                <span className="branch-output-name">{output.outputName}</span>
                <span className={`badge ${output.outputActive ? 'badge-rec' : 'badge-idle'}`}>
                  {output.outputActive ? 'REC' : 'IDLE'}
                </span>
              </div>
              <OutputDetail output={output} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
