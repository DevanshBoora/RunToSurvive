import React, { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Splash from './components/Splash.jsx'
import Dashboard from './components/Dashboard.jsx'
import ScorchZone from './components/ScorchZone.jsx'
import './styles.css'

export default function App() {
  const [screen, setScreen] = useState('splash') // splash | dashboard | scorch | blizzard
  const [transitioning, setTransitioning] = useState(false)
  const [selectedCharacter, setSelectedCharacter] = useState(() => {
    try { return localStorage.getItem('selectedCharacter') || 'solar-ranger' } catch { return 'solar-ranger' }
  })

  useEffect(() => {
    try { localStorage.setItem('selectedCharacter', selectedCharacter) } catch {}
  }, [selectedCharacter])

  return (
    <div className="app-root">
      <AnimatePresence mode="wait">
        {screen === 'splash' && (
          <motion.div key="splash" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Splash onContinue={() => setScreen('dashboard')} />
          </motion.div>
        )}

        {screen === 'dashboard' && (
          <motion.div key="dashboard" initial={{ opacity: 0, filter: 'blur(6px)' }} animate={{ opacity: 1, filter: 'blur(0px)' }} exit={{ opacity: 0 }}>
            <Dashboard
              onEnterScorch={() => {
                // Direct route to gameplay (no intros)
                setTransitioning(true)
                setTimeout(() => { setScreen('scorch'); setTransitioning(false) }, 200)
              }}
              onPreviewBlizzard={() => {
                // For now, show an alert since Blizzard zone is in preview
                alert('🌨️ Blizzard Zone - Coming Soon!\n\nThis frozen wasteland will challenge you with:\n• Sub-zero temperatures\n• Blinding snowstorms\n• Ice-based survival challenges\n\nStay tuned for this chilling adventure!')
              }}
              selectedCharacter={selectedCharacter}
              onSelectCharacter={setSelectedCharacter}
            />
          </motion.div>
        )}

        {screen === 'scorch' && (
          <motion.div key="scorch" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <ScorchZone
              selectedCharacter={selectedCharacter}
              onExit={() => setScreen('dashboard')}
              onRestart={() => {
                // Quick reset: go to dashboard and immediately relaunch scorch
                setTransitioning(true)
                setScreen('dashboard')
                setTimeout(() => { setScreen('scorch'); setTransitioning(false) }, 150)
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {transitioning && (
        <div className="heat-transition" />
      )}
    </div>
  )
}
