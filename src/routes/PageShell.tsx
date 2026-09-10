import type { ReactNode } from 'react'
import { Blend } from 'lucide-react'
import { Link } from 'react-router-dom'

/**
 * The frame around the non-room screens.
 *
 * Deliberately plain: these are forms and lists, and the room is where the
 * design does its work.
 */
export function PageShell({
  eyebrow,
  title,
  intro,
  children,
  wide = false,
}: {
  eyebrow?: string
  title: string
  intro?: ReactNode
  children: ReactNode
  wide?: boolean
}) {
  return (
    <div className="min-h-dvh bg-background font-sans">
      <header className="border-b border-border">
        <div className="mx-auto flex w-full max-w-5xl items-center gap-3 px-6 py-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-[15px] font-medium text-foreground"
          >
            <Blend className="size-5" strokeWidth={1.8} aria-hidden="true" />
            overlap
          </Link>
        </div>
      </header>

      <main className={`mx-auto w-full px-6 py-12 ${wide ? 'max-w-5xl' : 'max-w-2xl'}`}>
        {eyebrow !== undefined && (
          <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">
            {eyebrow}
          </p>
        )}
        <h1 className="mt-2 text-2xl font-semibold text-foreground">{title}</h1>
        {intro !== undefined && (
          <div className="mt-2 max-w-prose text-sm text-muted-foreground">{intro}</div>
        )}
        <div className="mt-8">{children}</div>
      </main>
    </div>
  )
}

export function Labelled({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string
  hint?: string
  htmlFor: string
  children: ReactNode
}) {
  return (
    <div className="grid gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
        {label}
      </label>
      {hint !== undefined && (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}
      {children}
    </div>
  )
}
