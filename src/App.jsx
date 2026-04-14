import { useState } from 'react'
import Today from './screens/Today'
import Calendar from './screens/Calendar'
import AllCrew from './screens/AllCrew'

const NAV_ITEMS = [
  { id: 'today', label: 'TODAY', icon: '🎂' },
  { id: 'calendar', label: 'CALENDAR', icon: '📅' },
  { id: 'crew', label: 'ALL CREW', icon: '🏴‍☠️' },
]

export default function App() {
  const [screen, setScreen] = useState('today')

  return (
    <div style={styles.root}>
      {/* Today is full-screen and handles its own nav */}
      {screen === 'today' && <Today onNavigate={setScreen} />}

      {/* Calendar and AllCrew use the shared layout + nav */}
      {screen !== 'today' && (
        <>
          <div style={styles.content}>
            {screen === 'calendar' && <Calendar />}
            {screen === 'crew' && <AllCrew />}
          </div>

          <nav style={styles.nav}>
            {NAV_ITEMS.map(({ id, label, icon }) => {
              const active = screen === id
              return (
                <button
                  key={id}
                  onClick={() => setScreen(id)}
                  style={styles.navBtn}
                >
                  <span style={styles.navIcon}>{icon}</span>
                  <span style={{
                    ...styles.navLabel,
                    color: active ? '#fbbf24' : 'rgba(255,255,255,0.3)',
                  }}>
                    {label}
                  </span>
                </button>
              )
            })}
          </nav>
        </>
      )}
    </div>
  )
}

const styles = {
  root: {
    minHeight: '100dvh',
    display: 'flex',
    flexDirection: 'column',
    background: '#060d1f',
    maxWidth: 480,
    margin: '0 auto',
    position: 'relative',
  },
  content: {
    flex: 1,
    overflowY: 'auto',
    paddingBottom: 72,
  },
  nav: {
    position: 'fixed',
    bottom: 0,
    left: '50%',
    transform: 'translateX(-50%)',
    width: '100%',
    maxWidth: 480,
    display: 'flex',
    height: 68,
    background: 'rgba(6,8,20,0.98)',
    borderTop: '1px solid rgba(255,255,255,0.06)',
    padding: '10px 0 20px',
    zIndex: 100,
  },
  navBtn: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    gap: 4,
  },
  navIcon: {
    fontSize: 18,
    lineHeight: 1,
  },
  navLabel: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 8,
    fontWeight: 700,
    letterSpacing: '1px',
    textTransform: 'uppercase',
  },
}
