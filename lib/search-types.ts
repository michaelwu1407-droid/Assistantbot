export interface SearchResultItem {
  id: string
  type: "contact" | "deal" | "task" | "activity" | "call"
  title: string
  subtitle?: string
  url: string
  score: number
}
