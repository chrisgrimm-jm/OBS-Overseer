function formatTimecode(tc) {
  if (!tc) return null
  return tc.split('.')[0]
}

export function getRecordInfo(recordStatus) {
  if (!recordStatus) return null
  const { outputActive, outputPaused, outputTimecode } = recordStatus
  return {
    outputActive,
    outputPaused,
    duration: formatTimecode(outputTimecode),
  }
}
