import type { Vertex } from '../types'

const DRAFT_KEY = 'roi_draft'

export function saveDraft(vertices: Vertex[]): void {
  localStorage.setItem(DRAFT_KEY, JSON.stringify(vertices))
}

export function loadDraft(): Vertex[] | null {
  const raw = localStorage.getItem(DRAFT_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as Vertex[]
  } catch {
    return null
  }
}

export function clearDraft(): void {
  localStorage.removeItem(DRAFT_KEY)
}
