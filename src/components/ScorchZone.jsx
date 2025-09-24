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

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(Math.max(1, mount.clientWidth), Math.max(1, mount.clientHeight))
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1))
    mount.appendChild(renderer.domElement)

    // Lights
    const hemi = new THREE.HemisphereLight(0xffe6a3, 0x442200, 0.9)
    const dir = new THREE.DirectionalLight(0xffcc88, 0.95)
    dir.position.set(5, 10, 5)
    const rim = new THREE.DirectionalLight(0x79c4ff, 0.35)
    rim.position.set(-6, 6, -4)
    scene.add(hemi, dir, rim)

    // Ground
    const groundGeo = new THREE.PlaneGeometry(40, 400, 1, 1)
    const groundMat = new THREE.MeshLambertMaterial({ color: 0x8a4a15 })
    const ground = new THREE.Mesh(groundGeo, groundMat)
    ground.rotation.x = -Math.PI / 2
    ground.position.z = -180
    scene.add(ground)

    // Dunes backdrop (parallax planes)
    const duneMat = new THREE.MeshBasicMaterial({ color: 0xb56a2b, transparent: true, opacity: 0.6 })
    const duneFar = new THREE.Mesh(new THREE.PlaneGeometry(60, 12), duneMat)
    duneFar.position.set(0, 4, -60)
    scene.add(duneFar)

    // Sun
    const sun = new THREE.Mesh(new THREE.SphereGeometry(2, 16, 16), new THREE.MeshBasicMaterial({ color: 0xffcf33 }))
    sun.position.set(10, 12, -40)
    scene.add(sun)

    // Player builder: stylized bear
    const buildBear = () => {
      const g = new THREE.Group()
      const fur = new THREE.MeshStandardMaterial({ color: 0x6b4028, roughness: 0.95, metalness: 0.05 })
      const muzzleMat = new THREE.MeshStandardMaterial({ color: 0xd9b59b, roughness: 0.9 })
      // Body
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.95, 18, 14), fur)
      body.scale.set(1.4, 1.0, 0.9)
      body.position.y = 1.0
      // Head
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.45, 18, 14), fur)
      head.position.set(0, 1.8, 0.1)
      // Ears
      const earGeo = new THREE.SphereGeometry(0.18, 12, 10)
      const earL = new THREE.Mesh(earGeo, fur); earL.position.set(-0.32, 2.15, -0.05)
      const earR = earL.clone(); earR.position.x = 0.32
      // Muzzle and nose
      const snout = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 10), muzzleMat)
      snout.position.set(0, 1.7, 0.42)
      const nose = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.12, 12), new THREE.MeshStandardMaterial({ color: 0x1a1308 }))
      nose.rotation.x = Math.PI/2
      nose.position.set(0, 1.69, 0.52)
      // Limbs
      const legGeo = new THREE.CapsuleGeometry(0.16, 0.5, 6, 12)
      const armGeo = new THREE.CapsuleGeometry(0.13, 0.5, 6, 12)
      const legL = new THREE.Mesh(legGeo, fur); legL.position.set(-0.35, 0.55, 0)
      const legR = legL.clone(); legR.position.x = 0.35
      const armL = new THREE.Mesh(armGeo, fur); armL.position.set(-0.65, 1.2, 0)
      const armR = armL.clone(); armR.position.x = 0.65
      // Tail
      const tail = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), fur)
      tail.position.set(0, 1.0, -0.5)
      g.add(body, head, earL, earR, snout, nose, legL, legR, armL, armR, tail)
      g.userData = { armL, armR, legL, legR, head, body, airborne:false }
      return g
    }

    const hero = buildBear()
    hero.position.set(LANES[laneIndexRef.current], 0, 0)
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

        // Character run animation (limb swing)
        const t = clockRef.current.elapsedTime
        const swing = Math.sin(t * 8) * 0.6
        if (playerRef.current?.userData) {
          const { armL, armR, legL, legR, head, body } = playerRef.current.userData
          if (armL && armR && legL && legR) {
            if (!slidingRef.current) {
              armL.rotation.x = swing
              armR.rotation.x = -swing
              legL.rotation.x = -swing * 0.8
              legR.rotation.x = swing * 0.8
            } else {
              // slide pose
              armL.rotation.x = -1.2
              armR.rotation.x = -1.0
              legL.rotation.x = 0.4
              legR.rotation.x = -0.2
            }
          }
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
          <div className="bar"><div className="fill" style={{ width: `${health}%` }} /></div>
        </div>
        <div className="score">Score {score}</div>
        <div className="hint">Swipe/Arrows to change lanes • Up/Space to jump • Down to slide • P pause • Esc back</div>
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
