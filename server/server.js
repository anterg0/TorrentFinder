import express from 'express'
import cors from 'cors'
import RuTracker from './rutracker.js'
import OnlineFix from './onlinefix.js'
import Freetp from './freetp.js'

const app = express()

app.use(cors())
app.use(express.json())

const ruTrackerClient = new RuTracker()
const onlineFixClient = new OnlineFix()
const freetpClient = new Freetp()

/* =========================
   AUTH
========================= */

app.post('/api/auth', async (req, res) => {
  const { username, password } = req.body
  const service = req.query.service || 'ru' // Default to RuTracker

  try {
    let client, success, isLoggedIn

    if (service === 'ru') {
      // RuTracker
      if (await ruTrackerClient.isLoggedIn()) {
        return res.json({ success: true, cached: true, service: 'rutracker' })
      }
      success = await ruTrackerClient.login(username, password)
    } else if (service === 'of') {
      // Online-Fix
      if (await onlineFixClient.isLoggedIn()) {
        return res.json({ success: true, cached: true, service: 'onlinefix' })
      }
      success = await onlineFixClient.login(username, password)
    } else if (service === 'ft') {
      if (await freetpClient.isLoggedIn()) {
        return res.json({ success: true, cached: true, service: 'freetp' })
      }
      success = await freetpClient.login(username, password)
    } else {
      return res.status(400).json({ error: 'Unknown service' })
    }

    if (!success) {
      return res.status(401).json({ success: false })
    }

    res.json({ success: true, service })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

/* =========================
   🔍 SEARCH
========================= */

app.get('/api/search', async (req, res) => {
  const q = req.query.q

  try {
    const results = []

    // Check auth status
    const ruTrackerLoggedIn = await ruTrackerClient.isLoggedIn()
    const onlineFixLoggedIn = await onlineFixClient.isLoggedIn()
    const freetpLoggedIn = await freetpClient.isLoggedIn()

    console.log(`Auth status - RuTracker: ${ruTrackerLoggedIn}, Online-Fix: ${onlineFixLoggedIn}, Freetp: ${freetpLoggedIn}`)

    // Search RuTracker
    if (ruTrackerLoggedIn) {
      try {
        const ruTrackerResults = await ruTrackerClient.search(q)
        results.push(...ruTrackerResults)
        console.log(`✅ RuTracker: ${ruTrackerResults.length} results`)
      } catch (err) {
        console.log('⚠️ RuTracker search failed:', err.message)
      }
    } else {
      console.log('⚠️ RuTracker: Not logged in')
    }

    // Search Online-Fix
    if (onlineFixLoggedIn) {
      try {
        const onlineFixResults = await onlineFixClient.search(q)
        results.push(...onlineFixResults)
        console.log(`✅ Online-Fix: ${onlineFixResults.length} results`)
      } catch (err) {
        console.log('⚠️ Online-Fix search failed:', err.message)
      }
    } else {
      console.log('⚠️ Online-Fix: Not logged in')
    }

    // Search Freetp (no auth required)
    try {
      const freetpResults = await freetpClient.search(q)
      results.push(...freetpResults)
      console.log(`Freetp: ${freetpResults.length} results`)
    } catch (err) {
      console.log('Freetp search failed:', err.message)
    }

    if (results.length === 0) {
      return res.status(404).json({ error: 'No results found' })
    }

    res.json(results)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

/* =========================
   MAGNET
========================= */

app.get('/api/magnet/:id', async (req, res) => {
  const id = req.params.id

  try {
    let magnet

    if (id.startsWith('of-')) {
      // Online-Fix result
      const gameId = id.replace('of-', '')
      magnet = await onlineFixClient.getMagnetLink(gameId)
    } else if (id.startsWith('ft-')) {
      // Freetp uses direct download, no magnet
      return res.status(400).json({ error: 'Magnet links not available for Freetp' })
    } else {
      // RuTracker result
      const rtId = id.replace('rt-', '')
      magnet = await ruTrackerClient.getMagnetLink(rtId)
    }

    res.json({ magnet })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

/* =========================
   DOWNLOAD
========================= */

app.get('/api/download/:id', async (req, res) => {
  const id = req.params.id
  const gameName = req.query.gameName // For Online-Fix
  const gameUrl = req.query.gameUrl
  const type = req.query.type || 'torrent'   // 'torrent' or 'repair'

  try {
    if (id.startsWith('of-')) {
      if (!gameName) {
        return res.status(400).json({ error: 'gameName parameter required' })
      }

      if (type === 'repair') {
        const repair = await onlineFixClient.downloadRepair(gameName, gameUrl)
        const r = repair.response
        const ct = r.headers['content-type']
        if (ct) res.setHeader('Content-Type', ct)
        const cd = r.headers['content-disposition']
        if (cd) {
          res.setHeader('Content-Disposition', cd)
        } else {
          res.setHeader('Content-Type', 'application/x-rar-compressed')
          res.setHeader('Content-Disposition', `attachment; filename="${repair.filename}"`)
        }
        return res.send(r.data)
      } else {
        const result = await onlineFixClient.downloadTorrent(gameName, gameUrl)
        const r = result.response
        const ct = r.headers['content-type']
        if (ct) res.setHeader('Content-Type', ct)
        const cd = r.headers['content-disposition']
        if (cd) {
          res.setHeader('Content-Disposition', cd)
        } else {
          res.setHeader('Content-Type', 'application/x-bittorrent')
          res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`)
        }
        return res.send(r.data)
      }
    } else if (id.startsWith('ft-')) {
      if (!gameUrl) {
        return res.status(400).json({ error: 'gameUrl parameter required for Freetp' })
      }

      const response = type === 'repair'
        ? await freetpClient.downloadRepair(gameUrl)
        : await freetpClient.downloadTorrent(gameUrl)

      const ct = response.headers['content-type']
      if (ct) res.setHeader('Content-Type', ct)

      const cd = response.headers['content-disposition']
      if (cd) {
        res.setHeader('Content-Disposition', cd)
      } else {
        res.setHeader('Content-Disposition', type === 'repair'
          ? 'attachment; filename="freetp_repair.rar"'
          : `attachment; filename="freetp_${id}.torrent"`)
      }
      return res.send(response.data)
    } else {
      // RuTracker - download torrent file
      const rtId = id.replace('rt-', '')
      const r = await ruTrackerClient.downloadTorrent(rtId)

      const ct = r.headers['content-type']
      if (ct) res.setHeader('Content-Type', ct)
      const cd = r.headers['content-disposition']
      if (cd) {
        res.setHeader('Content-Disposition', cd)
      } else {
        res.setHeader('Content-Type', 'application/x-bittorrent')
        res.setHeader('Content-Disposition', `attachment; filename="torrent_${rtId}.torrent"`)
      }
      res.send(r.data)
    }
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

/* =========================
   DETAILS
========================= */

app.get('/api/details/:id', async (req, res) => {
  const id = req.params.id
  const url = req.query.url

  try {
    let details = {}

    if (id.startsWith('of-')) {
      if (!url) {
        return res.status(400).json({ 
          error: 'Missing url parameter. Online-Fix details require the full page URL.' 
        })
      }
      details = await onlineFixClient.getDetails(url)
    } else if (id.startsWith('ft-')) {
      if (!url) {
        return res.status(400).json({
          error: 'Missing url parameter. Freetp details require the full page URL.'
        })
      }
      const pageDetails = await freetpClient.getDetails(url)
      const fileIds = await freetpClient.getFileIds(url)
      details = {
        ...pageDetails,
        torrentId: fileIds.torrentId,
        fixId: fileIds.fixId,
        torrentAvailable: fileIds.torrentAvailable,
        fixAvailable: fileIds.fixAvailable
      }
    }

    res.json(details)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    authenticated: !!ruTrackerClient
  });
});

app.get('/api/auth-status', async (req, res) => {
  try {
    const rutracker = await ruTrackerClient.isLoggedIn()
    const onlinefix = await onlineFixClient.isLoggedIn()
    const freetp = await freetpClient.isLoggedIn()
    res.json({
      rutracker,
      onlinefix,
      freetp
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.post('/api/logout/:service', async (req, res) => {
  const { service } = req.params

  try {
    if (service === 'rutracker') {
      // Delete RuTracker cookies
      if (ruTrackerClient.cookieFile) {
        const fs = await import('fs')
        fs.unlinkSync(ruTrackerClient.cookieFile)
      }
      res.json({ success: true })
    } else if (service === 'onlinefix') {
      // Delete Online-Fix cookies
      if (onlineFixClient.cookieFile) {
        const fs = await import('fs')
        fs.unlinkSync(onlineFixClient.cookieFile)
      }
      res.json({ success: true })
    } else if (service === 'freetp') {
      if (freetpClient.cookieFile) {
        const fs = await import('fs')
        fs.unlinkSync(freetpClient.cookieFile)
      }
      res.json({ success: true })
    } else {
      res.status(400).json({ error: 'Unknown service' })
    }
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.listen(3001, "0.0.0.0", () => {
  console.log('🚀 Server running on http://localhost:3001')
})