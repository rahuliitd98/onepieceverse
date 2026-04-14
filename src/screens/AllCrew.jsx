import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../supabase'

const CREW_COLORS = ['#e63946','#f4a261','#2a9d8f','#9b5de5','#f59e0b','#06b6d4','#ec4899','#84cc16']

function crewColor(crew) {
  if (!crew) return '#64748b'
  let h = 0
  for (let i = 0; i < crew.length; i++) h = crew.charCodeAt(i) + ((h << 5) - h)
  return CREW_COLORS[Math.abs(h) % CREW_COLORS.length]
}

function formatBounty(bounty) {
  if (!bounty || bounty === 0) return null
  if (bounty >= 1_000_000_000) return `฿${(bounty / 1_000_000_000).toFixed(1)}B`
  if (bounty >= 1_000_000)     return `฿${(bounty / 1_000_000).toFixed(0)}M`
  return `฿${bounty.toLocaleString()}`
}

function formatBirthday(bday) {
  if (!bday) return null
  const [mm, dd] = bday.split('-')
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${months[parseInt(mm) - 1]} ${parseInt(dd)}`
}

export default function AllCrew() {
  const [characters, setCharacters] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [crewFilter, setCrewFilter] = useState('All')

  useEffect(() => {
    async function fetchAll() {
      const { data, error } = await supabase
        .from('characters')
        .select('name, birthday, crew_name_english, bounty, devil_fruit_name, devil_fruit_type, age, status')
        .order('name')

      if (error) {
        console.error('Supabase error:', error)
        setError(error.message)
      } else {
        setCharacters(data || [])
      }
      setLoading(false)
    }
    fetchAll()
  }, [])

  const crews = useMemo(() => {
    const set = new Set(characters.map((c) => c.crew_name_english).filter(Boolean))
    return ['All', ...Array.from(set).sort()]
  }, [characters])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return characters.filter((c) => {
      const matchSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        (c.crew_name_english || '').toLowerCase().includes(q) ||
        (c.devil_fruit_name || '').toLowerCase().includes(q)
      const matchCrew = crewFilter === 'All' || c.crew_name_english === crewFilter
      return matchSearch && matchCrew
    })
  }, [characters, search, crewFilter])

  return (
    <div style={s.screen}>
      {/* Sky glow */}
      <div style={s.skyGlow} aria-hidden="true" />

      {/* Header */}
      <div style={s.header}>
        <div style={s.headerLeft}>
          <div style={s.headerTitle}>All Crew</div>
          <div style={s.headerCount}>{characters.length} members</div>
        </div>
      </div>

      {/* Search */}
      <div style={s.searchRow}>
        <div style={s.searchBox}>
          <span style={s.searchIcon}>🔍</span>
          <input
            type="text"
            placeholder="Search name, crew, devil fruit…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={s.searchInput}
          />
          {search && (
            <button style={s.clearBtn} onClick={() => setSearch('')}>✕</button>
          )}
        </div>
      </div>

      {/* Crew filter pills */}
      <div style={s.filterScroll}>
        {crews.map((crew) => {
          const active = crewFilter === crew
          const color = crew === 'All' ? '#e63946' : crewColor(crew)
          return (
            <button
              key={crew}
              onClick={() => setCrewFilter(crew)}
              style={{
                ...s.pill,
                background: active ? color : 'transparent',
                borderColor: active ? color : 'rgba(255,255,255,0.1)',
                color: active ? '#fff' : 'rgba(255,255,255,0.4)',
              }}
            >
              {crew === 'All' ? '⚓ All' : crew}
            </button>
          )
        })}
      </div>

      {/* Results count when filtering */}
      {!loading && (search || crewFilter !== 'All') && (
        <div style={s.resultsLabel}>
          {filtered.length} result{filtered.length !== 1 ? 's' : ''}
        </div>
      )}

      {/* States */}
      {error && <div style={s.stateMsg}>💀 {error}</div>}
      {loading && <div style={s.stateMsg}>⚓ Loading crew…</div>}
      {!loading && !error && filtered.length === 0 && (
        <div style={s.stateMsg}>🌊 No crew members found</div>
      )}

      {/* Character list */}
      <div style={s.list}>
        {filtered.map((c) => {
          const color = crewColor(c.crew_name_english)
          const bounty = formatBounty(c.bounty)
          const birthday = formatBirthday(c.birthday)

          return (
            <div key={c.name} style={s.row}>
              {/* Avatar */}
              <div style={{
                ...s.avatar,
                background: `linear-gradient(135deg, ${color}, ${color}66)`,
              }}>
                {c.name[0]}
              </div>

              {/* Info */}
              <div style={s.rowInfo}>
                <div style={s.rowName}>{c.name}</div>
                {c.crew_name_english && (
                  <div style={{ ...s.rowCrew, color }}>{c.crew_name_english}</div>
                )}
                {c.devil_fruit_name && (
                  <div style={s.rowFruit}>🍎 {c.devil_fruit_name}</div>
                )}
              </div>

              {/* Right side */}
              <div style={s.rowRight}>
                {bounty
                  ? <div style={s.bounty}>{bounty}</div>
                  : <div style={s.noBounty}>—</div>
                }
                {birthday && <div style={s.bday}>{birthday}</div>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const s = {
  screen: {
    minHeight: '100%',
    background: '#060d1f',
    fontFamily: "'DM Sans', sans-serif",
    paddingBottom: 32,
    position: 'relative',
  },
  skyGlow: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 200,
    background: 'radial-gradient(ellipse at 50% -10%, #0c1e4a 0%, transparent 70%)',
    pointerEvents: 'none',
  },

  // ── Header ──
  header: {
    position: 'relative',
    zIndex: 1,
    padding: '28px 20px 4px',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  headerLeft: {},
  headerTitle: {
    fontFamily: "'Bebas Neue', sans-serif",
    fontSize: 36,
    color: '#f1f5f9',
    letterSpacing: 1,
    lineHeight: 1,
  },
  headerCount: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.3)',
    fontWeight: 500,
    marginTop: 2,
  },

  // ── Search ──
  searchRow: {
    position: 'relative',
    zIndex: 1,
    padding: '12px 16px 0',
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 14,
    padding: '0 14px',
    gap: 10,
  },
  searchIcon: {
    fontSize: 14,
    opacity: 0.4,
    flexShrink: 0,
  },
  searchInput: {
    flex: 1,
    border: 'none',
    outline: 'none',
    background: 'transparent',
    color: '#f1f5f9',
    fontSize: 14,
    fontWeight: 400,
    fontFamily: "'DM Sans', sans-serif",
    padding: '13px 0',
  },
  clearBtn: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    color: 'rgba(255,255,255,0.3)',
    fontSize: 13,
    padding: '0 2px',
    flexShrink: 0,
  },

  // ── Filter pills ──
  filterScroll: {
    position: 'relative',
    zIndex: 1,
    display: 'flex',
    gap: 8,
    overflowX: 'auto',
    padding: '12px 16px',
    scrollbarWidth: 'none',
  },
  pill: {
    flexShrink: 0,
    padding: '6px 14px',
    borderRadius: 100,
    border: '1px solid',
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    fontFamily: "'DM Sans', sans-serif",
    transition: 'all 0.15s',
  },

  resultsLabel: {
    padding: '0 20px 8px',
    fontSize: 11,
    color: 'rgba(255,255,255,0.25)',
    fontWeight: 500,
    position: 'relative',
    zIndex: 1,
  },

  stateMsg: {
    textAlign: 'center',
    padding: '48px 24px',
    fontSize: 14,
    color: 'rgba(255,255,255,0.3)',
  },

  // ── List ──
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    padding: '0 16px',
    position: 'relative',
    zIndex: 1,
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 14,
    padding: '10px 14px',
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 17,
    fontWeight: 900,
    color: '#fff',
    flexShrink: 0,
  },
  rowInfo: {
    flex: 1,
    minWidth: 0,
  },
  rowName: {
    fontSize: 14,
    fontWeight: 700,
    color: '#f1f5f9',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  rowCrew: {
    fontSize: 11,
    fontWeight: 500,
    marginTop: 2,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  rowFruit: {
    fontSize: 10,
    color: 'rgba(167,139,250,0.7)',
    marginTop: 2,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },

  // ── Right ──
  rowRight: {
    textAlign: 'right',
    flexShrink: 0,
  },
  bounty: {
    fontSize: 12,
    fontWeight: 700,
    color: '#fbbf24',
    fontFamily: "'DM Sans', sans-serif",
  },
  noBounty: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.15)',
  },
  bday: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.25)',
    marginTop: 2,
  },
}
