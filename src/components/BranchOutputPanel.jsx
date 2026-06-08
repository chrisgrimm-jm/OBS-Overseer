import React from 'react'
import { StatRow } from './StatRow.jsx'

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
  // Encoder name comes from the output settings — key varies by plugin
  const enc = settings?.encoder || settings?.video_encoder || settings?.['video-encoder'] || ''
  if (!enc) return null
  // Clean up common internal names to readable labels
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

export function BranchOutputPanel({ outputList }) {
  if (!outputList || outputList.length === 0) return null

  return (
    <div className="panel">
      <div className="panel-title">Branch Outputs</div>
      {outputList.map((output) => {
        const active = output.outputActive
        const dropped = output.outputDroppedFrames ?? 0
        const total = output.outputTotalFrames ?? 0
        const droppedPct = total > 0 ? ((dropped / total) * 100).toFixed(2) : '0.00'
        const s = output.settings || {}
        const encoder = encoderLabel(s)
        const bitrate = s.bitrate || s.videoBitrate || s.video_bitrate || null
        const width = output.outputWidth || s.width || null
        const height = output.outputHeight || s.height || null
        const resolution = (width && height) ? `${width}×${height}` : null

        return (
          <div key={output.outputName} className="branch-output">
            <div className="branch-output-header">
              <span className="branch-output-name">{output.outputName}</span>
              <span className={`badge ${active ? 'badge-rec' : 'badge-idle'}`}>
                {active ? 'REC' : 'IDLE'}
              </span>
            </div>
            {encoder && <StatRow label="Encoder" value={encoder} status="neutral" />}
            {bitrate && <StatRow label="Bitrate" value={bitrate} unit=" kbps" status="neutral" />}
            {resolution && <StatRow label="Resolution" value={resolution} status="neutral" />}
            <StatRow
              label="Written"
              value={formatBytes(output.outputTotalBytes)}
              status={active ? 'green' : 'neutral'}
            />
            <StatRow
              label="Dropped Frames"
              value={`${dropped} (${droppedPct}%)`}
              status={active ? droppedStatus(dropped, total) : 'neutral'}
            />
            <StatRow
              label="Total Frames"
              value={total.toLocaleString()}
              status="neutral"
            />
          </div>
        )
      })}
    </div>
  )
}
