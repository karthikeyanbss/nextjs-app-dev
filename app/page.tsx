'use client'

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'

type Message = {
  role: 'user' | 'assistant'
  content: string
}

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

  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content:
        'Hi there! I am connected to the FastAPI backend running inside Azure Container Apps. Ask me anything about the deployment or try out a few prompts below.',
    },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [highlightedSuggestion, setHighlightedSuggestion] = useState<string | null>(null)
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
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ prompt: trimmed }),
        })

        if (!response.ok) {
          const body = await response.text()
          throw new Error(body || 'Backend responded with an error')
        }

        const payload = await response.json()
        const assistantContent =
          payload.reply ?? payload.answer ?? payload.output ?? payload.response ?? payload.message ?? JSON.stringify(payload)
        setMessages((prev) => [...prev, { role: 'assistant', content: assistantContent }])
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
    [endpoint, input, isLoading]
  )

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await submitPrompt()
  }

  return (
    <div className="page-shell">
      <div className="glass-grid">
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

        <section className="chat-card">
          <header className="chat-header">
            <div>
              <p className="chat-title">Messenger</p>
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
