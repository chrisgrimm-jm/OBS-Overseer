# OBS Overseer

A real-time stats monitor for OBS Studio, built as a Custom Browser Dock. Monitor your stream, recordings, branch outputs, audio, and encoder health at a glance — all from inside OBS.

---

## Install

### 1. Add to OBS
1. In OBS, go to **Docks → Custom Browser Docks**
2. Give it a name (e.g. `Overseer`)
3. URL: `https://chrisgrimm-jm.github.io/OBS-Overseer/`
4. Click **Apply** and the dock will appear in OBS

Use the hosted URL, not a downloaded `file://` copy. OBS's browser locks down local files in ways that break the dock, and the hosted page updates itself on every release.

### 2. Connect to OBS WebSocket
OBS Overseer connects via OBS WebSocket (built into OBS Studio 28+).

1. In OBS go to **Tools → WebSocket Server Settings**
2. Make sure **Enable WebSocket Server** is checked
3. Note your port (default: `4455`) and password if set
4. In the Overseer dock, click **⚙ Settings** at the bottom
5. Enter your host (`localhost`), port, and password
6. Click **Save & Reconnect**

---

## What It Shows

### Main Stats Grid
| Stat | Description |
|---|---|
| Bitrate | Live stream output bitrate (kbps) |
| Dropped | Stream dropped frames % |
| OBS CPU | OBS process CPU usage (not system-wide) |
| OBS RAM | OBS process memory in GB (not system-wide) |
| Disk Free | Available disk space on recording drive |
| FPS | Active output framerate |
| Render Lag | Frames missed by the GPU renderer |
| Encode Lag | Frames actively being skipped by the encoder |

### Branch Outputs (ISO Recording)
Expandable panel for every [Branch Output](https://github.com/OPENSPHERE-Inc/branch-output) filter (idle ones too) and other ISO outputs:
- **Encoder** — the encoder that branch actually uses (NVENC/AMD/QSV/Apple VT/x264), read from the Branch Output filter
- **Encode Lag** — encoder skipped frames for this output
- **Live Bitrate** — actual kbps being written to disk
- **Congestion** — encoder queue pressure (early warning before frames drop)
- **Resolution, Written, Frames, Duration**

### Audio
Compact level meters for all audio input sources with mute indicators.

---

## Alerts
The red alert bar at the top fires automatically for:
- **ENCODER OVERLOAD** — frames actively being skipped (≥0.5% per poll)
- **HIGH CPU** — OBS CPU above 80% while outputs are recording
- **Dropped frames** — stream packet loss above threshold
- **Low disk space** — drive getting critically full
- **Congestion** — branch output encoder queue above 60%

---

## Requirements
- OBS Studio 28 or later (includes built-in WebSocket server)
- Nothing to install, just the dock URL
- Optional: a Groq API key for the ✦ Diagnose button. It is kept for the current OBS session only and never saved to disk.
