// src/components/ConfettiStreak.tsx
import React from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Star, Sparkles, Heart } from 'lucide-react'

type Particle = { id: string; left: number; top: number; rot: number; icon: 'star'|'spark'|'heart' }

export default function ConfettiStreak({ show, onComplete }: { show: boolean; onComplete?: ()=>void }) {
  const prefersReduced = useReducedMotion()
  const [particles, setParticles] = React.useState<Particle[]>([])

  React.useEffect(() => {
    if (!show) return
    // generate 18 particles
    const icons: Particle['icon'][] = ['star','spark','heart']
    const ps: Particle[] = Array.from({ length: 18 }).map((_, i) => ({
      id: String(Date.now() + i),
      left: 50 + (Math.random()*160 - 80),
      top: 20 + Math.random()*40,
      rot: Math.random()*360,
      icon: icons[i % icons.length]
    }))
    setParticles(ps)
    // auto-complete
    const t = setTimeout(() => { onComplete?.(); setParticles([]) }, 1400)
    return () => clearTimeout(t)
  }, [show, onComplete])

  if (!show || prefersReduced) return null

  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-start justify-center overflow-visible">
      <div className="relative w-full h-0">
        {particles.map((p, i) => {
          const Icon = p.icon === 'star' ? Star : p.icon === 'spark' ? Sparkles : Heart
          const x = (Math.random()*360 - 180)
          const y = -120 - Math.random()*200
          return (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 0, x: 0, scale: 0.6 }}
              animate={{ opacity: 1, x: x, y: y, rotate: p.rot, scale: 1 }}
              transition={{ type: 'spring', stiffness: 220, damping: 18, duration: 0.9, delay: i * 0.02 }}
              style={{ position: 'absolute', left: `calc(50% + ${p.left}px)`, top: `${p.top}px`, zIndex: 9999 }}
            >
              <div className="w-8 h-8 rounded-full flex items-center justify-center shadow-lg" style={{ background: '#fff2', backdropFilter: 'blur(6px)' }}>
                <Icon size={20} />
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
