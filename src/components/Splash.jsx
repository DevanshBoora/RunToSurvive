import React, { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'

export default function Splash({ onContinue }) {
  const ref = useRef(null)

  useEffect(() => {
    // simple spark effect using CSS animation on pseudo-elements handled in styles
  }, [])

  return (
    <div className="splash-screen" role="button" onClick={onContinue}>
      <motion.div
        className="splash-title"
        initial={{ letterSpacing: '0.6em', opacity: 0 }}
        animate={{ letterSpacing: '0.1em', opacity: 1 }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
      >
        RUN TO SURVIVE
      </motion.div>
      <div className="splash-glow" />
      <motion.div
        className="splash-heat"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.7, 0] }}
        transition={{ duration: 2.0, repeat: Infinity, repeatDelay: 0.4 }}
      />
      <div className="splash-hint">Click to Continue</div>
    </div>
  )
}
