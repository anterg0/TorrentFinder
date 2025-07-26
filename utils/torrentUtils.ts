export interface TorrentResult {
  id: string
  name: string
  size: string
  uploadDate: string
  category: string
  tracker: string
  magnetLink?: string
  url?: string
}