import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, Bot, User, FileText, AlertCircle } from 'lucide-react'
import { chat } from '../api'

interface Message {
  role: 'user' | 'assistant'
  content: string
  sources?: string[]
  error?: boolean
}

export default function ChatPage({ documentId, documentName }: {
  documentId: string | null
  documentName: string
}) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    setMessages([])
  }, [documentId])

  const send = async () => {
    const q = input.trim()
    if (!q || loading) return
    setInput('')
    setMessages(m => [...m, { role: 'user', content: q }])
    setLoading(true)
    try {
      const res = await chat(q, documentId)
      setMessages(m => [...m, {
        role: 'assistant',
        content: res.data.answer,
        sources: res.data.sourceChunks
      }])
    } catch {
      setMessages(m => [...m, {
        role: 'assistant',
        content: 'Something went wrong. Please try again.',
        error: true
      }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)] bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Chat Header */}
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-3">
        <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
          <Bot className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="font-semibold text-slate-800 text-sm">Lumidocs AI</p>
          {documentName ? (
            <p className="text-xs text-slate-400 flex items-center gap-1">
              <FileText className="w-3 h-3" /> {documentName}
            </p>
          ) : (
            <p className="text-xs text-slate-400">All documents</p>
          )}
        </div>
      </div>

      {/* Messages */}
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
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
              msg.role === 'user' ? 'bg-brand-600' : 'bg-slate-100'
            }`}>
              {msg.role === 'user'
                ? <User className="w-4 h-4 text-white" />
                : msg.error
                  ? <AlertCircle className="w-4 h-4 text-red-500" />
                  : <Bot className="w-4 h-4 text-slate-500" />
              }
            </div>
            <div className={`max-w-[75%] space-y-2 ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col`}>
              <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-brand-600 text-white rounded-tr-sm'
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
                    <div key={j} className="text-xs bg-amber-50 border border-amber-100 text-amber-800 px-3 py-2 rounded-lg">
                      {s}
                    </div>
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

      {/* Input */}
      <div className="px-6 py-4 border-t border-slate-100">
        <div className="flex gap-3 items-end">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            placeholder="Ask a question about your document..."
            rows={1}
            className="flex-1 resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-slate-50"
          />
          <button
            onClick={send}
            disabled={!input.trim() || loading}
            className="w-10 h-10 bg-brand-600 text-white rounded-xl flex items-center justify-center hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed transition flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-slate-400 mt-2">Press Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  )
}