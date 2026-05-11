export interface TorrentResult {
  id: string;
  name: string;
  size: string;
  uploadDate: string;
  author: string;
  tracker: string;
  magnetLink?: string;
  url?: string;
  seeds?: string;
  leeches?: string;
  tags?: string[];
}

/**
 * Parse tags from a torrent title
 * Supports:
 * - Parentheses at start: "(tag1, tag2)" or "(tag1/tag2)"
 * - Brackets at end: "[tag1] [tag2] [tag3]"
 */
export function parseTagsFromTitle(title: string): string[] {
  const tags: Set<string> = new Set();

  // Define a regex to match valid tags
  const tagPattern = /(\b[A-Za-z0-9\s]+?)(?=\s*\[|\s*$|\.)/g;

  let match;
  while ((match = tagPattern.exec(title)) !== null) {
    const tag = match[1].trim().replace(/\s+/g, ' ');
    if (tag.length > 0) {
      tags.add(tag);
    }
  }

  return Array.from(tags).sort();
}

/**
 * Enrich a torrent result with parsed tags
 */
export function enrichResultWithTags(result: TorrentResult): TorrentResult {
  const parsedTags = parseTagsFromTitle(result.name);

  // Filter and keep only the specific suffix tags
  const validSuffixTags = ['portable', 'p2p', 'gog', 'scene', 'steam-rip'];
  const filteredTags = parsedTags.filter(tag => validSuffixTags.includes(tag.toLowerCase()));

  return {
    ...result,
    tags: [...new Set([...(result.tags || []), ...filteredTags])],
  };
}