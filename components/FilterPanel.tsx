import { useState } from 'react'
import { Button } from './ui/button'
import { motion, AnimatePresence } from 'motion/react'
import { ChevronDown, X } from 'lucide-react'

interface FilterPanelProps {
  trackers: Array<{ name: string; count: number }>
  tags: Array<{ name: string; count: number }>
  authors: Array<{ name: string; count: number }>
  selectedTrackers: string[]
  selectedTags: string[]
  selectedAuthors: string[]
  onTrackerToggle: (tracker: string) => void
  onAuthorToggle: (author: string) => void
  onTagToggle: (tag: string) => void
  onClearAll: () => void
}

export function FilterPanel({
  trackers,
  tags,
  authors,
  selectedTrackers,
  selectedTags,
  selectedAuthors,
  onTrackerToggle,
  onAuthorToggle,
  onTagToggle,
  onClearAll
}: FilterPanelProps) {
  const [isOpen, setIsOpen] = useState(false)

  const activeFilterCount = selectedTrackers.length + selectedTags.length + selectedAuthors.length

  return (
    <div className="relative">
      {/* Filter Button */}
      <Button
        variant={activeFilterCount > 0 ? 'default' : 'outline'}
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2"
      >
        <span>Filters {activeFilterCount > 0 && `(${activeFilterCount})`}</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </Button>

      {/* Filter Dropdown Panel - Opens to the left */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: 10, y: -10 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, x: 10, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute left-0 top-full mt-2 bg-card border border-border/60 rounded-lg shadow-lg p-4 z-40 w-80 max-h-96 overflow-y-auto"
          >
            {/* Trackers Section */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-foreground mb-3">Trackers</h3>
              <div className="space-y-2">
                {trackers.map((tracker) => {
                  const isDisabled = tracker.count === 0
                  const isSelected = selectedTrackers.includes(tracker.name)

                  return (
                    <button
                      key={tracker.name}
                      onClick={() => !isDisabled && onTrackerToggle(tracker.name)}
                      disabled={isDisabled}
                      className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors ${
                        isSelected
                          ? 'bg-primary text-primary-foreground border-primary'
                          : isDisabled
                            ? 'bg-accent/30 text-muted-foreground border-border/30 cursor-not-allowed'
                            : 'bg-background border-border/60 text-foreground hover:bg-accent/50'
                      }`}
                    >
                      <span className="text-sm font-medium">{tracker.name}</span>
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                        isSelected
                          ? 'bg-primary-foreground/20'
                          : isDisabled
                            ? 'text-muted-foreground'
                            : 'bg-accent text-accent-foreground'
                      }`}>
                        {tracker.count}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Authors Section */}
            {authors.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-foreground mb-3">Authors</h3>
                <div className="flex flex-wrap gap-2">
                  {authors.map((author) => (
                    <button
                      key={author.name}
                      onClick={() => onAuthorToggle(author.name)}
                      className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        selectedAuthors.includes(author.name)
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-accent/40 text-foreground hover:bg-accent/60 border border-accent/60'
                      }`}
                    >
                      {author.name}
                      <span className="text-xs opacity-70">({author.count})</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Tags Section */}
            {tags.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-foreground mb-3">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <button
                      key={tag.name}
                      onClick={() => onTagToggle(tag.name)}
                      className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        selectedTags.includes(tag.name)
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-accent/40 text-foreground hover:bg-accent/60 border border-accent/60'
                      }`}
                    >
                      {tag.name}
                      <span className="text-xs opacity-70">({tag.count})</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Clear Filters Button */}
            {activeFilterCount > 0 && (
              <div className="pt-4 border-t border-border/60">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    onClearAll()
                    setIsOpen(false)
                  }}
                  className="w-full"
                >
                  <X className="h-4 w-4 mr-2" />
                  Clear All Filters
                </Button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
