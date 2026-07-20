import { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { Calendar } from 'lucide-react'
import axios from 'axios'

interface LatestItem {
  id: string
  title: string
  url: string
  image: string
  date: string
  editInfo?: string
  releaseDate?: string
  playVia?: string
  author?: string
  category?: string
  tracker: string
}

interface LatestUpdatesProps {
  activeTab: 'onlinefix' | 'freetp'
  onTabChange: (tab: 'onlinefix' | 'freetp') => void
  onOpenDetails: (result: any) => void
}

export function LatestUpdates({ activeTab, onTabChange, onOpenDetails }: LatestUpdatesProps) {
  const [items, setItems] = useState<Record<string, LatestItem[]>>({ onlinefix: [], freetp: [] })
  const [page, setPage] = useState<Record<string, number>>({ onlinefix: 0, freetp: 0 })
  const [hasMore, setHasMore] = useState<Record<string, boolean>>({ onlinefix: true, freetp: true })
  const [loading, setLoading] = useState<Record<string, boolean>>({ onlinefix: false, freetp: false })

  const fetchPage = async (tab: string, pageNum: number) => {
    setLoading(prev => ({ ...prev, [tab]: true }))
    try {
      const res = await axios.get(`http://localhost:3001/api/latest/${tab}`, {
        params: { page: pageNum }
      })
      const data = res.data
      setItems(prev => ({
        ...prev,
        [tab]: pageNum === 0 ? data.items : [...prev[tab], ...data.items]
      }))
      setHasMore(prev => ({ ...prev, [tab]: data.hasMore }))
    } catch (e) {
      console.error(`Failed to fetch ${tab} latest:`, e)
    } finally {
      setLoading(prev => ({ ...prev, [tab]: false }))
    }
  }

  // Fetch Online-Fix on mount
  useEffect(() => {
    fetchPage('onlinefix', 0)
  }, [])

  // Fetch selected tab if empty
  useEffect(() => {
    if (items[activeTab].length === 0 && !loading[activeTab]) {
      fetchPage(activeTab, 0)
    }
  }, [activeTab])

  const handleTabChange = (tab: 'onlinefix' | 'freetp') => {
    onTabChange(tab)
  }

  const handleShowMore = () => {
    const nextPage = page[activeTab] + 1
    const fetchPageNum = activeTab === 'freetp' ? nextPage + 1 : nextPage
    setPage(prev => ({ ...prev, [activeTab]: nextPage }))
    fetchPage(activeTab, fetchPageNum)
  }

  const handleCardClick = (item: LatestItem) => {
    onOpenDetails({
      id: item.id,
      name: item.title,
      url: item.url,
      gameName: item.title,
      tracker: item.tracker,
      size: 'N/A',
      uploadDate: item.date,
      author: item.author || item.tracker,
      seeds: 'N/A',
      leeches: 'N/A',
      tags: []
    })
  }

  const currentItems = items[activeTab]
  const tabLoading = loading[activeTab]

  function formatDate(dateStr: string, tracker: string): string {
    if (tracker === 'Online-Fix') {
      const d = new Date(dateStr)
      if (isNaN(d.getTime())) return dateStr
      return d.toLocaleDateString('en-GB', {
        day: 'numeric', month: 'short', year: 'numeric'
      }).replace(/ /g, ' ')
    }
    // FreeTP dates are already formatted by the site
    return dateStr
  }

  return (
    <div className="max-w-6xl mx-auto px-6 pt-8 pb-4">
      {/* Tab pills */}
      <div className="flex items-center justify-center gap-2 mb-6">
        {([
          { id: 'onlinefix' as const, label: 'Online-Fix' },
          { id: 'freetp' as const, label: 'FreeTP' }
        ]).map(({ id, label }) => (
          <button
            key={id}
            onClick={() => handleTabChange(id)}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors border ${
              activeTab === id
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background text-white border-border/60 hover:bg-accent/50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {tabLoading && currentItems.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mb-4" />
          <p className="text-zinc-300 text-sm">Loading latest updates...</p>
        </div>
      )}

      {/* Cards grid */}
      {currentItems.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {currentItems.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => handleCardClick(item)}
              className="rounded-3xl border border-border/60 bg-card overflow-hidden cursor-pointer hover:border-primary/40 transition-colors group"
            >
              {/* Image */}
              <div className="aspect-video bg-accent/40 relative overflow-hidden">
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                    onError={(e) => { (e.target as HTMLImageElement).src = '/images/image_unavailable.png' }}
                  />
                ) : (
                  <img
                    src="/images/image_unavailable.png"
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>

              {/* Content */}
              <div className="p-4 space-y-2">
                <h3 className="font-semibold text-sm leading-snug line-clamp-2 text-white group-hover:text-primary transition-colors">
                  {item.title}
                </h3>

                <div className="flex items-center gap-3 text-xs text-zinc-300">
                  {item.date && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(item.date, item.tracker)}
                    </span>
                  )}
                </div>

                {item.editInfo && item.editInfo.length > 0 && (
                  <p className="text-xs text-zinc-300 line-clamp-1">{item.editInfo}</p>
                )}

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {item.releaseDate && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-700 text-zinc-300">
                      {item.releaseDate}
                    </span>
                  )}
                  {item.playVia && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-700 text-zinc-300">
                      {item.playVia}
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Show More */}
      {hasMore[activeTab] && currentItems.length > 0 && (
        <div className="flex justify-center mt-6">
          <button
            onClick={handleShowMore}
            disabled={tabLoading}
            className={`px-6 py-2 rounded-full text-xs font-medium transition-colors border ${
              tabLoading
                ? 'bg-accent/30 text-zinc-500 border-border/30 cursor-not-allowed'
                : 'bg-background text-white border-border/60 hover:bg-accent/50'
            }`}
          >
            {tabLoading ? 'Loading...' : 'Show More'}
          </button>
        </div>
      )}
    </div>
  )
}
