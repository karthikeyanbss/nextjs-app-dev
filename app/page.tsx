'use client'

import {
  ChangeEvent,
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

type Message = {
  role: 'user' | 'assistant'
  content: string
}

type HistorySession = {
  id: string
  title: string
  channel: string
  updated: string
  summary: string
}

const WELCOME_MESSAGE =
  'Hi there! I am connected to the FastAPI backend running inside Azure Container Apps. Ask me anything about the deployment or try out a few prompts below.'

const HISTORY_SESSIONS: HistorySession[] = [
  {
    id: 'deployment',
    title: 'CI/CD deployment review',
    channel: 'nextjs-app-dev',
    updated: '5 minutes ago',
    summary: 'Walked through the GitHub Actions build/push to nerfastapiacr and verified the dev container app.',
  },
  {
    id: 'interface',
    title: 'Gemini UI playtest',
    channel: 'front-end dev',
    updated: '1 hour ago',
    summary: 'Experimented with glassmorphic chat styling, suggestions, and attachment handling before dispatch.',
  },
  {
    id: 'backend',
    title: 'FastAPI conversation log',
    channel: 'FastAPI backend',
    updated: 'Yesterday',
    summary: 'Confirmed the multipart upload endpoint, response payload shapes, and added error messaging.',
  },
]

const DEFAULT_BACKEND_URL = 'https://fastapi-dev.calmdesert-eab0db8f.eastus.azurecontainerapps.io'
const DEFAULT_BACKEND_PATH = '/chat'

const RAW_BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? DEFAULT_BACKEND_URL
const RAW_BACKEND_PATH = process.env.NEXT_PUBLIC_BACKEND_PATH ?? DEFAULT_BACKEND_PATH
const NORMALIZED_BACKEND_URL = RAW_BACKEND_URL.replace(/\/+$/, '')
const NORMALIZED_BACKEND_PATH = RAW_BACKEND_PATH.startsWith('/') ? RAW_BACKEND_PATH : `/${RAW_BACKEND_PATH}`
const BACKEND_ENDPOINT = `${NORMALIZED_BACKEND_URL}${NORMALIZED_BACKEND_PATH}`

const PROMPT_SUGGESTIONS = [
  'Explain how the CI/CD pipeline deploys to Azure Container Apps.',
  'Show me the health of the nerfastapiacr registry and nextjs-app-dev.',
  'What should I send to the FastAPI backend to generate a response?'
]

export default function Home() {
  const environment = (process.env.NEXT_PUBLIC_ENVIRONMENT ?? 'dev').toLowerCase()
  const version = process.env.NEXT_PUBLIC_VERSION ?? '0.0.1'
  const environmentMap: Record<string, { label: string; display: string }> = {
    dev: { label: 'DEV', display: 'Development' },
    qa: { label: 'QA', display: 'Quality Assurance' },
    prod: { label: 'PROD', display: 'Production' },
  }
  const envMeta = environmentMap[environment] ?? { label: environment.toUpperCase(), display: environment }

  const [messages, setMessages] = useState<Message[]>([{ role: 'assistant', content: WELCOME_MESSAGE }])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [highlightedSuggestion, setHighlightedSuggestion] = useState<string | null>(null)
  const [attachedFiles, setAttachedFiles] = useState<File[]>([])
  const [activeHistoryId, setActiveHistoryId] = useState(HISTORY_SESSIONS[0]?.id ?? '')
  const chatWindowRef = useRef<HTMLDivElement | null>(null)

  const endpointDisplay = useMemo(() => BACKEND_ENDPOINT.replace(/^https?:\/\//, ''), [])
  const endpoint = useMemo(() => BACKEND_ENDPOINT, [])

  const scrollToBottom = useCallback(() => {
    chatWindowRef.current?.scrollTo({
      top: chatWindowRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, isLoading, scrollToBottom])

  const formatFileSize = useCallback((size: number) => {
    if (size < 1024) {
      return `${size} B`
    }
    if (size < 1024 * 1024) {
      return `${(size / 1024).toFixed(1)} KB`
    }
    return `${(size / (1024 * 1024)).toFixed(1)} MB`
  }, [])

  const handleFileChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files?.length) {
      return
    }
    setAttachedFiles((prev) => [...prev, ...Array.from(files)])
    event.target.value = ''
  }, [])

  const removeAttachment = useCallback((index: number) => {
    setAttachedFiles((prev) => prev.filter((_, idx) => idx !== index))
  }, [])

  const handleNewChat = useCallback(() => {
    setMessages([{ role: 'assistant', content: WELCOME_MESSAGE }])
    setInput('')
    setError('')
    setAttachedFiles([])
    setHighlightedSuggestion(null)
  }, [])

  const handleHistorySelect = useCallback((id: string) => {
    setActiveHistoryId(id)
  }, [])

  const submitPrompt = useCallback(
    async (preset?: string) => {
      const trimmed = (preset ?? input).trim()
      if (!trimmed || isLoading) {
        return
      }

      setError('')
      setIsLoading(true)
      setMessages((prev) => [...prev, { role: 'user', content: trimmed }])
      setInput('')

      try {
        const hasAttachments = attachedFiles.length > 0
        const requestInit: RequestInit = hasAttachments
          ? (() => {
              const formData = new FormData()
              formData.append('prompt', trimmed)
              attachedFiles.forEach((file) => formData.append('files', file))
              return {
                method: 'POST',
                body: formData,
              }
            })()
          : {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ prompt: trimmed }),
            }
        const response = await fetch(endpoint, requestInit)

        if (!response.ok) {
          const body = await response.text()
          throw new Error(body || 'Backend responded with an error')
        }

        const payload = await response.json()
        const assistantContent =
          payload.reply ?? payload.answer ?? payload.output ?? payload.response ?? payload.message ?? JSON.stringify(payload)
        setMessages((prev) => [...prev, { role: 'assistant', content: assistantContent }])
        setAttachedFiles([])
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to reach the backend. Please try again.'
        setError(message)
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: 'I could not reach the backend right now. Please try again in a moment.',
          },
        ])
      } finally {
        setIsLoading(false)
      }
    },
    [attachedFiles, endpoint, input, isLoading]
  )

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await submitPrompt()
  }

  const activeHistory = HISTORY_SESSIONS.find((session) => session.id === activeHistoryId)

  return (
    <div className="page-shell">
      <div className="glass-grid">
        <div className="info-column">
          <section className="intro-card">
            <div className="badge-row">
              <span className="status-badge">ner-service-rg</span>
              <span className="status-badge status-badge--soft">{envMeta.display}</span>
            </div>
            <h1>AI chat inspired by Gemini</h1>
            <p>
              Seamlessly talk to the FastAPI backend running inside Azure Container Apps. The same container app
              (`nextjs-app-dev`) is deployed by GitHub Actions, and this interface fetches responses from{' '}
              <code>{endpointDisplay}</code>.
            </p>
            <div className="meta-grid">
              <div>
                <p className="meta-label">Environment</p>
                <p className="meta-value">{envMeta.display}</p>
              </div>
              <div>
                <p className="meta-label">Version</p>
                <p className="meta-value">{version}</p>
              </div>
            </div>
            <div className="suggestion-cluster">
              {PROMPT_SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  className={`suggestion ${highlightedSuggestion === suggestion ? 'suggestion--active' : ''}`}
                  onClick={() => {
                    setHighlightedSuggestion(suggestion)
                    submitPrompt(suggestion)
                  }}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </section>

          <section className="history-card" aria-label="Chat history">
            <div className="history-header">
              <div>
                <p className="history-title">Chat history</p>
                <p className="history-caption">Previous sessions you can revisit</p>
              </div>
            </div>
            <div className="history-list">
              {HISTORY_SESSIONS.map((session) => (
                <button
                  key={session.id}
                  type="button"
                  className={`history-item ${activeHistoryId === session.id ? 'history-item--active' : ''}`}
                  onClick={() => handleHistorySelect(session.id)}
                >
                  <div className="history-item__header">
                    <strong>{session.title}</strong>
                    <span className="history-meta">{session.updated}</span>
                  </div>
                  <p>{session.summary}</p>
                  <span className="history-channel">{session.channel}</span>
                </button>
              ))}
            </div>
            {activeHistory && (
              <div className="history-preview">
                <p className="history-preview-title">{activeHistory.title}</p>
                <p className="history-preview-summary">{activeHistory.summary}</p>
                <p className="history-preview-meta">
                  Last updated {activeHistory.updated} · Source: {activeHistory.channel}
                </p>
              </div>
            )}
          </section>
        </div>

        <section className="chat-card">
          <header className="chat-header">
            <div>
              <p className="chat-title">Messenger</p>
              <div className="chat-title-nav">
                <button type="button" className="chat-nav-button" onClick={handleNewChat}>
                  + Create chat
                </button>
                <span className="chat-nav-hint">Launch a fresh thread below</span>
              </div>
              <p className="chat-subtitle">Connected to nextjs-app-dev · {endpointDisplay}</p>
            </div>
            <span className={['chip', isLoading ? 'chip--pulse' : ''].join(' ')}>Live</span>
          </header>

          <div className="chat-window" ref={chatWindowRef}>
            {messages.map((message, index) => (
              <article key={`${message.role}-${index}`} className={`message message--${message.role}`}>
                <div className="avatar" aria-hidden="true">
                  {message.role === 'assistant' ? 'AI' : 'You'}
                </div>
                <div className="bubble">
                  <p>{message.content}</p>
                </div>
              </article>
            ))}
            {isLoading && (
              <div className="message message--assistant">
                <div className="avatar" aria-hidden="true">
                  AI
                </div>
                <div className="bubble bubble--typing">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            )}
          </div>

          {error && <div className="error-card">{error}</div>}

          <div className="attachment-toolbar">
            <label className="file-label" htmlFor="file-upload">
              Attach files
              <input
                id="file-upload"
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx"
                onChange={handleFileChange}
              />
            </label>
            <p className="file-hint">Supports PNG/JPG/PDF/DOCX — will be sent as multipart data.</p>
          </div>

          {attachedFiles.length > 0 && (
            <div className="attachment-cluster" aria-live="polite">
              {attachedFiles.map((file, index) => (
                <div className="attachment-pill" key={`${file.name}-${index}`}>
                  <div>
                    <strong>{file.name}</strong>
                    <span>{formatFileSize(file.size)}</span>
                  </div>
                  <button type="button" onClick={() => removeAttachment(index)} aria-label={`Remove ${file.name}`}>
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          <form className="composer" onSubmit={handleSubmit}>
            <textarea
              rows={1}
              placeholder="Ask the FastAPI backend anything..."
              value={input}
              onChange={(event) => setInput(event.target.value)}
              disabled={isLoading}
            />
            <button type="submit" disabled={isLoading || !input.trim()}>
              {isLoading ? 'Thinking…' : 'Send'}
            </button>
          </form>
        </section>
      </div>
    </div>
  )
}
