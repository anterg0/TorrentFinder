import { useState, useEffect, useRef } from 'react'
import { Input } from './ui/input'
import { Button } from './ui/button'
import { motion, AnimatePresence } from 'motion/react'
import { TorrentResultCard } from './TorrentResultCard'
import { SettingsSidebar } from './SettingsSidebar'
import { TorrentResult } from '../utils/torrentUtils'
import { Search, User, Lock, X, Shield, Menu, ExternalLink, Download, Wrench } from 'lucide-react'
import axios from 'axios'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible'
import { ChevronDown, ChevronUp } from 'lucide-react'

export type SortOption = 'name' | 'size' | 'date'

export const sortOptions = [
  { key: 'name' as const, label: 'Name' },
  { key: 'size' as const, label: 'Size' },
  { key: 'date' as const, label: 'Date' }
]

export function sortResults(results: TorrentResult[], sortBy: SortOption): TorrentResult[] {
  return [...results].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name)
      case 'size':
        const parseSize = (sizeStr: string) => {
          const match = sizeStr.match(/(\d+\.?\d*)\s*(GB|MB|KB|TB)/i)
          if (!match) return 0
          const size = parseFloat(match[1])
          const unit = match[2].toUpperCase() as keyof typeof multipliers
          const multipliers = { KB: 1, MB: 1024, GB: 1024 * 1024, TB: 1024 * 1024 * 1024 }
          return size * (multipliers[unit] || 0)
        }
        return parseSize(b.size) - parseSize(a.size)
      case 'date':
        return new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime()
      default:
        return 0
    }
  })
}

// Updated search function with auth awareness
export async function searchTorrents(query: string): Promise<TorrentResult[]> {
  try {
    console.log(`Searching for: "${query}"`)

    const healthResponse = await axios.get('http://localhost:3001/api/health', {
      timeout: 5000
    })
    console.log('Server health check:', healthResponse.data)

    const response = await axios.get(`http://localhost:3001/api/search`, {
      params: { q: query },
      timeout: 45000
    })

    console.log('Search response:', response.data)
    return response.data
  } catch (error) {
    console.error('Search API error:', error)
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
        throw new Error('❌ Backend server is not running.\n\nPlease run: npm run dev:backend\n\nOr start both servers with: npm run dev')
      } else if (error.code === 'ECONNABORTED') {
        throw new Error('⏱️ Search timed out. RuTracker might be slow or blocking requests. Try again in a few minutes.')
      } else if (error.response?.status === 401) {
        throw new Error('🔐 RuTracker authentication required')
      } else if (error.response?.status === 400) {
        throw new Error('❌ Invalid search query. Please try different search terms.')
      } else if (error.response?.status === 500) {
        throw new Error('❌ Server error occurred while searching. Please try again.')
      }
    }
    throw new Error('❌ Failed to search torrents. Please check your internet connection and try again.')
  }
}

export async function loginRuTracker(username: string, password: string, captcha: string = ''): Promise<boolean> {
  try {
    const response = await axios.post('http://localhost:3001/api/auth', {
      username,
      password,
      captcha
    }, {
      timeout: 30000
    })
    return response.data.success
  } catch {
    return false
  }
}

async function getMagnetLink(id: string): Promise<string> {
  const res = await axios.get(`http://localhost:3001/api/magnet/${id}`, {
    timeout: 15000
  })
  return res.data.magnet
}

function downloadTorrent(id: string, type: 'torrent' | 'repair' = 'torrent') {
  if (type === 'repair') {
    window.location.href = `http://localhost:3001/api/download/${id}?type=repair`
  } else {
    window.location.href = `http://localhost:3001/api/download/${id}`
  }
}

interface TorrentResultDetailsProps {
  result: TorrentResult & {
    magnetLink?: string
    url?: string
    gameName?: string
    // Online-Fix specific fields
    releaseDate?: string
    gameStore?: string
    gameStoreLink?: string
    gameInfo?: string
    launchGuide?: string
    inGameGuide?: string
    updateInfo?: string
  }
  onClose: () => void
  onMagnetClick: (id: string) => void
  onDownloadClick: (id: string, type?: 'torrent' | 'repair') => void
}

