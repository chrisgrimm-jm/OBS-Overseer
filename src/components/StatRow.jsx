import React from 'react'

/**
 * color: 'green' | 'yellow' | 'red' | 'gray' | 'blue'
 */
export function StatRow({ label, value, color = 'gray', unit = '' }) {
  return (
    <div className="stat-row">
      <span className="stat-label">{label}</span>
      <span className="stat-value">
        <span className={`dot dot-${color}`} />
        {value != null ? `${value}${unit}` : '—'}
      </span>
    </div>
  )
}
