import { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import { googleLogout } from '@react-oauth/google'

export interface UserProfile {
  email: string
  name: string
  picture: string
  sub: string
  theme: ThemeOptions
  accentColor: AccentColor
  displayName: string
}

export type AccentColor = 'indigo' | 'emerald' | 'rose' | 'amber' | 'sky'
export type ThemeOptions = 'light' | 'dark' | 'system'

interface AuthContextType {
  user: UserProfile | null
  login: (profile: Omit<UserProfile, 'theme' | 'accentColor' | 'displayName'>) => void
  logout: () => void
  updatePreferences: (prefs: Partial<Pick<UserProfile, 'theme' | 'accentColor' | 'displayName'>>) => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

// Applies dark/light class to <html> element
function applyTheme(theme: ThemeOptions) {
  const root = document.documentElement
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const shouldBeDark = theme === 'dark' || (theme === 'system' && prefersDark)
  root.classList.toggle('dark', shouldBeDark)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Load persisted user on mount
  useEffect(() => {
    const stored = localStorage.getItem('lumidocs_user')
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setUser(parsed)
        applyTheme(parsed.theme ?? 'system')
      } catch {
        localStorage.removeItem('lumidocs_user')
      }
    }
    setIsLoading(false)
  }, [])

  // Re-apply theme whenever it changes
  useEffect(() => {
    if (user?.theme) applyTheme(user.theme)
  }, [user?.theme])

  // Listen for OS preference changes (for system theme)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => { if (user?.theme === 'system') applyTheme('system') }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [user?.theme])

  const login = (profile: Omit<UserProfile, 'theme' | 'accentColor' | 'displayName'>) => {
    const stored = localStorage.getItem(`lumidocs_prefs_${profile.sub}`)
    const prefs = stored
      ? JSON.parse(stored)
      : { theme: 'system' as ThemeOptions, accentColor: 'indigo' as AccentColor, displayName: profile.name }
    const fullProfile: UserProfile = { ...profile, ...prefs }
    setUser(fullProfile)
    applyTheme(fullProfile.theme)
    localStorage.setItem('lumidocs_user', JSON.stringify(fullProfile))
  }

  const logout = () => {
    googleLogout()
    localStorage.removeItem('lumidocs_user')
    setUser(null)
    document.documentElement.classList.remove('dark')
  }

  const updatePreferences = (prefs: Partial<Pick<UserProfile, 'theme' | 'accentColor' | 'displayName'>>) => {
    if (!user) return
    const updated = { ...user, ...prefs }
    setUser(updated)
    if (prefs.theme) applyTheme(prefs.theme)
    localStorage.setItem('lumidocs_user', JSON.stringify(updated))
    localStorage.setItem(`lumidocs_prefs_${user.sub}`, JSON.stringify({
      theme: updated.theme,
      accentColor: updated.accentColor,
      displayName: updated.displayName,
    }))
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, updatePreferences, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}