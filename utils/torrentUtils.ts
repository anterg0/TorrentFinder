export interface TorrentResult {
  id: string
  name: string
  size: string
  uploadDate: string
  author: string
  tracker: string
  magnetLink?: string
  url?: string
  seeds?: string
  leeches?: string
  tags?: string[]
}

/**
 * Parse tags from a torrent title
 * Supports:
 * - Parentheses at start: "(tag1, tag2)" or "(tag1/tag2)"
 * - Brackets at end: "[tag1] [tag2] [tag3]"
 */
export function parseTagsFromTitle(title: string): string[] {
  const tags: Set<string> = new Set()

  // Parse parentheses at the beginning: "(tag1, tag2)" or "(tag1/tag2)"
  const parenthesesMatch = title.match(/^\s*\(([^)]+)\)/)
  if (parenthesesMatch) {
    const tagString = parenthesesMatch[1]
    // Split by comma or forward slash
    const parsedTags = tagString
      .split(/[,/]/)
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0)
    parsedTags.forEach(tag => tags.add(tag))
  }

  // Parse brackets at the end: "[tag1] [tag2]"
  const bracketMatches = title.match(/\[([^\]]+)\]/g)
  if (bracketMatches) {
    bracketMatches.forEach(match => {
      const tag = match.slice(1, -1).trim()
      if (tag.length > 0) {
        tags.add(tag)
      }
    })
  }

  return Array.from(tags).sort()
}

/**
 * Enrich a torrent result with parsed tags
 */
export function enrichResultWithTags(result: TorrentResult): TorrentResult {
  const parsedTags = parseTagsFromTitle(result.name)
  return {
    ...result,
    tags: [...new Set([...(result.tags || []), ...parsedTags])]
  }
}