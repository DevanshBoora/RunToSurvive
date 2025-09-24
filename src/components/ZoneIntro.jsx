import React, { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function ZoneIntro({ mode = 'scorch', onClose }) {
  const rootRef = useRef(null)

  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    const onMove = (e) => {
      const rect = el.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      const dx = (e.clientX - cx) / rect.width
      const dy = (e.clientY - cy) / rect.height
      el.style.setProperty('--tilt-x', `${dy * -6}deg`)
      el.style.setProperty('--tilt-y', `${dx * 6}deg`)
      el.style.setProperty('--parallax-x', `${dx * 20}px`)
      el.style.setProperty('--parallax-y', `${dy * 20}px`)
    }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  const title = mode === 'scorch' ? 'SCORCH ZONE' : 'BLIZZARD ZONE'

  return (
    <AnimatePresence>
      <motion.div
        className={`zone-intro ${mode}`}
        ref={rootRef}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        {/* Background layers */}
        <div className="layer bg" />
        {mode === 'scorch' ? (
          <>
            <div className="layer sunflare" />
            <div className="layer ground-cracks" />
            <div className="layer heatwaves" />
            <div className="layer sparks">
              {Array.from({ length: 60 }).map((_, i) => (
                <span key={i} className="spark" />
              ))}
            </div>
            <div className="layer flames">
              {Array.from({ length: 24 }).map((_, i) => (
                <span key={i} className="fl" />
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="layer frost-glass" />
            <div className="layer mountain-silhouette" />
            <div className="layer mist" />
            <div className="layer snow">
              {Array.from({ length: 120 }).map((_, i) => (
                <span key={i} className="flake" />
              ))}
            </div>
          </>
        )}

        {/* Title */}
        <motion.h1 className="zone-title" initial={{ scale: 0.96, filter: 'blur(2px)' }} animate={{ scale: 1, filter: 'blur(0px)' }}>
          {title}
        </motion.h1>
        <div className="zone-hint">Click to continue</div>
      </motion.div>
    </AnimatePresence>
  )
}
