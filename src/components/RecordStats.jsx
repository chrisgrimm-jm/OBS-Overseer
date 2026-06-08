import React from 'react';
import StatCard from './StatCard';
import './SectionPanel.css';

function formatBytes(bytes) {
  if (bytes == null) return { value: '—', unit: '' };
  if (bytes >= 1_073_741_824) {
    return { value: (bytes / 1_073_741_824).toFixed(2), unit: 'GB' };
  }
  if (bytes >= 1_048_576) {
    return { value: (bytes / 1_048_576).toFixed(1), unit: 'MB' };
  }
  if (bytes >= 1024) {
    return { value: (bytes / 1024).toFixed(1), unit: 'KB' };
  }
  return { value: String(bytes), unit: 'B' };
}

function formatTimecode(tc) {
  if (!tc) return null;
  return tc.split('.')[0];
}

export default function RecordStats({ recordStats }) {
  const { active, paused, outputBytes, outputTimecode } = recordStats;

  const fileSize = formatBytes(outputBytes);
  const timecode = formatTimecode(outputTimecode);

  const stateLabel = paused ? 'PAUSED' : active ? 'REC' : 'RECORD';
  const stateClass = paused
    ? 'section-indicator--paused'
    : active
    ? 'section-indicator--recording'
    : 'section-indicator--off';

  return (
    <div className="section-panel">
      <div className="section-panel__header">
        <div className={`section-indicator ${stateClass}`}>
          {stateLabel}
        </div>
        {active && timecode && (
          <span className="section-timecode">{timecode}</span>
        )}
        {!active && (
          <span className="section-inactive-msg">No active recording</span>
        )}
      </div>

      <div className="section-panel__grid">
        <StatCard
          title="File Size"
          value={active ? fileSize.value : '—'}
          unit={active ? fileSize.unit : ''}
          status={active ? 'green' : 'neutral'}
        />
        <StatCard
          title="Duration"
          value={active ? (timecode ?? '—') : '—'}
          status={active ? (paused ? 'yellow' : 'green') : 'neutral'}
          mono
        />
      </div>
    </div>
  );
}
