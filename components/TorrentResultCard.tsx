import { Download, Magnet, HardDrive, Clock, ArrowUp, ArrowDown, ExternalLink, Link2 } from 'lucide-react'
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

  const handleDownloadClick = () => {
    if (!isPlaceholder) {
      if (isOnlineFix && result.url) {
        // For Online-Fix, open the FTP directory with game name
        if (result.gameName) {
          const ftpUrl = `https://uploads.online-fix.me:2053/torrents/${encodeURIComponent(result.gameName)}/`
          window.open(ftpUrl, '_blank')
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

        {/* Split Magnet/Download Button */}
        <div className="flex shrink-0">
          <Button
            size="sm"
            className="rounded-r-none border-r border-primary-foreground/20 px-3"
            disabled={isPlaceholder || (isOnlineFix ? !result.url : !onMagnetClick)}
            onClick={handleMagnetClick}
            title={isOnlineFix ? (result.url ? "Open game page" : "Page not available") : (result.magnetLink ? "Open magnet link" : "Magnet link not available")}
          >
            {isOnlineFix ? <Link2 className="w-4 h-4" /> : <Magnet className="w-4 h-4" />}
          </Button>
          <Button
            size="sm"
            className="rounded-l-none px-3"
            disabled={isPlaceholder || (isOnlineFix ? !result.gameName : !onDownloadClick)}
            onClick={handleDownloadClick}
            title={isOnlineFix ? (result.gameName ? "Open FTP directory" : "Game name not available") : (result.url ? "Open RuTracker page" : "Page not available")}
          >
            {isOnlineFix ? <ExternalLink className="w-4 h-4" /> : <Download className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </Card>
  )
}