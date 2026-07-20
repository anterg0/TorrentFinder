import axios from 'axios'
import * as cheerio from 'cheerio'
import fs from 'fs'
import { TextDecoder } from 'util'

import { CookieJar } from 'tough-cookie'
import { wrapper } from 'axios-cookiejar-support'
import { enrichResultWithTags, parseTagsFromTitle } from "../utils/torrentUtils.ts"

function formatRuTrackerDate(raw) {
  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December']
  const ruMonths = { 'Янв':0,'Фев':1,'Мар':2,'Апр':3,'Май':4,'Июн':5,'Июл':6,'Авг':7,'Сен':8,'Окт':9,'Ноя':10,'Дек':11 }
  const now = new Date()

  if (raw.includes('Сегодня')) {
    return `${now.getDate()} ${monthNames[now.getMonth()]} ${now.getFullYear()}`
  }

  if (raw.includes('Вчера')) {
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    return `${yesterday.getDate()} ${monthNames[yesterday.getMonth()]} ${yesterday.getFullYear()}`
  }

  const numMatch = raw.match(/(\d{1,2})-(\d{1,2})-(\d{2})/)
  if (numMatch) {
    const [, d, m, y] = numMatch
    return `${parseInt(d)} ${monthNames[parseInt(m)-1]} ${2000+parseInt(y)}`
  }

  const ruMatch = raw.match(/(\d{1,2})-([А-Яа-я]{3})-(\d{2})/)
  if (ruMatch) {
    const [, d, m, y] = ruMatch
    return `${parseInt(d)} ${monthNames[ruMonths[m]]} ${2000+parseInt(y)}`
  }

  return raw
}

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

    this.captchaSid = null
    this.captchaFieldName = null
    this.captchaImageUrl = null
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

    try {
      const decoder = new TextDecoder(charset, { fatal: false })
      return decoder.decode(data)
    } catch (err) {
      console.warn(`Failed to decode with ${charset}, falling back to utf-8`)
      return new TextDecoder('utf-8', { fatal: false }).decode(data)
    }
  }

  /* =========================
     COOKIE HANDLING
  ========================= */

  saveCookies() {
    try {
      const serialized = this.jar.serializeSync()
      fs.writeFileSync(this.cookieFile, JSON.stringify(serialized, null, 2))
      console.log('RuTracker cookies saved')
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

        console.log('RuTracker cookies loaded')
      } catch (err) {
        console.error('Failed to load RuTracker cookies:', err.message)
      }
    }
  }

  async clearCookies() {
    this.jar = new CookieJar()
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
    if (fs.existsSync(this.cookieFile)) {
      fs.unlinkSync(this.cookieFile)
    }
    console.log('RuTracker cookies cleared')
  }

  async isLoggedIn() {
    try {
      const res = await this.client.get('index.php')
      const html = this.decodeResponse(res.data, res.headers['content-type'])
      const isLogged = html.includes('logout') || html.includes('Выход')
      console.log(`RuTracker: ${isLogged ? 'Logged in' : 'Not logged in'}`)
      return isLogged
    } catch (err) {
      console.error('RuTracker login check error:', err.message)
      return false
    }
  }

  /* =========================
     CAPTCHA HELPERS
  ========================= */

  parseCaptcha(html) {
    const imgMatch = html.match(/<img[^>]+src="([^"]*captcha\/[^"]+)"[^>]*>/i)
    const sidMatch = html.match(/<input[^>]+name="cap_sid"[^>]+value="([^"]+)"/i)
    const codeMatch = html.match(/<input[^>]+name="(cap_code_[^"]+)"[^>]*>/i)

    this.captchaSid = sidMatch ? sidMatch[1] : null
    this.captchaFieldName = codeMatch ? codeMatch[1] : null
    this.captchaImageUrl = imgMatch
      ? (imgMatch[1].startsWith('//') ? 'https:' + imgMatch[1] : imgMatch[1])
      : null

    return this.captchaSid && this.captchaFieldName && this.captchaImageUrl
  }

  clearCaptcha() {
    this.captchaSid = null
    this.captchaFieldName = null
    this.captchaImageUrl = null
  }

  async getCaptchaImage() {
    if (!this.captchaImageUrl) throw new Error('No captcha image available')
    const res = await axios.get(this.captchaImageUrl, {
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    })
    return res
  }

  /* =========================
     LOGIN
  ========================= */

  async login(username, password, captcha = '') {
    try {
      const params = new URLSearchParams()
      params.append('login_username', username)
      params.append('login_password', password)
      params.append('login', 'Вход')

      if (captcha && this.captchaSid && this.captchaFieldName) {
        params.append('cap_sid', this.captchaSid)
        params.append(this.captchaFieldName, captcha)
      }

      const res = await this.client.post('login.php', params)
      const html = this.decodeResponse(res.data, res.headers['content-type'])

      if (html.includes('logout') || html.includes('Выход')) {
        console.log('RuTracker: Successfully logged in')
        this.clearCaptcha()
        this.saveCookies()
        return { success: true }
      }

      if (this.parseCaptcha(html)) {
        console.log('RuTracker: CAPTCHA required')
        return { success: false, captcha: true }
      }

      return { success: false }
    } catch (err) {
      console.error('Login error:', err.message)
      return { success: false, networkError: true }
    }
  }

  /* =========================
     SEARCH (FIXED)
  ========================= */

  async search(query) {
    try {
      const res = await this.client.get(`tracker.php?nm=${encodeURIComponent(query)}`)

      const contentType = res.headers['content-type'] || ''
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

        const size = $(el).find('td').eq(5).text().trim().replace(/↓.*$/, '').trim()
        const rawDate = $(el).find('td').eq(9).text().trim()
        const date = formatRuTrackerDate(rawDate)
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
          tags: extractedTags.flat(),
          url: `https://rutracker.org/forum/viewtopic.php?t=${id}`,
        })
      })

      console.log(`RuTracker: ${results.length} results found`)
      return results
    } catch (err) {
      console.error('RuTracker search error:', err.message)
      throw err
    }
  }

  /* =========================
     DETAILS
  ========================= */

  async getDetails(topicId) {
    try {
      const res = await this.client.get(`viewtopic.php?t=${topicId}`)
      const html = this.decodeResponse(res.data, res.headers['content-type'])
      const $ = cheerio.load(html, { decodeEntities: false })

      const details = {
        fields: {},
        spoilers: [],
        postHtml: null,
        updateInfo: null,
      }

      const $body = $('.post_body').first()
      if (!$body.length) return details

      // --- Structured fields from span.post-b ---
      $body.find('span.post-b').each((_, el) => {
        const $el = $(el)
        const label = $el.text().trim()
        let value = ''
        const next = el.nextSibling
        if (next && next.nodeType === 3) {
          value = (next.data || next.textContent || '').replace(/^:\s*/, '').trim()
        }
        if (label && value) {
          details.fields[label] = value
        }
      })

      // --- Spoiler sections ---
      $body.find('.sp-wrap').each((_, el) => {
        const $sp = $(el)
        const title = $sp.find('.sp-head').text().trim()
        const $bodyContent = $sp.find('.sp-body')
        $bodyContent.find('var.postImg').each((_, v) => {
          const src = $(v).attr('title')
          if (src) {
            $(v).replaceWith(`<img src="${src}" alt="" style="max-width:100%">`)
          } else {
            $(v).remove()
          }
        })
        let content = $bodyContent.html()?.trim()
        if (title && content) {
          details.spoilers.push({ title, content })
        }
      })

      // --- Update info ---
      const bodyText = $body.text()
      const updateMatch = bodyText.match(/Раздача обновлена[^.]*\./)
      if (updateMatch) details.updateInfo = updateMatch[0].trim()

      // --- Post HTML (sanitized mock, spoilers removed) ---
      const $cleanBody = $body.clone()
      $cleanBody.find('.sp-wrap').remove()
      $cleanBody.find('var.postImg').each((_, v) => {
        const src = $(v).attr('title')
        if (src) {
          $(v).replaceWith(`<img src="${src}" alt="" style="max-width:100%">`)
        } else {
          $(v).remove()
        }
      })
      $cleanBody.find('img.smile').remove()
      $cleanBody.find('script').remove()
      $cleanBody.find('*').each((_, el) => {
        if (el.attribs) {
          Object.keys(el.attribs).forEach(attr => {
            if (/^on/i.test(attr)) delete el.attribs[attr]
          })
        }
      })
      details.postHtml = $cleanBody.html()?.trim() || null

      return details
    } catch (err) {
      console.error('RuTracker getDetails error:', err.message)
      return { fields: {}, spoilers: [], postHtml: null, updateInfo: null }
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