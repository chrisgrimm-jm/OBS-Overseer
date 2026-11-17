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

// Branch Output stores its encoder ID on the filter ("video_encoder"). Matches every NVENC ID OBS has shipped
// (jim_nvenc, obs_nvenc_h264_tex / _hevc_ / _av1_ in OBS 31+, ffmpeg_nvenc) plus AMD, QSV and Apple VT.
const HW_ENCODERS = [
  [/nvenc/i, 'NVENC', 'NVIDIA GPU'],
  [/amf/i, 'AMD', 'AMD GPU'],
  [/qsv/i, 'QSV', 'Intel iGPU'],
  [/videotoolbox/i, 'Apple VT', 'Apple Silicon'],
]

export function encoderInfo(settings) {
  const enc = settings?.video_encoder || ''
  if (!enc) return { label: 'Unknown', tooltip: 'No Branch Output filter matched this output, so its encoder is unknown. Hit Refresh after adding or renaming a branch.' }
  const codec = /hevc|265/i.test(enc) ? 'HEVC' : /av1/i.test(enc) ? 'AV1' : 'H.264'
  const hw = HW_ENCODERS.find(([re]) => re.test(enc))
  const preset = settings.preset2 || settings.preset || null
  const kbps = settings.bitrate ? `${settings.bitrate} kbps target` : null
  const detail = [enc, preset && `Preset: ${preset}`, kbps].filter(Boolean).join('\n')
  if (hw) return { label: `${hw[1]} ${codec}`, hw: true, tooltip: `Hardware encoder (${hw[2]})\n${detail}\n\nRuns on dedicated encode hardware, minimal CPU impact.` }
  return { label: enc === 'obs_x264' ? 'x264' : enc, hw: false, tooltip: `Software encoder (CPU)\n${detail}\n\nCompetes with OBS rendering for CPU. A hardware encoder (NVENC) is lighter for ISO records.` }
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

  const enc = encoderInfo(s)

  if (s._sources?.length > 1) {
    return (
      <div style={{ color: '#ffb74d', fontSize: 11, lineHeight: 1.4, padding: '2px 4px' }}>
        {s._sources.length} Branch Output filters are all named "{output.outputName}" (on {s._sources.join(', ')}).
        OBS can only report one of them by that name, so their stats get mixed together.
        Give each filter a unique name (right-click the source → Filters), then hit Refresh.
      </div>
    )
  }

  return (
    <div className="branch-detail-grid">
      <DetailTile label="Encoder" value={enc.label} borderColor={enc.hw ? '#4caf50' : undefined} tooltip={enc.tooltip} />
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

      {/* Output chips — each expands inline below itself */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {outputList.map(output => {
          const isSelected = selected === output.outputName
          const active = output.outputActive
          return (
            <div key={output.outputName}>
              <button
                onClick={() => setSelected(isSelected ? null : output.outputName)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4, width: '100%',
                  padding: '4px 8px', borderRadius: 4, cursor: 'pointer',
                  fontFamily: 'inherit', fontSize: 10, fontWeight: 600,
                  background: isSelected ? (active ? 'rgba(198,40,40,0.25)' : '#333') : (active ? 'rgba(198,40,40,0.12)' : '#2e2e2e'),
                  border: isSelected
                    ? (active ? '1px solid rgba(198,40,40,0.7)' : '1px solid #666')
                    : (active ? '1px solid rgba(198,40,40,0.3)' : '1px solid #3a3a3a'),
                  color: active ? '#ef9a9a' : '#888',
                  transition: 'background 0.15s, border-color 0.15s',
                }}
              >
                <span className={`dot dot-${active ? 'green' : 'gray'}`} style={{ flexShrink: 0 }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, textAlign: 'left' }}>
                  {output.outputName}
                </span>
                {output.settings?._sources?.length > 1 && <span style={{ fontSize: 8, color: '#ffb74d', flexShrink: 0 }}>×{output.settings._sources.length} SAME NAME</span>}
                {active && <span style={{ fontSize: 8, background: '#c62828', color: '#fff', borderRadius: 2, padding: '0 3px', flexShrink: 0 }}>REC</span>}
                {output.idle && <span style={{ fontSize: 8, color: '#666', flexShrink: 0 }}>{output.settings?._enabled === false ? 'OFF' : 'IDLE'}</span>}
                <span style={{ fontSize: 9, color: '#555', flexShrink: 0, marginLeft: 4 }}>{isSelected ? '▾' : '▸'}</span>
              </button>
              {isSelected && (
                <div style={{ marginTop: 4, padding: '6px 4px 2px', borderTop: '1px solid #3a3a3a' }}>
                  <OutputDetail output={output} />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
