import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Gemini-style AI Chat',
  description: 'Next.js chat interface backed by the Azure Container Apps FastAPI backend',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="app-shell">{children}</body>
    </html>
  )
}
