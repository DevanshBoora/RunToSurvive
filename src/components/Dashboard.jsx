import React, { useState, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'

export default function Dashboard({ onEnterScorch, onPreviewBlizzard, selectedCharacter, onSelectCharacter }) {
  const [scorchStyle, setScorchStyle] = useState({})
  const [blizzardStyle, setBlizzardStyle] = useState({})
  const [co2, setCo2] = useState(420)
  const [earthOpen, setEarthOpen] = useState(false)

  // Simulate real-time CO₂ display; gently fluctuates upward
  useEffect(() => {
    const id = setInterval(() => {
      setCo2(v => {
        const drift = (Math.random() - 0.4) * 0.02 // slight random
        const trend = 0.0015 // gentle upward trend
        const next = Math.max(350, Math.min(999, +(v + drift + trend).toFixed(2)))
        return next
      })
    }, 1500)
    return () => clearInterval(id)
  }, [])

  // Accessibility: close earth modal on Esc
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') setEarthOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const makeParallaxHandler = useCallback(setter => (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const dx = (e.clientX - (rect.left + rect.width / 2)) / rect.width
    const dy = (e.clientY - (rect.top + rect.height / 2)) / rect.height
    const rx = (-dy * 10).toFixed(2)
    const ry = (dx * 12).toFixed(2)
    setter({
      '--rx': `${rx}deg`,
      '--ry': `${ry}deg`,
      '--tx': `${dx * 16}px`,
      '--ty': `${dy * 16}px`,
    })
  }, [])

  const resetParallax = useCallback(setter => () => setter({ '--rx': '0deg', '--ry': '0deg', '--tx': '0px', '--ty': '0px' }), [])

  return (
    <div className="dashboard">
      <div className="dashboard-bg" />
      <div className="dashboard-center">
        <motion.h1 className="pick-world" initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
          PICK A WORLD
        </motion.h1>
        
        <div className="ready-indicator">
          {selectedCharacter && (
            <motion.div 
              className="ready-badge"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              ✓ Character Selected - Ready to Survive!
            </motion.div>
          )}
        </div>

        <div className="world-cards">
          <motion.button
            className="world-card scorch"
            whileHover={{ y: -6, boxShadow: '0 20px 60px rgba(255,100,0,0.4)' }}
            whileTap={{ scale: 0.98 }}
            onClick={onEnterScorch}
            style={scorchStyle}
            onMouseMove={makeParallaxHandler(setScorchStyle)}
            onMouseLeave={resetParallax(setScorchStyle)}
          >
            <div className="card-overlay" />
            <div className="neon-ring hot" />
            <div className="sweep hot" />
            <div className="card-title">SCORCH ZONE</div>
            <div className="card-thermo hot">50°C+</div>
            <div className="thermometer hot">
              <div className="tube"><span className="mercury" /></div>
              <div className="bulb" />
            </div>
            {/* Big red thermometer accent */}
            <div className="thermo big hot">
              <div className="tube"><span className="mercury" /></div>
              <div className="bulb" />
            </div>
            <div className="flame-edge">
              <span className="flame f1" /><span className="flame f2" /><span className="flame f3" />
            </div>
            <div className="mirage" />
            <div className="fx scorch">
              <div className="heat-haze" />
              <div className="solar-flare" />
              <div className="embers">
                {Array.from({ length: 14 }).map((_, i) => (
                  <span className="ember" key={i} />
                ))}
              </div>
              <div className="sun-glare" />
              <div className="heat-lines">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span className="line" key={i} />
                ))}
              </div>
              <div className="dunes">
                <span className="d dune1" />
                <span className="d dune2" />
                <span className="d dune3" />
              </div>
            </div>
            <div className="texture cracked" />
          </motion.button>

          <motion.div
            className="world-card blizzard"
            whileHover={{ y: -6, boxShadow: '0 20px 60px rgba(120,180,255,0.25)' }}
            whileTap={{ scale: 0.98 }}
            onClick={onPreviewBlizzard}
            style={blizzardStyle}
            onMouseMove={makeParallaxHandler(setBlizzardStyle)}
            onMouseLeave={resetParallax(setBlizzardStyle)}
          >
            <div className="card-overlay" />
            <div className="neon-ring cold" />
            <div className="sweep cold" />
            <div className="card-title">BLIZZARD ZONE</div>
            <div className="card-thermo cold">-30°C</div>
            <div className="thermometer cold">
              <div className="tube"><span className="mercury" /></div>
              <div className="bulb" />
            </div>
            <div className="frost-edge" />
            <div className="fx blizzard">
              <div className="aurora-sweep" />
              <div className="snow-layer near">
                {Array.from({ length: 10 }).map((_, i) => (
                  <span className="flake" key={i} />
                ))}
              </div>
              <div className="snow-layer mid">
                {Array.from({ length: 10 }).map((_, i) => (
                  <span className="flake" key={i} />
                ))}
              </div>
              <div className="snow-layer far">
                {Array.from({ length: 10 }).map((_, i) => (
                  <span className="flake" key={i} />
                ))}
              </div>
              <div className="frost-shards">
                {Array.from({ length: 8 }).map((_, i) => (
                  <span className="shard" key={i} />
                ))}
              </div>
              <div className="glaciers">
                <span className="peak p1" />
                <span className="peak p2" />
                <span className="peak p3" />
              </div>
              <div className="gusts">
                {Array.from({ length: 4 }).map((_, i) => (
                  <span className="gust" key={i} />
                ))}
              </div>
              <div className="breath" />
              <div className="icicles">
                {Array.from({ length: 6 }).map((_, i) => (
                  <span className="ice" key={i} />
                ))}
              </div>
            </div>
            <div className="texture aurora" />
            <div className="locked">PREVIEW</div>
          </motion.div>
        </div>
      </div>

      <aside className="side-panel left">
        <h3>SELECT YOUR CHARACTER</h3>
        <div className="char-info">
          {selectedCharacter === 'solar-ranger' && (
            <div className="char-description">
              <strong>Solar Ranger</strong><br />
              <small>Desert survival expert with heat resistance</small>
            </div>
          )}
          {selectedCharacter === 'sand-ranger' && (
            <div className="char-description">
              <strong>Forest Runner</strong><br />
              <small>Agile explorer with nature adaptation</small>
            </div>
          )}
          {selectedCharacter === 'ice-sentinel' && (
            <div className="char-description">
              <strong>Ice Sentinel</strong><br />
              <small>Cold weather specialist with endurance</small>
            </div>
          )}
        </div>
        <div className="char-grid">
          {/* Dunes image (maps to solar-ranger) */}
          <div className={`char-card env dunes ${selectedCharacter==='solar-ranger'?'selected':''}`} role="button" tabIndex={0} aria-label="Select Dunes Runner" onClick={()=>onSelectCharacter?.('solar-ranger')} onKeyDown={(e)=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onSelectCharacter?.('solar-ranger')}}}>
            <div className="frame" />
            <div className="portrait env-img dunes" />
          </div>

          {/* Forest/trees image rotating (maps to sand-ranger) */}
          <div className={`char-card env forest spin ${selectedCharacter==='sand-ranger'?'selected':''}`} role="button" tabIndex={0} aria-label="Select Forest Runner" onClick={()=>onSelectCharacter?.('sand-ranger')} onKeyDown={(e)=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onSelectCharacter?.('sand-ranger')}}}>
            <div className="frame" />
            <div className="portrait env-img forest" />
          </div>

          {/* Snowcaps image (maps to ice-sentinel) */}
          <div className={`char-card env snow ${selectedCharacter==='ice-sentinel'?'selected':''}`} role="button" tabIndex={0} aria-label="Select Snow Runner" onClick={()=>onSelectCharacter?.('ice-sentinel')} onKeyDown={(e)=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onSelectCharacter?.('ice-sentinel')}}}>
            <div className="frame" />
            <div className="portrait env-img snow" />
          </div>
        </div>
      </aside>

      <aside className="side-panel right">
        <h3>VIRTUAL EARTH</h3>
        <div className="earth-widget" role="button" tabIndex={0} aria-label="Open Virtual Earth" onClick={() => setEarthOpen(true)} onKeyDown={(e)=>{ if(e.key==='Enter' || e.key===' ') { e.preventDefault(); setEarthOpen(true) } }}>
          <div className="earth-scene">
            <svg className="earth-svg" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" aria-label="Spinning Earth">
              <defs>
                <radialGradient id="globeShade" cx="35%" cy="35%" r="75%">
                  <stop offset="0%" stopColor="#c4ecff"/>
                  <stop offset="55%" stopColor="#2aa0ff"/>
                  <stop offset="100%" stopColor="#0b2a66"/>
                </radialGradient>
                <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="6" result="glow"/>
                  <feMerge>
                    <feMergeNode in="glow"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              {/* Ocean sphere */}
              <circle cx="100" cy="100" r="78" fill="url(#globeShade)" filter="url(#softGlow)"/>
              {/* Rotating land group */}
              <g className="lands">
                <path d="M50,100 C60,80 80,70 95,80 C110,90 120,110 110,120 C95,135 70,135 60,118 Z" fill="#33cc66" opacity="0.9"/>
                <path d="M130,70 C140,78 150,92 148,104 C146,116 132,118 124,110 C116,102 118,84 130,70 Z" fill="#2fb45d" opacity="0.9"/>
                <path d="M80,145 C92,140 108,142 118,150 C122,156 114,165 100,166 C86,167 76,154 80,145 Z" fill="#36d66a" opacity="0.9"/>
              </g>
              {/* Gloss highlight */}
              <ellipse cx="86" cy="76" rx="32" ry="18" fill="rgba(255,255,255,0.25)"/>
            </svg>

            {/* Orbit lines and particles */}
            <div className="orbit o1" />
            <div className="orbit o2" />
            <div className="particles">
              {Array.from({length:10}).map((_,i)=>(<span key={i} className="p"/>))}
            </div>

            <div className="earth-caption">World just like ours but…</div>
            <div className="earth-co2">CO₂ <span className="num">{co2.toFixed(2)}</span> ppm</div>
          </div>
        </div>
      </aside>

      {/* Earth Modal Overlay */}
      {earthOpen && (
        <div className="earth-modal" role="dialog" aria-modal="true" aria-label="Virtual Earth">
          <div className="earth-modal-backdrop" onClick={() => setEarthOpen(false)} />
          <div className="earth-modal-content">
            <svg className="earth-svg big" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" aria-label="Spinning Earth Large">
              <defs>
                <radialGradient id="globeShadeBig" cx="35%" cy="35%" r="75%">
                  <stop offset="0%" stopColor="#dff7ff"/>
                  <stop offset="55%" stopColor="#36b0ff"/>
                  <stop offset="100%" stopColor="#0b2a66"/>
                </radialGradient>
                <filter id="softGlowBig" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="8" result="glow"/>
                  <feMerge>
                    <feMergeNode in="glow"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              <circle cx="100" cy="100" r="86" fill="url(#globeShadeBig)" filter="url(#softGlowBig)"/>
              <g className="lands">
                <path d="M40,100 C58,74 86,66 108,78 C126,88 138,112 120,128 C100,146 66,144 50,118 Z" fill="#33cc66" opacity="0.95"/>
                <path d="M128,56 C144,70 160,92 154,110 C146,124 128,126 118,112 C110,100 116,78 128,56 Z" fill="#2fb45d" opacity="0.95"/>
                <path d="M80,150 C100,142 120,146 132,160 C130,170 112,178 94,176 C78,174 72,160 80,150 Z" fill="#36d66a" opacity="0.95"/>
              </g>
              <ellipse cx="82" cy="70" rx="36" ry="20" fill="rgba(255,255,255,0.22)"/>
            </svg>
            <div className="earth-modal-caption">World just like ours but…</div>
            <div className="earth-modal-co2">CO₂ <span className="num">{co2.toFixed(2)}</span> ppm</div>
            <button className="earth-close" onClick={() => setEarthOpen(false)} aria-label="Close">Close</button>
          </div>
        </div>
      )}
    </div>
  )
}
