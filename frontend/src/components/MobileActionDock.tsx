'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'motion/react'
import {
  Heart,
  Search,
  UserPlus,
  Activity,
  AlertCircle
} from 'lucide-react'

export default function MobileActionDock() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 200)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <AnimatePresence>
      {scrolled && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 30 }}
          transition={{ duration: 0.25 }}
          className="fixed bottom-4 inset-x-4 z-40 block md:hidden pointer-events-auto"
        >
          <div className="relative mx-auto flex max-w-md items-center justify-between gap-2 rounded-2xl border border-line bg-surface/95 p-2 backdrop-blur-xl shadow-[0_15px_35px_-10px_rgba(0,0,0,0.9)]">
            <Link
              href="/register"
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blood py-3 text-center text-xs font-semibold text-white shadow-[0_8px_20px_-6px_rgba(220,38,38,0.8)] active:scale-98 transition-transform"
            >
              <Heart className="h-4 w-4 fill-white" />
              <span>Donate Blood</span>
            </Link>

            <Link
              href="/requests"
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-line bg-raised py-3 text-center text-xs font-medium text-bone active:scale-98 transition-transform"
            >
              <Search className="h-4 w-4 text-blood" />
              <span>Find Blood</span>
            </Link>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
