import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../supabase'

const TEST_IMAGE =
  'https://blmhkjrfhctkjqqimkpx.supabase.co/storage/v1/object/public/characters/luffy-chibi-one-piece-sky-background-wallpaper.png'

const NAV = [
  { id: 'today',    label: 'TODAY',    icon: '🎂' },
  { id: 'calendar', label: 'CALENDAR', icon: '📅' },
  { id: 'crew',     label: 'ALL CREW', icon: '🏴‍☠️' },
]

const STARS = [
  { x: 12, y:  7, size: 2 },
  { x: 30, y:  4, size: 1 },
  { x: 47, y: 11, size: 2 },
  { x: 22, y: 19, size: 1 },
  { x: 63, y:  6, size: 2 },
  { x: 40, y: 27, size: 1 },
  { x: 75, y: 14, size: 2 },
  { x: 18, y: 33, size: 1 },
  { x: 85, y: 22, size: 2 },
  { x: 57, y: 30, size: 1 },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTodayString() {
  const d = new Date()
  return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getDateDisplay() {
  return new Date()
    .toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    .toUpperCase()
}

// Returns array of MM-dd strings for the next `count` days (excluding today)
function getUpcomingDays(count = 7) {
  const days = []
  const base = new Date()
  for (let i = 1; i <= count; i++) {
    const d = new Date(base)
    d.setDate(base.getDate() + i)
    days.push(
      `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    )
  }
  return days
}

// Score a character by richness of data — higher = more to show
function scoreCharacter(c) {
  let score = 0
  if (c.image_url)         score += 10
  if (c.bounty > 0)        score += 3
  if (c.devil_fruit_name)  score += 2
  if (c.crew_name_english) score += 2
  if (c.age)               score += 1
  if (c.height)            score += 1
  if (c.status)            score += 1
  return score
}

function formatBountyFull(bounty) {
  const n = Number(bounty)
  if (!bounty || isNaN(n) || n === 0) return null
  return '฿ ' + n.toLocaleString()
}

// "05-04" → "MAY 4"
function fmtBday(bday) {
  if (!bday) return ''
  const [mm, dd] = bday.split('-')
  const M = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']
  return `${M[parseInt(mm) - 1]} ${parseInt(dd)}`
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Stars() {
  return (
    <>
      {STARS.map((star, i) => (
        <div key={i} aria-hidden="true" style={{
          position: 'absolute',
          left: `${star.x}%`,
          top:  `${star.y}%`,
          width:  star.size,
          height: star.size,
          borderRadius: '50%',
          background: '#fff',
          opacity: 0.7,
          pointerEvents: 'none',
        }} />
      ))}
    </>
  )
}

function Moon() {
  return (
    <div aria-hidden="true" style={{ position: 'absolute', top: 22, right: 24, width: 44, height: 44, zIndex: 2 }}>
      <div style={{
        position: 'absolute', inset: 0,
        borderRadius: '50%',
        background: '#f7e27a',
        boxShadow: '0 0 30px #f7e27a55',
      }} />
      <div style={{
        position: 'absolute',
        width: 38, height: 38,
        borderRadius: '50%',
        background: '#1a2448',
        top: -3, left: 9,
      }} />
    </div>
  )
}

function StatCard({ label, value }) {
  return (
    <div style={s.statCard}>
      <div style={s.statLabel}>{label}</div>
      <div style={s.statValue}>{value}</div>
    </div>
  )
}

// Row in the "this week" list
function WeekRow({ c }) {
  const CREW_COLORS = ['#e63946','#f4a261','#2a9d8f','#9b5de5','#f59e0b','#06b6d4','#ec4899','#84cc16']
  let h = 0
  const name = c.name || ''
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  const color = CREW_COLORS[Math.abs(h) % CREW_COLORS.length]

  return (
    <div style={s.weekRow}>
      <div style={{ ...s.weekAvatar, background: `linear-gradient(135deg, ${color}, ${color}88)` }}>
        {name[0]}
      </div>
      <div style={s.weekMid}>
        <div style={s.weekName}>{name}</div>
        {c.crew_name_english && <div style={s.weekCrew}>{c.crew_name_english}</div>}
      </div>
      <div style={s.weekDate}>{fmtBday(c.birthday)}</div>
    </div>
  )
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function Today({ onNavigate }) {
  const [character,     setCharacter]     = useState(null)
  const [todayCount,    setTodayCount]    = useState(0)
  const [weekBirthdays, setWeekBirthdays] = useState([])
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState(null)

  const todayStr    = useMemo(() => getTodayString(), [])
  const dateDisplay = useMemo(() => getDateDisplay(),  [])

  useEffect(() => {
    async function fetch() {

      // 1. Fetch everyone born today
      const { data: todayData, error: err1 } = await supabase
        .from('characters')
        .select('*')
        .eq('birthday', todayStr)

      if (err1) {
        console.error('Supabase error:', err1)
        setError(err1.message)
        setLoading(false)
        return
      }

      if (todayData && todayData.length > 0) {
        // Pick the richest character
        const sorted = [...todayData].sort((a, b) => scoreCharacter(b) - scoreCharacter(a))
        setCharacter(sorted[0])
        setTodayCount(todayData.length)
      } else {
        // No birthday today — fetch next 7 days
        const upcoming = getUpcomingDays(7)
        const { data: weekData, error: err2 } = await supabase
          .from('characters')
          .select('name, birthday, crew_name_english')
          .in('birthday', upcoming)
          .order('birthday')

        if (!err2 && weekData) {
          // Sort by proximity (the upcoming array is already ordered day+1…day+7)
          const sorted = weekData.sort(
            (a, b) => upcoming.indexOf(a.birthday) - upcoming.indexOf(b.birthday)
          )
          setWeekBirthdays(sorted)
        }
      }

      setLoading(false)
    }
    fetch()
  }, [todayStr])

  const imageUrl  = character?.image_url || TEST_IMAGE
  const bountyStr = formatBountyFull(character?.bounty)
  const crewLine  = [character?.crew_name_english, character?.crew_name]
    .filter(Boolean).join(' · ')

  const hasBirthday = !loading && !error && !!character

  return (
    <div style={s.screen}>
      <Stars />
      <Moon />

      {/* ── Date bar ── */}
      <div style={s.dateBar}>{dateDisplay}</div>

      {/* ══════════════════════════════════════════
          CASE A — Birthday today
      ══════════════════════════════════════════ */}
      {hasBirthday && (
        <>
          {/* Image zone */}
          <div style={s.imageZone}>
            <div style={s.footGlow} aria-hidden="true" />
            <img
              src={imageUrl}
              alt={character.name}
              style={s.characterImg}
              draggable={false}
            />
          </div>

          {/* Fade */}
          <div style={s.fade} aria-hidden="true" />

          {/* Info */}
          <div style={s.info}>
            <h1 style={s.name}>{character.name}</h1>
            {crewLine && <p style={s.crew}>{crewLine}</p>}

            {/* "X others share this birthday" */}
            {todayCount > 1 && (
              <p style={s.othersNote}>
                +{todayCount - 1} other{todayCount > 2 ? 's' : ''} share this birthday
              </p>
            )}

            <div style={s.divider} />

            <div style={s.statRow}>
              {character.age    && <StatCard label="AGE"    value={`${character.age} yrs`} />}
              {character.height && <StatCard label="HEIGHT" value={character.height}        />}
              {character.status && <StatCard label="STATUS" value={character.status}        />}
            </div>

            {bountyStr && (
              <div style={s.bountyRow}>
                <span style={s.bountyLabel}>BOUNTY</span>
                <span style={s.bountyValue}>{bountyStr}</span>
              </div>
            )}

            {character.devil_fruit_name && (
              <div style={s.fruitRow}>
                <span>🍎</span>
                <span style={s.fruitMuted}>Devil Fruit ·</span>
                <span style={s.fruitBold}>{character.devil_fruit_name}</span>
                {character.devil_fruit_type && (
                  <>
                    <span style={s.fruitMuted}>·</span>
                    <span style={s.fruitBold}>{character.devil_fruit_type}</span>
                  </>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════
          CASE B — No birthday today
      ══════════════════════════════════════════ */}
      {!loading && !error && !character && (
        <>
          {/* Empty sky zone with label */}
          <div style={s.emptyHero}>
            <div style={s.emptyMoonGlow} aria-hidden="true" />
            <div style={s.emptyIcon}>🌊</div>
            <div style={s.emptyTitle}>NO BIRTHDAY</div>
            <div style={s.emptySubtitle}>TODAY</div>
          </div>

          {/* This week panel */}
          <div style={s.emptyPanel}>
            {weekBirthdays.length > 0 ? (
              <>
                <div style={s.weekHeader}>
                  <span style={s.weekHeaderDot} />
                  BIRTHDAYS THIS WEEK
                </div>
                <div style={s.weekList}>
                  {weekBirthdays.slice(0, 6).map((c) => (
                    <WeekRow key={c.name + c.birthday} c={c} />
                  ))}
                </div>
              </>
            ) : (
              <div style={s.emptyWeek}>
                <div style={s.emptyWeekIcon}>⚓</div>
                <div style={s.emptyWeekText}>No birthdays this week either.</div>
                <div style={s.emptyWeekSub}>The crew is quiet for now.</div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Loading / error ── */}
      {loading && <div style={s.stateMsg}>⚓ Loading…</div>}
      {!loading && error && <div style={{ ...s.stateMsg, color: '#e63946' }}>💀 {error}</div>}

      {/* ── Nav ── */}
      <nav style={s.nav}>
        {NAV.map(({ id, label, icon }) => (
          <button key={id} onClick={() => onNavigate(id)} style={s.navBtn}>
            <span style={s.navIcon}>{icon}</span>
            <span style={{
              ...s.navLabel,
              color: id === 'today' ? '#f5d76e' : 'rgba(255,255,255,0.25)',
            }}>
              {label}
            </span>
          </button>
        ))}
      </nav>
    </div>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = {
  screen: {
    position: 'fixed',
    top: 0, bottom: 0,
    left: '50%',
    transform: 'translateX(-50%)',
    width: '100%',
    maxWidth: 480,
    background: 'linear-gradient(175deg, #0e1f5e 0%, #162448 25%, #1a1035 55%, #100818 100%)',
    overflow: 'hidden',
    fontFamily: "'DM Sans', sans-serif",
  },

  dateBar: {
    position: 'absolute',
    top: 20, left: 0, right: 0,
    textAlign: 'center',
    fontSize: 11, fontWeight: 500,
    color: 'rgba(255,255,255,0.35)',
    letterSpacing: '2.5px',
    zIndex: 2, pointerEvents: 'none',
  },

  // ── Birthday state ──
  imageZone: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: '55%',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    zIndex: 1, pointerEvents: 'none',
    overflow: 'hidden',
  },
  footGlow: {
    position: 'absolute',
    bottom: 0, left: '50%',
    transform: 'translateX(-50%)',
    width: '60%', height: 24,
    background: 'rgba(230,80,80,0.15)',
    filter: 'blur(14px)',
    borderRadius: '50%',
    zIndex: 2,
  },
  characterImg: {
    position: 'relative', zIndex: 3,
    height: '100%', width: '100%',
    objectFit: 'contain',
    objectPosition: 'bottom center',
    mixBlendMode: 'lighten',
    userSelect: 'none',
  },
  fade: {
    position: 'absolute',
    top: '43%', left: 0, right: 0,
    height: '16%',
    background: 'linear-gradient(to bottom, transparent, #100818)',
    zIndex: 2, pointerEvents: 'none',
  },
  info: {
    position: 'absolute',
    top: '55%', bottom: 68,
    left: 0, right: 0,
    padding: '10px 20px 0',
    zIndex: 3,
  },
  name: {
    fontFamily: "'Bebas Neue', sans-serif",
    fontSize: 32, fontWeight: 400,
    color: '#fff',
    letterSpacing: '2px',
    textAlign: 'center',
    margin: 0, marginBottom: 4,
    lineHeight: 1.1,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  crew: {
    fontSize: 9, fontWeight: 500,
    color: 'rgba(255,255,255,0.35)',
    textAlign: 'center',
    letterSpacing: '0.8px',
    margin: 0,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  othersNote: {
    fontSize: 9, fontWeight: 500,
    color: 'rgba(245,215,110,0.45)',
    textAlign: 'center',
    letterSpacing: '0.5px',
    margin: '4px 0 0',
  },
  divider: {
    height: 1,
    background: 'rgba(255,255,255,0.07)',
    margin: '12px 0',
  },
  statRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: 6, marginBottom: 8,
  },
  statCard: {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 10, padding: 8,
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', gap: 3,
  },
  statLabel: {
    fontSize: 7, fontWeight: 700,
    color: 'rgba(255,255,255,0.28)',
    letterSpacing: '1.5px',
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  statValue: {
    fontSize: 11, fontWeight: 700,
    color: '#fff', textAlign: 'center',
  },
  bountyRow: {
    background: 'rgba(245,215,110,0.06)',
    border: '1px solid rgba(245,215,110,0.13)',
    borderRadius: 10,
    padding: '8px 14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  bountyLabel: {
    fontSize: 7, fontWeight: 700,
    color: 'rgba(245,215,110,0.5)',
    letterSpacing: '1.5px',
    textTransform: 'uppercase',
  },
  bountyValue: {
    fontFamily: "'Bebas Neue', sans-serif",
    fontSize: 16, color: '#f5d76e',
    letterSpacing: '0.5px',
  },
  fruitRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5, fontSize: 8,
    flexWrap: 'wrap',
  },
  fruitMuted: { color: 'rgba(255,255,255,0.3)' },
  fruitBold:  { color: 'rgba(255,255,255,0.65)', fontWeight: 700 },

  // ── Empty / no-birthday state ──
  emptyHero: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: '52%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
    gap: 4,
  },
  emptyMoonGlow: {
    position: 'absolute',
    width: 180, height: 180,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(14,31,94,0.6) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 8,
    position: 'relative',
  },
  emptyTitle: {
    fontFamily: "'Bebas Neue', sans-serif",
    fontSize: 36,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: '4px',
    lineHeight: 1,
    position: 'relative',
  },
  emptySubtitle: {
    fontFamily: "'Bebas Neue', sans-serif",
    fontSize: 20,
    color: 'rgba(255,255,255,0.2)',
    letterSpacing: '8px',
    position: 'relative',
  },

  emptyPanel: {
    position: 'absolute',
    top: '52%', bottom: 68,
    left: 0, right: 0,
    padding: '0 20px',
    overflowY: 'auto',
    zIndex: 3,
  },

  // Week list
  weekHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 9, fontWeight: 700,
    color: 'rgba(255,255,255,0.25)',
    letterSpacing: '2px',
    textTransform: 'uppercase',
    marginBottom: 10,
    paddingTop: 4,
  },
  weekHeaderDot: {
    width: 5, height: 5,
    borderRadius: '50%',
    background: '#e63946',
    display: 'inline-block',
    flexShrink: 0,
  },
  weekList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  weekRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 12,
    padding: '9px 12px',
  },
  weekAvatar: {
    width: 34, height: 34,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 14, fontWeight: 900,
    color: '#fff',
    flexShrink: 0,
  },
  weekMid: {
    flex: 1, minWidth: 0,
  },
  weekName: {
    fontSize: 13, fontWeight: 700,
    color: '#f1f5f9',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  weekCrew: {
    fontSize: 10, fontWeight: 400,
    color: 'rgba(255,255,255,0.3)',
    marginTop: 1,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  weekDate: {
    fontSize: 10, fontWeight: 700,
    color: '#f5d76e',
    letterSpacing: '0.5px',
    flexShrink: 0,
  },

  // "Nothing this week" fallback
  emptyWeek: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    paddingTop: 24,
    gap: 6,
  },
  emptyWeekIcon: { fontSize: 28 },
  emptyWeekText: {
    fontSize: 13, fontWeight: 600,
    color: 'rgba(255,255,255,0.3)',
  },
  emptyWeekSub: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.15)',
  },

  stateMsg: {
    position: 'absolute',
    top: '45%', left: 0, right: 0,
    textAlign: 'center',
    fontSize: 14,
    color: 'rgba(255,255,255,0.3)',
    zIndex: 5,
  },

  // ── Nav ──
  nav: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: 68,
    background: 'rgba(6,8,20,0.98)',
    borderTop: '1px solid rgba(255,255,255,0.06)',
    display: 'flex',
    padding: '10px 0 20px',
    zIndex: 10,
  },
  navBtn: {
    flex: 1,
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    gap: 4,
    background: 'transparent', border: 'none', cursor: 'pointer',
  },
  navIcon:  { fontSize: 18, lineHeight: 1 },
  navLabel: {
    fontSize: 8, fontWeight: 700,
    letterSpacing: '1px',
    textTransform: 'uppercase',
  },
}
