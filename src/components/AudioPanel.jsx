import React from 'react'

function levelColor(level, muted) {
  if (muted) return 'audio-level-muted'
  if (level > 0.85) return 'audio-level-red'
  if (level > 0.60) return 'audio-level-yellow'
  return 'audio-level-green'
}

function muteTooltip(name, muted, level) {
  const pct = (level * 100).toFixed(0)
  return `Audio input: ${name}\nMuted: ${muted ? 'yes' : 'no'}\nLevel: ${pct}%\n\nA muted input during a live show will result in no audio for that source.`
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
      {audioInputs.map(({ inputName, inputMuted, level }) => {
        const pct = Math.round((level ?? 0) * 100)
        const barClass = levelColor(level ?? 0, inputMuted)
        return (
          <div key={inputName} className="audio-input">
            <div
              className="stat-row stat-row-tip"
              style={{ position: 'relative' }}
              title={muteTooltip(inputName, inputMuted, level ?? 0)}
            >
              <span className="stat-label" style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {inputName}
              </span>
              <span className="stat-value">
                {inputMuted && (
                  <span className="badge" style={{ background: 'var(--red)', color: '#fff' }}>MUTED</span>
                )}
                {!inputMuted && (
                  <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{pct}%</span>
                )}
              </span>
            </div>
            <div className="audio-level-wrap">
              <div
                className={`audio-level-bar ${barClass}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )
      })}
    </section>
  )
}
