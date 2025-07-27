export interface TorrentResult {
  id: string
  name: string
  size: string
  uploadDate: string
  author: string
  tracker: string
  magnetLink?: string
  url?: string
}