import axios from 'axios'
import * as cheerio from 'cheerio'
import fs from 'fs'

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

        console.log('✅ Online-Fix cookies loaded')
      } catch (err) {
        console.log('⚠️ Failed to load Online-Fix cookies:', err.message)
      }
    } else {
      console.log('⚠️ Online-Fix cookie file not found')
    }
  }

  async isLoggedIn() {
    try {
      // Check if cookie file exists and contains auth cookies
      if (fs.existsSync(this.cookieFile)) {
        const data = JSON.parse(fs.readFileSync(this.cookieFile))
        const hasDleUserId = data.cookies?.some(c => c.key === 'dle_user_id')
        const hasDlePassword = data.cookies?.some(c => c.key === 'dle_password')
        
        if (hasDleUserId && hasDlePassword) {
          console.log('✅ Online-Fix: Auth cookies found')
          return true
        }
      }
      
      console.log('⚠️ Online-Fix: No auth cookies found')
      return false
    } catch (err) {
      console.log('❌ Online-Fix: Error checking login status:', err.message)
      return false
    }
  }

  /* =========================
     LOGIN
  ========================= */

  async extractCSRFToken() {
    try {
      // Step 1: Visit homepage to establish session and get Cloudflare clearance
      console.log('📄 Fetching homepage to establish session...')
      const homeRes = await this.client.get('', {
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      })
      console.log('✅ Homepage loaded, status:', homeRes.status)
      
      // Step 2: Fetch CSRF token from the AJAX endpoint with proper headers
      console.log('🔐 Fetching CSRF token...')
      const res = await this.client.get('engine/ajax/authtoken.php', {
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
          'Accept': 'application/json, text/javascript, */*; q=0.01',
          'Referer': 'https://online-fix.me/',
          'Sec-Fetch-Site': 'same-origin',
          'Sec-Fetch-Mode': 'cors'
        },
        responseType: 'text'
      })
      
      console.log('📥 Token response status:', res.status)
      console.log('📥 Token response headers:', res.headers['content-type'])
      console.log('📥 First 300 chars:', res.data.substring(0, 300))
      
      // The response should contain the token in format: {"field":"token_xxxxx","value":"xxxxx"}
      let tokenName = null
      let tokenValue = null
      
      try {
        const tokenData = JSON.parse(res.data)
        console.log('✅ Parsed as JSON:', tokenData)
        
        // Check if it has the expected structure
        if (tokenData.field && tokenData.value) {
          tokenName = tokenData.field
          tokenValue = tokenData.value
          console.log(`✅ Extracted token: ${tokenName} = ${tokenValue}`)
        } else {
          // Fallback: look for any key starting with token_
          for (const [key, value] of Object.entries(tokenData)) {
            if (key.startsWith('token_')) {
              tokenName = key
              tokenValue = value
              break
            }
          }
        }
      } catch {
        // If not JSON, try parsing with regex
        const match = res.data.match(/token_([a-f0-9]+)["\s=:]+([a-f0-9]+)/)
        if (match) {
          tokenName = `token_${match[1]}`
          tokenValue = match[2]
          console.log('✅ Parsed with regex:', { tokenName, tokenValue })
        } else {
          console.log('⚠️ Could not parse token response - not JSON and no token pattern found')
          return null
        }
      }
      
      if (!tokenName || !tokenValue) {
        console.log('⚠️ Could not extract token from response')
        return null
      }
      
      console.log(`✅ CSRF Token obtained: ${tokenName}`)
      return { tokenName, tokenValue }
    } catch (err) {
      console.log('❌ Failed to extract CSRF token:', err.message)
      if (err.response) {
        console.log('Response status:', err.response.status)
        console.log('Response data (first 200 chars):', err.response.data?.substring?.(0, 200))
      }
      return null
    }
  }

  async login(username, password) {
    try {
      // Step 1: Extract CSRF token from the homepage
      const tokenData = await this.extractCSRFToken()
      
      if (!tokenData) {
        console.log('❌ Login failed: Could not get CSRF token')
        return false
      }

      // Step 2: Submit login form with credentials and CSRF token
      const params = new URLSearchParams()
      params.append('login_name', username)
      params.append('login_password', password)
      params.append('login', 'submit')
      params.append(tokenData.tokenName, tokenData.tokenValue)

      const res = await this.client.post('/', params)

      // Step 3: Check if login was successful by looking for logout link or checking cookies
      const isSuccess = res.data.includes('logout') || res.data.includes('Выход')
      
      if (isSuccess) {
        console.log('✅ Logged in successfully')
        this.saveCookies()
        return true
      }

      console.log('❌ Login failed')
      return false
    } catch (err) {
      console.log('❌ Login error:', err.message)
      return false
    }
  }

  /* =========================
     SEARCH
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

      const $ = cheerio.load(res.data)
      const results = []

      // Parse search results
      // Each result has: <a href="..."><span class="searchheading">Title</span></a>
      $('a span.searchheading').each((_, el) => {
        const title = $(el).text().trim()
        const link = $(el).closest('a').attr('href')

        if (!title || !link) return

        // Extract game name from URL: https://online-fix.me/games/category/id-gamename.html
        const nameMatch = link.match(/\/(\d+)-(.+?)\.html/)
        const id = nameMatch ? nameMatch[1] : null
        const gameName = nameMatch ? nameMatch[2] : title

        if (!id) return

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
          gameName: gameName // Add the extracted game name
        })
      })

      console.log(`🔍 Online-Fix search found ${results.length} results`)
      return results
    } catch (err) {
      console.log('❌ Search error:', err.message)
      throw err
    }
  }

  /* =========================
     MAGNET/DETAILS
  ========================= */

  async getMagnetLink(topicId) {
    // For Online-Fix, we return the game page URL instead
    // since magnet links and torrent details are on the game page
    try {
      const res = await this.client.get(`?do=search&story=${encodeURIComponent(topicId)}`)
      const html = res.data

      const match = html.match(/magnet:\?xt=urn:btih:[^"]+/)
      if (match) return match[0]

      const $ = cheerio.load(html)
      const magnet = $('a[href^="magnet:"]').attr('href')

      if (magnet) return magnet

      // If no magnet link found, return the search page
      return `https://online-fix.me/?do=search&story=${encodeURIComponent(topicId)}`
    } catch (err) {
      console.log('❌ Error getting magnet link:', err.message)
      return `https://online-fix.me/?do=search&story=${encodeURIComponent(topicId)}`
    }
  }

  /* =========================
     TORRENT DOWNLOAD
  ========================= */

  async downloadTorrent(topicId) {
    // For Online-Fix, torrents are accessed from:
    // https://uploads.online-fix.me:2053/torrents/{GameName}/
    // For now, return the torrents directory URL
    // The actual torrent file will be accessible via the game page
    try {
      // topicId should be the game name or ID
      const torrentUrl = `https://uploads.online-fix.me:2053/torrents/${encodeURIComponent(topicId)}/`
      return torrentUrl
    } catch (err) {
      console.log('❌ Error getting torrent download:', err.message)
      throw err
    }
  }
}