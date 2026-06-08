import React, { useState } from 'react'

export function StatTile({ label, value, unit = '', color = 'gray', tooltip }) {
  const [visible, setVisible] = useState(false)

  return (
    <div
      className={`stat-tile stat-tile-${color}${tooltip ? ' stat-tile-tip' : ''}`}
      onMouseEnter={() => tooltip && setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      <span className="stat-tile-label">{label}</span>
      <span className="stat-tile-value">
        {value != null ? `${value}${unit}` : '—'}
      </span>
      {tooltip && visible && (
        <div className="tooltip tooltip-tile">{tooltip}</div>
      )}
    </div>
  )
}
