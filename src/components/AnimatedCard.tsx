import { motion, useMotionTemplate, useMotionValue } from 'framer-motion'
import { cn } from '@/lib/utils'
import { ReactNode } from 'react'

interface AnimatedCardProps {
  className?: string
  children: ReactNode
  onClick?: () => void
}

export default function AnimatedCard({ className, children, onClick }: AnimatedCardProps) {
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const rotateX = useMotionValue(0)
  const rotateY = useMotionValue(0)
  const bg = useMotionTemplate`radial-gradient(600px circle at ${x}px ${y}px, rgba(255,255,255,0.12), transparent 40%)`

  return (
    <motion.div
      onMouseMove={(e) => {
        const rect = (e.target as HTMLElement).getBoundingClientRect()
        const px = e.clientX - rect.left
        const py = e.clientY - rect.top
        x.set(px)
        y.set(py)
        const rx = (py / rect.height - 0.5) * -8
        const ry = (px / rect.width - 0.5) * 8
        rotateX.set(rx)
        rotateY.set(ry)
      }}
      onMouseLeave={() => { 
        rotateX.set(0)
        rotateY.set(0) 
      }}
      whileHover={{ scale: 1.01 }}
      style={{ rotateX, rotateY, backgroundImage: bg }}
      className={cn(
        'group relative rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md shadow-lg transition-colors cursor-pointer',
        'hover:border-white/20 hover:bg-white/10',
        className
      )}
      onClick={onClick}
    >
      {/* glow */}
      <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-white/10"></div>
      {children}
    </motion.div>
  )
}