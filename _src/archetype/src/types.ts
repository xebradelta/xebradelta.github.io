export type ArchetypeKey =
  | 'explorer'
  | 'sage'
  | 'hero'
  | 'caregiver'
  | 'creator'
  | 'rebel'
  | 'ruler'
  | 'magician'
  | 'lover'
  | 'jester'
  | 'innocent'
  | 'everyperson'

export type ScoreMap = Partial<Record<ArchetypeKey, number>>

export type Choice = {
  label: string
  scores: ScoreMap
  note?: string
}

export type Question = {
  id: string
  prompt: string
  choices: Choice[]
  instruction?: string
}

export type Archetype = {
  key: ArchetypeKey
  name: string
  symbol: string
  drive: string
  gift: string
  shadow: string
  growth: string
  color: string
  practices: string[]
  readings: { title: string; author: string; why: string }[]
}

export type Profile = {
  scores: Record<ArchetypeKey, number>
  ranked: ArchetypeKey[]
  primary: ArchetypeKey
  secondary: ArchetypeKey[]
  shadow: string
  tension: string
  title: string
  statement: string
}
