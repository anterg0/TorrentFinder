import axios from 'axios'
import * as cheerio from 'cheerio'
import fs from 'fs'

import { CookieJar } from 'tough-cookie'
import { wrapper } from 'axios-cookiejar-support'

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
        'User-Agent': 'Mozilla/5.0'
      }
    }))

    this.loadCookies()
  }

  /* =========================
     COOKIE HANDLING
  ========================= */

  saveCookies() {
    try {
      const serialized = this.jar.serializeSync()
      fs.writeFileSync(this.cookieFile, JSON.stringify(serialized, null, 2))
      console.log('💾 Cookies saved')
    } catch {
      console.log('❌ Failed to save cookies')
    }
  }

  loadCookies() {
    if (fs.existsSync(this.cookieFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(this.cookieFile))

        this.jar = CookieJar.deserializeSync(data)

        this.client = wrapper(axios.create({
          baseURL: this.baseURL,
          jar: this.jar,
          withCredentials: true,
          headers: {
            'User-Agent': 'Mozilla/5.0'
          }
        }))

        console.log('✅ RuTracker cookies loaded')
      } catch (err) {
        console.log('⚠️ Failed to load RuTracker cookies:', err.message)
      }
    } else {
      console.log('⚠️ RuTracker cookie file not found')
    }
  }

  async isLoggedIn() {
    try {
      const res = await this.client.get('index.php')
      const isLogged = res.data.includes('logout')
      console.log(`✅ RuTracker: ${isLogged ? 'Logged in' : 'Not logged in'}`)
      return isLogged
    } catch (err) {
      console.log('❌ RuTracker: Error checking login status:', err.message)
      return false
    }
  }

  /* =========================
     LOGIN
  ========================= */

  async login(username, password) {
    const params = new URLSearchParams()
    params.append('login_username', username)
    params.append('login_password', password)
    params.append('login', 'Вход')

    const res = await this.client.post('login.php', params)

    if (res.data.includes('logout')) {
      console.log('✅ Logged in')
      this.saveCookies()
      return true
    }

    return false
  }

  /* =========================
     SEARCH
  ========================= */

  async search(query) {
    const res = await this.client.get(`tracker.php?nm=${encodeURIComponent(query)}`)
    const $ = cheerio.load(res.data)

    const results = []

    $('.forumline tr').each((_, el) => {
      const title = $(el).find('.tLink').text().trim()
      const link = $(el).find('.tLink').attr('href')

      if (!title || !link) return

      const idMatch = link.match(/t=(\d+)/)
      if (!idMatch) return

      const id = idMatch[1]

      const size = $(el).find('td').eq(5).text().trim()
      const date = $(el).find('td').eq(9).text().trim()
      const author = $(el).find('div.u-name a').text().trim()
      const seedAmount = $(el).find('b.seedmed').text().trim()
      const leechAmount = $(el).find('td.leechmed').text().trim()

      results.push({
        id: `rt-${id}`,
        name: title,
        size,
        uploadDate: date,
        author,
        tracker: 'RuTracker',
        seeds: seedAmount,
        leeches: leechAmount
      })
    })

    return results
  }

  /* =========================
     MAGNET
  ========================= */

  async getMagnetLink(topicId) {
    const res = await this.client.get(`viewtopic.php?t=${topicId}`)
    const html = res.data

    const match = html.match(/magnet:\?xt=urn:btih:[^"]+/)
    if (match) return match[0]

    const $ = cheerio.load(html)
    const magnet = $('a[href^="magnet:"]').attr('href')

    if (magnet) return magnet

    throw new Error('Magnet not found')
  }

  /* =========================
     TORRENT DOWNLOAD
  ========================= */

  async downloadTorrent(topicId) {
    const res = await this.client.get(`dl.php?t=${topicId}`, {
      responseType: 'arraybuffer'
    })

    return res.data
  }
}