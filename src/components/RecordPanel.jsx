import React from 'react'
import { StatRow } from './StatRow.jsx'

function formatBytes(bytes) {
  if (bytes == null) return null
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

function formatTimecode(tc) {
  if (!tc) return null
  return tc.split('.')[0]
}

export function RecordPanel({ recordStatus }) {
  if (!recordStatus) {
    return (
      <section className="panel">
        <h2 className="panel-title">Record</h2>
        <div className="panel-idle">Not recording</div>
      </section>
    )
  }

  const { outputActive, outputPaused, outputBytes, outputTimecode } = recordStatus

  const size = formatBytes(outputBytes)
  const duration = formatTimecode(outputTimecode)

  let badge = null
  if (outputActive && outputPaused) badge = <span className="badge badge-paused">PAUSED</span>
  else if (outputActive) badge = <span className="badge badge-rec">REC</span>
  else badge = <span className="badge badge-off">OFF</span>

  return (
    <section className="panel">
      <h2 className="panel-title">Record {badge}</h2>
      {size && <StatRow label="Size" value={size} color={outputActive ? 'green' : 'gray'} />}
      {duration && <StatRow label="Duration" value={duration} color="gray" />}
      {!outputActive && <div className="panel-idle">Not recording</div>}
    </section>
  )
}
