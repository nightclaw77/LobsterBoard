# 🦞 LobsterBoard

A self-hosted, drag-and-drop dashboard builder with live system monitoring, dark theme, and 45 widgets. No cloud dependencies.

![LobsterBoard](lobsterboard-logo-final.png)

![LobsterBoard Dashboard Example](screenshot.jpg)

## Quick Start

### Option A: npm install

```bash
npm install lobsterboard
cd node_modules/lobsterboard
node server.cjs
```

### Option B: Clone & Run

```bash
git clone https://github.com/curbob/LobsterBoard.git
cd LobsterBoard
npm install
node server.cjs
```

Open **http://localhost:8080** → press **Ctrl+E** to enter edit mode → drag widgets from the sidebar → click **💾 Save**.

## How It Works

LobsterBoard runs as a single Node.js server (`server.cjs`) that:

- **Serves the dashboard** — a vanilla JS single-page app (no build step, no frameworks)
- **Saves/loads config** — `GET/POST /config` persists your layout to `config.json`
- **Streams live system stats** — CPU, memory, disk, network, and Docker container data via Server-Sent Events (`/api/stats/stream`) using [systeminformation](https://github.com/nicholasricci/systeminformation)
- **Proxies external feeds** — iCal calendars (`/api/calendar`), RSS feeds (`/api/rss`) fetched server-side to avoid CORS issues
- **Provides API endpoints** — todos, cron jobs, system logs, auth status, release checks, and today's activity summary

The server binds to `127.0.0.1:8080` by default. Configure with environment variables:

```bash
PORT=3000 node server.cjs              # Custom port
HOST=0.0.0.0 node server.cjs           # Expose to network (trusted networks only!)
```

## Edit Mode

Press **Ctrl+E** (or click **Edit Layout**) to toggle edit mode:

- **Drag widgets** from the sidebar onto the canvas
- **Click a widget** to select it and edit properties in the right panel
- **Drag to reposition**, resize with the corner handle
- **20px snap grid** keeps things aligned
- **Canvas sizes** — 1920×1080, 2560×1440, or custom
- **Font scale** — adjust text size globally across all widgets
- Click **💾 Save** to persist, then exit edit mode for the live dashboard

In view mode, the canvas auto-scales to fit your browser window and all widget scripts run live.

## Widgets (45)

### 🖥️ System Monitoring
Live data via SSE — updates every 2–30 seconds automatically.

| Widget | Description |
|--------|-------------|
| 💻 CPU / Memory | Real-time CPU load and memory usage |
| 💾 Disk Usage | Disk space with ring gauge (configurable mount point) |
| 🌐 Network Speed | Upload/download throughput |
| 📡 Uptime Monitor | System uptime, CPU load, and memory summary |
| 🐳 Docker Containers | Container list with running/stopped status |

### 🦞 OpenClaw Integration
For users running [OpenClaw](https://github.com/openclaw/openclaw).

| Widget | Description |
|--------|-------------|
| 🔐 Auth Status | Anthropic Max subscription vs. API key indicator |
| 🦞 OpenClaw Release | Auto-detects installed version, compares to latest GitHub release |
| 📋 Activity List | Today's activity from memory files, git commits, and cron runs |
| ⏰ Cron Jobs | Scheduled jobs with status and last-run times |
| 🔧 System Log | Parsed gateway log with level/category color coding |
| 💬 Active Sessions | Count of active OpenClaw sessions |
| 📊 Token Gauge | Visual gauge of token usage against a limit |

### 🤖 AI / LLM Monitoring

| Widget | Description |
|--------|-------------|
| 🟣 Claude Usage | Anthropic API token/cost tracking |
| 🟢 GPT Usage | OpenAI API token/cost tracking |
| 🔵 Gemini Usage | Google API token/cost tracking |
| 🤖 AI Usage (All) | Combined multi-provider view |
| 💰 AI Cost Tracker | Total AI spending across providers |

### ⏰ Time & Productivity

| Widget | Description |
|--------|-------------|
| 🕐 Clock | Digital clock (12h/24h) |
| 🌍 World Clock | Multiple time zones side by side |
| ⏳ Countdown | Days (and optionally hours/minutes) to a target date |
| 🎯 Pomodoro Timer | Focus timer with work/break intervals and audio alerts |
| ✅ Todo List | Persistent task list with checkboxes (saved to `todos.json`) |
| 📅 Calendar | Upcoming events from any iCal (.ics) feed URL |
| 📝 Notes | Editable text area on the dashboard |

### 🌤️ Weather

| Widget | Description |
|--------|-------------|
| 🌡️ Local Weather | Current conditions via wttr.in (no API key needed) |
| 🌍 World Weather | Multiple cities side by side |

### 💰 Finance

| Widget | Description |
|--------|-------------|
| 📈 Stock Ticker | Stock prices (requires Finnhub API key) |
| ₿ Crypto Price | Cryptocurrency prices from CoinGecko (free) |

### 🏠 Smart Home

| Widget | Description |
|--------|-------------|
| 🏠 Indoor Climate | Temperature/humidity from sensor API |
| 📷 Camera Feed | Live MJPEG camera stream |
| 🔌 Power Usage | Real-time power consumption |

### 📰 Media & Content

| Widget | Description |
|--------|-------------|
| 📰 RSS Ticker | Headlines from any RSS/Atom feed (server-side proxy) |
| 🎵 Now Playing | Currently playing track from Spotify/music API |
| 💭 Quote of Day | Random inspirational quotes |
| 📧 Unread Emails | Email count from API endpoint |

### 🔗 Embeds & Media

| Widget | Description |
|--------|-------------|
| 🖼️ Image | Local/embedded image (base64 for portability) |
| 🎲 Random Image | Rotates through multiple images on a timer |
| 🌐 Image Embed | Display an image from a URL |
| 🔗 Quick Links | Bookmark grid with favicons |
| 📺 Iframe Embed | Embed any web page |

### 📦 Utilities

| Widget | Description |
|--------|-------------|
| 📦 Release Tracker | Compare local version to latest GitHub release for any repo |
| 🔄 API Status | Health check indicators for multiple endpoints |
| 🐙 GitHub Stats | Public repo/follower/star counts for any user |
| 😴 Sleep Score | Sleep data ring gauge (health API integration) |

### 🎨 Layout

| Widget | Description |
|--------|-------------|
| 🔤 Header / Text | Custom text with configurable font size, color, weight, and alignment |
| ➖ Horizontal Line | Divider line (adjustable color and thickness) |
| │ Vertical Line | Vertical divider |

## Configuration

Widget properties are edited in the right-hand panel when a widget is selected in edit mode. Common options:

- **Title** — display name and header visibility toggle
- **Refresh Interval** — how often the widget polls for data (seconds)
- **Endpoint** — API URL for data-driven widgets
- **Location** — city name for weather widgets
- **iCal URL** — feed URL for the calendar widget (Google Calendar, Outlook, Apple Calendar all supported)
- **Feed URL** — RSS/Atom feed for the ticker widget

All configuration is saved to `config.json` in the project root.

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/config` | GET/POST | Load/save dashboard layout |
| `/api/stats` | GET | Current system stats (JSON snapshot) |
| `/api/stats/stream` | GET | Live system stats (SSE, max 10 connections) |
| `/api/todos` | GET/POST | Read/write todo list |
| `/api/calendar?url=&max=` | GET | Proxy + parse iCal feed |
| `/api/rss?url=` | GET | Proxy RSS/Atom feed |
| `/api/cron` | GET | OpenClaw cron job status |
| `/api/logs` | GET | Last 50 gateway log lines |
| `/api/system-log` | GET | Structured log entries with levels |
| `/api/auth` | GET | OpenClaw auth profile info |
| `/api/releases` | GET | OpenClaw version check (cached 1hr) |
| `/api/today` | GET | Today's activity summary |
| `/api/activity` | GET | Recent entries from memory file |

## File Structure

```
dashboard-builder/
├── server.cjs          # Node.js server (CommonJS)
├── index.html          # Single-page app
├── config.json         # Saved dashboard layout
├── todos.json          # Todo list data
├── js/
│   ├── builder.js      # Canvas, drag-drop, edit mode, zoom, config I/O
│   └── widgets.js      # All 45 widget definitions + SSE helpers
├── css/
│   └── builder.css     # Dark theme (CSS custom properties)
└── package.json        # npm package config
```

## npm Package

LobsterBoard is published as `lobsterboard` on npm. The package exports:

```js
// ESM
import { WIDGETS } from 'lobsterboard/widgets';
import { state } from 'lobsterboard/builder';

// UMD (browser)
<script src="https://unpkg.com/lobsterboard"></script>
```

Requires Node.js ≥ 16.

## License

MIT

---

Made with 🦞 by [curbob](https://github.com/curbob)
