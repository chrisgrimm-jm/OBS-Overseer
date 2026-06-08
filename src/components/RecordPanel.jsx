import React from 'react'

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
  // Kept for data access — rendering moved to App.jsx
  return null
}

export function getRecordInfo(recordStatus) {
  if (!recordStatus) return null
  const { outputActive, outputPaused, outputBytes, outputTimecode } = recordStatus
  return {
    outputActive,
    outputPaused,
    size: formatBytes(outputBytes),
    duration: formatTimecode(outputTimecode),
  }
}
