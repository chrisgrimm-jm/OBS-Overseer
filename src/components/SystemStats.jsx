import React from 'react';
import StatCard from './StatCard';
import './SectionPanel.css';

function cpuStatus(pct) {
  if (pct == null) return 'neutral';
  if (pct < 50) return 'green';
  if (pct < 80) return 'yellow';
  return 'red';
}

function renderLagStatus(pct) {
  if (pct == null) return 'neutral';
  if (pct < 0.5) return 'green';
  if (pct < 2) return 'yellow';
  return 'red';
}

export default function SystemStats({ systemStats, connected }) {
  const {
    cpuUsage,
    memoryUsage,
    activeFps,
    averageFrameRenderTime,
    renderMissedFrames,
    renderTotalFrames,
  } = systemStats;

  const renderLagPct =
    renderTotalFrames != null && renderTotalFrames > 0 && renderMissedFrames != null
      ? (renderMissedFrames / renderTotalFrames) * 100
      : null;

  const renderLagSubtitle =
    renderMissedFrames != null && renderTotalFrames != null
      ? `${renderMissedFrames.toLocaleString()} / ${renderTotalFrames.toLocaleString()} frames`
      : null;

  const fpsValue = activeFps != null ? activeFps.toFixed(2) : '—';
  const cpuValue = cpuUsage != null ? cpuUsage.toFixed(1) : '—';
  const memValue = memoryUsage != null ? memoryUsage.toFixed(0) : '—';
  const renderTimeValue = averageFrameRenderTime != null ? averageFrameRenderTime.toFixed(2) : '—';
  const renderLagValue = renderLagPct != null ? renderLagPct.toFixed(2) : '—';

  const neutral = !connected;

  return (
    <div className="section-panel">
      <div className="section-panel__header">
        <div className="section-label">SYSTEM</div>
      </div>
      <div className="section-panel__grid section-panel__grid--wide">
        <StatCard
          title="CPU Usage"
          value={cpuValue}
          unit={cpuUsage != null ? '%' : ''}
          status={neutral ? 'neutral' : cpuStatus(cpuUsage)}
        />
        <StatCard
          title="Memory"
          value={memValue}
          unit={memoryUsage != null ? 'MB' : ''}
          status={neutral ? 'neutral' : 'blue'}
        />
        <StatCard
          title="Active FPS"
          value={fpsValue}
          unit={activeFps != null ? 'fps' : ''}
          status={neutral ? 'neutral' : 'blue'}
        />
        <StatCard
          title="Frame Render Time"
          value={renderTimeValue}
          unit={averageFrameRenderTime != null ? 'ms' : ''}
          status={neutral ? 'neutral' : 'blue'}
        />
        <StatCard
          title="Render Lag"
          value={renderLagValue}
          unit={renderLagPct != null ? '%' : ''}
          status={neutral ? 'neutral' : renderLagStatus(renderLagPct)}
          subtitle={renderLagSubtitle}
        />
      </div>
    </div>
  );
}
