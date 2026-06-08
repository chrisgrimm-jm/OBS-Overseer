import React, { useState } from 'react'

function levelColor(level, muted) {
  if (muted) return 'gray'
  if (level > 0.85) return 'red'
  if (level > 0.60) return 'yellow'
  return 'green'
}

function muteTooltip(name, muted, level) {
  const pct = (level * 100).toFixed(0)
  return `Audio input: ${name}\nMuted: ${muted ? 'yes' : 'no'}\nLevel: ${pct}%\n\nA muted input during a live show will result in no audio for that source.`
}

function AudioChip({ inputName, inputMuted, level }) {
  const [hovered, setHovered] = useState(false)
  const pct = Math.round((level ?? 0) * 100)
  const color = levelColor(level ?? 0, inputMuted)
  const tooltip = muteTooltip(inputName, inputMuted, level ?? 0)

  return (
    <div
      className="audio-chip"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={tooltip}
    >
      <div className="audio-chip-top">
        {inputMuted
          ? <span className="badge" style={{ background: 'var(--red)', color: '#fff', fontSize: 9, padding: '1px 4px' }}>MUTED</span>
          : <span className={`dot dot-${color}`} />
        }
        <span className="audio-chip-name">{inputName}</span>
      </div>
      <div className="audio-level-wrap" style={{ marginTop: 2 }}>
        <div
          className={`audio-level-bar audio-level-${inputMuted ? 'muted' : color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export function AudioPanel({ audioInputs }) {
  if (!audioInputs || audioInputs.length === 0) {
    return (
      <section className="panel">
        <h2 className="panel-title">Audio</h2>
        <div className="panel-idle">No audio inputs detected</div>
      </section>
    )
  }

  return (
    <section className="panel">
      <h2 className="panel-title">Audio</h2>
      <div className="audio-chips-row">
        {audioInputs.map(({ inputName, inputMuted, level }) => (
          <AudioChip key={inputName} inputName={inputName} inputMuted={inputMuted} level={level} />
        ))}
      </div>
    </section>
  )
}
