import { archetypes } from './data'
import type { ArchetypeKey, Profile, ScoreMap } from './types'

const keys = Object.keys(archetypes) as ArchetypeKey[]

export function emptyScores(): Record<ArchetypeKey, number> {
  return Object.fromEntries(keys.map(k => [k, 0])) as Record<ArchetypeKey, number>
}

export function addScores(base: Record<ArchetypeKey, number>, delta: ScoreMap) {
  const next = { ...base }
  for (const key of keys) next[key] += delta[key] || 0
  return next
}

function tension(primary: ArchetypeKey, ranked: ArchetypeKey[]) {
  const top = new Set(ranked.slice(0, 5))
  const pairs: Array<[ArchetypeKey, ArchetypeKey, string]> = [
    ['explorer', 'caregiver', 'Freedom vs. obligation — learning to stay loyal without disappearing inside responsibility.'],
    ['sage', 'hero', 'Understanding vs. action — knowing when truth-seeking has earned enough confidence to move.'],
    ['creator', 'ruler', 'Possibility vs. structure — protecting originality without letting systems become cages.'],
    ['rebel', 'lover', 'Independence vs. belonging — resisting control without confusing closeness with captivity.'],
    ['hero', 'caregiver', 'Strength vs. tenderness — helping others without turning yourself into a perpetual mission.'],
    ['sage', 'lover', 'Analysis vs. intimacy — understanding experience without standing outside it.']
  ]
  for (const [a, b, text] of pairs) if (top.has(a) && top.has(b)) return text
  return `Develop the gift of the ${archetypes[primary].name} without letting its shadow make your choices for you.`
}

function titleFor(primary: ArchetypeKey, secondary: ArchetypeKey[]) {
  const combo = [primary, ...secondary.slice(0, 2)].join('-')
  const titles: Record<string, string> = {
    'explorer-sage-hero': 'The Principled Explorer',
    'explorer-hero-sage': 'The Principled Explorer',
    'hero-sage-caregiver': 'The Warrior-Mentor',
    'sage-explorer-hero': 'The Truth-Seeking Pathfinder',
    'caregiver-hero-sage': 'The Guardian of Conviction',
    'creator-explorer-sage': 'The Inventive Pathfinder',
    'ruler-caregiver-hero': 'The Steward-Guardian',
    'rebel-sage-explorer': 'The Principled Dissenter',
    'magician-sage-creator': 'The Transformative Thinker',
    'lover-caregiver-everyperson': 'The Devoted Connector'
  }
  return titles[combo] || `The ${archetypes[primary].name}-${archetypes[secondary[0]]?.name || 'Path'}`
}

function statementFor(primary: ArchetypeKey, secondaries: ArchetypeKey[]) {
  const p = archetypes[primary]
  const s = secondaries.map(k => archetypes[k].name)
  return `${p.gift} Your strongest supporting patterns — ${s.join(', ')} — shape how that drive becomes action, relationship, and meaning.`
}

export function buildProfile(scores: Record<ArchetypeKey, number>): Profile {
  const ranked = [...keys].sort((a, b) => scores[b] - scores[a])
  const primary = ranked[0]
  const secondary = ranked.slice(1, 5)
  const shadow = archetypes[primary].shadow
  return {
    scores,
    ranked,
    primary,
    secondary,
    shadow,
    tension: tension(primary, ranked),
    title: titleFor(primary, secondary),
    statement: statementFor(primary, secondary)
  }
}

export function normalizedScores(profile: Profile) {
  const max = Math.max(...Object.values(profile.scores), 1)
  return profile.ranked.slice(0, 6).map(k => ({
    key: k,
    name: archetypes[k].name,
    value: Math.round((profile.scores[k] / max) * 100)
  }))
}
