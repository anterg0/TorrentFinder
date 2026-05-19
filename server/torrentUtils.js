export function parseTagsFromTitle(title) {
  const tags = new Set()
  const tagPattern = /(\b[A-Za-z0-9\s]+?)(?=\s*\[|\s*$|\.)/g
  let match
  while ((match = tagPattern.exec(title)) !== null) {
    const tag = match[1].trim().replace(/\s+/g, ' ')
    if (tag.length > 0) {
      tags.add(tag)
    }
  }
  return Array.from(tags).sort()
}

export function enrichResultWithTags(result) {
  const parsedTags = parseTagsFromTitle(result.name)
  const validSuffixTags = ['portable', 'p2p', 'gog', 'scene', 'steam-rip']
  const filteredTags = parsedTags.filter(tag => validSuffixTags.includes(tag.toLowerCase()))
  return {
    ...result,
    tags: [...new Set([...(result.tags || []), ...filteredTags])],
  }
}
