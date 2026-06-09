const ENCODER_MAP = {
  'jim_nvenc':                                      { label: 'NVENC H.264',   hw: true,  brand: 'NVIDIA GPU' },
  'jim_hevc_nvenc':                                 { label: 'NVENC HEVC',    hw: true,  brand: 'NVIDIA GPU' },
  'jim_av1_nvenc':                                  { label: 'NVENC AV1',     hw: true,  brand: 'NVIDIA GPU' },
  'com.apple.videotoolbox.videoencoder.ave.avc':    { label: 'Apple VT H.264',hw: true,  brand: 'Apple Silicon' },
  'com.apple.videotoolbox.videoencoder.ave.hevc':   { label: 'Apple VT HEVC', hw: true,  brand: 'Apple Silicon' },
  'h264_texture_amf':                               { label: 'AMD H.264',     hw: true,  brand: 'AMD GPU' },
  'hevc_texture_amf':                               { label: 'AMD HEVC',      hw: true,  brand: 'AMD GPU' },
  'av1_texture_amf':                                { label: 'AMD AV1',       hw: true,  brand: 'AMD GPU' },
  'obs_qsv11':                                      { label: 'QSV H.264',     hw: true,  brand: 'Intel iGPU' },
  'obs_qsv11_av1':                                  { label: 'QSV AV1',       hw: true,  brand: 'Intel iGPU' },
  'obs_x264':                                       { label: 'x264',          hw: false, brand: 'CPU' },
  'ffmpeg_svt_av1':                                 { label: 'SVT-AV1',       hw: false, brand: 'CPU' },
  'obs_ffmpeg_openh264':                            { label: 'OpenH264',      hw: false, brand: 'CPU' },
}

export function resolveEncoder(id) {
  if (!id) return null
  const info = ENCODER_MAP[id] || { label: id, hw: false, brand: 'CPU' }
  return info
}

export function encoderLabel(id) {
  return resolveEncoder(id)?.label || id || null
}
