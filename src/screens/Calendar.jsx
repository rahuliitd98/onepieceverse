import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../supabase'

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const CREW_COLORS = ['#e63946','#f4a261','#2a9d8f','#9b5de5','#f59e0b','#06b6d4','#ec4899','#84cc16']
function crewColor(name) {
  if (!name) return '#e63946'
  let h = 0
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return CREW_COLORS[Math.abs(h) % CREW_COLORS.length]
}

export default function Calendar() {
  const [allBirthdays, setAllBirthdays] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewDate, setViewDate] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState(null)

  const today = new Date()

  useEffect(() => {
    async function fetchAll() {
      const { data, error } = await supabase
        .from('characters')
        .select('name, birthday, crew_name_english')
        .not('birthday', 'is', null)

      if (error) {
        console.error('Supabase error:', error)
      } else if (data) {
        setAllBirthdays(data)
      }
      setLoading(false)
    }
    fetchAll()
  }, [])

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()

  const birthdayMap = useMemo(() => {
    const map = {}
    for (const c of allBirthdays) {
      if (!c.birthday) continue
      if (!map[c.birthday]) map[c.birthday] = []
      map[c.birthday].push(c)
    }
    return map
  }, [allBirthdays])

  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const monthStr = String(month + 1).padStart(2, '0')
  const dayKey = (d) => `${monthStr}-${String(d).padStart(2, '0')}`

  const prevMonth = () => { setViewDate(new Date(year, month - 1, 1)); setSelectedDay(null) }
  const nextMonth = () => { setViewDate(new Date(year, month + 1, 1)); setSelectedDay(null) }

  const selectedChars = selectedDay ? (birthdayMap[dayKey(selectedDay)] || []) : []
  const isToday = (d) =>
    d === today.getDate() && month === today.getMonth() && year === today.getFullYear()

  return (
    <div style={s.screen}>
      {/* Sky glow */}
      <div style={s.skyGlow} aria-hidden="true" />

      {/* Month nav */}
      <div style={s.monthNav}>
        <button style={s.arrow} onClick={prevMonth}>‹</button>
        <div style={s.monthInfo}>
          <div style={s.monthName}>{MONTHS[month]}</div>
          <div style={s.yearLabel}>{year}</div>
        </div>
        <button style={s.arrow} onClick={nextMonth}>›</button>
      </div>

      {loading ? (
        <div style={s.centerMsg}>⚓ Loading...</div>
      ) : (
        <>
          {/* Day headers */}
          <div style={s.dayHeaders}>
            {DAYS.map((d, i) => (
              <div key={i} style={s.dayHeader}>{d}</div>
            ))}
          </div>

          {/* Grid */}
          <div style={s.grid}>
            {cells.map((d, i) => {
              if (!d) return <div key={`e-${i}`} />
              const chars = birthdayMap[dayKey(d)] || []
              const hasBirthday = chars.length > 0
              const selected = selectedDay === d
              const todayCell = isToday(d)

              return (
                <button
                  key={d}
                  onClick={() => setSelectedDay(selected ? null : d)}
                  style={{
                    ...s.cell,
                    ...(todayCell && !selected ? s.cellToday : {}),
                    ...(selected ? s.cellSelected : {}),
                  }}
                >
                  <span style={{
                    ...s.dayNum,
                    ...(todayCell && !selected ? s.dayNumToday : {}),
                    ...(selected ? s.dayNumSelected : {}),
                  }}>
                    {d}
                  </span>
                  {hasBirthday && (
                    <div style={s.dots}>
                      {chars.slice(0, 3).map((_, idx) => (
                        <span key={idx} style={{
                          ...s.dot,
                          background: selected ? 'rgba(255,255,255,0.7)' : '#e63946',
                        }} />
                      ))}
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          {/* Selected day panel */}
          {selectedDay && (
            <div style={s.panel}>
              <div style={s.panelHeader}>
                {selectedChars.length === 0
                  ? `No birthdays — ${MONTHS[month]} ${selectedDay}`
                  : `🎂  ${MONTHS[month]} ${selectedDay}`}
              </div>
              {selectedChars.map((c) => {
                const color = crewColor(c.name)
                return (
                  <div key={c.name} style={s.panelRow}>
                    <div style={{ ...s.panelAvatar, background: `linear-gradient(135deg, ${color}, ${color}88)` }}>
                      {c.name[0]}
                    </div>
                    <div style={s.panelInfo}>
                      <div style={s.panelName}>{c.name}</div>
                      {c.crew_name_english && (
                        <div style={{ ...s.panelCrew, color }}>{c.crew_name_english}</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}

const s = {
  screen: {
    minHeight: '100%',
    background: '#060d1f',
    fontFamily: "'DM Sans', sans-serif",
    position: 'relative',
  },
  skyGlow: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 220,
    background: 'radial-gradient(ellipse at 50% -10%, #0c1e4a 0%, transparent 70%)',
    pointerEvents: 'none',
  },

  // ── Month nav ──
  monthNav: {
    position: 'relative',
    zIndex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '24px 20px 16px',
  },
  arrow: {
    width: 38,
    height: 38,
    borderRadius: 12,
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.08)',
    color: 'rgba(255,255,255,0.6)',
    fontSize: 22,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 1,
  },
  monthInfo: {
    textAlign: 'center',
  },
  monthName: {
    fontFamily: "'Bebas Neue', sans-serif",
    fontSize: 28,
    color: '#f1f5f9',
    letterSpacing: 1,
    lineHeight: 1,
  },
  yearLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.3)',
    fontWeight: 500,
    letterSpacing: 1,
    marginTop: 2,
  },

  // ── Day headers ──
  dayHeaders: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    padding: '0 12px 6px',
    position: 'relative',
    zIndex: 1,
  },
  dayHeader: {
    textAlign: 'center',
    fontSize: 10,
    fontWeight: 700,
    color: 'rgba(255,255,255,0.2)',
    letterSpacing: 0.5,
    paddingBottom: 4,
  },

  // ── Grid ──
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: 4,
    padding: '0 12px 16px',
    position: 'relative',
    zIndex: 1,
  },
  cell: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    aspectRatio: '1',
    borderRadius: 10,
    background: 'transparent',
    border: '1px solid transparent',
    cursor: 'pointer',
    gap: 3,
    padding: 2,
  },
  cellToday: {
    border: '1px solid rgba(251,191,36,0.4)',
    background: 'rgba(251,191,36,0.06)',
  },
  cellSelected: {
    background: '#e63946',
    border: '1px solid rgba(255,255,255,0.2)',
  },
  dayNum: {
    fontSize: 13,
    fontWeight: 500,
    color: 'rgba(255,255,255,0.5)',
    lineHeight: 1,
  },
  dayNumToday: {
    color: '#fbbf24',
    fontWeight: 800,
  },
  dayNumSelected: {
    color: '#fff',
    fontWeight: 700,
  },
  dots: {
    display: 'flex',
    gap: 2,
    alignItems: 'center',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: '50%',
    display: 'block',
  },

  // ── Panel ──
  panel: {
    margin: '4px 16px 24px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 18,
    overflow: 'hidden',
    position: 'relative',
    zIndex: 1,
  },
  panelHeader: {
    padding: '12px 16px',
    fontSize: 12,
    fontWeight: 700,
    color: '#e63946',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    letterSpacing: 0.3,
  },
  panelRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
  },
  panelAvatar: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 15,
    fontWeight: 900,
    color: '#fff',
    flexShrink: 0,
  },
  panelInfo: {
    flex: 1,
    minWidth: 0,
  },
  panelName: {
    fontSize: 14,
    fontWeight: 700,
    color: '#f1f5f9',
  },
  panelCrew: {
    fontSize: 11,
    fontWeight: 500,
    marginTop: 2,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },

  centerMsg: {
    textAlign: 'center',
    padding: 60,
    fontSize: 16,
    color: 'rgba(255,255,255,0.3)',
    fontFamily: "'DM Sans', sans-serif",
  },
}
