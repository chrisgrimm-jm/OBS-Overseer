import React, { useState } from 'react'

export function StatRow({ label, value, color = 'gray', unit = '', status, tooltip }) {
  const [visible, setVisible] = useState(false)
  const resolvedColor = color !== 'gray' ? color : (status || 'neutral')

  return (
    <div
      className={`stat-row${tooltip ? ' stat-row-tip' : ''}`}
      onMouseEnter={() => tooltip && setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      <span className="stat-label">{label}</span>
      <span className="stat-value">
        <span className={`dot dot-${resolvedColor}`} />
        {value != null ? `${value}${unit}` : '—'}
      </span>
      {tooltip && visible && (
        <div className="tooltip">{tooltip}</div>
      )}
    </div>
  )
}
