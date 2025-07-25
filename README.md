# TorrentFinder

A minimalistic torrent search engine that scrapes RuTracker.org in real-time using DuckDuckGo search with a dark theme and smooth animations.

## 🚀 Getting Started

### Prerequisites

- Node.js (version 16 or higher)
- npm or yarn package manager

### Installation & Setup

1. **Clone or download the project files**

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start both frontend and backend**
   ```bash
   npm run dev
   ```
   This will start:
   - Frontend (React app) on http://localhost:3000
   - Backend (Express server) on http://localhost:3001

4. **Alternative: Start servers separately**
   
   Frontend only:
   ```bash
   npm run dev:frontend
   ```
   
   Backend only:
   ```bash
   npm run dev:backend
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000` to use the application

### 🔧 Troubleshooting

#### "Network Error" or "Backend server is not running"

1. **Check if backend is running:**
   ```bash
   npm run test:backend
   ```

2. **Start backend manually:**
   ```bash
   npm run dev:backend
   ```

3. **Check server logs** - Look for errors in the terminal

4. **Verify ports are free:**
   - Frontend: http://localhost:3000
   - Backend: http://localhost:3001

#### "Hello, World!" instead of search interface

1. **Clear browser cache** (Ctrl+Shift+R or Cmd+Shift+R)
2. **Stop and restart servers:**
   ```bash
   # Stop with Ctrl+C, then:
   npm run dev
   ```

#### Search takes too long or times out

- This is normal for web scraping (can take 30-45 seconds)
- RuTracker may be rate-limiting requests
- Try different search terms or wait a few minutes

## 🛠️ Available Scripts

- `npm run dev` - Start both frontend and backend concurrently
- `npm run dev:frontend` - Start only the React frontend (port 3000)
- `npm run dev:backend` - Start only the Express backend (port 3001) 
- `npm run server` - Alternative command to start backend
- `npm run build` - Build frontend for production
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint

## 🧩 Project Structure

```
├── server/
│   └── server.js           # Express backend with web scraping
├── src/
│   └── main.tsx           # React entry point
├── components/            # React components
│   ├── TorrentSearch.tsx  # Main search component with real API calls
│   ├── TorrentResultCard.tsx # Result card with magnet/download links
│   └── ui/               # UI components (buttons, inputs, etc.)
├── data/
│   └── mockTorrents.ts   # Data types and placeholder content
├── styles/
│   └── globals.css       # Global styles with Tailwind
└── App.tsx               # Main app component
```

## 🔍 How It Works

### Backend Scraping Process

1. **DuckDuckGo Search**: Uses the dork query `intitle:"${query}" site:rutracker.org` to find relevant RuTracker pages
2. **Page Scraping**: Extracts detailed information from each RuTracker page:
   - Magnet links
   - File sizes
   - Upload dates
   - Seeders/leechers count
   - Categories
3. **API Response**: Returns structured data to the frontend

### Frontend Features

- ✨ Smooth animations with Motion (Framer Motion)
- 🌙 Dark theme with grayish color scheme
- 🔍 Real-time search with debouncing
- 📱 Responsive design
- 🎯 Fixed-size results container with faded scroll
- 🔄 Animated search field positioning
- 📊 Multiple sorting options
- 🧲 Working magnet links and RuTracker page links

## ⚠️ Important Notes

### Legal Disclaimer
This tool is for educational purposes only. Users are responsible for complying with their local laws and the terms of service of the websites being accessed.

### Rate Limiting
The backend includes delays between requests to avoid overwhelming the target websites. Search results may take 10-30 seconds depending on the number of results found.

### Error Handling
- If the backend server isn't running, you'll see an error message
- Network timeouts are handled gracefully
- Invalid search queries show appropriate error messages

## 🔧 Technology Stack

**Frontend:**
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS v4** - Styling
- **Motion** - Animations
- **Lucide React** - Icons
- **Axios** - HTTP client

**Backend:**
- **Express.js** - Web server
- **Cheerio** - HTML parsing/scraping
- **Axios** - HTTP requests
- **CORS** - Cross-origin resource sharing

## 🚀 Production Deployment

### Frontend
1. Build the frontend:
   ```bash
   npm run build
   ```
2. Deploy the `dist` folder to any static hosting service (Vercel, Netlify, etc.)

### Backend
1. Deploy the Express server to a platform like:
   - Heroku
   - Railway
   - DigitalOcean
   - AWS EC2

2. Update the frontend API URL in `components/TorrentSearch.tsx`:
   ```javascript
   const response = await axios.get(`https://your-backend-url.com/api/search`, {
   ```

## 🔧 Configuration

### Backend Port
Change the backend port in `server/server.js`:
```javascript
const PORT = process.env.PORT || 3001;
```

### API Timeout
Adjust search timeout in `components/TorrentSearch.tsx`:
```javascript
timeout: 30000 // 30 seconds
```

### Rate Limiting
Modify delays in `server/server.js`:
```javascript
await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
```

## 🐛 Troubleshooting

**"Backend server is not running" error:**
- Make sure you've run `npm run dev` or `npm run dev:backend`
- Check that port 3001 is not being used by another application

**Slow search results:**
- This is normal due to web scraping delays
- Results typically take 10-30 seconds

**No results found:**
- Try different search terms
- RuTracker may be blocking requests (try again later)
- Check your internet connection

## 📝 License

This project is for educational/demonstration purposes only.