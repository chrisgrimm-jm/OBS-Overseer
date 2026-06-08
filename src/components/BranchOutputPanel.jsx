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

function encoderLabel(settings) {
  const enc = settings?.encoder || settings?.video_encoder || settings?.['video-encoder'] || ''
  if (!enc) return null
  const map = {
    'obs_x264': 'x264',
    'ffmpeg_aac': 'AAC',
    'jim_nvenc': 'NVENC H.264',
    'jim_hevc_nvenc': 'NVENC HEVC',
    'com.apple.videotoolbox.videoencoder.ave.avc': 'Apple VT H.264',
    'com.apple.videotoolbox.videoencoder.ave.hevc': 'Apple VT HEVC',
    'h264_texture_amf': 'AMD H.264',
    'av1_texture_amf': 'AMD AV1',
    'obs_qsv11': 'QSV H.264',
  }
  return map[enc] || enc
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

  return (
    <div className="branch-detail-grid">
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
