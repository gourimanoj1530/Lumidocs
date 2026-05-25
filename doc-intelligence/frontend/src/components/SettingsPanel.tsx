import { useState } from 'react'
import { X, Check, Palette, Sun, Moon, Monitor, User } from 'lucide-react'
import { useAuth, AccentColor, ThemeOptions } from '../context/AuthContext'

const ACCENT_COLORS: { value: AccentColor; label: string; classes: string; preview: string }[] = [
  { value: 'indigo', label: 'Indigo', classes: 'bg-indigo-600', preview: '#4f46e5' },
  { value: 'emerald', label: 'Emerald', classes: 'bg-emerald-600', preview: '#059669' },
  { value: 'rose', label: 'Rose', classes: 'bg-rose-600', preview: '#e11d48' },
  { value: 'amber', label: 'Amber', classes: 'bg-amber-500', preview: '#f59e0b' },
  { value: 'sky', label: 'Sky', classes: 'bg-sky-600', preview: '#0284c7' },
]

const THEMES: { value: ThemeOptions; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
]

export default function SettingsPanel({ onClose }: { onClose: () => void }) {
  const { user, updatePreferences } = useAuth()
  const [displayName, setDisplayName] = useState(user?.displayName || user?.name || '')
  const [saved, setSaved] = useState(false)

  if (!user) return null

  const handleSave = () => {
    updatePreferences({ displayName })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">Preferences</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Profile */}
          <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl">
            <img src={user.picture} alt={user.name} className="w-14 h-14 rounded-full ring-2 ring-white shadow-sm" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-800 truncate">{user.name}</p>
              <p className="text-sm text-slate-400 truncate">{user.email}</p>
            </div>
          </div>

          {/* Display name */}
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

          {/* Theme */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
              <Monitor className="w-4 h-4" /> Theme
            </label>
            <div className="grid grid-cols-3 gap-2">
              {THEMES.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => updatePreferences({ theme: value })}
                  className={`flex flex-col items-center gap-2 py-3 px-2 rounded-xl border-2 transition-all text-sm font-medium ${
                    user.theme === value
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Accent color */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
              <Palette className="w-4 h-4" /> Accent color
            </label>
            <div className="flex gap-3">
              {ACCENT_COLORS.map(({ value, label, preview }) => (
                <button
                  key={value}
                  onClick={() => updatePreferences({ accentColor: value })}
                  title={label}
                  className="relative w-10 h-10 rounded-full transition-transform hover:scale-110"
                  style={{ backgroundColor: preview }}
                >
                  {user.accentColor === value && (
                    <Check className="w-4 h-4 text-white absolute inset-0 m-auto" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6">
          <button
            onClick={handleSave}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-colors"
          >
            {saved ? <><Check className="w-4 h-4" /> Saved!</> : 'Save preferences'}
          </button>
        </div>
      </div>
    </div>
  )
}