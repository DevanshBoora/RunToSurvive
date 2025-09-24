import React, { useEffect, useRef, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import * as THREE from 'three'
import QuizModal from './quiz/QuizModal.jsx'
import { QUESTIONS } from '../data/questions.js'

const LANES = [-6, 0, 6]

export default function ScorchZone({ onExit, onRestart, selectedCharacter = 'solar-ranger' }) {
  const mountRef = useRef(null)
  const rendererRef = useRef(null)
  const sceneRef = useRef(null)
  const cameraRef = useRef(null)
  const playerRef = useRef(null)
  const clockRef = useRef(null)
  const objectsRef = useRef({ obstacles: [], items: [], cards: [], particles: [] })
  const [laneIndex, setLaneIndex] = useState(1)
  const [health, setHealth] = useState(100)
  const [score, setScore] = useState(0)
  const [quiz, setQuiz] = useState({ open: false, q: null })
  const [paused, setPaused] = useState(false)
  const startTimeRef = useRef(0)
  const vyRef = useRef(0)
  const slidingRef = useRef(false)
  const wrongCountRef = useRef(0)
  const laneIndexRef = useRef(laneIndex)
  const pausedRef = useRef(paused)
  const quizOpenRef = useRef(quiz.open)
  const scoreRef = useRef(score)
  const smearRef = useRef(0) // smear timer for lane switch/jump
  const preJumpRef = useRef(0) // anticipation crouch timer
  const lastLaneRef = useRef(laneIndex)

  useEffect(() => { laneIndexRef.current = laneIndex }, [laneIndex])
  useEffect(() => { if (laneIndex !== lastLaneRef.current) { smearRef.current = 0.18; lastLaneRef.current = laneIndex } }, [laneIndex])
  useEffect(() => { pausedRef.current = paused }, [paused])
  useEffect(() => { quizOpenRef.current = quiz.open }, [quiz.open])
  useEffect(() => { scoreRef.current = score }, [score])

  // Swipe detection
  useEffect(() => {
    let startX = 0, startY = 0, endX = 0, endY = 0
    const onTouchStart = e => { const t = e.touches[0]; startX = t.clientX; startY = t.clientY }
    const onTouchEnd = e => {
      const dx = (endX || startX) - startX
      const dy = (endY || startY) - startY
      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > 20) setLaneIndex(i => Math.min(2, i + 1))
        else if (dx < -20) setLaneIndex(i => Math.max(0, i - 1))
      } else {
        if (dy < -20) jump()
        else if (dy > 20) slide()
      }
      startX = startY = endX = endY = 0
    }
    const onTouchMove = e => { const t = e.touches[0]; endX = t.clientX; endY = t.clientY }
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: true })
    window.addEventListener('touchend', onTouchEnd, { passive: true })
    return () => {
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
    }
  }, [])

  // Keyboard
  useEffect(() => {
    const onKey = e => {
      if (quizOpenRef.current) return
      if (pausedRef.current) setPaused(false)
      if (e.key === 'ArrowLeft' || e.key === 'a') setLaneIndex(i => Math.max(0, i - 1))
      if (e.key === 'ArrowRight' || e.key === 'd') setLaneIndex(i => Math.min(2, i + 1))
      if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w') jump()
      if (e.key === 'ArrowDown' || e.key === 's') slide()
      if (e.key === 'p') setPaused(p => !p)
      if (e.key === 'Escape') onExit?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onExit])

  const jump = () => {
    if (!playerRef.current) return
    if (quizOpenRef.current) return
    // Trigger jump immediately when grounded (no anticipation delay)
    if (Math.abs(playerRef.current.position.y) < 0.001) {
      preJumpRef.current = 0
      vyRef.current = 14 // faster, higher jump
      smearRef.current = Math.max(smearRef.current, 0.18)
    }
  }
  const slide = () => {
    slidingRef.current = true
    setTimeout(() => (slidingRef.current = false), 600)
  }

  // Init Three.js scene
  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return
    const scene = new THREE.Scene()
    scene.fog = new THREE.FogExp2(0x3a1605, 0.03)
    const camera = new THREE.PerspectiveCamera(60, Math.max(1, mount.clientWidth) / Math.max(1, mount.clientHeight), 0.1, 1000)
    camera.position.set(0, 6, 12)
    camera.lookAt(0, 0, 0)

    const renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: true,
      powerPreference: "high-performance"
    })
    renderer.setSize(Math.max(1, mount.clientWidth), Math.max(1, mount.clientHeight))
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.2
    mount.appendChild(renderer.domElement)

    // Improved lighting system
    const hemi = new THREE.HemisphereLight(0xffe6a3, 0x442200, 0.8)
    
    // Main sun light with shadows
    const sunLight = new THREE.DirectionalLight(0xffcc88, 1.2)
    sunLight.position.set(8, 15, 8)
    sunLight.castShadow = true
    sunLight.shadow.mapSize.width = 2048
    sunLight.shadow.mapSize.height = 2048
    sunLight.shadow.camera.near = 0.5
    sunLight.shadow.camera.far = 50
    sunLight.shadow.camera.left = -15
    sunLight.shadow.camera.right = 15
    sunLight.shadow.camera.top = 15
    sunLight.shadow.camera.bottom = -15
    sunLight.shadow.bias = -0.0001
    
    // Rim lighting for character definition
    const rimLight = new THREE.DirectionalLight(0x79c4ff, 0.4)
    rimLight.position.set(-8, 8, -6)
    
    // Ambient fill light
    const fillLight = new THREE.DirectionalLight(0xffa366, 0.3)
    fillLight.position.set(0, 5, 10)
    
    scene.add(hemi, sunLight, rimLight, fillLight)

    // Enhanced ground with texture and shadows
    const groundGeo = new THREE.PlaneGeometry(40, 400, 32, 32)
    const groundMat = new THREE.MeshStandardMaterial({ 
      color: 0xc4762a,
      roughness: 0.9,
      metalness: 0.1
    })
    const ground = new THREE.Mesh(groundGeo, groundMat)
    ground.rotation.x = -Math.PI / 2
    ground.position.z = -180
    ground.receiveShadow = true
    scene.add(ground)

    // Multiple dune layers for depth
    const createDuneLayer = (distance, height, opacity, color) => {
      const duneMat = new THREE.MeshStandardMaterial({ 
        color: color, 
        transparent: true, 
        opacity: opacity,
        roughness: 0.8
      })
      const dune = new THREE.Mesh(new THREE.PlaneGeometry(80, height), duneMat)
      dune.position.set(0, height/2, -distance)
      return dune
    }
    
    scene.add(createDuneLayer(80, 20, 0.4, 0xd4823a))
    scene.add(createDuneLayer(60, 16, 0.5, 0xc4762a))
    scene.add(createDuneLayer(40, 12, 0.6, 0xb46a2a))

    // Enhanced sun with glow effect
    const sunGeo = new THREE.SphereGeometry(2.5, 32, 32)
    const sunMat = new THREE.MeshBasicMaterial({ 
      color: 0xffcf33,
      emissive: 0xffaa00,
      emissiveIntensity: 0.3
    })
    const sun = new THREE.Mesh(sunGeo, sunMat)
    sun.position.set(12, 18, -50)
    scene.add(sun)
    
    // Sun glow effect
    const glowGeo = new THREE.SphereGeometry(4, 16, 16)
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xffaa00,
      transparent: true,
      opacity: 0.2
    })
    const sunGlow = new THREE.Mesh(glowGeo, glowMat)
    sunGlow.position.copy(sun.position)
    scene.add(sunGlow)

    // Enhanced environment particles
    const createEnvironmentParticles = () => {
      const particles = []
      
      // Heat shimmer particles
      const shimmerGeo = new THREE.SphereGeometry(0.08, 4, 4)
      const shimmerMat = new THREE.MeshBasicMaterial({
        color: 0xffcc66,
        transparent: true,
        opacity: 0.4
      })
      
      for (let i = 0; i < 25; i++) {
        const particle = new THREE.Mesh(shimmerGeo, shimmerMat)
        particle.position.set(
          (Math.random() - 0.5) * 35,
          Math.random() * 3 + 0.5,
          (Math.random() - 0.5) * 25
        )
        particle.userData = {
          originalY: particle.position.y,
          speed: 0.5 + Math.random() * 0.5,
          amplitude: 0.3 + Math.random() * 0.4
        }
        particles.push(particle)
        scene.add(particle)
      }
      
      // Dust motes
      const dustGeo = new THREE.SphereGeometry(0.02, 3, 3)
      const dustMat = new THREE.MeshBasicMaterial({
        color: 0xd4823a,
        transparent: true,
        opacity: 0.6
      })
      
      for (let i = 0; i < 15; i++) {
        const dust = new THREE.Mesh(dustGeo, dustMat)
        dust.position.set(
          (Math.random() - 0.5) * 40,
          Math.random() * 4 + 1,
          (Math.random() - 0.5) * 30
        )
        dust.userData = {
          driftSpeed: 0.2 + Math.random() * 0.3,
          rotSpeed: (Math.random() - 0.5) * 0.02
        }
        particles.push(dust)
        scene.add(dust)
      }
      
      return particles
    }
    
    const environmentParticles = createEnvironmentParticles()

    // Character builder system - matches selected character
    const buildCharacter = (characterType) => {
      const g = new THREE.Group()
      
      if (characterType === 'solar-ranger') {
        return buildSolarRanger(g)
      } else if (characterType === 'sand-ranger') {
        return buildForestRunner(g)
      } else if (characterType === 'ice-sentinel') {
        return buildIceSentinel(g)
      }
      
      // Default to solar ranger
      return buildSolarRanger(g)
    }

    // Solar Ranger - Desert specialist with heat-resistant gear
    const buildSolarRanger = (g) => {
      const suitMat = new THREE.MeshStandardMaterial({ color: 0xff6a00, roughness: 0.3, metalness: 0.7 })
      const visorMat = new THREE.MeshStandardMaterial({ color: 0x00d1ff, roughness: 0.1, metalness: 0.9, transparent: true, opacity: 0.8 })
      const accentMat = new THREE.MeshStandardMaterial({ color: 0xffd700, roughness: 0.2, metalness: 0.8 })
      
      // Body - heat-resistant suit
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.7, 1.4, 12), suitMat)
      body.position.y = 1.0
      
      // Head - helmet with visor
      const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 12), suitMat)
      helmet.position.set(0, 1.9, 0)
      
      // Visor
      const visor = new THREE.Mesh(new THREE.SphereGeometry(0.52, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.6), visorMat)
      visor.position.set(0, 1.9, 0.1)
      
      // Solar panels on shoulders
      const panelGeo = new THREE.BoxGeometry(0.3, 0.1, 0.4)
      const panelL = new THREE.Mesh(panelGeo, accentMat)
      panelL.position.set(-0.7, 1.6, 0)
      const panelR = panelL.clone()
      panelR.position.x = 0.7
      
      // Arms
      const armGeo = new THREE.CylinderGeometry(0.15, 0.18, 0.8, 8)
      const armL = new THREE.Mesh(armGeo, suitMat)
      armL.position.set(-0.8, 1.2, 0)
      const armR = armL.clone()
      armR.position.x = 0.8
      
      // Legs
      const legGeo = new THREE.CylinderGeometry(0.18, 0.2, 0.9, 8)
      const legL = new THREE.Mesh(legGeo, suitMat)
      legL.position.set(-0.3, 0.45, 0)
      const legR = legL.clone()
      legR.position.x = 0.3
      
      // Heat vents
      const ventGeo = new THREE.CylinderGeometry(0.05, 0.08, 0.2, 6)
      const ventMat = new THREE.MeshStandardMaterial({ color: 0xff4400, emissive: 0x441100 })
      const vent1 = new THREE.Mesh(ventGeo, ventMat)
      vent1.position.set(0.4, 1.4, 0.3)
      const vent2 = vent1.clone()
      vent2.position.x = -0.4
      
      g.add(body, helmet, visor, panelL, panelR, armL, armR, legL, legR, vent1, vent2)
      g.userData = { armL, armR, legL, legR, helmet, body, airborne: false, type: 'solar-ranger' }
      return g
    }

    // Forest Runner - Agile nature specialist
    const buildForestRunner = (g) => {
      const leafMat = new THREE.MeshStandardMaterial({ color: 0x228B22, roughness: 0.8, metalness: 0.1 })
      const barkMat = new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.9, metalness: 0.0 })
      const clothMat = new THREE.MeshStandardMaterial({ color: 0x654321, roughness: 0.7, metalness: 0.0 })
      
      // Body - nature-inspired outfit
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 1.3, 8), clothMat)
      body.position.y = 1.0
      
      // Head
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 12), clothMat)
      head.position.set(0, 1.8, 0)
      
      // Leaf hood/cap
      const hood = new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.3, 8), leafMat)
      hood.position.set(0, 2.0, 0)
      
      // Arms - agile and lean
      const armGeo = new THREE.CylinderGeometry(0.12, 0.15, 0.7, 8)
      const armL = new THREE.Mesh(armGeo, clothMat)
      armL.position.set(-0.7, 1.15, 0)
      const armR = armL.clone()
      armR.position.x = 0.7
      
      // Legs - built for running
      const legGeo = new THREE.CylinderGeometry(0.15, 0.18, 0.85, 8)
      const legL = new THREE.Mesh(legGeo, clothMat)
      legL.position.set(-0.25, 0.42, 0)
      const legR = legL.clone()
      legR.position.x = 0.25
      
      // Nature accessories
      const vineGeo = new THREE.TorusGeometry(0.3, 0.03, 4, 12)
      const vine = new THREE.Mesh(vineGeo, leafMat)
      vine.position.set(0, 1.5, 0)
      vine.rotation.x = Math.PI / 4
      
      // Bark armor pieces
      const armor1 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.1), barkMat)
      armor1.position.set(0, 1.3, 0.35)
      
      g.add(body, head, hood, armL, armR, legL, legR, vine, armor1)
      g.userData = { armL, armR, legL, legR, head, body, airborne: false, type: 'forest-runner' }
      return g
    }

    // Ice Sentinel - Cold weather specialist
    const buildIceSentinel = (g) => {
      const iceMat = new THREE.MeshStandardMaterial({ color: 0x87CEEB, roughness: 0.1, metalness: 0.9, transparent: true, opacity: 0.9 })
      const snowMat = new THREE.MeshStandardMaterial({ color: 0xF0F8FF, roughness: 0.3, metalness: 0.1 })
      const crystalMat = new THREE.MeshStandardMaterial({ color: 0xB0E0E6, roughness: 0.0, metalness: 1.0, transparent: true, opacity: 0.8 })
      
      // Body - crystalline ice armor
      const body = new THREE.Mesh(new THREE.OctahedronGeometry(0.8, 1), iceMat)
      body.position.y = 1.0
      body.scale.set(1, 1.2, 0.8)
      
      // Head - ice crystal helmet
      const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.45, 1), iceMat)
      head.position.set(0, 1.9, 0)
      
      // Ice crown
      const crownGeo = new THREE.ConeGeometry(0.5, 0.4, 6)
      const crown = new THREE.Mesh(crownGeo, crystalMat)
      crown.position.set(0, 2.2, 0)
      
      // Arms - crystalline
      const armGeo = new THREE.OctahedronGeometry(0.2, 1)
      const armL = new THREE.Mesh(armGeo, iceMat)
      armL.position.set(-0.8, 1.2, 0)
      armL.scale.set(0.8, 2, 0.8)
      const armR = armL.clone()
      armR.position.x = 0.8
      
      // Legs - sturdy ice pillars
      const legGeo = new THREE.CylinderGeometry(0.2, 0.25, 0.9, 6)
      const legL = new THREE.Mesh(legGeo, iceMat)
      legL.position.set(-0.3, 0.45, 0)
      const legR = legL.clone()
      legR.position.x = 0.3
      
      // Frost aura particles
      const particleGeo = new THREE.SphereGeometry(0.02, 4, 4)
      for (let i = 0; i < 8; i++) {
        const particle = new THREE.Mesh(particleGeo, snowMat)
        const angle = (i / 8) * Math.PI * 2
        particle.position.set(
          Math.cos(angle) * 1.2,
          1.0 + Math.sin(i * 0.5) * 0.3,
          Math.sin(angle) * 1.2
        )
        g.add(particle)
      }
      
      g.add(body, head, crown, armL, armR, legL, legR)
      g.userData = { armL, armR, legL, legR, head, body, airborne: false, type: 'ice-sentinel' }
      return g
    }

    const hero = buildCharacter(selectedCharacter)
    hero.position.set(LANES[laneIndexRef.current], 0, 0)
    hero.castShadow = true
    hero.receiveShadow = true
    // Enable shadows for all character parts
    hero.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true
        child.receiveShadow = true
      }
    })
    scene.add(hero)

    // Collections
    const obstacles = []
    const items = []
    const cards = []

    // Helper: make transparent texture with '?' glyph
    const makeQuestionMarkTexture = () => {
      const canvas = document.createElement('canvas')
      canvas.width = 128; canvas.height = 192
      const ctx = canvas.getContext('2d')
      // transparent background
      ctx.clearRect(0,0,canvas.width,canvas.height)
      // soft rounded border
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)'
      ctx.lineWidth = 4
      ctx.beginPath()
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(6,6,canvas.width-12,canvas.height-12,12)
      } else {
        // Fallback: manual rounded rectangle path
        const x=6, y=6, w=canvas.width-12, h=canvas.height-12, r=12
        ctx.moveTo(x+r, y)
        ctx.lineTo(x+w-r, y)
        ctx.quadraticCurveTo(x+w, y, x+w, y+r)
        ctx.lineTo(x+w, y+h-r)
        ctx.quadraticCurveTo(x+w, y+h, x+w-r, y+h)
        ctx.lineTo(x+r, y+h)
        ctx.quadraticCurveTo(x, y+h, x, y+h-r)
        ctx.lineTo(x, y+r)
        ctx.quadraticCurveTo(x, y, x+r, y)
      }
      ctx.stroke()
      // question mark
      ctx.fillStyle = 'rgba(255, 240, 180, 0.9)'
      ctx.font = 'bold 120px Arial'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('?', canvas.width/2, canvas.height/2)
      const tex = new THREE.CanvasTexture(canvas)
      tex.needsUpdate = true
      return tex
    }

    const addCactus = (lane, z) => {
      const group = new THREE.Group()
      // Main trunk
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.5, 0.55, 2.4, 12),
        new THREE.MeshStandardMaterial({ color: 0x0fae3a, roughness: 0.8 })
      )
      trunk.position.y = 1.2
      group.add(trunk)
      // Arms
      const armMat = new THREE.MeshStandardMaterial({ color: 0x0fae3a, roughness: 0.85 })
      const armGeo = new THREE.CylinderGeometry(0.28, 0.32, 1.4, 10)
      const armL = new THREE.Mesh(armGeo, armMat)
      armL.position.set(-0.6, 1.3, 0)
      armL.rotation.z = Math.PI/3
      const armR = armL.clone()
      armR.position.set(0.6, 0.9, 0)
      armR.rotation.z = -Math.PI/3
      group.add(armL, armR)
      // Spikes (small white cones)
      const spikeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.1, roughness: 0.3 })
      for (let i=0;i<10;i++){
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.18, 6), spikeMat)
        spike.position.set((Math.random()-0.5)*0.7, 0.6+Math.random()*1.4, (Math.random()-0.5)*0.3)
        spike.rotation.x = Math.random()*Math.PI
        spike.rotation.y = Math.random()*Math.PI
        group.add(spike)
      }
      group.position.set(LANES[lane], 0, z)
      scene.add(group)
      obstacles.push({ mesh: group, type: 'cactus', scored: false })
    }
    const addTornado = (lane, z) => {
      const group = new THREE.Group()
      // Funnel silhouette with LatheGeometry (tornado-like)
      const pts = []
      const h = 2.6
      for (let i = 0; i <= 16; i++) {
        const t = i / 16 // 0..1 bottom->top
        // radius tapers from 1.1 to 0.15 with slight bulges
        const r = 1.1 * (1 - t) + 0.15 * t + 0.05 * Math.sin(t * Math.PI * 3)
        pts.push(new THREE.Vector2(r, t * h))
      }
      const funnelGeo = new THREE.LatheGeometry(pts, 48)
      const funnelMat = new THREE.MeshStandardMaterial({ color: 0x9aa0a8, transparent: true, opacity: 0.7, roughness: 0.8, metalness: 0.0, side: THREE.DoubleSide })
      const funnel = new THREE.Mesh(funnelGeo, funnelMat)
      funnel.rotation.x = Math.PI
      funnel.position.y = h * 0.5
      group.add(funnel)
      // Add a few semi-transparent swirl planes for motion feel
      const swirlMat = new THREE.MeshBasicMaterial({ color: 0xbcc3c9, transparent: true, opacity: 0.35 })
      for (let i = 0; i < 3; i++) {
        const swirl = new THREE.Mesh(new THREE.PlaneGeometry(2.4 - i*0.4, 0.5), swirlMat.clone())
        swirl.position.set(0, 0.6 + i*0.7, 0)
        swirl.rotation.y = (i * Math.PI) / 3
        group.add(swirl)
      }
      group.position.set(LANES[lane], 0, z)
      scene.add(group)
      obstacles.push({ mesh: group, type: 'tornado', scored: false, baseX: LANES[lane], spin: 0.12 + Math.random()*0.08, wobble: 0, wobbleSpeed: 0.8 + Math.random()*0.5 })
    }
    const addItem = (lane, z, kind) => {
      let geo, mat
      switch (kind) {
        case 'sapling': geo = new THREE.ConeGeometry(0.5, 1.2, 8); mat = new THREE.MeshStandardMaterial({ color: 0x1f8a34 }); break
        case 'water': geo = new THREE.CylinderGeometry(0.3, 0.3, 0.9, 8); mat = new THREE.MeshStandardMaterial({ color: 0x2aa0ff }); break
        case 'solar': geo = new THREE.BoxGeometry(1.2, 0.05, 0.8); mat = new THREE.MeshStandardMaterial({ color: 0x0b2a66 }); break
        default: geo = new THREE.ConeGeometry(0.5, 1.2, 8); mat = new THREE.MeshStandardMaterial({ color: 0x9fe3ff })
      }
      const m = new THREE.Mesh(geo, mat)
      m.position.set(LANES[lane], kind === 'solar' ? 0.1 : 0.6, z)
      scene.add(m)
      items.push({ mesh: m, kind })
    }
    const addChanceCard = (lane, z) => {
      const tex = makeQuestionMarkTexture()
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(0.9, 1.2),
        new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.9 })
      )
      m.position.set(LANES[lane], 1, z)
      scene.add(m)
      cards.push({ mesh: m, used: false })
    }

    // Initial spawn with proportional spacing (denser and a bit closer)
    let zCursor = -70
    for (let i = 0; i < 22; i++) {
      const lane = Math.floor(Math.random() * 3)
      const placeCard = i % 3 === 1 // every 3rd segment, place a card
      const placeItem = Math.random() < 0.5;
      // Obstacle first
      ;(Math.random() < 0.6 ? addCactus : addTornado)(lane, zCursor)
      // Card a bit behind obstacle, different lane to avoid overlap
      if (placeCard) addChanceCard(Math.floor(Math.random()*3), zCursor - 8)
      if (placeItem) addItem(Math.floor(Math.random()*3), zCursor - 14, ['sapling','water','solar'][Math.floor(Math.random()*3)])
      zCursor -= 16 + Math.random() * 5 // slightly tighter for more action
    }

    // Simple dust particle spawner
    const spawnDust = (x, z) => {
      const group = new THREE.Group()
      const parts = []
      for (let i = 0; i < 6; i++) {
        const geo = new THREE.PlaneGeometry(0.3 + Math.random()*0.2, 0.18 + Math.random()*0.12)
        const mat = new THREE.MeshBasicMaterial({ color: 0xcda37a, transparent: true, opacity: 0.8 })
        const p = new THREE.Mesh(geo, mat)
        p.rotation.x = -Math.PI/2
        p.position.set((Math.random()-0.5)*0.6, 0.02, (Math.random()-0.5)*0.4)
        group.add(p)
        parts.push(p)
      }
      group.position.set(x, 0.01, z+0.5)
      scene.add(group)
      const dir = new THREE.Vector3((Math.random()-0.5)*1.5, 0, 1.2 + Math.random()*0.6)
      objectsRef.current.particles.push({ group, vel: dir, life: 0.5, maxLife: 0.5 })
    }

    // Save refs
    rendererRef.current = renderer
    sceneRef.current = scene
    cameraRef.current = camera
    playerRef.current = hero
    objectsRef.current = { obstacles, items, cards, particles: [] }
    clockRef.current = new THREE.Clock()

    const onResize = () => {
      if (!mount) return
      const w = Math.max(1, mount.clientWidth), h = Math.max(1, mount.clientHeight)
      renderer.setSize(w, h)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    }
    window.addEventListener('resize', onResize)
    const ro = new ResizeObserver(onResize)
    ro.observe(mount)

    // Game loop
    let animId = 0
    const animate = () => {
      const dt = clockRef.current.getDelta()
      if (!startTimeRef.current) startTimeRef.current = clockRef.current.elapsedTime
      if (!pausedRef.current && !quizOpenRef.current) {
        // Increase speed over time (faster base + ramp, capped)
        const speed = 18 + Math.min(24, Math.floor(scoreRef.current / 80))

        // Auto forward: move everything towards camera
        const { obstacles, items, cards } = objectsRef.current
        const all = [...obstacles, ...items, ...cards]
        all.forEach(o => { o.mesh.position.z += speed * dt })

        // Recycle objects beyond camera and respawn ahead
        const aheadZ = -120
        const behindZ = 14
        obstacles.forEach(o => {
          if (o.type === 'tornado') {
            o.mesh.rotation.y += o.spin
            // subtle lateral wobble to feel alive
            o.wobble = (o.wobble || 0) + o.wobbleSpeed * dt
            // keep around its original base lane with a small wobble
            o.mesh.position.x = (o.baseX ?? o.mesh.position.x) + Math.sin(o.wobble) * 0.2
          }
          if (o.mesh.position.z > behindZ) {
            const newLane = Math.floor(Math.random() * 3)
            // recycle a bit closer to increase frequency
            o.mesh.position.set(LANES[newLane], o.mesh.position.y, aheadZ - 30 - Math.random() * 20)
            if (o.type === 'tornado') o.baseX = LANES[newLane]
            o.scored = false
          }
        })
        items.forEach(o => {
          if (o.mesh.position.z > behindZ) o.mesh.position.set(LANES[Math.floor(Math.random() * 3)], o.mesh.position.y, aheadZ - 60 - Math.random() * 30)
        })
        cards.forEach(o => {
          if (o.mesh.position.z > behindZ) {
            const newLane = Math.floor(Math.random() * 3)
            o.mesh.position.set(LANES[newLane], o.mesh.position.y, aheadZ - 50 - Math.random() * 30)
            o.used = false
          }
        })
        // Keep cards present but not excessive
        if (cards.length < 3) addChanceCard(Math.floor(Math.random()*3), aheadZ - 50 - Math.random()*30)

        // Player lane lerp
        const targetX = LANES[laneIndexRef.current]
        playerRef.current.position.x += (targetX - playerRef.current.position.x) * Math.min(10 * dt, 1)

        // Gravity and anticipation
        if (preJumpRef.current > 0) {
          preJumpRef.current = Math.max(0, preJumpRef.current - dt)
          // crouch
          if (playerRef.current?.userData) {
            const { torso, legL, legR, armL, armR } = playerRef.current.userData
            const tAnt = 1 - (preJumpRef.current / 0.12)
            const squat = -0.14 * Math.sin(tAnt * Math.PI)
            playerRef.current.position.y = squat
            if (torso) torso.rotation.x = 0.15
            if (legL && legR) { legL.rotation.x = 0.4; legR.rotation.x = 0.3 }
            if (armL && armR) { armL.rotation.x = -0.5; armR.rotation.x = -0.5 }
          }
          if (preJumpRef.current === 0) {
            vyRef.current = 14 // faster, higher jump
          }
        }
        // Gravity
        if (vyRef.current !== 0 || Math.abs(playerRef.current.position.y) > 0.0001) {
          vyRef.current -= 20 * dt // slightly stronger gravity for a snappier arc
          playerRef.current.position.y += vyRef.current * dt
          if (playerRef.current.position.y > 0) { playerRef.current.userData.airborne = true }
          if (playerRef.current.position.y <= 0) {
            if (playerRef.current.userData.airborne) {
              // landed: spawn dust puff
              spawnDust(playerRef.current.position.x, playerRef.current.position.z)
            }
            playerRef.current.userData.airborne = false
            playerRef.current.position.y = 0; vyRef.current = 0
          }
        }

        // Enhanced character-specific animations
        const t = clockRef.current.elapsedTime
        const swing = Math.sin(t * 10) * 0.5 // Slightly faster, more controlled
        const bounce = Math.abs(Math.sin(t * 12)) * 0.08 // Subtle bounce
        
        if (playerRef.current?.userData) {
          const { armL, armR, legL, legR, head, body, helmet, type } = playerRef.current.userData
          
          // Character-specific animations
          if (type === 'solar-ranger') {
            // Solar Ranger: Mechanical, precise movements
            if (armL && armR && legL && legR) {
              if (!slidingRef.current) {
                armL.rotation.x = swing * 0.7
                armR.rotation.x = -swing * 0.7
                legL.rotation.x = -swing * 0.9
                legR.rotation.x = swing * 0.9
              }
            }
            // Helmet visor glint effect
            if (helmet) {
              helmet.rotation.y = Math.sin(t * 2) * 0.05
            }
            
          } else if (type === 'forest-runner') {
            // Forest Runner: Agile, fluid movements
            if (armL && armR && legL && legR) {
              if (!slidingRef.current) {
                armL.rotation.x = swing * 1.2 // More arm swing
                armR.rotation.x = -swing * 1.2
                legL.rotation.x = -swing * 1.1
                legR.rotation.x = swing * 1.1
              }
            }
            // Natural swaying motion
            if (body) {
              body.rotation.z = Math.sin(t * 6) * 0.03
            }
            
          } else if (type === 'ice-sentinel') {
            // Ice Sentinel: Crystalline, angular movements
            if (armL && armR && legL && legR) {
              if (!slidingRef.current) {
                armL.rotation.x = swing * 0.4 // Stiffer movements
                armR.rotation.x = -swing * 0.4
                legL.rotation.x = -swing * 0.6
                legR.rotation.x = swing * 0.6
              }
            }
            // Crystalline sparkle effect
            if (head) {
              head.rotation.y = Math.sin(t * 3) * 0.02
            }
          }
          
          // Universal running bounce
          if (!playerRef.current.userData.airborne) {
            playerRef.current.position.y += bounce
          }
          
          // Head bob for all characters
          if (head && !slidingRef.current) {
            head.rotation.x = Math.sin(t * 8) * 0.02
          }
          
          // Sliding pose override
          if (slidingRef.current && armL && armR && legL && legR) {
            armL.rotation.x = -1.2
            armR.rotation.x = -1.0
            legL.rotation.x = 0.4
            legR.rotation.x = -0.2
          }
        
        // Additional character tilting and body language
        if (playerRef.current?.userData) {
          const { head, body } = playerRef.current.userData
          if (head) {
            const tilt = (LANES[laneIndexRef.current] - playerRef.current.position.x) * 0.08
            head.rotation.z = tilt
            head.position.y = 1.8 + Math.sin(t*6) * 0.02
          }
          if (body) body.rotation.y = (LANES[laneIndexRef.current] - playerRef.current.position.x) * 0.06
        }

        // Idle breathing sprinkle when grounded and not sliding
        if (playerRef.current && playerRef.current.position.y === 0 && !slidingRef.current && preJumpRef.current<=0) {
          playerRef.current.position.y = Math.sin(t*2) * 0.02
        }

        // Smear frames (temporary stretch on quick moves)
        if (smearRef.current > 0 && playerRef.current) {
          smearRef.current = Math.max(0, smearRef.current - dt)
          const s = 1 + smearRef.current * 2.2
          playerRef.current.scale.set(1 + smearRef.current*0.4, 1 - smearRef.current*0.3, 1 + smearRef.current*0.4)
        } else if (playerRef.current) {
          playerRef.current.scale.set(1,1,1)
        }

        // Update particles (dust)
        const parts = objectsRef.current.particles
        for (let i = parts.length - 1; i >= 0; i--) {
          const p = parts[i]
          p.life -= dt
          p.group.position.addScaledVector(p.vel, dt)
          p.group.children.forEach((s, idx) => { s.material.opacity = Math.max(0, p.life / p.maxLife) })
          if (p.life <= 0) {
            scene.remove(p.group)
            parts.splice(i, 1)
          }
        }

        // Animate environment particles
        environmentParticles.forEach((particle, i) => {
          if (particle.userData.originalY !== undefined) {
            // Heat shimmer animation
            const { originalY, speed, amplitude } = particle.userData
            particle.position.y = originalY + Math.sin(t * speed + i) * amplitude
            particle.material.opacity = 0.3 + Math.sin(t * speed * 2 + i) * 0.1
          } else if (particle.userData.driftSpeed !== undefined) {
            // Dust drift animation
            const { driftSpeed, rotSpeed } = particle.userData
            particle.position.x += Math.sin(t * driftSpeed + i) * 0.01
            particle.position.z += Math.cos(t * driftSpeed * 0.7 + i) * 0.008
            particle.rotation.y += rotSpeed
          }
        })

        // Collisions
        const heroBB = new THREE.Box3().setFromObject(playerRef.current)
        const heroShrink = new THREE.Vector3(0.8, slidingRef.current ? 0.6 : 1.8, 0.8)
        heroBB.expandByVector(heroShrink.multiplyScalar(-0.2))

        obstacles.forEach(o => {
          const bb = new THREE.Box3().setFromObject(o.mesh)
          const grace = (clockRef.current.elapsedTime - startTimeRef.current) < 2
          if (!grace && bb.intersectsBox(heroBB)) {
            // Immediate game over on obstacle collision
            setPaused(true)
          } else if (!o.scored && o.mesh.position.z > playerRef.current.position.z + 1) {
            o.scored = true
            setScore(s => s + 5)
          }
        })

        items.forEach(o => {
          const bb = new THREE.Box3().setFromObject(o.mesh)
          if (bb.intersectsBox(heroBB)) {
            setScore(s => s + 8)
            setHealth(h => Math.min(100, h + 6))
            o.mesh.position.z = aheadZ - Math.random() * 60
          }
        })

        if (!quizOpenRef.current) {
          cards.forEach(o => {
            if (o.used) return
            const bb = new THREE.Box3().setFromObject(o.mesh)
            const grace = (clockRef.current.elapsedTime - startTimeRef.current) < 2
            if (!grace && bb.intersectsBox(heroBB)) {
              o.used = true
              // recycle card immediately so it doesn't retrigger on close
              o.mesh.position.z = aheadZ - 50 - Math.random() * 30
              const q = QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)]
              setQuiz({ open: true, q })
            }
          })
        }
      }
      renderer.render(scene, camera)
      animId = requestAnimationFrame(animate)
    }
    animate()

    return () => {
      window.removeEventListener('resize', onResize)
      try { ro.disconnect() } catch {}
      cancelAnimationFrame(animId)
      mount.removeChild(renderer.domElement)
      renderer.dispose()
    }
  }, [])

  const handleAnswer = correct => {
    if (correct) {
      setScore(s => s + 10)
      // Health remains the same on correct answer
    } else {
      setHealth(h => Math.max(0, h - 15))
      wrongCountRef.current += 1
      if (wrongCountRef.current >= 3) {
        setPaused(true)
      }
    }
    setQuiz({ open: false, q: null })
  }

  useEffect(() => {
    if (health <= 0 || wrongCountRef.current >= 3) setPaused(true)
  }, [health])

  return (
    <div className="scorch-zone">
      <div className="hud">
        <div className="meter">
          <div className="earth-icon" />
          <div className="bar">
            <div 
              className={`fill ${health < 30 ? 'low' : ''}`} 
              style={{ width: `${health}%` }} 
            />
          </div>
        </div>
        <div className="score">Score {score}</div>
        <div className="hint">
          {selectedCharacter === 'solar-ranger' && '☀️ Solar Ranger: Heat resistant with solar power'}
          {selectedCharacter === 'sand-ranger' && '🌲 Forest Runner: Agile nature specialist'}
          {selectedCharacter === 'ice-sentinel' && '❄️ Ice Sentinel: Cold weather endurance expert'}
          <br />
          Swipe/Arrows to change lanes • Up/Space to jump • Down to slide • P pause • Esc back
        </div>
      </div>

      <div ref={mountRef} className="three-canvas" />

      <AnimatePresence>
        {quiz.open && (
          <QuizModal question={quiz.q} onAnswer={handleAnswer} />
        )}
      </AnimatePresence>

      {paused && (
        <div className="game-over">
          <div className="title">CLIMATE CATASTROPHE</div>
          <button onClick={() => {
            if (onRestart) {
              onRestart()
            } else {
              setHealth(100); wrongCountRef.current = 0; setScore(0); setPaused(false)
            }
          }}>Restart</button>
          <button onClick={onExit}>Exit</button>
        </div>
      )}
    </div>
  )
}
