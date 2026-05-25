import { useState, useEffect, useCallback } from 'react'
import { Upload, FileText, Trash2, MessageSquare, Loader2, CheckCircle, Clock } from 'lucide-react'
import { uploadDocument, getDocuments, deleteDocument } from '../api'

interface Doc {
  id: string
  originalName: string
  fileType: string
  fileSize: number
  status: string
  createdAt: string
}

export default function DocumentsPage({ onOpenChat }: { onOpenChat: (id: string, name: string) => void }) {
  const [docs, setDocs] = useState<Doc[]>([])
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [loading, setLoading] = useState(true)

  const loadDocs = useCallback(async () => {
    try {
      const res = await getDocuments()
      setDocs(res.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadDocs() }, [loadDocs])

  const handleUpload = async (file: File) => {
    if (!file) return
    setUploading(true)
    try {
      await uploadDocument(file)
      await loadDocs()
    } catch (e) {
      console.error(e)
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this document?')) return
    await deleteDocument(id)
    setDocs(d => d.filter(doc => doc.id !== id))
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / 1024 / 1024).toFixed(1) + ' MB'
  }

  return (
    <div className="space-y-6">
      {/* Upload Zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => {
          e.preventDefault()
          setDragOver(false)
          const file = e.dataTransfer.files[0]
          if (file) handleUpload(file)
        }}
        className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all cursor-pointer ${
          dragOver ? 'border-brand-500 bg-brand-50' : 'border-slate-200 bg-white hover:border-brand-300 hover:bg-slate-50'
        }`}
        onClick={() => document.getElementById('fileInput')?.click()}
      >
        <input
          id="fileInput"
          type="file"
          accept=".pdf,.docx,.csv"
          className="hidden"
          onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])}
        />
        {uploading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-10 h-10 text-brand-500 animate-spin" />
            <p className="text-slate-600 font-medium">Uploading and processing...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 bg-brand-50 rounded-2xl flex items-center justify-center">
              <Upload className="w-7 h-7 text-brand-500" />
            </div>
            <div>
              <p className="text-slate-700 font-semibold text-lg">Drop your document here</p>
              <p className="text-slate-400 text-sm mt-1">PDF, DOCX, or CSV — up to 50MB</p>
            </div>
            <span className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition">
              Browse files
            </span>
          </div>
        )}
      </div>

      {/* Document List */}
      <div>
        <h2 className="text-lg font-semibold text-slate-800 mb-4">
          Your documents
          <span className="ml-2 text-sm font-normal text-slate-400">({docs.length})</span>
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
                <div className="w-10 h-10 bg-brand-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-brand-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800 truncate">{doc.originalName}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {doc.fileType.toUpperCase()} · {formatSize(doc.fileSize)}
                  </p>
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
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 text-white text-xs font-medium rounded-lg hover:bg-brand-700 transition"
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