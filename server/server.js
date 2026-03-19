import express from 'express'
import cors from 'cors'
import RuTracker from './rutracker.js'

const app = express()

app.use(cors())
app.use(express.json())

const client = new RuTracker()

/* =========================
   AUTH
========================= */

app.post('/api/auth', async (req, res) => {
  const { username, password } = req.body

  try {
    if (await client.isLoggedIn()) {
      return res.json({ success: true, cached: true })
    }

    const success = await client.login(username, password)

    if (!success) {
      return res.status(401).json({ success: false })
    }

    res.json({ success: true })
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
    if (!(await client.isLoggedIn())) {
      return res.status(401).json({ error: 'Not authenticated' })
    }

    const results = await client.search(q)
    res.json(results)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

/* =========================
   MAGNET
========================= */

app.get('/api/magnet/:id', async (req, res) => {
  const id = req.params.id.replace('rt-', '')

  try {
    const magnet = await client.getMagnetLink(id)
    res.json({ magnet })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

/* =========================
   DOWNLOAD
========================= */

app.get('/api/download/:id', async (req, res) => {
  const id = req.params.id.replace('rt-', '')

  try {
    const file = await client.downloadTorrent(id)

    res.setHeader('Content-Type', 'application/x-bittorrent')
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="torrent_${id}.torrent"`
    )

    res.send(file)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    authenticated: !!client
  });
});

/* ========================= */

app.listen(3001, () => {
  console.log('🚀 Server running on http://localhost:3001')
})