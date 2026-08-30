import { archetypes } from './data'
import type { Profile } from './types'

const escMap: Record<string, string> = {'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&apos;'}
const esc = (s: string) => s.replace(/[&<>\"']/g, c => escMap[c] || c)

function wrap(text: string, max = 40) {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let line = ''
  for (const w of words) {
    if ((line + ' ' + w).trim().length > max && line) { lines.push(line); line = w }
    else line = (line + ' ' + w).trim()
  }
  if (line) lines.push(line)
  return lines
}

export function profileSvg(profile: Profile, name = 'Your') {
  const primary = archetypes[profile.primary]
  const top = profile.ranked.slice(0, 5)
  const cards = top.map((k, i) => {
    const a = archetypes[k]
    const x = i % 2 === 0 ? 95 : 635
    const y = 500 + Math.floor(i / 2) * 270
    const giftLines = wrap(a.gift, 42).slice(0, 4)
    return `<g transform="translate(${x} ${y})">
      <rect width="470" height="220" rx="18" fill="#101d27" stroke="#a97f3f" stroke-width="2"/>
      <circle cx="58" cy="58" r="36" fill="#172735" stroke="#d7a85c" stroke-width="2"/>
      <text x="58" y="68" text-anchor="middle" font-size="30" fill="#e7bd72">${esc(a.symbol)}</text>
      <text x="112" y="52" font-family="Georgia,serif" font-size="27" fill="#f0d7a0" letter-spacing="1">${esc(a.name.toUpperCase())}</text>
      ${giftLines.map((line,j)=>`<text x="112" y="88" dy="${j*28}" font-family="Georgia,serif" font-size="19" fill="#e7e1d5">${esc(line)}</text>`).join('')}
    </g>`
  }).join('')
  const statement = wrap(profile.statement, 68).slice(0, 4)
  const tension = wrap(profile.tension, 52).slice(0, 5)
  const growth = wrap(primary.growth, 52).slice(0, 4)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1800" viewBox="0 0 1200 1800">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#08131c"/><stop offset="0.56" stop-color="#142534"/><stop offset="1" stop-color="#090f14"/></linearGradient>
      <radialGradient id="sun" cx="50%" cy="35%" r="50%"><stop stop-color="#d69447" stop-opacity=".7"/><stop offset="1" stop-color="#d69447" stop-opacity="0"/></radialGradient>
    </defs>
    <rect width="1200" height="1800" fill="url(#bg)"/>
    <rect width="1200" height="900" fill="url(#sun)"/>
    <path d="M0 620 L180 430 L330 610 L485 360 L680 600 L850 420 L1030 625 L1200 455 L1200 900 L0 900Z" fill="#142536" opacity=".92"/>
    <path d="M0 720 L220 545 L390 730 L585 520 L760 715 L935 570 L1200 730 L1200 960 L0 960Z" fill="#0d1b25"/>
    <text x="600" y="92" text-anchor="middle" font-family="Georgia,serif" font-size="31" fill="#efe3c7" letter-spacing="7">${esc(name.toUpperCase())} ARCHETYPAL PATTERN</text>
    <text x="600" y="158" text-anchor="middle" font-family="Georgia,serif" font-size="55" font-weight="700" fill="#e3b45f" letter-spacing="2">${esc(profile.title.toUpperCase())}</text>
    <line x1="210" x2="990" y1="194" y2="194" stroke="#a77d3d"/>
    <text x="600" y="238" text-anchor="middle" font-family="Georgia,serif" font-size="25" fill="#e6c98e">${top.map(k=>archetypes[k].name.toUpperCase()).join(' • ')}</text>
    ${statement.map((line,i)=>`<text x="600" y="300" dy="${i*31}" text-anchor="middle" font-family="Georgia,serif" font-size="22" font-style="italic" fill="#eee6d6">${esc(line)}</text>`).join('')}
    <g transform="translate(405 345)">
      <circle cx="195" cy="105" r="104" fill="#0b151c" stroke="#d0a052" stroke-width="3"/>
      <text x="195" y="89" text-anchor="middle" font-family="Georgia,serif" font-size="52" fill="#e6b966">${esc(primary.symbol)}</text>
      <text x="195" y="130" text-anchor="middle" font-family="Georgia,serif" font-size="29" fill="#f0dfbd">${esc(primary.name.toUpperCase())}</text>
      <text x="195" y="160" text-anchor="middle" font-family="Georgia,serif" font-size="17" fill="#c9c3b7">CORE DRIVE</text>
    </g>
    ${cards}
    <g transform="translate(95 1330)">
      <rect width="470" height="320" rx="18" fill="#131b20" stroke="#9b6a4a" stroke-width="2"/>
      <text x="28" y="46" font-family="Georgia,serif" font-size="28" fill="#e5ad72">YOUR SHADOW</text>
      ${wrap(primary.shadow, 44).slice(0,6).map((line,i)=>`<text x="28" y="89" dy="${i*30}" font-family="Georgia,serif" font-size="19" fill="#eadfd2">${esc(line)}</text>`).join('')}
      <text x="28" y="260" font-family="Georgia,serif" font-size="21" fill="#e5ad72">Corrective</text>
      <text x="28" y="292" font-family="Georgia,serif" font-size="18" fill="#eadfd2">Notice the pattern before it chooses for you.</text>
    </g>
    <g transform="translate(635 1330)">
      <rect width="470" height="320" rx="18" fill="#101d27" stroke="#a97f3f" stroke-width="2"/>
      <text x="28" y="46" font-family="Georgia,serif" font-size="28" fill="#e3b45f">PATH FOR GROWTH</text>
      ${growth.map((line,i)=>`<text x="28" y="89" dy="${i*30}" font-family="Georgia,serif" font-size="19" fill="#eadfd2">${esc(line)}</text>`).join('')}
      <text x="28" y="225" font-family="Georgia,serif" font-size="21" fill="#e3b45f">Central tension</text>
      ${tension.map((line,i)=>`<text x="28" y="258" dy="${i*25}" font-family="Georgia,serif" font-size="16" fill="#eadfd2">${esc(line)}</text>`).join('')}
    </g>
    <text x="600" y="1718" text-anchor="middle" font-family="Georgia,serif" font-size="22" fill="#efe3c7">THIS IS A LENS FOR REFLECTION, NOT A DIAGNOSIS.</text>
    <text x="600" y="1758" text-anchor="middle" font-family="Georgia,serif" font-size="19" font-style="italic" fill="#d4ae6c">Live the gift. Watch the shadow. Keep becoming.</text>
  </svg>`
}

export function downloadSvg(svg: string, filename = 'archetype-poster.svg') {
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
