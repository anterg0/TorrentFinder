import { Download, Magnet, HardDrive, Clock, ArrowUp, ArrowDown, ExternalLink, Link2, Wrench } from 'lucide-react'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Card } from './ui/card'
import { TorrentResult } from '../utils/torrentUtils'

interface TorrentResultCardProps {
  result: TorrentResult & {
    magnetLink?: string
    url?: string
    gameName?: string
  }
  isPlaceholder?: boolean
  onMagnetClick?: (id: string) => void
  onDownloadClick?: (id: string) => void
}

export function TorrentResultCard({ result, isPlaceholder = false, onMagnetClick, onDownloadClick }: TorrentResultCardProps) {
  const isOnlineFix = result.tracker === 'Online-Fix'
  const isRuTracker = result.tracker === 'RuTracker'
  const isFreeTP = result.tracker === 'FreeTp'

  const handleMagnetClick = () => {
    if (!isPlaceholder) {
      if (isOnlineFix) {
        // For Online-Fix, open the game page URL
        if (result.url) {
          window.open(result.url, '_blank')
        }
      } else if (onMagnetClick) {
        onMagnetClick(result.id)
      }
    }
  }

  const handleDownloadClick = (type: 'torrent' | 'repair' = 'torrent') => {
    if (!isPlaceholder) {
      if (isOnlineFix) {
        if (result.gameName && result.url) {
          const params = new URLSearchParams({
            gameName: result.gameName,
            gameUrl: result.url,
            type
          })
          window.location.href = `http://localhost:3001/api/download/${result.id}?${params.toString()}`
        }
      } else if (onDownloadClick) {
        onDownloadClick(result.id)
      }
    }
  }

  const getTrackerBadgeColor = () => {
    switch (result.tracker) {
      case 'Online-Fix':
        return 'bg-blue-900 text-white border-blue-900'
      case 'RuTracker':
        return 'bg-red-500 text-white border-red-500'
      case 'FreeTp':
        return 'bg-green-700 text-white border-green-700'
      default:
        return ''
    }
  }

  return (
    <Card className={`p-6 hover:bg-accent/50 transition-colors cursor-pointer group ${isPlaceholder ? 'opacity-70' : ''}`}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="mb-3 group-hover:text-primary transition-colors truncate text-lg">
            {result.name}
          </h3>

          <div className="flex items-center gap-6 text-sm text-muted-foreground mb-2">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4" />
              <span>{result.size}</span>
            </div>

            {result.uploadDate && result.uploadDate !== 'Unknown' && (
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>{result.uploadDate}</span>
              </div>
            )}

            {result.tracker === 'RuTracker' && result.seeds && result.seeds !== 'Unknown' && (
              <div className="flex items-center gap-2 text-green-500">
                <ArrowUp className="w-4 h-4" />
                <span>{result.seeds}</span>
              </div>
            )}

            {result.tracker === 'RuTracker' && result.leeches && result.leeches !== 'Unknown' && (
              <div className="flex items-center gap-2 text-red-500">
                <ArrowDown className="w-4 h-4" />
                <span>{result.leeches}</span>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Badge variant="outline" className={`text-xs ${getTrackerBadgeColor()}`}>
              {result.tracker}
            </Badge>
            {result.author && result.author !== 'Unknown' && (
              <Badge variant="secondary" className="text-xs">
                {result.author}
              </Badge>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex shrink-0">
          {/* Magnet / Page button */}
          <Button
            size="sm"
            className="rounded-r-none border-r border-primary-foreground/20 px-3"
            disabled={isPlaceholder || (isOnlineFix ? !result.url : !onMagnetClick)}
            onClick={handleMagnetClick}
          >
            {isOnlineFix ? <Link2 className="w-4 h-4" /> : <Magnet className="w-4 h-4" />}
          </Button>

          {/* NEW: Repair / Wrench button - only for Online-Fix */}
          {isOnlineFix && (
            <Button
              size="sm"
              className="rounded-none border-x border-primary-foreground/20 px-3"
              disabled={isPlaceholder || !result.gameName}
              onClick={() => handleDownloadClick('repair')}
              title="Download Fix Repair (.rar)"
            >
              <Wrench className="w-4 h-4" />
            </Button>
          )}

          {/* Download button */}
          <Button
            size="sm"
            className={`${isOnlineFix ? 'rounded-l-none' : 'rounded-l-none'} px-3`}
            disabled={isPlaceholder || (isOnlineFix ? !result.gameName : !onDownloadClick)}
            onClick={() => handleDownloadClick('torrent')}
          >
            <Download className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  )
}