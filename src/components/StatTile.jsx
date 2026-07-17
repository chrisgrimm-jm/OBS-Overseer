import React, { useState } from 'react'

const BORDER_COLORS = { green: '#4caf50', yellow: '#ffb74d', red: '#ef5350', gray: '#666' }

export function StatTile({ label, value, unit = '', color = 'gray', tooltip }) {
  const [visible, setVisible] = useState(false)

  return (
    <div
      className={`stat-tile stat-tile-${color}${tooltip ? ' stat-tile-tip' : ''}`}
      style={{ background: '#252525', borderLeftColor: BORDER_COLORS[color] || '#666' }}
      onMouseEnter={() => tooltip && setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      <span className="stat-tile-label" style={{ color: '#888' }}>{label}</span>
      <span className="stat-tile-value" style={{ color: '#e0e0e0' }}>
        {value != null ? `${value}${unit}` : '—'}
      </span>
      {tooltip && visible && (
        <div className="tooltip tooltip-tile">{tooltip}</div>
      )}
    </div>
  )
}
