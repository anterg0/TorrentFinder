import axios from 'axios'
import * as cheerio from 'cheerio'
import fs from 'fs'
import { TextDecoder } from 'util'

import { CookieJar } from 'tough-cookie'
import { wrapper } from 'axios-cookiejar-support'

export default class OnlineFix {
  constructor() {
    this.baseURL = 'https://online-fix.me/'
    this.cookieFile = './cookiesOnlineFix.json'

    this.jar = new CookieJar()

    this.client = wrapper(axios.create({
      baseURL: this.baseURL,
      jar: this.jar,
      withCredentials: true,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Charset': 'utf-8'
      },
      responseType: 'arraybuffer'
    }))

    this.loadCookies()
  }

  /* =========================
     DECODING (FIXED)
  ========================= */

  /**
   * Decode response using the charset from Content-Type header
   */
  decodeResponse(data, contentType = '') {
    if (!Buffer.isBuffer(data)) {
      return typeof data === 'string' ? data : String(data)
    }

    // Extract charset from header (e.g. "text/html; charset=windows-1251")
    let charset = 'utf-8'
    if (contentType) {
      const match = contentType.match(/charset=([\w-]+)/i)
      if (match) {
        charset = match[1].toLowerCase()
      }
    }

    console.log(`[Decoding] Using charset: ${charset}`)

    try {
      const decoder = new TextDecoder(charset, { fatal: false })
      return decoder.decode(data)
    } catch (err) {
      console.warn(`Failed to decode with ${charset}, falling back to utf-8`)
      return new TextDecoder('utf-8', { fatal: false }).decode(data)
    }
  }

  debugLogEncoding(label, data, contentType = '') {
    console.log(`\n=== DEBUG: ${label} ===`)
    if (Buffer.isBuffer(data)) {
      console.log(`Buffer size: ${data.length} bytes`)
      console.log(`First 100 bytes (hex): ${data.slice(0, 100).toString('hex')}`)

      const decoded = this.decodeResponse(data, contentType)
      console.log(`Decoded string (first 300 chars): ${decoded.substring(0, 300)}`)
      return decoded
    } else if (typeof data === 'string') {
      console.log(`String length: ${data.length} characters`)
      console.log(`First 300 chars: ${data.substring(0, 300)}`)
      return data
    }
  }

  extractSections($article) {
    const result = { gameInfo: null, launchGuide: null, inGameGuide: null }

    // Get raw HTML of the article body
    const html = $article.html() || ''

    // Split by known bold headers
    const parts = html.split(/<b>Как запускать:<\/b>|<b>В игре:<\/b>|<b>Информация о игре:<\/b>/i)

    if (parts.length >= 2) {
      // Game Info
      if (parts[1]) {
        result.gameInfo = this.cleanText(parts[1].split(/<b>Как запускать:<\/b>/i)[0])
      }
    }

    // Launch Guide
    const launchMatch = html.match(/<b>Как запускать:<\/b>([\s\S]*?)(?=<b>В игре:<\/b>|$)/i)
    if (launchMatch) {
      result.launchGuide = this.cleanText(launchMatch[1])
    }

    // In Game
    const inGameMatch = html.match(/<b>В игре:<\/b>([\s\S]*?)(?=<b>Информация о сетевых|$)/i)
    if (inGameMatch) {
      result.inGameGuide = this.cleanText(inGameMatch[1])
    }

    return result
  }

  cleanText(html) {
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/?[^>]+(>|$)/g, '')           // remove tags
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  }

  /* =========================
     COOKIE HANDLING
  ========================= */

  saveCookies() {
    try {
      const serialized = this.jar.serializeSync()
      fs.writeFileSync(this.cookieFile, JSON.stringify(serialized, null, 2))
    } catch (err) {
      console.error('Failed to save cookies:', err.message)
    }
  }

  loadCookies() {
    if (fs.existsSync(this.cookieFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(this.cookieFile, 'utf-8'))
        this.jar = CookieJar.deserializeSync(data)

        this.client = wrapper(axios.create({
          baseURL: this.baseURL,
          jar: this.jar,
          withCredentials: true,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
          },
          responseType: 'arraybuffer'
        }))
      } catch (err) {
        console.error('Failed to load Online-Fix cookies:', err.message)
      }
    }
  }

  async isLoggedIn() {
    try {
      if (fs.existsSync(this.cookieFile)) {
        const data = JSON.parse(fs.readFileSync(this.cookieFile, 'utf-8'))
        const hasDleUserId = data.cookies?.some(c => c.key === 'dle_user_id')
        const hasDlePassword = data.cookies?.some(c => c.key === 'dle_password')
        return !!(hasDleUserId && hasDlePassword)
      }
      return false
    } catch (err) {
      console.error('Error checking login status:', err.message)
      return false
    }
  }

  /* =========================
     LOGIN
  ========================= */

  async extractCSRFToken() {
    try {
      const homeRes = await this.client.get('', {
        headers: { 'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' }
      })

      const homeHtml = this.decodeResponse(homeRes.data, homeRes.headers['content-type'])

      const res = await this.client.get('engine/ajax/authtoken.php', {
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
          'Accept': 'application/json, text/javascript, */*; q=0.01',
          'Referer': 'https://online-fix.me/'
        }
      })

      const tokenData = this.decodeResponse(res.data, res.headers['content-type'])

      let tokenName = null
      let tokenValue = null

      try {
        const parsed = JSON.parse(tokenData)
        if (parsed.field && parsed.value) {
          tokenName = parsed.field
          tokenValue = parsed.value
        }
      } catch { }

      if (!tokenName) {
        const match = tokenData.match(/token_([a-f0-9]+)/)
        if (match) tokenName = match[0]
      }

      return tokenName && tokenValue ? { tokenName, tokenValue } : null
    } catch (err) {
      console.error('Failed to extract CSRF token:', err.message)
      return null
    }
  }

  async login(username, password) {
    try {
      const tokenData = await this.extractCSRFToken()
      if (!tokenData) return false

      const params = new URLSearchParams()
      params.append('login_name', username)
      params.append('login_password', password)
      params.append('login', 'submit')
      params.append(tokenData.tokenName, tokenData.tokenValue)

      const res = await this.client.post('/', params)
      const html = this.decodeResponse(res.data, res.headers['content-type'])

      const success = html.includes('logout') || html.includes('Выход')
      if (success) this.saveCookies()

      return success
    } catch (err) {
      console.error('Login error:', err.message)
      return false
    }
  }

  /* =========================
     SEARCH (FIXED)
  ========================= */

  async search(query) {
    try {
      const params = new URLSearchParams()
      params.append('query', query)

      const res = await this.client.post('engine/ajax/search.php', params, {
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
        }
      })

      // === CRITICAL FIX ===
      const contentType = res.headers['content-type'] || ''
      this.debugLogEncoding('Raw Search Response', res.data, contentType)

      const html = this.decodeResponse(res.data, contentType)

      const $ = cheerio.load(html, { decodeEntities: false })
      const results = []

      $('a span.searchheading').each((_, el) => {
        const title = $(el).text().trim()
        const link = $(el).closest('a').attr('href')

        if (!title || !link) return

        const idMatch = link.match(/\/(\d+)-(.+?)\.html/)
        const id = idMatch ? idMatch[1] : null
        if (!id) return

        const gameName = title.replace(/\s+по\s+сети$/i, '')
          .replace(/\s+по\s+сету$/i, '')
          .trim()

        results.push({
          id: `of-${id}`,
          name: title,
          size: 'N/A',
          uploadDate: 'N/A',
          author: 'Online-Fix',
          tracker: 'Online-Fix',
          seeds: 'N/A',
          leeches: 'N/A',
          url: link,
          gameName: gameName
        })
      })

      console.log(`✅ Online-Fix: ${results.length} results`)
      return results
    } catch (err) {
      console.error('Search error:', err.message)
      throw err
    }
  }

  /* =========================
     MAGNET / DOWNLOAD
  ========================= */

  async getMagnetLink(topicId) {
    try {
      const res = await this.client.get(`?do=search&story=${encodeURIComponent(topicId)}`)
      const html = this.decodeResponse(res.data, res.headers['content-type'])

      const magnetMatch = html.match(/magnet:\?xt=urn:btih:[^"'\s]+/)
      if (magnetMatch) return magnetMatch[0]

      const $ = cheerio.load(html, { decodeEntities: false })
      const magnet = $('a[href^="magnet:"]').attr('href')
      return magnet || `https://online-fix.me/?do=search&story=${encodeURIComponent(topicId)}`
    } catch (err) {
      console.error('Error getting magnet link:', err.message)
      return `https://online-fix.me/?do=search&story=${encodeURIComponent(topicId)}`
    }
  }

  async downloadTorrent(gameFolder, gamePageUrl = null) {
    try {
      // 1. Warm up the session on the real game page (this sets online_fix_auth)
      if (gamePageUrl) {
        await this.client.get(gamePageUrl, {
          headers: { 'Referer': 'https://online-fix.me/' }
        })
      } else {
        // Fallback (not ideal)
        await this.client.get(`https://online-fix.me/`, {
          headers: { 'Referer': 'https://online-fix.me/' }
        })
      }

      // 2. Get the torrent directory listing
      const dirUrl = `https://uploads.online-fix.me:2053/torrents/${encodeURIComponent(gameFolder)}/`
      const dirRes = await this.client.get(dirUrl, {
        headers: { 'Referer': gamePageUrl || 'https://online-fix.me/' }
      })

      const dirHtml = this.decodeResponse(dirRes.data, dirRes.headers['content-type'])
      const $ = cheerio.load(dirHtml)

      // 3. Find the .torrent file (there's only one)
      let torrentFilename = null
      $('a').each((_, el) => {
        const href = $(el).attr('href') || ''
        if (href.endsWith('.torrent')) {
          torrentFilename = href
          return false
        }
      })

      if (!torrentFilename) {
        torrentFilename = `${gameFolder}.torrent` // fallback
      }

      // 4. Download the actual .torrent file
      const torrentUrl = `https://uploads.online-fix.me:2053/torrents/${encodeURIComponent(gameFolder)}/${encodeURIComponent(torrentFilename)}`

      const torrentRes = await this.client.get(torrentUrl, {
        responseType: 'arraybuffer',
        headers: { 'Referer': dirUrl }
      })

      console.log(`✅ Online-Fix: Downloaded ${torrentFilename} for ${gameFolder}`)
      return torrentRes.data

    } catch (err) {
      console.error('Online-Fix torrent download error:', err.message)
      throw err
    }
  }

  async downloadRepair(gameFolder, gamePageUrl = null) {
    try {
      // 1. Warm up session
      if (gamePageUrl) {
        await this.client.get(gamePageUrl, {
          headers: { 'Referer': 'https://online-fix.me/' }
        })
      }

      // 2. List the Fix Repair folder
      const repairDirUrl = `https://uploads.online-fix.me:2053/uploads/${encodeURIComponent(gameFolder)}/Fix%20Repair/`
      const dirRes = await this.client.get(repairDirUrl, {
        headers: { 'Referer': gamePageUrl || 'https://online-fix.me/' }
      })

      const dirHtml = this.decodeResponse(dirRes.data, dirRes.headers['content-type'])
      const $ = cheerio.load(dirHtml)

      // 3. Find .rar files (usually only one)
      const rarFiles = []
      $('a').each((_, el) => {
        const href = $(el).attr('href') || ''
        if (href.toLowerCase().endsWith('.rar')) {
          rarFiles.push(href)
        }
      })

      if (rarFiles.length === 0) {
        throw new Error('No .rar repair file found in Fix Repair folder')
      }

      // Download the first .rar (you can improve later to zip multiple)
      const rarFile = rarFiles[0]
      const rarUrl = `https://uploads.online-fix.me:2053/uploads/${encodeURIComponent(gameFolder)}/Fix%20Repair/${encodeURIComponent(rarFile)}`

      const rarRes = await this.client.get(rarUrl, {
        responseType: 'arraybuffer',
        headers: { 'Referer': repairDirUrl }
      })

      console.log(`✅ Online-Fix: Downloaded repair ${rarFile} for ${gameFolder}`)
      return {
        buffer: rarRes.data,
        filename: rarFile
      }

    } catch (err) {
      console.error('Online-Fix repair download error:', err.message)
      throw err
    }
  }

  /* =========================
     DETAILS SCRAPING
  ========================= */

  async getDetails(url) {
    try {
      console.log(`🔍 Scraping Online-Fix: ${url}`)

      const res = await this.client.get(url, {
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Referer': 'https://online-fix.me/'
        }
      })

      const html = this.decodeResponse(res.data, res.headers['content-type'])
      const $ = cheerio.load(html, { decodeEntities: false })

      const details = {
        releaseDate: null,
        gameStore: null,
        gameStoreLink: null,
        gameInfo: null,
        launchGuide: null,
        inGameGuide: null,
        updateInfo: null,
        videoUrl: null,
        coopPlayers: null,
        multiplayerPlayers: null,
        supportsOfficialServers: false
      }

      // Detect official servers from URL
      if (url.includes('/officialservers/')) {
        details.supportsOfficialServers = true
      }

      // === Video ===
      const $video = $('iframe[src*="youtube-nocookie.com/embed"], iframe[src*="youtube.com/embed"]').first()
      if ($video.length) {
        let src = $video.attr('src')
        if (src.includes('&')) src = src.split('&')[0]
        details.videoUrl = src
      }

      // Get main content
      const $article = $('div[itemprop="articleBody"]')
      const rawText = $article.text().replace(/\s+/g, ' ').trim()

      const supportsOfficialServers =
        /официальных серверах|official servers|play on official servers|официальные сервера/i.test(rawText);

      details.supportsOfficialServers = supportsOfficialServers;

      // === Релиз игры ===
      const releaseMatch = rawText.match(/Релиз игры[:\s]*(\d{1,2}[.\\/]\d{1,2}[.\\/]\d{2,4})/i)
      if (releaseMatch) details.releaseDate = releaseMatch[1].trim()

      // === Игра через ===
      const storeMatch = rawText.match(/Игра через[:\s]*([A-Za-z ]+Store|[A-Za-z ]+)/i)
      if (storeMatch) details.gameStore = storeMatch[1].trim()

      // === Clean sections with better line breaks ===
      const sections = this.extractSections($article)

      details.gameInfo = sections.gameInfo
      details.launchGuide = sections.launchGuide
      details.inGameGuide = sections.inGameGuide

      // === Network modes (COOP / MULTIPLAYER) ===
      const coopMatch = rawText.match(/КООПЕРАТИВ[:\s]*(\d+)/i)
      const multiMatch = rawText.match(/МУЛЬТИПЛЕЕР[:\s]*(\d+)/i)

      if (coopMatch) details.coopPlayers = coopMatch[1]
      if (multiMatch) details.multiplayerPlayers = multiMatch[1]

      // === Update info ===
      const updateMatch = rawText.match(/Игра обновлена до версии[:\s]*([^\n<]+)/i)
      if (updateMatch) {
        details.updateInfo = `Игра обновлена до версии ${updateMatch[1].trim()}`
      }

      console.log(`✅ Scraped successfully | Official servers: ${details.supportsOfficialServers}`)
      return details

    } catch (err) {
      console.error('Online-Fix error:', err.message)
      return {
        releaseDate: null, gameStore: null, gameStoreLink: null,
        gameInfo: null, launchGuide: null, inGameGuide: null, updateInfo: null,
        videoUrl: null, coopPlayers: null, multiplayerPlayers: null,
        supportsOfficialServers: false
      }
    }
  }
}