import { Download, Magnet, HardDrive, Clock } from 'lucide-react'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Card } from './ui/card'
import { TorrentResult } from '../utils/torrentUtils'

interface TorrentResultCardProps {
  result: TorrentResult & {
    magnetLink?: string
    url?: string
  }
  isPlaceholder?: boolean
  onMagnetClick?: (id: string) => void
  onDownloadClick?: (id: string) => void
}

export function TorrentResultCard({ result, isPlaceholder = false, onMagnetClick, onDownloadClick }: TorrentResultCardProps) {
  const handleMagnetClick = () => {
    if (!isPlaceholder && onMagnetClick) {
      onMagnetClick(result.id)
    }
  }

  const handleDownloadClick = () => {
    if (!isPlaceholder && onDownloadClick) {
      onDownloadClick(result.id)
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
          </div>

          <div className="flex gap-2">
            <Badge variant="outline" className="text-xs">
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
            disabled={isPlaceholder || !onMagnetClick}
            onClick={handleMagnetClick}
            title={result.magnetLink ? "Open magnet link" : "Magnet link not available"}
          >
            <Magnet className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            className="rounded-l-none px-3"
            disabled={isPlaceholder || !onDownloadClick}
            onClick={handleDownloadClick}
            title={result.url ? "Open RuTracker page" : "Page not available"}
          >
            <Download className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  )
}