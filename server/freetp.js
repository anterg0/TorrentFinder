import axios from 'axios'
import * as cheerio from 'cheerio'
import fs from 'fs'
import { TextDecoder } from 'util'

import { CookieJar } from 'tough-cookie'
import { wrapper } from 'axios-cookiejar-support'

export default class Freetp {
  constructor() {
    this.baseURL = 'https://freetp.org/'
    this.cookieFile = './cookiesFreetp.json'

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

  decodeResponse(data, contentType = '') {
    if (!Buffer.isBuffer(data)) {
      return typeof data === 'string' ? data : String(data)
    }

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
        console.error('Failed to load Freetp cookies:', err.message)
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
    console.log('🗑️ Freetp cookies cleared')
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
          'Referer': 'https://freetp.org/'
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

  async search(query) {
    try {
      const params = new URLSearchParams()
      params.append('query', query)

      const res = await this.client.post('engine/ajax/search.php', params, {
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'Accept': '*/*',
          'Accept-Language': 'ru,en;q=0.9,en-GB;q=0.8,en-US;q=0.7',
          'Referer': 'https://freetp.org/'
        }
      })

      const contentType = res.headers['content-type'] || ''
      this.debugLogEncoding('Raw Search Response', res.data, contentType)

      const html = this.decodeResponse(res.data, contentType)

      const $ = cheerio.load(html, { decodeEntities: false })
      const results = []

      $('a').each((_, el) => {
        const $el = $(el)
        const $heading = $el.find('span.searchheading')
        if (!$heading.length) return

        const title = $heading.text().trim()
        let link = $el.attr('href')
        if (!title || !link) return

        if (!link.startsWith('http')) {
          link = new URL(link, this.baseURL).href
        }

        const idMatch = link.match(/\/(\d+)-/)
        const id = idMatch ? idMatch[1] : null

        results.push({
          id: id ? `ft-${id}` : null,
          name: title,
          size: 'N/A',
          uploadDate: 'N/A',
          author: 'FreeTP',
          tracker: 'FreeTP',
          seeds: 'N/A',
          leeches: 'N/A',
          url: link,
          gameName: title
        })
      })

      console.log(`Freetp: ${results.length} results`)
      return results
    } catch (err) {
      console.error('Freetp search error:', err.message)
      throw err
    }
  }

  async getFileIds(gamePageUrl) {
    const res = await this.client.get(gamePageUrl, {
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Referer': this.baseURL
      }
    })

    const html = this.decodeResponse(res.data, res.headers['content-type'])
    const $ = cheerio.load(html, { decodeEntities: false })

    let torrentId = null
    let fixId = null
    let torrentAvailable = false
    let fixAvailable = false

    $('a[href*="getfile-"]').each((_, el) => {
      const $el = $(el)
      const href = $el.attr('href') || ''
      const text = $el.text().trim()
      if (!text) return

      const match = href.match(/getfile-(\d+)/)
      if (!match) return
      const fileId = match[1]

      const hasLineThrough = $el.is('[style*="line-through"]') ||
        $el.closest('[style*="line-through"]').length > 0
      const available = !hasLineThrough

      if (/\.torrent/i.test(text) || /торрент/i.test(text)) {
        torrentId = fileId
        torrentAvailable = available
      } else if (/Fix/i.test(text) || /фикс/i.test(text) || /Online/i.test(text)) {
        fixId = fileId
        fixAvailable = available
      }
    })

    return { torrentId, fixId, torrentAvailable, fixAvailable }
  }

  async downloadFile(fileId) {
    const getfileUrl = `https://freetp.org/getfile-${fileId}`

    await this.client.get(getfileUrl, {
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Referer': this.baseURL
      }
    })

    const dlUrl = `https://freetp.org/engine/download.php?id=${fileId}&area=`
    const dlRes = await this.client.get(dlUrl, {
      responseType: 'arraybuffer',
      headers: {
        'Referer': getfileUrl,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8'
      }
    })

