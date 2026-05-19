import type { SearchResultItem } from "@/lib/search-types"

export async function globalSearchClient(query: string): Promise<SearchResultItem[]> {
  const trimmedQuery = query.trim()
  if (trimmedQuery.length < 2) return []

  const response = await fetch("/api/search/global", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: trimmedQuery }),
  })

  if (!response.ok) {
    throw new Error(`Search failed (${response.status})`)
  }

  const data = await response.json()
  return Array.isArray(data?.results) ? data.results : []
}
