import React from 'react';
import StatCard from './StatCard';
import './SectionPanel.css';

function formatBitrate(bytesPerSec) {
  if (bytesPerSec == null) return { value: '—', unit: '' };
  const bitsPerSec = bytesPerSec * 8;
  if (bitsPerSec >= 1_000_000) {
    return { value: (bitsPerSec / 1_000_000).toFixed(2), unit: 'Mbps' };
  }
  return { value: (bitsPerSec / 1_000).toFixed(1), unit: 'kbps' };
}

function formatTimecode(tc) {
  if (!tc) return null;
  // OBS sends HH:MM:SS.mmm
  return tc.split('.')[0];
}

function droppedFrameStatus(pct) {
  if (pct == null) return 'neutral';
  if (pct < 0.1) return 'green';
  if (pct < 1) return 'yellow';
  return 'red';
}

export default function StreamStats({ streamStats, systemStats }) {
  const { active, outputBytesPerSec, outputTotalFrames, outputSkippedFrames, outputTimecode } = streamStats;

  const bitrate = formatBitrate(outputBytesPerSec);

  // Dropped frames: prefer stream-specific data, fall back to system stats
  const totalFrames = outputTotalFrames ?? systemStats?.outputTotalFrames;
  const skippedFrames = outputSkippedFrames ?? systemStats?.outputSkippedFrames;
  const droppedPct =
    totalFrames != null && totalFrames > 0 && skippedFrames != null
      ? (skippedFrames / totalFrames) * 100
      : null;

  const droppedStatus = droppedFrameStatus(droppedPct);
  const droppedValue = droppedPct != null ? droppedPct.toFixed(2) : '—';
  const droppedSubtitle =
    skippedFrames != null && totalFrames != null
      ? `${skippedFrames.toLocaleString()} / ${totalFrames.toLocaleString()} frames`
      : null;

  const timecode = formatTimecode(outputTimecode);

  return (
    <div className="section-panel">
      <div className="section-panel__header">
        <div className={`section-indicator ${active ? 'section-indicator--live' : 'section-indicator--off'}`}>
          {active ? 'LIVE' : 'STREAM'}
        </div>
        {active && timecode && (
          <span className="section-timecode">{timecode}</span>
        )}
        {!active && (
          <span className="section-inactive-msg">No active stream</span>
        )}
      </div>

      <div className="section-panel__grid">
        <StatCard
          title="Bitrate"
          value={active ? bitrate.value : '—'}
          unit={active ? bitrate.unit : ''}
          status={active ? 'blue' : 'neutral'}
        />
        <StatCard
          title="Dropped Frames"
          value={active ? droppedValue : '—'}
          unit={active && droppedPct != null ? '%' : ''}
          status={active ? droppedStatus : 'neutral'}
          subtitle={active ? droppedSubtitle : null}
        />
      </div>
    </div>
  );
}
