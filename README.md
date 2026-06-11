# OBS Overseer

A real-time stats monitor for OBS Studio, built as a Custom Browser Dock. Monitor your stream, recordings, branch outputs, audio, and encoder health at a glance — all from inside OBS.

---

## Install

### 1. Download
Grab the latest `index.html` from the [Releases](https://github.com/chrisgrimm-jm/OBS-Overseer/releases) page.

### 2. Add to OBS
1. In OBS, go to **Docks → Custom Browser Docks**
2. Give it a name (e.g. `Overseer`)
3. In the URL field, enter the path to the downloaded file with `file://` in front:

**Mac:**
```
file:///Users/yourname/Downloads/index.html
```

**Windows:**
```
file:///C:/Users/yourname/Downloads/index.html
```

> **Tip — Get the exact path on Mac:** Open Terminal, drag the `index.html` file into the Terminal window, and it will paste the full path. Add `file://` to the front of it.

> **Tip — Get the exact path on Windows:** Hold Shift and right-click the file, select **Copy as path**. Replace the backslashes `\` with forward slashes `/` and add `file://` to the front.

4. Click **Apply** and the dock will appear in OBS

### 3. Connect to OBS WebSocket
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
Expandable panel showing per-output stats for each active branch/ISO recording:
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
- No installation, no build step — just a single HTML file
