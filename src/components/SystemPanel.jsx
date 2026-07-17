function cpuColor(pct) {
  if (pct == null) return 'gray'
  if (pct < 50) return 'green'
  if (pct < 80) return 'yellow'
  return 'red'
}

function memColor(mb) {
  if (mb == null) return 'gray'
  if (mb < 4096) return 'green'
  if (mb < 8192) return 'yellow'
  return 'red'
}

function fpsColor(fps, target = 30) {
  if (fps == null) return 'gray'
  if (fps >= target * 0.99) return 'green'
  if (fps >= target * 0.95) return 'yellow'
  return 'red'
}

function diskColor(mb) {
  if (mb == null) return 'gray'
  if (mb > 10000) return 'green'
  if (mb >= 2000) return 'yellow'
  return 'red'
}

function lagColor(pct) {
  if (pct == null) return 'gray'
  if (pct <= 0) return 'green'
  if (pct < 1) return 'yellow'
  return 'red'
}

function diskTooltip(mb) {
  if (mb == null) return null
  const gb = (mb / 1024).toFixed(1)
  return `Available disk space on OBS recording drive.\n\n${gb} GB free\n\nThresholds: >10 GB good · 2–10 GB warning · <2 GB critical\n\nLow disk space will cause recordings to stop mid-show.`
}

function memTooltip(mb) {
  if (mb == null) return null
  const advice = mb >= 8192
    ? 'OBS is using a very large amount of RAM. With multiple software encoders this is expected, but watch for continued growth which can indicate a memory leak.\n\nTry: restarting OBS between shows, closing unused browser sources, or switching to hardware encoders (NVENC/AMF/Apple VT).'
    : mb >= 4096
    ? 'Memory usage is elevated. Normal for multi-output software encoding setups — monitor for growth over long sessions.'
    : 'Memory usage is normal. Plenty of headroom on a 32 GB system.'
  return `OBS process memory: ${(mb / 1024).toFixed(2)} GB (${mb.toFixed(0)} MB)\n\nThis is RAM used by OBS only — not your whole system.\n\nThresholds (tuned for 32 GB systems): <4 GB good · 4–8 GB warning · >8 GB critical\n\n${advice}`
}

function cpuTooltip(pct) {
  if (pct == null) return null
  const advice = pct >= 80
    ? 'OBS is under heavy CPU load. This can cause dropped/skipped frames.\n\nTry: lowering encoder preset (e.g. faster/veryfast), switching to hardware encoding (NVENC/AMF/VT), or reducing scene complexity.'
    : pct >= 50
    ? 'CPU load is moderate. Monitor for spikes during busy scenes.'
    : 'CPU usage is normal.'
  return `OBS process CPU: ${pct.toFixed(1)}%\n\nThis is CPU used by OBS only — not your whole system. Your total system CPU usage will be higher.\n\nThresholds: <50% good · 50–80% warning · >80% critical\n\n${advice}`
}

function renderLagTooltip(pct) {
  if (pct == null) return null
  const advice = pct >= 2
    ? 'OBS is missing many render frames. Your GPU cannot keep up.\n\nTry: lowering canvas/output resolution, removing heavy GPU sources (browser sources, filters), or checking for GPU throttling.'
    : pct >= 0.5
    ? 'Some render frames are being missed. Could be brief GPU spikes.'
    : 'Render performance is good.'
  return `${pct.toFixed(2)}% of frames missed by renderer\n\nThresholds: <0.5% good · 0.5–2% warning · >2% critical\n\n${advice}`
}

function encodeLagTooltip(pct) {
  if (pct == null) return null
  const advice = pct >= 2
    ? 'The encoder is struggling to keep up. Frames are being skipped before they are sent.\n\nTry: switching to a faster encoder preset, using hardware encoding (NVENC/AMF/VT), or lowering output bitrate.'
    : pct >= 0.5
    ? 'Minor encoder lag detected. Watch for increases over time.'
    : 'Encoder is keeping up fine.'
  return `${pct.toFixed(2)}% of frames skipped by encoder\n\nThresholds: <0.5% good · 0.5–2% warning · >2% critical\n\n${advice}`
}

export function getSystemTiles(stats) {
  if (!stats) return null
  const {
    cpuUsage, memoryUsage, activeFps,
    renderSkippedFrames, renderTotalFrames,
    outputSkippedFrames, outputTotalFrames,
    availableDiskSpace,
  } = stats

  const renderLagPct = (renderTotalFrames && renderSkippedFrames != null)
    ? parseFloat(((renderSkippedFrames / renderTotalFrames) * 100).toFixed(2))
    : null

  const encodeLagPct = (outputTotalFrames && outputSkippedFrames != null)
    ? parseFloat(((outputSkippedFrames / outputTotalFrames) * 100).toFixed(2))
    : null

  return {
    cpu: cpuUsage != null ? cpuUsage.toFixed(1) : null,
    cpuColor: cpuColor(cpuUsage),
    cpuTooltip: cpuTooltip(cpuUsage),
    mem: memoryUsage != null ? (memoryUsage / 1024).toFixed(2) : null,
    memColor: memColor(memoryUsage),
    memTooltip: memTooltip(memoryUsage),
    fps: activeFps != null ? activeFps.toFixed(2) : null,
    fpsColor: fpsColor(activeFps),
    fpsTooltip: `Active output framerate.\n\nShould match your OBS canvas FPS setting. Drops below target indicate the system cannot render at the configured rate.`,
    diskFree: availableDiskSpace != null ? (availableDiskSpace / 1024).toFixed(1) : null,
    diskColor: diskColor(availableDiskSpace),
    diskTooltip: diskTooltip(availableDiskSpace),
    renderLag: renderLagPct,
    renderLagColor: lagColor(renderLagPct),
    renderLagTooltip: renderLagTooltip(renderLagPct),
    encodeLag: encodeLagPct,
    encodeLagColor: lagColor(encodeLagPct),
    encodeLagTooltip: encodeLagTooltip(encodeLagPct),
  }
}

export function getSystemAlerts(stats) {
  if (!stats) return []
  const t = getSystemTiles(stats)
  const alerts = []
  if (t.cpuColor === 'red') alerts.push({ text: `CPU ${t.cpu}%`, level: 'red' })
  else if (t.cpuColor === 'yellow') alerts.push({ text: `CPU ${t.cpu}%`, level: 'yellow' })
  if (t.memColor === 'red') alerts.push({ text: `Mem ${t.mem} GB`, level: 'red' })
  else if (t.memColor === 'yellow') alerts.push({ text: `Mem ${t.mem} GB`, level: 'yellow' })
  if (t.diskColor === 'red') alerts.push({ text: `Disk ${t.diskFree} GB`, level: 'red' })
  else if (t.diskColor === 'yellow') alerts.push({ text: `Disk ${t.diskFree} GB`, level: 'yellow' })
  if (t.fpsColor === 'red') alerts.push({ text: `FPS ${t.fps}`, level: 'red' })
  else if (t.fpsColor === 'yellow') alerts.push({ text: `FPS ${t.fps}`, level: 'yellow' })
  if (t.renderLagColor === 'red') alerts.push({ text: `Render ${t.renderLag}%`, level: 'red' })
  else if (t.renderLagColor === 'yellow') alerts.push({ text: `Render ${t.renderLag}%`, level: 'yellow' })
  return alerts
}
