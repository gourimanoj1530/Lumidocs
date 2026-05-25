import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

// Inject the real logged-in user's Google sub as the user ID on every request
api.interceptors.request.use(config => {
  const stored = localStorage.getItem('lumidocs_user')
  if (stored) {
    try {
      const user = JSON.parse(stored)
      if (user?.sub) config.headers['X-User-Id'] = user.sub
    } catch {
      // ignore
    }
  }
  return config
})

export const uploadDocument = (file: File) => {
  const form = new FormData()
  form.append('file', file)
  return api.post('/documents/upload', form)
}

export const getDocuments = () => api.get('/documents')

export const deleteDocument = (id: string) => api.delete(`/documents/${id}`)

export const chat = (question: string, documentId: string | null) =>
  api.post('/chat', { question, documentId })