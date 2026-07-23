![logo](public/images/logo.png)

# TorrentFinder

A self-hosted torrent search app that searches across multiple trackers from one place. Supports RuTracker, Online-Fix, and FreeTP with built-in authentication, magnet links, torrent downloads, and fix/repair file downloads.  

### Disclaimer

This started as an experimental project to test Figma's AI to build websites, which turned into a real app afterwards.  
UI might be janky (especially the search bar animation) since AI agents were used in development of this app.

## Getting Started

### Prerequisites

You need [Node.js](https://nodejs.org/) (v18 or newer) installed on your machine. Download it from the official site - the LTS version is recommended.

Verify it's installed:

```bash
node -v
```

### Setup

You can either run **start.bat** to install dependencies and launch the app or do it manually.

Clone the repo and install dependencies:

```bash
git clone https://github.com/anterg0/TorrentFinder.git
cd TorrentFinder
npm install
```

Run the app with this command:

```bash
npm start
```

This runs:
- **Frontend** (Vite + React) at http://localhost:3000
- **Backend** (Express) at http://localhost:3001


## Features

- **Multi-tracker search** - Search RuTracker, Online-Fix, and FreeTP simultaneously from a single search bar
- **Built-in authentication** - Log into each tracker directly from the app (RuTracker supports CAPTCHA)
- **Download options** - Download .torrent files, magnet links, fix repairs, or open the source page
- **Detailed result pages** - Rich game info pages with videos, descriptions, launch guides, and player counts (Online-Fix / FreeTP)
- **Filtering and sorting** - Filter by tracker, tags, and author. Sort by name, size, date, or seeders
- **Latest updates** - Browse recent uploads from Online-Fix and FreeTP
- **Dark theme** - Clean dark UI with smooth animations
- **Settings sidebar** - Manage your tracker logins in one place

## Supported Trackers

| Tracker | Auth Required | Notes |
|---------|--------------|-------|
| RuTracker | Yes (with CAPTCHA) | Full torrent + magnet support |
| Online-Fix | Yes | Torrent and fix repair downloads |
| FreeTP | No | Torrent and fix repair downloads |

## Usage Tips

- Log into at least one tracker before searching. Use the settings gear icon in the top-right corner.
- RuTracker searches will remind you to log in if you haven't yet.
- Online-Fix and FreeTP results include extra details like release date, player counts, and launch guides.
- Fix repair files are separate downloads from the main .torrent file.

## Project Structure

```
├── server/
│   ├── server.js           # Express API server
│   ├── rutracker.js        # RuTracker scraper + auth
│   ├── onlinefix.js        # Online-Fix scraper + auth
│   └── freetp.js           # FreeTP scraper + auth
├── components/
│   ├── TorrentSearch.tsx   # Main search UI + results
│   ├── TorrentResultCard.tsx # Individual result card
│   ├── FilterPanel.tsx     # Filter dropdown
│   ├── LatestUpdates.tsx   # Recent uploads browser
│   ├── SettingsSidebar.tsx # Auth management sidebar
│   └── ui/                 # Shared UI components
├── utils/
│   └── torrentUtils.ts     # Tag parsing + result types
├── App.tsx                 # Root component
└── src/main.tsx            # Entry point
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/search?q=...&trackers=...` | GET | Search across trackers |
| `/api/auth` | POST | Login to a tracker |
| `/api/auth-status` | GET | Check login status |
| `/api/logout/:service` | POST | Logout from a tracker |
| `/api/magnet/:id` | GET | Get magnet link |
| `/api/download/:id` | GET | Download .torrent or fix |
| `/api/details/:id` | GET | Get full result details |
| `/api/latest/:tracker` | GET | Get latest uploads |
| `/api/proxy-image?url=...` | GET | Proxy external images |
| `/api/health` | GET | Server health check |

## Tech Stack

**Frontend:** React 18, TypeScript, Vite, Tailwind CSS v4, Motion, shadcn/ui, Lucide icons

**Backend:** Express.js, Cheerio (HTML parsing), tough-cookie (session management), Axios

## Legal

This project is for educational purposes only. You are responsible for complying with applicable laws and the terms of service of any sites you interact with.
