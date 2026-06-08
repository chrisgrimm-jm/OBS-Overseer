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

        return (
          <div key={output.outputName} className="branch-output">
            <div className="branch-output-header">
              <span className="branch-output-name">{output.outputName}</span>
              <span className={`badge ${active ? 'badge-rec' : 'badge-idle'}`}>
                {active ? 'REC' : 'IDLE'}
              </span>
            </div>
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
