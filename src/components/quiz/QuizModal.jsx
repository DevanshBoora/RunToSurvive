import React from 'react'
import { motion } from 'framer-motion'

export default function QuizModal({ question, onAnswer }) {
  if (!question) return null
  const { prompt, choices, correctIndex, info } = question

  return (
    <div className="quiz-backdrop">
      <motion.div
        className="quiz-card"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
      >
        <div className="quiz-header">
          <div className="qm">?</div>
          <h3>Chance Card</h3>
        </div>
        <div className="quiz-body">
          <p className="prompt">{prompt}</p>
          <div className="choices">
            {choices.map((c, i) => (
              <button key={i} className="choice" onClick={() => onAnswer(i === correctIndex)}>
                {c}
              </button>
            ))}
          </div>
          {info && <div className="fact">{info}</div>}
        </div>
      </motion.div>
    </div>
  )
}
