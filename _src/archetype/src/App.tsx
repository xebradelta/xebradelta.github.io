import { useEffect, useMemo, useState } from 'react'
import { Compass, BookOpen, Shield, Sparkles, Download, RotateCcw, PenLine, ChevronRight, CheckCircle2 } from 'lucide-react'
import { archetypes, questions } from './data'
import { addScores, buildProfile, emptyScores, normalizedScores } from './engine'
import { downloadSvg, profileSvg } from './poster'
import type { ArchetypeKey, Profile } from './types'

type View = 'home' | 'quiz' | 'results' | 'practice' | 'journal'
type JournalEntry = { id: string; date: string; text: string }

const STORAGE = 'archetype-mvp-state-v1'

function loadState() {
  try { return JSON.parse(localStorage.getItem(STORAGE) || '{}') } catch { return {} }
}

export default function App() {
  const saved = loadState()
  const [view, setView] = useState<View>(saved.profile ? 'results' : 'home')
  const [index, setIndex] = useState(0)
  const [scores, setScores] = useState<Record<ArchetypeKey, number>>(emptyScores())
  const [profile, setProfile] = useState<Profile | null>(saved.profile || null)
  const [name, setName] = useState(saved.name || '')
  const [completedPractices, setCompletedPractices] = useState<string[]>(saved.completedPractices || [])
  const [journal, setJournal] = useState<JournalEntry[]>(saved.journal || [])
  const [journalText, setJournalText] = useState('')

  useEffect(() => {
    localStorage.setItem(STORAGE, JSON.stringify({ profile, name, completedPractices, journal }))
  }, [profile, name, completedPractices, journal])

  const daily = useMemo(() => {
    if (!profile) return null
    const pool = profile.ranked.slice(0, 4).flatMap(k => archetypes[k].practices.map(p => ({ archetype: k, text: p })))
    const day = Math.floor(Date.now() / 86400000)
    return pool[day % pool.length]
  }, [profile])

  function startQuiz() {
    setIndex(0); setScores(emptyScores()); setProfile(null); setView('quiz')
  }

  function choose(choiceScores: Partial<Record<ArchetypeKey, number>>) {
    const next = addScores(scores, choiceScores)
    if (index === questions.length - 1) {
      const p = buildProfile(next)
      setScores(next); setProfile(p); setView('results')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      setScores(next); setIndex(i => i + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  function resetAll() {
    localStorage.removeItem(STORAGE)
    setProfile(null); setScores(emptyScores()); setIndex(0); setCompletedPractices([]); setJournal([]); setView('home')
  }

  function saveJournal() {
    const text = journalText.trim()
    if (!text) return
    setJournal([{ id: crypto.randomUUID(), date: new Date().toISOString(), text }, ...journal])
    setJournalText('')
  }

  return <div className="app-shell">
    <header className="topbar">
      <button className="brand" onClick={() => setView(profile ? 'results' : 'home')}><Compass size={22}/> Archetype</button>
      <nav>
        {profile && <>
          <button onClick={() => setView('results')}>Profile</button>
          <button onClick={() => setView('practice')}>Today</button>
          <button onClick={() => setView('journal')}>Journal</button>
        </>}
      </nav>
    </header>

    {view === 'home' && <main className="hero-page">
      <section className="hero-copy">
        <div className="eyebrow">Jung-inspired self-reflection</div>
        <h1>Find the pattern underneath how you live.</h1>
        <p>Not a diagnosis. Not a four-letter box. A structured reflection on what drives you, how you make meaning, where your strengths become shadows, and what you may want to develop next.</p>
        <div className="hero-actions">
          <button className="primary" onClick={startQuiz}>Begin the assessment <ChevronRight size={18}/></button>
          <span>{questions.length} scenario questions • ~8–12 minutes</span>
        </div>
      </section>
      <section className="feature-grid">
        <article><Compass/><h3>Core pattern</h3><p>Explorer, Sage, Hero, Caregiver and more — interpreted as a stack rather than a single label.</p></article>
        <article><Shield/><h3>Shadow</h3><p>See where a strength may turn into avoidance, control, martyrdom, rigidity, or escape.</p></article>
        <article><Sparkles/><h3>Daily practice</h3><p>Turn the profile into small behavioral experiments instead of leaving it as personality trivia.</p></article>
      </section>
    </main>}

    {view === 'quiz' && <main className="quiz-page">
      <div className="progress"><span style={{width:`${((index+1)/questions.length)*100}%`}}/></div>
      <div className="quiz-meta">Question {index + 1} of {questions.length}</div>
      <h2>{questions[index].prompt}</h2>
      {questions[index].instruction && <p className="instruction">{questions[index].instruction}</p>}
      <div className="choices">
        {questions[index].choices.map((choice, i) => <button key={i} onClick={() => choose(choice.scores)}>
          <span className="choice-letter">{String.fromCharCode(65+i)}</span><span>{choice.label}</span>
        </button>)}
      </div>
    </main>}

    {view === 'results' && profile && <Results profile={profile} name={name} setName={setName} onPractice={()=>setView('practice')} onRetake={startQuiz} onReset={resetAll}/>} 

    {view === 'practice' && profile && daily && <main className="practice-page">
      <div className="eyebrow">Today's practice</div>
      <div className="practice-hero">
        <div className="big-symbol">{archetypes[daily.archetype].symbol}</div>
        <div><h1>{archetypes[daily.archetype].name} practice</h1><p>{daily.text}</p></div>
      </div>
      <button className={completedPractices.includes(daily.text) ? 'completed primary' : 'primary'} onClick={()=>setCompletedPractices(p=>p.includes(daily.text)?p:[...p,daily.text])}>
        <CheckCircle2 size={18}/>{completedPractices.includes(daily.text) ? 'Completed today' : 'Mark complete'}
      </button>
      <section className="readings">
        <h2><BookOpen size={22}/> Suggested reading</h2>
        {profile.ranked.slice(0,3).flatMap(k=>archetypes[k].readings).slice(0,3).map((r,i)=><article key={i}><strong>{r.title}</strong><span>{r.author}</span><p>{r.why}</p></article>)}
      </section>
    </main>}

    {view === 'journal' && profile && <main className="journal-page">
      <div className="eyebrow">Reflection journal</div>
      <h1>What are you noticing?</h1>
      <p className="muted">Your journal stays in this browser in this MVP. It is not uploaded anywhere.</p>
      <textarea value={journalText} onChange={e=>setJournalText(e.target.value)} placeholder="Where did your archetypal pattern help you today? Where did its shadow show up?"/>
      <button className="primary" onClick={saveJournal}><PenLine size={18}/> Save reflection</button>
      <div className="journal-list">
        {journal.length === 0 ? <div className="empty">No reflections yet.</div> : journal.map(e=><article key={e.id}><time>{new Date(e.date).toLocaleDateString()}</time><p>{e.text}</p></article>)}
      </div>
    </main>}
  </div>
}

function Results({profile,name,setName,onPractice,onRetake,onReset}:{profile:Profile,name:string,setName:(v:string)=>void,onPractice:()=>void,onRetake:()=>void,onReset:()=>void}) {
  const top = profile.ranked.slice(0,5)
  const bars = normalizedScores(profile)
  const svg = profileSvg(profile, name.trim() || 'Your')
  const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  return <main className="results-page">
    <div className="result-head">
      <div className="eyebrow">Your archetypal pattern</div>
      <h1>{profile.title}</h1>
      <div className="stack">{top.map(k=><span key={k}>{archetypes[k].name}</span>)}</div>
      <p>{profile.statement}</p>
    </div>

    <section className="results-grid">
      <div className="profile-card core-card">
        <div className="core-symbol">{archetypes[profile.primary].symbol}</div>
        <div><small>Core archetype</small><h2>{archetypes[profile.primary].name}</h2><p>{archetypes[profile.primary].drive}</p></div>
      </div>
      <div className="profile-card"><small>Central tension</small><h3>{profile.tension}</h3></div>
      <div className="profile-card shadow-card"><small>Shadow pattern</small><h3>{profile.shadow}</h3><p><strong>Growth:</strong> {archetypes[profile.primary].growth}</p></div>
    </section>

    <section className="score-panel"><h2>Your strongest patterns</h2>{bars.map(b=><div className="score-row" key={b.key}><span>{b.name}</span><div><i style={{width:`${b.value}%`}}/></div><strong>{b.value}</strong></div>)}</section>

    <section className="poster-section">
      <div className="poster-controls">
        <div><h2>Your poster</h2><p className="muted">Generated locally from your results. The SVG can be printed or imported into a design tool.</p></div>
        <label>Your name<input value={name} onChange={e=>setName(e.target.value)} placeholder="Optional"/></label>
        <button className="primary" onClick={()=>downloadSvg(profileSvg(profile,name.trim()||'Your'), 'archetype-poster.svg')}><Download size={18}/> Download SVG</button>
      </div>
      <img className="poster-preview" src={dataUrl} alt={`Poster for ${profile.title}`}/>
    </section>

    <section className="action-strip">
      <button className="primary" onClick={onPractice}>Start today's practice <ChevronRight size={18}/></button>
      <button onClick={onRetake}><RotateCcw size={18}/> Retake assessment</button>
      <button className="danger-link" onClick={onReset}>Clear local data</button>
    </section>
  </main>
}