function TorrentResultDetails({ result, onClose, onMagnetClick, onDownloadClick }: TorrentResultDetailsProps) {
  const isOnlineFix = result.tracker === 'Online-Fix'
  const title = result.gameName || result.name

  const [launchGuideOpen, setLaunchGuideOpen] = useState(false)
  const [inGameGuideOpen, setInGameGuideOpen] = useState(false)
  const [details, setDetails] = useState<any>({})
  const [isLoadingDetails, setIsLoadingDetails] = useState(false)
  const hasFetchedRef = useRef(false)

  useEffect(() => {
    if (isOnlineFix && result.url && !hasFetchedRef.current) {
      hasFetchedRef.current = true
      setIsLoadingDetails(true)

      const params = new URLSearchParams({ url: result.url })

      axios.get(`http://localhost:3001/api/details/${result.id}?${params.toString()}`)
        .then(response => {
          setDetails(response.data || {})
        })
        .catch(err => {
          console.error('Failed to fetch Online-Fix details:', err)
          setDetails({})
        })
        .finally(() => {
          setIsLoadingDetails(false)
        })
    }
  }, [isOnlineFix, result.id, result.url])   // stable dependencies only

  // Merge the result with fetched details
  const enrichedResult = { ...result, ...details }

  return (
    <motion.div
      key="details-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-hidden"
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 mx-4 my-8 flex w-full max-w-6xl flex-col overflow-hidden rounded-[28px] border border-border/70 bg-card shadow-2xl max-h-[92vh]"
      >
        {/* Header */}
        <div className="flex flex-col gap-4 border-b border-border/60 bg-background/95 p-6 backdrop-blur-sm sm:flex-row sm:items-start sm:justify-between flex-shrink-0">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span className="rounded-full border border-border/60 bg-accent px-3 py-1">{result.tracker}</span>
              {!isOnlineFix && result.author && result.author !== 'Unknown' && (
                <span className="rounded-full border border-border/60 bg-accent px-3 py-1">{result.author}</span>
              )}
            </div>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">{title}</h2>
            <p className="text-sm text-muted-foreground line-clamp-2">{result.name}</p>
          </div>

          <Button variant="ghost" size="sm" onClick={onClose} className="self-start whiteText">
            Back to results
          </Button>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 min-h-0">
          <div className="grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
            <section className="space-y-5">
              {/* Video Showcase */}
              {isOnlineFix && enrichedResult.videoUrl && (
                <div className="rounded-3xl overflow-hidden border border-border/60 bg-black aspect-video">
                  <iframe
                    src={enrichedResult.videoUrl}
                    className="w-full h-full"
                    allowFullScreen
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  />
                </div>
              )}

              {/* Online-Fix Content */}
              {isOnlineFix ? (
                <div className="space-y-4">
                  {enrichedResult.releaseDate && (
                    <div className="rounded-3xl border border-border/60 bg-accent/40 p-5">
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Релиз игры</p>
                      <p className="mt-2 text-lg font-semibold text-foreground">{enrichedResult.releaseDate}</p>
                    </div>
                  )}

                  {enrichedResult.gameStore && (
                    <div className="rounded-3xl border border-border/60 bg-accent/40 p-5">
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Игра через</p>
                      <p className="mt-2 text-lg font-semibold text-foreground">{enrichedResult.gameStore}</p>
                    </div>
                  )}
                  {/* Official Servers - Separate */}
                  {enrichedResult.supportsOfficialServers && (
                    <div className="rounded-3xl border border-green-500/30 bg-green-500/10 px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500">
                          <span className="text-sm font-bold text-white">✓</span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-green-400">Official Servers Supported</p>
                          <p className="text-xs text-muted-foreground">You can play on official servers</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {((enrichedResult.coopPlayers && parseInt(enrichedResult.coopPlayers) > 0) ||
                    (enrichedResult.multiplayerPlayers && parseInt(enrichedResult.multiplayerPlayers) > 0)) && (

                      <div className="space-y-3">

                        {/* COOP + MULTIPLAYER - Separate cards with blue background if > 0 players */}
                        {(enrichedResult.coopPlayers || enrichedResult.multiplayerPlayers) && (
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

                            {/* COOP */}
                            {enrichedResult.coopPlayers && (
                              <div className={`rounded-3xl px-5 py-4 transition-colors ${parseInt(enrichedResult.coopPlayers) > 0
                                ? 'bg-blue-600 text-white'
                                : 'bg-accent/40 text-foreground'
                                }`}>
                                <div className="flex items-baseline justify-between">
                                  <div>
                                    <p className={`text-xs uppercase tracking-[0.2em] ${parseInt(enrichedResult.coopPlayers) > 0 ? 'text-blue-200' : 'text-muted-foreground'
                                      }`}>
                                      COOPERATIVE
                                    </p>
                                    <p className="mt-1 text-3xl font-semibold">
                                      {enrichedResult.coopPlayers}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className={`text-sm ${parseInt(enrichedResult.coopPlayers) > 0 ? 'text-blue-200' : 'text-muted-foreground'
                                      }`}>players</p>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* MULTIPLAYER */}
                            {enrichedResult.multiplayerPlayers && (
                              <div className={`rounded-3xl px-5 py-4 transition-colors ${parseInt(enrichedResult.multiplayerPlayers) > 0
                                ? 'bg-blue-600 text-white'
                                : 'bg-accent/40 text-foreground'
                                }`}>
                                <div className="flex items-baseline justify-between">
                                  <div>
                                    <p className={`text-xs uppercase tracking-[0.2em] ${parseInt(enrichedResult.multiplayerPlayers) > 0 ? 'text-blue-200' : 'text-muted-foreground'
                                      }`}>
                                      MULTIPLAYER
                                    </p>
                                    <p className="mt-1 text-3xl font-semibold">
                                      {enrichedResult.multiplayerPlayers}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className={`text-sm ${parseInt(enrichedResult.multiplayerPlayers) > 0 ? 'text-blue-200' : 'text-muted-foreground'
                                      }`}>players</p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                  {enrichedResult.gameInfo && (
                    <div className="space-y-3 rounded-3xl border border-border/60 bg-background/80 p-5">
                      <h3 className="text-lg font-semibold text-foreground">Информация о игре</h3>
                      <p className="text-sm leading-7 text-muted-foreground whitespace-pre-line">
                        {enrichedResult.gameInfo}
                      </p>
                    </div>
                  )}

                  {/* Как запускать - Always visible */}
                  {enrichedResult.launchGuide && (
                    <div className="space-y-3 rounded-3xl border border-border/60 bg-background/80 p-5">
                      <h3 className="text-lg font-semibold text-foreground">Как запускать</h3>
                      <p className="text-sm leading-7 text-muted-foreground whitespace-pre-line">
                        {enrichedResult.launchGuide}
                      </p>
                    </div>
                  )}

                  {/* В игре - Always visible */}
                  {enrichedResult.inGameGuide && (
                    <div className="space-y-3 rounded-3xl border border-border/60 bg-background/80 p-5">
                      <h3 className="text-lg font-semibold text-foreground">В игре</h3>
                      <p className="text-sm leading-7 text-muted-foreground whitespace-pre-line">
                        {enrichedResult.inGameGuide}
                      </p>
                    </div>
                  )}

                  {enrichedResult.updateInfo && (
                    <div className="rounded-3xl border border-border/60 bg-yellow-500/10 p-5">
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Обновлено</p>
                      <p className="mt-2 text-sm text-muted-foreground">{enrichedResult.updateInfo}</p>
                    </div>
                  )}
                </div>
              ) : (
                // RuTracker/FreeTP content
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-3xl border border-border/60 bg-accent/40 p-5">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Release date</p>
                    <p className="mt-2 text-lg font-semibold text-foreground">{result.uploadDate || 'Unknown'}</p>
                  </div>
                  <div className="rounded-3xl border border-border/60 bg-accent/40 p-5">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">File size</p>
                    <p className="mt-2 text-lg font-semibold text-foreground">{result.size}</p>
                  </div>
                </div>
              )}

              {!isOnlineFix && (
                <div className="space-y-3 rounded-3xl border border-border/60 bg-background/80 p-5">
                  <h3 className="text-lg font-semibold text-foreground">Description</h3>
                  <p className="text-sm leading-7 text-muted-foreground">
                    The torrent contains the selected release, including package contents and metadata. Use the buttons below to fetch the torrent file or open the magnet link in your preferred client.
                  </p>
                </div>
              )}
            </section>
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="border-t border-border/60 bg-background/95 p-6 flex-shrink-0">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {isOnlineFix ? (
              <>
                <Button
                  onClick={() => {
                    if (enrichedResult.gameName && enrichedResult.url) {
                      const params = new URLSearchParams({
                        gameName: enrichedResult.gameName,
                        gameUrl: enrichedResult.url,
                        type: 'repair'
                      })
                      window.location.href = `http://localhost:3001/api/download/${enrichedResult.id}?${params.toString()}`
                    }
                  }}
                  disabled={!enrichedResult.gameName || !enrichedResult.url}
                  className="h-11 bg-white text-black hover:bg-gray-100 border-gray-300 flex items-center justify-center gap-2"
                >
                  <Wrench className="h-4 w-4" />
                  Download Fix Repair
                </Button>

                <Button
                  onClick={() => onDownloadClick(enrichedResult.id, 'torrent')}
                  className="h-11 bg-white text-black hover:bg-gray-100 border-gray-300 flex items-center justify-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download .torrent
                </Button>

                <Button
                  onClick={() => {
                    if (enrichedResult.url) window.open(enrichedResult.url, '_blank')
                  }}
                  disabled={!enrichedResult.url}
                  className="h-11 bg-white text-black hover:bg-gray-100 border-gray-300 flex items-center justify-center gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open Webpage
                </Button>
              </>
            ) : (
              // Normal torrent buttons
              <>
                <Button
                  onClick={() => onDownloadClick(enrichedResult.id, 'torrent')}
                  className="h-11 bg-white text-black hover:bg-gray-100 border-gray-300 flex items-center justify-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download .torrent
                </Button>
                <Button
                  onClick={() => onMagnetClick(enrichedResult.id)}
                  className="h-11 bg-white text-black hover:bg-gray-100 border-gray-300 flex items-center justify-center gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Magnet Link
                </Button>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

export function TorrentSearch() {
  const [searchQuery, setSearchQuery] = useState('')
  const [results, setResults] = useState<TorrentResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [sortBy, setSortBy] = useState<SortOption>('name')
  const [isFocused, setIsFocused] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Auth modal state
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authUsername, setAuthUsername] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState('')
  const [showCaptcha, setShowCaptcha] = useState(false)
  const [captchaCode, setCaptchaCode] = useState('')
  const [captchaImageLoaded, setCaptchaImageLoaded] = useState(false)
  const [captchaError, setCaptchaError] = useState('')
  const [captchaImageSrc, setCaptchaImageSrc] = useState('/api/captcha')

  // Online-Fix auth modal state
  const [showOnlineFixAuthModal, setShowOnlineFixAuthModal] = useState(false)
  const [onlineFixUsername, setOnlineFixUsername] = useState('')
  const [onlineFixPassword, setOnlineFixPassword] = useState('')
  const [onlineFixAuthLoading, setOnlineFixAuthLoading] = useState(false)
  const [onlineFixAuthError, setOnlineFixAuthError] = useState('')
  const [selectedResult, setSelectedResult] = useState<TorrentResult | null>(null)

  // Sidebar and auth status state
  const [showSidebar, setShowSidebar] = useState(false)
  const [ruTrackerAuth, setRuTrackerAuth] = useState(false)
  const [onlineFixAuth, setOnlineFixAuth] = useState(false)
  const [freeTpAuth, setFreeTpAuth] = useState(false)

  // Check auth status on mount
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const response = await axios.get('http://localhost:3001/api/auth-status', {
          timeout: 5000
        })
        setRuTrackerAuth(response.data.rutracker || false)
        setOnlineFixAuth(response.data.onlinefix || false)
        setFreeTpAuth(response.data.freetp || false)
      } catch (error) {
        console.error('Failed to check auth status:', error)
      }
    }
    checkAuthStatus()
  }, [])


  const handleMagnetClick = async (id: string) => {
    try {
      const magnet = await getMagnetLink(id)
      window.location.href = magnet
    } catch (e) {
      console.error(e)
      alert('Failed to fetch magnet link')
    }
  }

  const handleOpenDetails = (result: TorrentResult) => {
    setSelectedResult(result)
  }

  const handleCloseDetails = () => {
    setSelectedResult(null)
  }

  const handleDownloadClick = (id: string, type: 'torrent' | 'repair' = 'torrent') => {
    downloadTorrent(id, type)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }

  const handleFocus = () => {
    setIsFocused(true)
  }

  const handleBlur = () => {
    setIsFocused(false)
  }

  // Clear results when search query is emptied
  useEffect(() => {
    if (!searchQuery.trim() && hasSearched) {
      setResults([])
      setHasSearched(false)
    }
  }, [searchQuery, hasSearched])

  const showResults = hasSearched || isLoading || error
  const sortedResults = sortResults(results, sortBy)

  const handleSearch = async () => {
    if (!searchQuery.trim()) return

    setHasSearched(true)
    setIsLoading(true)
    setError(null)

    try {
      const searchResults = await searchTorrents(searchQuery)
      setResults(searchResults)

      if (searchResults.length === 0) {
        setError('No results found. Try a different search term.')
      }
    } catch (error) {
      console.error('Search error:', error)
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'
      setResults([])
      setError(errorMessage)

      // Show auth modal for 401 errors
      if (errorMessage.includes('authentication required') || errorMessage.includes('🔐')) {
        setShowAuthModal(true)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthLoading(true)
    setAuthError('')
    setCaptchaError('')

    try {
      const success = await loginRuTracker(authUsername, authPassword, captchaCode)
      if (success) {
        setShowAuthModal(false)
        setShowCaptcha(false)
        setCaptchaCode('')
        setCaptchaImageLoaded(false)
        setCaptchaImageSrc('/api/captcha')
        setRuTrackerAuth(true)
        // Auto-retry search
        setTimeout(() => handleSearch(), 500)
      } else {
        if (!showCaptcha) {
          setShowCaptcha(true)
          setCaptchaImageSrc('/api/captcha?t=' + Date.now())
          setCaptchaImageLoaded(false)
          setAuthError('Login failed. Solve CAPTCHA below.')
        } else if (!captchaImageLoaded) {
          setAuthError('CAPTCHA unavailable. Try again.')
        } else {
          setAuthError('Wrong CAPTCHA. Click image to refresh.')
          setCaptchaImageSrc('/api/captcha?t=' + Date.now())
        }
      }
    } catch (error) {
      setAuthError('Network error. Check server.')
    } finally {
      setAuthLoading(false)
    }
  }

  const handleLogout = async (service: 'rutracker' | 'onlinefix' | 'freetp') => {
    try {
      await axios.post(`http://localhost:3001/api/logout/${service}`, {}, {
        timeout: 5000
      })

      if (service === 'rutracker') {
        setRuTrackerAuth(false)
      } else if (service === 'onlinefix') {
        setOnlineFixAuth(false)
      } else if (service === 'freetp') {
        setFreeTpAuth(false)
      }
    } catch (error) {
      console.error(`Failed to logout from ${service}:`, error)
    }
  }

  const handleOnlineFixAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setOnlineFixAuthLoading(true)
    setOnlineFixAuthError('')

    try {
      const response = await axios.post('http://localhost:3001/api/auth?service=of', {
        username: onlineFixUsername,
        password: onlineFixPassword
      }, {
        timeout: 30000
      })

      if (response.data.success) {
        setShowOnlineFixAuthModal(false)
        setOnlineFixUsername('')
        setOnlineFixPassword('')
        setOnlineFixAuth(true)
      } else {
        setOnlineFixAuthError('Login failed. Please check your credentials.')
      }
    } catch (error) {
      const errorMsg = axios.isAxiosError(error)
        ? error.response?.data?.error || 'Network error'
        : 'Network error. Check server.'
      setOnlineFixAuthError(errorMsg)
    } finally {
      setOnlineFixAuthLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      <AnimatePresence>
        {showAuthModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowAuthModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ duration: 0.2 }}
              className="bg-background/95 backdrop-blur-xl border border-border/50 rounded-2xl p-8 max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/20 rounded-xl border">
                    <Shield className="h-6 w-6 text-primary" />
                  </div>
                  <div className="whiteText">
                    <h2 className="text-2xl font-bold">RuTracker Login</h2>
                    <p className="text-sm">Enter credentials to search</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAuthModal(false)}
                  className="h-9 w-9 p-0 hover:bg-accent"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <form onSubmit={handleAuthSubmit} className="space-y-4 whiteText">
                {/* Username */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Username</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      className="pl-10 h-11"
                      placeholder="Username"
                      value={authUsername}
                      onChange={(e) => setAuthUsername(e.target.value)}
                      disabled={authLoading}
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="password"
                      className="pl-10 h-11"
                      placeholder="Password"
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      disabled={authLoading}
                    />
                  </div>
                </div>

                {/* CAPTCHA - ONLY when image successfully downloaded */}
                {showCaptcha && captchaImageLoaded && (
                  <div className="space-y-3 pt-2 border-t border-border/50">
                    <label className="text-sm font-medium">CAPTCHA</label>
                    <div className="space-y-2">
                      <img
                        id="captchaImg"
                        src={captchaImageSrc}
                        alt="CAPTCHA"
                        className="w-full h-20 object-contain border rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                        onLoad={() => {
                          setCaptchaImageLoaded(true)
                          setCaptchaError('')
                        }}
                        onError={() => {
                          setCaptchaImageLoaded(false)
                          setCaptchaError('Failed to load CAPTCHA')
                        }}
                        onClick={() => {
                          setCaptchaImageSrc(`/api/captcha?t=${Date.now()}`)
                        }}
                      />
                      <Input
                        id="captchaInput"
                        className="pl-10 h-11"
                        placeholder="Enter CAPTCHA digits"
                        maxLength={6}
                        value={captchaCode}
                        onChange={(e) => setCaptchaCode(e.target.value)}
                        disabled={!captchaImageLoaded}
                      />
                    </div>
                  </div>
                )}

                {/* CAPTCHA error */}
                {captchaError && (
                  <p className="text-destructive text-xs text-center p-2 bg-destructive/10 rounded">
                    {captchaError}
                  </p>
                )}

                {authError && (
                  <motion.p
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="text-destructive text-sm p-3 bg-destructive/10 border border-destructive/30 rounded-lg"
                  >
                    {authError}
                  </motion.p>
                )}

                <Button
                  type="submit"
                  className="w-full h-12"
                  disabled={authLoading ||
                    !authUsername.trim() ||
                    !authPassword.trim() ||
                    (showCaptcha && (!captchaImageLoaded || !captchaCode.trim()))}
                >
                  {authLoading ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-background border-r-transparent rounded-full mr-2" />
                      Logging in...
                    </>
                  ) : showCaptcha ? (
                    'Login with CAPTCHA'
                  ) : (
                    'Login & Search'
                  )}
                </Button>

                <p className="text-xs text-center">
                  {!showCaptcha
                    ? "Login will show CAPTCHA if needed"
                    : captchaImageLoaded
                      ? "Click CAPTCHA to refresh"
                      : "Loading CAPTCHA image..."}
                </p>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Online-Fix Auth Modal */}
      <AnimatePresence>
        {showOnlineFixAuthModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowOnlineFixAuthModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ duration: 0.2 }}
              className="bg-background/95 backdrop-blur-xl border border-border/50 rounded-2xl p-8 max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/20 rounded-xl border">
                    <Shield className="h-6 w-6 text-primary" />
                  </div>
                  <div className="whiteText">
                    <h2 className="text-2xl font-bold">Online-Fix Login</h2>
                    <p className="text-sm">Enter credentials to test</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowOnlineFixAuthModal(false)}
                  className="h-9 w-9 p-0 hover:bg-accent"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <form onSubmit={handleOnlineFixAuthSubmit} className="space-y-4 whiteText">
                {/* Username */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Username</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      className="pl-10 h-11"
                      placeholder="Username"
                      value={onlineFixUsername}
                      onChange={(e) => setOnlineFixUsername(e.target.value)}
                      disabled={onlineFixAuthLoading}
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="password"
                      className="pl-10 h-11"
                      placeholder="Password"
                      value={onlineFixPassword}
                      onChange={(e) => setOnlineFixPassword(e.target.value)}
                      disabled={onlineFixAuthLoading}
                    />
                  </div>
                </div>

                {onlineFixAuthError && (
                  <motion.p
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="text-destructive text-sm p-3 bg-destructive/10 border border-destructive/30 rounded-lg"
                  >
                    {onlineFixAuthError}
                  </motion.p>
                )}

                <Button
                  type="submit"
                  className="w-full h-12"
                  disabled={onlineFixAuthLoading ||
                    !onlineFixUsername.trim() ||
                    !onlineFixPassword.trim()}
                >
                  {onlineFixAuthLoading ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-background border-r-transparent rounded-full mr-2" />
                      Logging in...
                    </>
                  ) : (
                    'Test Login'
                  )}
                </Button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hamburger Menu Button */}
      <div className="fixed top-4 right-4 z-40">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowSidebar(true)}
          className="h-10 w-10"
        >
          <Menu className="h-6 w-6 text-foreground" />
        </Button>
      </div>

      {/* Settings Sidebar */}
      <SettingsSidebar
        isOpen={showSidebar}
        onClose={() => setShowSidebar(false)}
        ruTrackerAuth={ruTrackerAuth}
        onlineFixAuth={onlineFixAuth}
        freeTpAuth={freeTpAuth}
        onLogin={() => {
          setShowSidebar(false)
          setShowAuthModal(true)
        }}
        onOnlineFixLogin={() => {
          setShowSidebar(false)
          setShowOnlineFixAuthModal(true)
        }}
        onLogout={handleLogout}
      />

      {/* Header Container */}
      <div className="text-center pt-20 pb-8">
        <motion.h1
          initial={{ opacity: 1 }}
          animate={{
            opacity: 1,
            y: isFocused || hasSearched ? -50 : 0
          }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          className="mb-4 text-4xl tracking-tight text-foreground"
        >
          TorrentFinder
        </motion.h1>

        <motion.p
          initial={{ opacity: 1 }}
          animate={{
            opacity: isFocused || hasSearched ? 0 : 1,
            y: isFocused || hasSearched ? -50 : 0
          }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          className="text-muted-foreground max-w-2xl mx-auto px-6"
        >
          Search RuTracker.org, Online-Fix.me and FreeTP.org<br />for torrents using real-time web scraping
        </motion.p>
      </div>

      {/* Search Container */}
      <motion.div
        initial={{ y: 0 }}
        animate={{
          y: isFocused || hasSearched ? -240 : 0
        }}
        transition={{ duration: 0.6, ease: "easeInOut" }}
        className="flex items-center justify-center min-h-[40vh]"
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="w-full max-w-2xl px-6"
        >
          <div className="relative">
            <Input
              type="text"
              placeholder="Search for torrents..."
              value={searchQuery}
              onChange={handleInputChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="h-16 bg-input text-foreground placeholder:text-muted-foreground border-border text-lg rounded-full px-8 pr-16 transition-all duration-300"
              disabled={showAuthModal}
            />
            <Button
              onClick={handleSearch}
              disabled={!searchQuery.trim() || isLoading || showAuthModal}
              size="sm"
              className="absolute right-2 top-1/2 transform -translate-y-1/2 h-12 w-12 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-300 disabled:opacity-50"
            >
              <Search className="h-5 w-5" />
            </Button>
          </div>

          <div className="relative h-8 mt-2">
            {error && !isLoading && !showAuthModal && (
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-destructive text-sm text-center absolute inset-0 flex items-center justify-center"
              >
                {error}
              </motion.p>
            )}
          </div>
        </motion.div>
      </motion.div>

      {/* Results Container */}
      <AnimatePresence>
        {showResults && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
            className="fixed bottom-0 left-0 right-0 top-[180px] bg-background"
          >
            {results.length > 0 && !isLoading && !error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="flex gap-2 mb-4 pt-6 px-6 flex-wrap justify-center max-w-4xl mx-auto"
              >
                <span className="text-sm text-muted-foreground self-center mr-2">Sort by:</span>
                {sortOptions.map((option) => (
                  <Button
                    key={option.key}
                    variant={sortBy === option.key ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSortBy(option.key)}
                  >
                    {option.label}
                  </Button>
                ))}
              </motion.div>
            )}

            <div className="relative h-full">
              <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-background to-transparent z-10 pointer-events-none" />

              <div className="h-full overflow-y-auto px-6 pt-4 pb-20">
                <div className="max-w-4xl mx-auto">
                  <AnimatePresence mode="wait">
                    {isLoading ? (
                      <motion.div
                        key="loading"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="text-center py-12"
                      >
                        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                        <p className="text-muted-foreground">Searching...</p>
                        <p className="text-xs text-muted-foreground mt-2">This may take up to 30 seconds</p>
                      </motion.div>
                    ) : error ? (
                      <motion.div
                        key="error"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="text-center py-12"
                      >
                        <p className="text-destructive mb-2">{error}</p>
                        <Button
                          variant="outline"
                          onClick={() => handleSearch()}
                          disabled={!searchQuery.trim()}
                        >
                          Try Again
                        </Button>
                      </motion.div>
                    ) : sortedResults.length > 0 ? (
                      <motion.div
                        key="results"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="space-y-4"
                      >
                        {sortedResults.map((result, index) => (
                          <motion.div
                            key={result.id}
                            layout
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.03 }}
                          >
                            <TorrentResultCard
                              result={result}
                              isPlaceholder={false}
                              onMagnetClick={handleMagnetClick}
                              onDownloadClick={handleDownloadClick}
                              onOpenDetails={handleOpenDetails}
                            />
                          </motion.div>
                        ))}
                      </motion.div>
                    ) : searchQuery && !isLoading && !error ? (
                      <motion.div
                        key="no-results"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="text-center py-12"
                      >
                        <p className="text-muted-foreground">No results found for "{searchQuery}"</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          Try different keywords or check your spelling
                        </p>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
              </div>

              <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-background to-transparent pointer-events-none" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedResult && (
          <TorrentResultDetails
            result={selectedResult}
            onClose={handleCloseDetails}
            onMagnetClick={handleMagnetClick}
            onDownloadClick={handleDownloadClick}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
