import { useEffect, useRef, useState } from 'react'
import { useGoogleLogin } from '@react-oauth/google'
import { useAuth } from '../context/AuthContext'
import { FileText, Zap, Shield, Search, ArrowRight, Sparkles } from 'lucide-react'

export default function LandingPage() {
  const { login } = useAuth()
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [error, setError] = useState('')
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Animated particle background
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const particles: { x: number; y: number; vx: number; vy: number; size: number; opacity: number }[] = []
    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        size: Math.random() * 2 + 0.5,
        opacity: Math.random() * 0.5 + 0.1
      })
    }

    let animId: number
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(99, 102, 241, ${p.opacity})`
        ctx.fill()
      })
      // Draw connecting lines
      particles.forEach((p, i) => {
        particles.slice(i + 1).forEach(q => {
          const dist = Math.hypot(p.x - q.x, p.y - q.y)
          if (dist < 120) {
            ctx.beginPath()
            ctx.moveTo(p.x, p.y)
            ctx.lineTo(q.x, q.y)
            ctx.strokeStyle = `rgba(99, 102, 241, ${0.08 * (1 - dist / 120)})`
            ctx.stroke()
          }
        })
      })
      animId = requestAnimationFrame(animate)
    }
    animate()
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize) }
  }, [])

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setIsSigningIn(true)
      try {
        const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
        })
        const profile = await res.json()
        login({
          email: profile.email,
          name: profile.name,
          picture: profile.picture,
          sub: profile.sub
        })
      } catch {
        setError('Sign-in failed. Please try again.')
        setIsSigningIn(false)
      }
    },
    onError: () => {
      setError('Sign-in was cancelled or failed.')
      setIsSigningIn(false)
    }
  })

  const features = [
    { icon: Zap, title: 'Instant answers', desc: 'Ask anything about your document and get precise, cited responses in seconds.' },
    { icon: Search, title: 'Semantic search', desc: 'AI-powered vector search finds the most relevant passages, not just keywords.' },
    { icon: Shield, title: 'Private & secure', desc: 'Your documents never leave your control. Processed and stored securely.' },
  ]

  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-hidden relative">
      {/* Particle canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />

      {/* Gradient orbs */}
      <div className="absolute top-[-20%] left-[10%] w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[5%] w-[400px] h-[400px] bg-violet-600/15 rounded-full blur-[100px] pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <FileText className="w-4 h-4 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight">Lumidocs</span>
          <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full font-semibold tracking-wider uppercase">AI</span>
        </div>
        <button
          onClick={() => googleLogin()}
          disabled={isSigningIn}
          className="text-sm text-slate-300 hover:text-white transition-colors font-medium"
        >
          Sign in →
        </button>
      </header>

      {/* Hero */}
      <main className="relative z-10 max-w-7xl mx-auto px-8 pt-16 pb-24">
        <div className="max-w-3xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-4 py-1.5 mb-8">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-xs text-indigo-300 font-medium">Powered by Gemini + LLaMA 3.3</span>
          </div>

          {/* Headline */}
          <h1 className="text-6xl font-black tracking-tight leading-[1.05] mb-6">
            <span className="text-white">Your documents,</span>
            <br />
            <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
              finally intelligent
            </span>
          </h1>

          <p className="text-lg text-slate-400 leading-relaxed max-w-xl mx-auto mb-10">
            Upload any PDF or document and have a real conversation with it. Lumidocs finds the exact answers you need — with page citations.
          </p>

          {/* CTA */}
          <div className="flex flex-col items-center gap-3">
            {error && (
              <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 px-4 py-2 rounded-lg">{error}</p>
            )}
            <button
              onClick={() => { setError(''); googleLogin() }}
              disabled={isSigningIn}
              className="group flex items-center gap-3 bg-white text-slate-900 hover:bg-slate-100 px-6 py-3.5 rounded-2xl font-semibold text-base transition-all shadow-xl shadow-black/20 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSigningIn ? (
                <div className="w-5 h-5 border-2 border-slate-400 border-t-slate-900 rounded-full animate-spin" />
              ) : (
                <svg viewBox="0 0 24 24" className="w-5 h-5 flex-shrink-0">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              )}
              {isSigningIn ? 'Signing you in…' : 'Continue with Google'}
              {!isSigningIn && <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />}
            </button>
            <p className="text-xs text-slate-600">Free to use · No credit card required</p>
          </div>
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-3 gap-4 mt-24 max-w-4xl mx-auto">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/8 hover:border-white/15 transition-all">
              <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center mb-4">
                <Icon className="w-5 h-5 text-indigo-400" />
              </div>
              <h3 className="font-semibold text-white mb-2">{title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        {/* Mock UI preview */}
        <div className="mt-16 max-w-2xl mx-auto">
          <div className="bg-slate-900/80 border border-white/10 rounded-2xl overflow-hidden shadow-2xl shadow-black/40">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-slate-800/50">
              <div className="w-3 h-3 rounded-full bg-red-500/60" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
              <div className="w-3 h-3 rounded-full bg-green-500/60" />
              <span className="ml-3 text-xs text-slate-500">lumidocs.ai</span>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex gap-3 items-start">
                <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0 text-xs">You</div>
                <div className="bg-indigo-600/80 text-white text-sm px-4 py-2.5 rounded-2xl rounded-tl-sm max-w-xs">
                  What are the key findings in section 3?
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <div className="w-7 h-7 rounded-full bg-indigo-500/30 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-3.5 h-3.5 text-indigo-400" />
                </div>
                <div className="bg-slate-800 text-slate-200 text-sm px-4 py-2.5 rounded-2xl rounded-tl-sm max-w-sm leading-relaxed">
                  Section 3 identifies three core findings: <span className="text-indigo-400">increased retention rates</span> of 34%, a cost reduction of $2.1M, and improved NPS scores…
                  <div className="mt-2 text-xs text-slate-500">📄 Source: page 12, 14</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}