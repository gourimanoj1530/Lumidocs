import {
  useState, useEffect, useRef, useCallback,
  createContext, useContext
} from 'react'
import { useGoogleLogin, googleLogout } from '@react-oauth/google'
import {
  FileText, MessageSquare, LayoutDashboard, LogOut, Settings,
  ChevronDown, X, Check, Palette, Sun, Moon, Monitor, User,
  Upload, Trash2, CheckCircle, Clock, Send, Loader2, Bot,
  AlertCircle, ArrowRight, Sparkles, Zap, Shield, Search
} from 'lucide-react'
import { uploadDocument, getDocuments, deleteDocument, chat } from './api'

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

type Tab = 'documents' | 'chat'
type AccentColor = 'indigo' | 'emerald' | 'rose' | 'amber' | 'sky'
type ThemeOption = 'light' | 'dark' | 'system'

interface UserProfile {
  email: string
  name: string
  picture: string
  sub: string
  theme: ThemeOption
  accentColor: AccentColor
  displayName: string
}

interface Doc {
  id: string
  originalName: string
  fileType: string
  fileSize: number
  status: string
  createdAt: string
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  sources?: string[]
  error?: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTH CONTEXT  (self-contained, no external file needed)
// ─────────────────────────────────────────────────────────────────────────────

interface AuthCtx {
  user: UserProfile | null
  login: (p: Omit<UserProfile, 'theme' | 'accentColor' | 'displayName'>) => void
  logout: () => void
  updatePreferences: (p: Partial<Pick<UserProfile, 'theme' | 'accentColor' | 'displayName'>>) => void
  isLoading: boolean
}

const AuthContext = createContext<AuthCtx | null>(null)

function useAuth() {
  const c = useContext(AuthContext)
  if (!c) throw new Error('useAuth must be inside AuthProvider')
  return c
}

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    try {
      const s = localStorage.getItem('lumidocs_user')
      if (s) setUser(JSON.parse(s))
    } catch { localStorage.removeItem('lumidocs_user') }
    setIsLoading(false)
  }, [])

  const login = (profile: Omit<UserProfile, 'theme' | 'accentColor' | 'displayName'>) => {
    const raw = localStorage.getItem(`lumidocs_prefs_${profile.sub}`)
    const prefs = raw
      ? JSON.parse(raw)
      : { theme: 'system' as ThemeOption, accentColor: 'indigo' as AccentColor, displayName: profile.name }
    const full: UserProfile = { ...profile, ...prefs }
    setUser(full)
    localStorage.setItem('lumidocs_user', JSON.stringify(full))
  }

  const logout = () => {
    googleLogout()
    localStorage.removeItem('lumidocs_user')
    setUser(null)
  }

  const updatePreferences = (prefs: Partial<Pick<UserProfile, 'theme' | 'accentColor' | 'displayName'>>) => {
    if (!user) return
    const updated = { ...user, ...prefs }
    setUser(updated)
    localStorage.setItem('lumidocs_user', JSON.stringify(updated))
    localStorage.setItem(`lumidocs_prefs_${user.sub}`, JSON.stringify({
      theme: updated.theme, accentColor: updated.accentColor, displayName: updated.displayName
    }))
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, updatePreferences, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ACCENT COLOUR SYSTEM
// ─────────────────────────────────────────────────────────────────────────────

const A: Record<AccentColor, { bg: string; hov: string; ring: string; light: string; hex: string }> = {
  indigo:  { bg: 'bg-indigo-600',  hov: 'hover:bg-indigo-700',  ring: 'ring-indigo-500',  light: 'bg-indigo-50 text-indigo-600',  hex: '#4f46e5' },
  emerald: { bg: 'bg-emerald-600', hov: 'hover:bg-emerald-700', ring: 'ring-emerald-500', light: 'bg-emerald-50 text-emerald-600', hex: '#059669' },
  rose:    { bg: 'bg-rose-600',    hov: 'hover:bg-rose-700',    ring: 'ring-rose-500',    light: 'bg-rose-50 text-rose-600',    hex: '#e11d48' },
  amber:   { bg: 'bg-amber-500',   hov: 'hover:bg-amber-600',   ring: 'ring-amber-400',   light: 'bg-amber-50 text-amber-600',   hex: '#f59e0b' },
  sky:     { bg: 'bg-sky-600',     hov: 'hover:bg-sky-700',     ring: 'ring-sky-500',     light: 'bg-sky-50 text-sky-600',     hex: '#0284c7' },
}

// ─────────────────────────────────────────────────────────────────────────────
// LANDING PAGE
// ─────────────────────────────────────────────────────────────────────────────

function LandingPage() {
  const { login } = useAuth()
  const [signingIn, setSigningIn] = useState(false)
  const [error, setError]         = useState('')
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // ── particle canvas ──────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width  = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const pts = Array.from({ length: 60 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      r: Math.random() * 2 + 0.5,
      o: Math.random() * 0.5 + 0.1,
    }))

    let id: number
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      pts.forEach(p => {
        p.x += p.vx; p.y += p.vy
        if (p.x < 0 || p.x > canvas.width)  p.vx *= -1
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(99,102,241,${p.o})`
        ctx.fill()
      })
      pts.forEach((p, i) => pts.slice(i + 1).forEach(q => {
        const d = Math.hypot(p.x - q.x, p.y - q.y)
        if (d < 120) {
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y)
          ctx.strokeStyle = `rgba(99,102,241,${0.08 * (1 - d / 120)})`
          ctx.stroke()
        }
      }))
      id = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(id); window.removeEventListener('resize', resize) }
  }, [])

  // ── google login ─────────────────────────────────────────────────────────
  const doGoogleLogin = useGoogleLogin({
    onSuccess: async (tok) => {
      setSigningIn(true)
      try {
        const r = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tok.access_token}` }
        })
        const p = await r.json()
        login({ email: p.email, name: p.name, picture: p.picture, sub: p.sub })
      } catch {
        setError('Sign-in failed. Please try again.')
        setSigningIn(false)
      }
    },
    onError: () => { setError('Sign-in was cancelled or failed.'); setSigningIn(false) }
  })

  const features = [
    { icon: Zap,    title: 'Instant answers',   desc: 'Ask anything about your document and get precise, cited responses in seconds.' },
    { icon: Search, title: 'Semantic search',    desc: 'AI-powered vector search finds the most relevant passages, not just keywords.' },
    { icon: Shield, title: 'Private & secure',   desc: 'Your documents stay in your control. Processed and stored securely.' },
  ]

  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-hidden relative">
      {/* canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
      {/* glow orbs */}
      <div className="absolute top-[-20%] left-[10%] w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[5%]  w-[400px] h-[400px] bg-violet-600/15 rounded-full blur-[100px] pointer-events-none" />

      {/* ── header ── */}
      <header className="relative z-10 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <FileText className="w-4 h-4 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight">Lumidocs</span>
          <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full font-semibold tracking-wider uppercase">AI</span>
        </div>
        <button
          onClick={() => doGoogleLogin()}
          disabled={signingIn}
          className="text-sm text-slate-300 hover:text-white transition-colors font-medium"
        >
          Sign in →
        </button>
      </header>

      {/* ── hero ── */}
      <main className="relative z-10 max-w-7xl mx-auto px-8 pt-16 pb-24">
        <div className="max-w-3xl mx-auto text-center">

          <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-4 py-1.5 mb-8">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-xs text-indigo-300 font-medium">Powered by Gemini + LLaMA 3.3</span>
          </div>

          <h1 className="text-6xl font-black tracking-tight leading-[1.05] mb-6">
            <span className="text-white">Your documents,</span><br />
            <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
              finally intelligent
            </span>
          </h1>

          <p className="text-lg text-slate-400 leading-relaxed max-w-xl mx-auto mb-10">
            Upload any PDF or document and have a real conversation with it.
            Lumidocs finds the exact answers you need — with page citations.
          </p>

          {/* CTA */}
          <div className="flex flex-col items-center gap-3">
            {error && (
              <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 px-4 py-2 rounded-lg">{error}</p>
            )}
            <button
              onClick={() => { setError(''); doGoogleLogin() }}
              disabled={signingIn}
              className="group flex items-center gap-3 bg-white text-slate-900 hover:bg-slate-100 px-6 py-3.5 rounded-2xl font-semibold text-base transition-all shadow-xl shadow-black/20 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {signingIn ? (
                <div className="w-5 h-5 border-2 border-slate-400 border-t-slate-900 rounded-full animate-spin" />
              ) : (
                <svg viewBox="0 0 24 24" className="w-5 h-5 flex-shrink-0">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              )}
              {signingIn ? 'Signing you in…' : 'Continue with Google'}
              {!signingIn && <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />}
            </button>
            <p className="text-xs text-slate-600">Free to use · No credit card required</p>
          </div>
        </div>

        {/* feature cards */}
        <div className="grid grid-cols-3 gap-4 mt-24 max-w-4xl mx-auto">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/[0.08] hover:border-white/20 transition-all">
              <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center mb-4">
                <Icon className="w-5 h-5 text-indigo-400" />
              </div>
              <h3 className="font-semibold text-white mb-2">{title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        {/* mock chat preview */}
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
                <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0 text-xs text-slate-300">You</div>
                <div className="bg-indigo-600/80 text-white text-sm px-4 py-2.5 rounded-2xl rounded-tl-sm max-w-xs">
                  What are the key findings in section 3?
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <div className="w-7 h-7 rounded-full bg-indigo-500/30 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-3.5 h-3.5 text-indigo-400" />
                </div>
                <div className="bg-slate-800 text-slate-200 text-sm px-4 py-2.5 rounded-2xl rounded-tl-sm max-w-sm leading-relaxed">
                  Section 3 identifies three core findings:{' '}
                  <span className="text-indigo-400">increased retention rates</span> of 34%, a cost reduction of $2.1M, and improved NPS scores…
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

// ─────────────────────────────────────────────────────────────────────────────
// SETTINGS PANEL
// ─────────────────────────────────────────────────────────────────────────────

const ACCENT_OPTS: { value: AccentColor; label: string; hex: string }[] = [
  { value: 'indigo',  label: 'Indigo',  hex: '#4f46e5' },
  { value: 'emerald', label: 'Emerald', hex: '#059669' },
  { value: 'rose',    label: 'Rose',    hex: '#e11d48' },
  { value: 'amber',   label: 'Amber',   hex: '#f59e0b' },
  { value: 'sky',     label: 'Sky',     hex: '#0284c7' },
]

const THEME_OPTS: { value: ThemeOption; label: string; icon: typeof Sun }[] = [
  { value: 'light',  label: 'Light',  icon: Sun     },
  { value: 'dark',   label: 'Dark',   icon: Moon    },
  { value: 'system', label: 'System', icon: Monitor },
]

function SettingsPanel({ onClose }: { onClose: () => void }) {
  const { user, updatePreferences, logout } = useAuth()
  const [displayName, setDisplayName] = useState(user?.displayName || user?.name || '')
  const [saved, setSaved] = useState(false)

  if (!user) return null
  const ac = A[user.accentColor]

  const save = () => {
    updatePreferences({ displayName })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>

        {/* header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">Preferences</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">

          {/* profile */}
          <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl">
            <img src={user.picture} alt={user.name} className={`w-14 h-14 rounded-full ring-2 ${ac.ring}`} />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-800 truncate">{user.name}</p>
              <p className="text-sm text-slate-400 truncate">{user.email}</p>
            </div>
          </div>

          {/* display name */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
              <User className="w-4 h-4" /> Display name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-slate-50"
              placeholder="How should we call you?"
            />
          </div>

          {/* theme */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
              <Monitor className="w-4 h-4" /> Theme
            </label>
            <div className="grid grid-cols-3 gap-2">
              {THEME_OPTS.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => updatePreferences({ theme: value })}
                  className={`flex flex-col items-center gap-2 py-3 px-2 rounded-xl border-2 transition-all text-sm font-medium ${
                    user.theme === value
                      ? `border-indigo-500 bg-indigo-50 text-indigo-700`
                      : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />{label}
                </button>
              ))}
            </div>
          </div>

          {/* accent colour */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
              <Palette className="w-4 h-4" /> Accent color
            </label>
            <div className="flex gap-3">
              {ACCENT_OPTS.map(({ value, label, hex }) => (
                <button
                  key={value}
                  onClick={() => updatePreferences({ accentColor: value })}
                  title={label}
                  className="relative w-10 h-10 rounded-full transition-transform hover:scale-110 flex items-center justify-center shadow-sm"
                  style={{ backgroundColor: hex }}
                >
                  {user.accentColor === value && <Check className="w-4 h-4 text-white" />}
                </button>
              ))}
            </div>
          </div>

          {/* sign out */}
          <div className="pt-2 border-t border-slate-100">
            <button
              onClick={() => { onClose(); logout() }}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 transition-colors text-sm font-medium"
            >
              <LogOut className="w-4 h-4" /> Sign out
            </button>
          </div>
        </div>

        {/* footer */}
        <div className="px-6 pb-6">
          <button
            onClick={save}
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl ${ac.bg} ${ac.hov} text-white font-semibold transition-colors`}
          >
            {saved ? <><Check className="w-4 h-4" /> Saved!</> : 'Save preferences'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// DOCUMENTS PAGE
// ─────────────────────────────────────────────────────────────────────────────

function DocumentsPage({
  onOpenChat,
  ac,
}: {
  onOpenChat: (id: string, name: string) => void
  ac: typeof A[AccentColor]
}) {
  const [docs, setDocs]       = useState<Doc[]>([])
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver]   = useState(false)
  const [loading, setLoading]     = useState(true)

  const load = useCallback(async () => {
    try { const r = await getDocuments(); setDocs(r.data) }
    catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleUpload = async (file: File) => {
    setUploading(true)
    try { await uploadDocument(file); await load() }
    catch (e) { console.error(e) }
    finally { setUploading(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this document?')) return
    await deleteDocument(id)
    setDocs(d => d.filter(doc => doc.id !== id))
  }

  const fmt = (b: number) =>
    b < 1024 ? b + ' B' : b < 1048576 ? (b / 1024).toFixed(1) + ' KB' : (b / 1048576).toFixed(1) + ' MB'

  return (
    <div className="space-y-6">
      {/* upload zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleUpload(f) }}
        className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all cursor-pointer ${
          dragOver ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50'
        }`}
        onClick={() => document.getElementById('fileInput')?.click()}
      >
        <input id="fileInput" type="file" accept=".pdf,.docx,.csv" className="hidden"
          onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])} />

        {uploading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
            <p className="text-slate-600 font-medium">Uploading and processing…</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${ac.light}`}>
              <Upload className="w-7 h-7" />
            </div>
            <div>
              <p className="text-slate-700 font-semibold text-lg">Drop your document here</p>
              <p className="text-slate-400 text-sm mt-1">PDF, DOCX, or CSV — up to 50 MB</p>
            </div>
            <span className={`px-4 py-2 ${ac.bg} ${ac.hov} text-white text-sm font-medium rounded-lg transition`}>
              Browse files
            </span>
          </div>
        )}
      </div>

      {/* document list */}
      <div>
        <h2 className="text-lg font-semibold text-slate-800 mb-4">
          Your documents <span className="ml-1 text-sm font-normal text-slate-400">({docs.length})</span>
        </h2>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
          </div>
        ) : docs.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No documents yet. Upload one to get started.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {docs.map(doc => (
              <div key={doc.id} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4 hover:shadow-sm transition-shadow">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${ac.light}`}>
                  <FileText className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800 truncate">{doc.originalName}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{doc.fileType.toUpperCase()} · {fmt(doc.fileSize)}</p>
                </div>
                <div className="flex items-center gap-2">
                  {doc.status === 'ready' ? (
                    <span className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                      <CheckCircle className="w-3 h-3" /> Ready
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                      <Clock className="w-3 h-3" /> Processing
                    </span>
                  )}
                  <button
                    onClick={() => onOpenChat(doc.id, doc.originalName)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 ${ac.bg} ${ac.hov} text-white text-xs font-medium rounded-lg transition`}
                  >
                    <MessageSquare className="w-3 h-3" /> Chat
                  </button>
                  <button
                    onClick={() => handleDelete(doc.id)}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// CHAT PAGE
// ─────────────────────────────────────────────────────────────────────────────

function ChatPage({
  documentId,
  documentName,
  ac,
}: {
  documentId: string | null
  documentName: string
  ac: typeof A[AccentColor]
}) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput]       = useState('')
  const [loading, setLoading]   = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])
  useEffect(() => { setMessages([]) }, [documentId])

  const send = async () => {
    const q = input.trim()
    if (!q || loading) return
    setInput('')
    setMessages(m => [...m, { role: 'user', content: q }])
    setLoading(true)
    try {
      const r = await chat(q, documentId)
      setMessages(m => [...m, { role: 'assistant', content: r.data.answer, sources: r.data.sourceChunks }])
    } catch {
      setMessages(m => [...m, { role: 'assistant', content: 'Something went wrong. Please try again.', error: true }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)] bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* header */}
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-3">
        <div className={`w-8 h-8 ${ac.bg} rounded-lg flex items-center justify-center`}>
          <Bot className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="font-semibold text-slate-800 text-sm">Lumidocs AI</p>
          {documentName
            ? <p className="text-xs text-slate-400 flex items-center gap-1"><FileText className="w-3 h-3" /> {documentName}</p>
            : <p className="text-xs text-slate-400">All documents</p>}
        </div>
      </div>

      {/* messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        {messages.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <Bot className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="font-medium">Ask anything about your document</p>
            <p className="text-sm mt-1">I'll find the most relevant sections and answer precisely</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? ac.bg : 'bg-slate-100'}`}>
              {msg.role === 'user'
                ? <User className="w-4 h-4 text-white" />
                : msg.error
                  ? <AlertCircle className="w-4 h-4 text-red-500" />
                  : <Bot className="w-4 h-4 text-slate-500" />}
            </div>
            <div className={`max-w-[75%] flex flex-col space-y-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                msg.role === 'user'
                  ? `${ac.bg} text-white rounded-tr-sm`
                  : msg.error
                    ? 'bg-red-50 text-red-700 border border-red-100 rounded-tl-sm'
                    : 'bg-slate-100 text-slate-800 rounded-tl-sm'
              }`}>
                {msg.content}
              </div>
              {msg.sources && msg.sources.length > 0 && (
                <div className="space-y-1 w-full">
                  <p className="text-xs text-slate-400 font-medium">Sources used:</p>
                  {msg.sources.slice(0, 2).map((s, j) => (
                    <div key={j} className="text-xs bg-amber-50 border border-amber-100 text-amber-800 px-3 py-2 rounded-lg">{s}</div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
              <Bot className="w-4 h-4 text-slate-500" />
            </div>
            <div className="bg-slate-100 px-4 py-3 rounded-2xl rounded-tl-sm">
              <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* input */}
      <div className="px-6 py-4 border-t border-slate-100">
        <div className="flex gap-3 items-end">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            placeholder="Ask a question about your document…"
            rows={1}
            className="flex-1 resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-slate-50"
          />
          <button
            onClick={send}
            disabled={!input.trim() || loading}
            className={`w-10 h-10 ${ac.bg} ${ac.hov} text-white rounded-xl flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed transition flex-shrink-0`}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-slate-400 mt-2">Press Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD  (authenticated shell)
// ─────────────────────────────────────────────────────────────────────────────

function Dashboard() {
  const { user, logout } = useAuth()
  const [tab, setTab]               = useState<Tab>('documents')
  const [docId, setDocId]           = useState<string | null>(null)
  const [docName, setDocName]       = useState('')
  const [showSettings, setSettings] = useState(false)
  const [showMenu, setMenu]         = useState(false)

  const ac = A[user?.accentColor ?? 'indigo']

  const openChat = (id: string, name: string) => { setDocId(id); setDocName(name); setTab('chat') }

  const greet = () => {
    const h = new Date().getHours()
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">

      {/* ── header ── */}
      <header className="bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 ${ac.bg} rounded-lg flex items-center justify-center`}>
            <FileText className="w-4 h-4 text-white" />
          </div>
          <span className="text-xl font-bold text-slate-800">Lumidocs</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ac.light}`}>AI</span>
        </div>

        <nav className="flex gap-1">
          {([
            { id: 'documents' as Tab, label: 'Documents', icon: LayoutDashboard },
            { id: 'chat'      as Tab, label: 'Chat',      icon: MessageSquare   },
          ]).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === id ? `${ac.bg} text-white shadow-sm` : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-4 h-4" />{label}
            </button>
          ))}
        </nav>

        {/* user menu */}
        <div className="relative">
          <button
            onClick={() => setMenu(v => !v)}
            className="flex items-center gap-2.5 pl-1 pr-3 py-1 rounded-full hover:bg-slate-100 transition-colors"
          >
            <img src={user?.picture} alt={user?.name} className={`w-8 h-8 rounded-full ring-2 ${ac.ring}`} />
            <div className="text-left hidden sm:block">
              <p className="text-sm font-semibold text-slate-800 leading-tight">{user?.displayName || user?.name}</p>
              <p className="text-xs text-slate-400 leading-tight">{greet()}</p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
              <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl shadow-xl border border-slate-100 z-20 overflow-hidden py-1">
                <div className="px-4 py-3 border-b border-slate-100">
                  <p className="text-xs text-slate-400">Signed in as</p>
                  <p className="text-sm font-medium text-slate-700 truncate">{user?.email}</p>
                </div>
                <button
                  onClick={() => { setMenu(false); setSettings(true) }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <Settings className="w-4 h-4 text-slate-400" /> Preferences
                </button>
                <button
                  onClick={() => { setMenu(false); logout() }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" /> Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      {/* welcome banner */}
      {tab === 'documents' && (
        <div className={`${ac.bg} text-white px-8 py-2.5`}>
          <p className="text-sm font-medium opacity-90">
            {greet()}, {(user?.displayName || user?.name || '').split(' ')[0]} 👋 — Upload a document to get started, or continue a previous conversation.
          </p>
        </div>
      )}

      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-8">
        {tab === 'documents' && <DocumentsPage onOpenChat={openChat} ac={ac} />}
        {tab === 'chat'      && <ChatPage documentId={docId} documentName={docName} ac={ac} />}
      </main>

      {showSettings && <SettingsPanel onClose={() => setSettings(false)} />}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOT
// ─────────────────────────────────────────────────────────────────────────────

function Inner() {
  const { user, isLoading } = useAuth()

  if (isLoading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
    </div>
  )

  return user ? <Dashboard /> : <LandingPage />
}

export default function App() {
  return (
    <AuthProvider>
      <Inner />
    </AuthProvider>
  )
}