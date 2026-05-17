import axios from 'axios'
import * as cheerio from 'cheerio'
import fs from 'fs'
import { TextDecoder } from 'util'

import { CookieJar } from 'tough-cookie'
import { wrapper } from 'axios-cookiejar-support'
import { enrichResultWithTags, parseTagsFromTitle } from "../utils/torrentUtils.ts"

export default class RuTracker {
  constructor() {
    this.baseURL = 'https://rutracker.org/forum/'
    this.cookieFile = './cookiesRutracker.json'

    this.jar = new CookieJar()

    this.client = wrapper(axios.create({
      baseURL: this.baseURL,
      jar: this.jar,
      withCredentials: true,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Charset': 'utf-8'
      },
      responseType: 'arraybuffer'   // Important: keep as buffer
    }))

    this.loadCookies()
  }

  /* =========================
     DECODING (THE FIX)
  ========================= */

  decodeResponse(data, contentType = '') {
    if (!Buffer.isBuffer(data)) {
      return typeof data === 'string' ? data : String(data)
    }

    // Detect charset from header
    let charset = 'utf-8'
    if (contentType) {
      const match = contentType.match(/charset=([\w-]+)/i)
      if (match) charset = match[1].toLowerCase()
    }

    console.log(`[RuTracker] Decoding with charset: ${charset}`)

    try {
      const decoder = new TextDecoder(charset, { fatal: false })
      return decoder.decode(data)
    } catch (err) {
      console.warn(`Failed to decode with ${charset}, falling back to utf-8`)
      return new TextDecoder('utf-8', { fatal: false }).decode(data)
    }
  }

  debugLog(label, data, contentType = '') {
    if (!Buffer.isBuffer(data)) return
    console.log(`\n=== DEBUG ${label} ===`)
    console.log(`Size: ${data.length} bytes`)
    console.log(`First 80 bytes (hex): ${data.slice(0, 80).toString('hex')}`)
    const decoded = this.decodeResponse(data, contentType)
    console.log(`Decoded preview: ${decoded.substring(0, 300)}...`)
  }

  /* =========================
     COOKIE HANDLING
  ========================= */

  saveCookies() {
    try {
      const serialized = this.jar.serializeSync()
      fs.writeFileSync(this.cookieFile, JSON.stringify(serialized, null, 2))
      console.log('💾 RuTracker cookies saved')
    } catch (err) {
      console.error('❌ Failed to save cookies:', err.message)
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

        console.log('✅ RuTracker cookies loaded')
      } catch (err) {
        console.error('⚠️ Failed to load RuTracker cookies:', err.message)
      }
    }
  }

  async isLoggedIn() {
    try {
      const res = await this.client.get('index.php')
      const html = this.decodeResponse(res.data, res.headers['content-type'])
      const isLogged = html.includes('logout') || html.includes('Выход')
      console.log(`✅ RuTracker: ${isLogged ? 'Logged in' : 'Not logged in'}`)
      return isLogged
    } catch (err) {
      console.error('❌ RuTracker login check error:', err.message)
      return false
    }
  }

  /* =========================
     LOGIN
  ========================= */

  async login(username, password) {
    try {
      const params = new URLSearchParams()
      params.append('login_username', username)
      params.append('login_password', password)
      params.append('login', 'Вход')

      const res = await this.client.post('login.php', params)
      const html = this.decodeResponse(res.data, res.headers['content-type'])

      if (html.includes('logout') || html.includes('Выход')) {
        console.log('✅ RuTracker: Successfully logged in')
        this.saveCookies()
        return true
      }
      return false
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
      const res = await this.client.get(`tracker.php?nm=${encodeURIComponent(query)}`)

      const contentType = res.headers['content-type'] || ''
      this.debugLog('Search Response', res.data, contentType)

      const html = this.decodeResponse(res.data, contentType)
      const $ = cheerio.load(html, { decodeEntities: false })

      const results = []

      $('.forumline tr').each((_, el) => {
        const titleEl = $(el).find('.tLink')
        let title = titleEl.text().trim()
        const link = titleEl.attr('href')

        if (!title || !link) return

        const idMatch = link.match(/t=(\d+)/)
        if (!idMatch) return

        const id = idMatch[1]

        const size = $(el).find('td').eq(5).text().trim()
        const date = $(el).find('td').eq(9).text().trim()
        const author = $(el).find('div.u-name a').text().trim()
        const seedAmount = $(el).find('b.seedmed').text().trim()
        const leechAmount = $(el).find('td.leechmed').text().trim()

        let extractedTags = [];

        // Remove ALL leading [] and () tags
        while (true) {
          const prefixMatch = title.match(
            /^\s*(\[[^\]]*]|\([^)]+\))\s*/
          );

          if (!prefixMatch) break;

          title = title
            .slice(prefixMatch[0].length)
            .trim();
        }

        // Only allowed suffix tags
        const VALID_RELEASE_TAGS = [
          'portable',
          'gog',
          'p2p',
          'scene',
          'steam-rip',
          'steamrip',
          'repack',
          'rip'
        ];

        // ONLY the final [...] in the string
        const suffixMatch = title.match(
          /\[([^\]]+)\]\s*$/
        );

        if (suffixMatch) {
          const suffix = suffixMatch[1].trim();

          if (
            VALID_RELEASE_TAGS.includes(
              suffix.toLowerCase()
            )
          ) {
            extractedTags.push(suffix);

            title = title
              .slice(0, suffixMatch.index)
              .trim();
          }
        }

        results.push({
          id: `rt-${id}`,
          name: title,
          size,
          uploadDate: date,
          author,
          tracker: 'RuTracker',
          seeds: seedAmount,
          leeches: leechAmount,
          tags: extractedTags.flat()
        })
      })

      console.log(`✅ RuTracker: ${results.length} results found`)
      return results
    } catch (err) {
      console.error('RuTracker search error:', err.message)
      throw err
    }
  }

  /* =========================
     MAGNET
  ========================= */

  async getMagnetLink(topicId) {
    try {
      const res = await this.client.get(`viewtopic.php?t=${topicId}`)
      const html = this.decodeResponse(res.data, res.headers['content-type'])

      const match = html.match(/magnet:\?xt=urn:btih:[^"'\s]+/)
      if (match) return match[0]

      const $ = cheerio.load(html, { decodeEntities: false })
      const magnet = $('a[href^="magnet:"]').attr('href')

      if (magnet) return magnet
      throw new Error('Magnet link not found')
    } catch (err) {
      console.error('Error getting magnet:', err.message)
      throw err
    }
  }

  /* =========================
     TORRENT DOWNLOAD
  ========================= */

  async downloadTorrent(topicId) {
    try {
      const res = await this.client.get(`dl.php?t=${topicId}`, {
        responseType: 'arraybuffer'
      })
      return res
    } catch (err) {
      console.error('Torrent download error:', err.message)
      throw err
    }
  }
}