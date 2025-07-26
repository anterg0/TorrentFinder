import express from 'express';
import cors from 'cors';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { URL } from 'url';

const app = express();
const PORT = process.env.PORT || 3001;

// More permissive CORS setup
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// User agent to avoid being blocked
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// Function to search DuckDuckGo for RuTracker results
async function searchDuckDuckGo(query) {
  const dorkQuery = `intitle:"${query}" site:rutracker.org`;
  const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(dorkQuery)}`;

  console.log(`🔍 Searching DuckDuckGo: ${searchUrl}`);
  const res = await axios.get(searchUrl, {
    headers: {
      'User-Agent': USER_AGENT,
      'Accept': 'text/html,*/*;q=0.9',
    },
    timeout: 15000
  });
  const $ = cheerio.load(res.data);
  const results = [];

  // Основные контейнеры результатов
  const containers = ['.result__body', '.web-result', '.result'];
  for (const sel of containers) {
    $(sel).each((_, el) => {
      const anchor = $(el).find('a.result__a, a.result__title, h2 a').first();
      let href = anchor.attr('href') || '';
      const title = anchor.text().trim();
      if (!href || !title) return;

      // Преобразуем DuckDuckGo‑ссылки
      if (href.startsWith('/l/?uddg=')) {
        try {
          const params = new URLSearchParams(href.slice(2)); // убираем ведущие "/"
          const real = params.get('uddg');
          if (real) href = decodeURIComponent(real);
        } catch {}
      }
      // Добавляем протокол, если URL вида "//…"
      else if (href.startsWith('//')) {
        href = 'https:' + href;
      }

      if (href.includes('rutracker.org')) {
        results.push({
          title,
          url: href,
          snippet: $(el).find('.result__snippet, .result-snippet').text().trim()
        });
      }
    });
    if (results.length) break;
  }

  console.log(`✅ Found ${results.length} results`);
  return results.slice(0, 6);
}

function extractRealRuTrackerUrl(url) {
  try {
    const parsed = new URL(url);
    if (
      parsed.hostname === 'duckduckgo.com' &&
      parsed.pathname.startsWith('/l/') &&
      parsed.searchParams.has('uddg')
    ) {
      return decodeURIComponent(parsed.searchParams.get('uddg'));
    }
  } catch {}
  return url;
}

// Function to scrape individual RuTracker page
async function scrapeRuTrackerPage(url) {
  url = extractRealRuTrackerUrl(url);
  console.log(`🔍 Scraping RuTracker page: ${url}`);

  const res = await axios.get(url, {
    headers: {
      'User-Agent': USER_AGENT,
      'Referer': 'https://html.duckduckgo.com/',
    },
    timeout: 25000
  });
  const $ = cheerio.load(res.data);
  const data = { 
    magnetLink: null, 
    size: null, 
    date: null, 
    author: null, 
    title: null 
  };

  // Magnet link and size
  const attach = $('fieldset.attach');
  if (attach.length) {
    data.magnetLink = attach.find('a.magnet-link').attr('href') || null;
    const attachText = attach.text();
    const sizeMatch = attachText.match(/\d+(\.\d+)?\s*(GB|MB|KB|TB)/i);
    if (sizeMatch) {
      data.size = sizeMatch[0];
    }
  }

  // Title
  data.title = $('#topic-title').text().trim() || null;

  // Author
  data.author = $('td.poster_info.td1.hide-for-print > p.nick.nick-author').first().text().trim() || null;

  // Date
  data.date = $('td.message.td2 > div.post_head > p > span.hl-scrolled-to-wrap > a').first().text().trim() || null;

  return data;
}


// Function to search Bing for RuTracker results
async function searchBingRuTracker(query) {
  const dorkQuery = `intitle:"${query}" site:rutracker.org`;
  const searchUrl = `https://www.bing.com/search?q=${encodeURIComponent(dorkQuery)}`;

  console.log(`🔍 Searching Bing: ${searchUrl}`);
  const res = await axios.get(searchUrl, {
    headers: {
      'User-Agent': USER_AGENT,
      'Accept': 'text/html,*/*;q=0.9',
    },
    timeout: 15000
  });
  const $ = cheerio.load(res.data);
  const results = [];

  $('.b_algo').each((_, el) => {
    const anchor = $(el).find('h2 a').first();
    const href = anchor.attr('href');
    const title = anchor.text().trim();
    if (!href || !title) return;
    if (href.includes('rutracker.org')) {
      results.push({
        title,
        url: href,
        snippet: $(el).find('.b_caption p').text().trim()
      });
    }
  });

  console.log(`✅ Bing found ${results.length} results`);
  return results.slice(0, 6);
}

// API endpoint for searching torrents
app.get('/api/search', async (req, res) => {
  const { q: query } = req.query;

  if (!query || query.trim().length === 0) {
    return res.status(400).json({ error: 'Query parameter is required' });
  }

  try {
    console.log(`🚀 Starting search for: "${query}"`);
    
    // Step 1: Search DuckDuckGo for RuTracker results
    let searchResults = await searchDuckDuckGo(query);

    if (searchResults.length === 0) {
      console.log('❌ No results from DuckDuckGo. Falling back to Bing...');
      searchResults = await searchBingRuTracker(query);
    }

    if (searchResults.length === 0) {
      console.log('❌ No search results found');
      return res.json([]);
    }

    // Step 2: Scrape detailed information from each result
    const torrents = [];
    let processedCount = 0;

    for (const result of searchResults) {
      try {
        console.log(`⏳ Processing result ${processedCount + 1}/${searchResults.length}: ${result.title}`);
        const torrentData = await scrapeRuTrackerPage(result.url);
        
        if (torrentData) {
          torrents.push({
            id: `rt-${Date.now()}-${processedCount}`,
            name: torrentData.title || result.title,
            size: torrentData.size || 'Unknown',
            uploadDate: torrentData.date || 'Unknown',
            author: torrentData.author || 'Unknown',
            tracker: 'RuTracker',
            magnetLink: torrentData.magnetLink,
            url: result.url
          });
          console.log(`✅ Successfully processed: ${result.title}`);
        } else {
          console.log(`❌ Failed to scrape: ${result.title}`);
        }
        
        processedCount++;
        
        // Add delay to avoid rate limiting
        await new Promise(r => setTimeout(r, 1000));

        // Limit processing to avoid timeouts
        if (processedCount >= 4) break;
        
      } catch (error) {
        console.error(`❌ Error processing result: ${result.title}`, error.message);
        continue;
      }
    }

    console.log(`🎉 Successfully processed ${torrents.length} torrents`);
    res.json(torrents);

  } catch (error) {
    console.error('❌ Search API error:', error);
    res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message 
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'Server is working!', 
    timestamp: new Date().toISOString() 
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Torrent Search API Server',
    endpoints: {
      search: '/api/search?q=YOUR_QUERY',
      health: '/api/health',
      test: '/api/test'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message 
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Torrent scraping server running on http://localhost:${PORT}`);
  console.log(`📡 API endpoint: http://localhost:${PORT}/api/search?q=YOUR_QUERY`);
  console.log(`🔍 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🧪 Test endpoint: http://localhost:${PORT}/api/test`);
});