    return dlRes
  }

  async downloadTorrent(gamePageUrl) {
    const { torrentId, torrentAvailable } = await this.getFileIds(gamePageUrl)
    if (!torrentId) throw new Error('No torrent file link found on page')
    if (!torrentAvailable) throw new Error('Torrent download is unavailable (link has strikethrough)')

    const response = await this.downloadFile(torrentId)
    console.log(`Freetp: Downloaded torrent (file ${torrentId})`)
    return response
  }

  async downloadRepair(gamePageUrl) {
    const { fixId, fixAvailable } = await this.getFileIds(gamePageUrl)
    if (!fixId) throw new Error('No fix/repair file link found on page')
    if (!fixAvailable) throw new Error('Fix/repair download is unavailable (link has strikethrough)')

    const response = await this.downloadFile(fixId)
    console.log(`Freetp: Downloaded repair (file ${fixId})`)
    return response
  }

  async getDetails(url) {
    const res = await this.client.get(url, {
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Referer': this.baseURL
      }
    })

    const html = this.decodeResponse(res.data, res.headers['content-type'])
    const $ = cheerio.load(html, { decodeEntities: false })

    const details = {
      description: null,
      playMethod: null,
      language: null,
      genre: null,
      maxPlayers: null,
      singleplayer: null,
      releaseDate: null,
      author: null,
      videoUrl: null,
      updateInfo: null,
      launchGuide: null
    }

    // Author
    const authorEl = $('span.small:contains("Автор:")').next('a')
    if (authorEl.length) details.author = authorEl.text().trim()

    // Update info
    const $update = $('span[style*="color:red"] b:contains("Изменена")').first()
    if ($update.length) {
      details.updateInfo = $update.parent('span').text().trim()
    }

    // Video
    const $video = $('iframe[src*="youtube.com/embed"]').first()
    if ($video.length) {
      let src = $video.attr('src')
      if (src.startsWith('//')) src = 'https:' + src
      details.videoUrl = src
    }

    const stripDot = s => s.replace(/\.+$/, '').trim()
    const stripDate = s => s.replace(/[\.\s]*г[\.\s]*$/, '').trim()

    // Parsed labeled fields inside the news div
    const $news = $('div[id^="news-id-"]')
    if ($news.length) {
      $news.find('p').each((_, p) => {
        const $p = $(p)
        const $label = $p.find('span[style*="text-decoration: underline"]')
        if (!$label.length) return

        const label = $label.text().replace(/^[\s\u00A0]+|[\s\u00A0]+$/g, '').replace(/:$/, '').trim()
        const $cloned = $p.clone()
        $cloned.find('span[style*="text-decoration: underline"]').remove()
        let value = $cloned.text().replace(/\u00A0/g, ' ').replace(/&nbsp;/g, ' ').trim()
        if (!value) return

        switch (label) {
          case 'Описание игры':
            details.description = value
            break
          case 'Способ Игры':
            details.playMethod = stripDot(value)
            break
          case 'Язык в Игре':
            details.language = stripDot(value)
            break
          case 'Жанр':
            details.genre = stripDot(value)
            break
          case 'Максимальное количество игроков':
            details.maxPlayers = value.includes('*') ? '∞' : stripDot(value)
            break
          case 'Одиночная игра':
            details.singleplayer = stripDot(value)
            break
          case 'Дата выхода игры':
          case 'Дата выхода':
            details.releaseDate = stripDate(value)
            break
        }
      })

      // Launch guide
      const $heading = $news.find('p').filter((_, el) => {
        const t = $(el).text()
        return t.includes('Запуск') && t.includes('по сети')
      }).first()
      if ($heading.length) {
        const $allHrs = $heading.nextAll('hr')
        let $stopHr = null
        $allHrs.each((i, hr) => {
          if (i === 0) return
          const $hr = $(hr)
          const between = []
          $hr.nextUntil('hr').each((_, el) => between.push($(el).text()))
          if (between.join(' ').includes('Доп')) {
            $stopHr = $hr
            return false
          }
        })
        if ($stopHr) {
          const parts = []
          $allHrs.first().nextUntil($stopHr).each((_, el) => parts.push($(el).text()))
          details.launchGuide = parts.join('\n').replace(/\s+/g, ' ').trim()
        }
      }
    }

    // Author
    if (details.author) details.author = stripDot(details.author)

    return details
  }
}
