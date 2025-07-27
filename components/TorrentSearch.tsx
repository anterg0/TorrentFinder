'use client'

import { useState, useEffect } from 'react'
import { Input } from './ui/input'
import { Button } from './ui/button'
import { motion, AnimatePresence } from 'motion/react'
import { TorrentResultCard } from './TorrentResultCard'
import { TorrentResult } from '../utils/torrentUtils'
import { Search } from 'lucide-react'
import axios from 'axios'

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
        // Extract numeric value from size string for proper sorting
        const parseSize = (sizeStr: string) => {
          const match = sizeStr.match(/(\d+\.?\d*)\s*(GB|MB|KB|TB)/i)
          if (!match) return 0
          const size = parseFloat(match[1])
          const unit = match[2].toUpperCase() as keyof typeof multipliers
          const multipliers = { KB: 1, MB: 1024, GB: 1024 * 1024, TB: 1024 * 1024 * 1024 }
          return size * (multipliers[unit] || 0)
        }
        return parseSize(a.size) - parseSize(b.size)
      case 'date':
        return new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime()
      default:
        return 0
    }
  })
}

// Real API search function
export async function searchTorrents(query: string): Promise<TorrentResult[]> {
  try {
    console.log(`Searching for: "${query}"`)
    
    // First try to check if server is running
    const healthResponse = await axios.get('http://localhost:3001/api/health', {
      timeout: 5000
    })
    console.log('Server health check:', healthResponse.data)
    
    // If health check passes, make the search request
    const response = await axios.get(`http://localhost:3001/api/search`, {
      params: { q: query },
      timeout: 45000 // 45 second timeout for scraping
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
      } else if (error.response?.status === 400) {
        throw new Error('❌ Invalid search query. Please try different search terms.')
      } else if (error.response?.status === 500) {
        throw new Error('❌ Server error occurred while searching. Please try again.')
      }
    }
    throw new Error('❌ Failed to search torrents. Please check your internet connection and try again.')
  }
}

export function TorrentSearch() {
  const [searchQuery, setSearchQuery] = useState('')
  const [results, setResults] = useState<TorrentResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [sortBy, setSortBy] = useState<SortOption>('name')
  const [isFocused, setIsFocused] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Clear results when search query is emptied
  useEffect(() => {
    if (!searchQuery.trim() && hasSearched) {
      setResults([])
      setHasSearched(false)
    }
  }, [searchQuery, hasSearched])

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
      setResults([])
      setError(error instanceof Error ? error.message : 'An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
    if (e.target.value.trim()) {
      setError(null)
    }
  }

  const handleFocus = () => {
    setIsFocused(true)
  }

  const handleBlur = () => {
    if (!searchQuery.trim() && !hasSearched) {
      setIsFocused(false)
    }
  }

  const displayResults = results
  const sortedResults = sortResults(displayResults, sortBy)
  const showResults = hasSearched

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Header Container */}
      <div className="text-center pt-20 pb-8">
        {/* Title - stays visible and moves up */}
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
        
        {/* Description - fades away when search is focused */}
        <motion.p 
          initial={{ opacity: 1 }}
          animate={{ 
            opacity: isFocused || hasSearched ? 0 : 1,
            y: isFocused || hasSearched ? -50 : 0
          }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          className="text-muted-foreground max-w-2xl mx-auto px-6"
        >
          Search RuTracker.org for torrents using real-time web scraping
        </motion.p>
      </div>

      {/* Search Container - moves from center to top, positioned higher when description fades */}
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
          {/* Search field with embedded search button */}
          <div className="relative">
            <Input
              type="text"
              placeholder="Search torrents on RuTracker..."
              value={searchQuery}
              onChange={handleInputChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="h-16 bg-input text-foreground placeholder:text-muted-foreground border-border text-lg rounded-full px-8 pr-16 transition-all duration-300"
            />
            <Button
              onClick={handleSearch}
              disabled={!searchQuery.trim() || isLoading}
              size="sm"
              className="absolute right-2 top-1/2 transform -translate-y-1/2 h-12 w-12 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-300 disabled:opacity-50"
            >
              <Search className="h-5 w-5" />
            </Button>
          </div>
          
          {/* Error message - positioned absolutely to prevent layout shift */}
          <div className="relative h-8 mt-2">
            {error && !isLoading && (
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

      {/* Results Container - Fixed size, appears when search is active */}
      <AnimatePresence>
        {showResults && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
            className="fixed bottom-0 left-0 right-0 h-[60vh] bg-background"
          >
            {/* Sort Options */}
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

            {/* Results with faded edges */}
            <div className="relative h-full">
              {/* Fade gradient at top */}
              <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-background to-transparent z-10 pointer-events-none" />
              
              {/* Scrollable results area */}
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
                        <p className="text-muted-foreground">Searching RuTracker...</p>
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
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.03 }}
                          >
                            <TorrentResultCard result={result} isPlaceholder={false} />
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

              {/* Fade gradient at bottom */}
              <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-background to-transparent pointer-events-none" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}