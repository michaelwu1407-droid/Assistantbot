/**
 * Fuzzy Search Utility
 *
 * Lightweight fuzzy matching for CRM search — finds "Jhon" when
 * searching for "John". Uses Levenshtein distance with a configurable
 * threshold. No external dependencies.
 */

/**
 * Calculate Levenshtein distance between two strings.
 */
function levenshtein(a: string, b: string): number {
  const la = a.length;
  const lb = b.length;

  if (la === 0) return lb;
  if (lb === 0) return la;

  const matrix: number[][] = [];

  for (let i = 0; i <= la; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= lb; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= la; i++) {
    for (let j = 1; j <= lb; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return matrix[la][lb];
}

/**
 * Score how well a query matches a target string.
 * Returns a value between 0 (no match) and 1 (exact match).
 */
export function fuzzyScore(query: string, target: string): number {
  const q = query.toLowerCase().trim();
  const t = target.toLowerCase().trim();

  if (q === t) return 1;
  if (t.includes(q)) return 0.9;
  if (t.startsWith(q)) return 0.95;

  const distance = levenshtein(q, t);
  const maxLen = Math.max(q.length, t.length);
  if (maxLen === 0) return 1;

  const similarity = 1 - distance / maxLen;
  return Math.max(0, similarity);
}

export interface SearchableItem {
  id: string;
  searchableFields: string[];
}

export interface SearchResult<T extends SearchableItem> {
  item: T;
  score: number;
}

/**
 * Fuzzy search across a list of items.
 * Each item provides searchableFields that are checked against the query.
 */
export function fuzzySearch<T extends SearchableItem>(
  items: T[],
  query: string,
  threshold = 0.4
): SearchResult<T>[] {
  if (!query.trim()) return items.map((item) => ({ item, score: 1 }));

  const results: SearchResult<T>[] = [];

  for (const item of items) {
    let bestScore = 0;
    for (const field of item.searchableFields) {
      // Check each word in the field
      const words = field.split(/\s+/);
      for (const word of words) {
        const score = fuzzyScore(query, word);
        bestScore = Math.max(bestScore, score);
      }
      // Also check the full field
      const fullScore = fuzzyScore(query, field);
      bestScore = Math.max(bestScore, fullScore);
    }

    if (bestScore >= threshold) {
      results.push({ item, score: bestScore });
    }
  }

  return results.sort((a, b) => b.score - a.score);
}
