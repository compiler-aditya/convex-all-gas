import { useCallback, useEffect, useState } from 'react'

export type Appearance = 'system' | 'light' | 'dark'

const storageKey = 'overlap-appearance'

export function parseAppearance(value: string | null | undefined): Appearance {
  return value === 'light' || value === 'dark' ? value : 'system'
}

export function nextAppearance(appearance: Appearance): Appearance {
  return appearance === 'system' ? 'light' : appearance === 'light' ? 'dark' : 'system'
}

function readAppearance(): Appearance {
  if (typeof window === 'undefined') return 'system'
  try {
    return parseAppearance(window.localStorage.getItem(storageKey))
  } catch {
    return parseAppearance(document.documentElement.dataset.appearance)
  }
}

export function useAppearance() {
  const [appearance, setAppearanceState] = useState<Appearance>(readAppearance)

  const setAppearance = useCallback((value: Appearance) => {
    const next = parseAppearance(value)
    setAppearanceState(next)
    try {
      window.localStorage.setItem(storageKey, next)
    } catch {
      // Appearance still works when the browser blocks preference storage.
    }
  }, [])

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const applyTheme = () => {
      const root = document.documentElement
      root.dataset.appearance = appearance
      root.dataset.theme = appearance === 'system' ? (media.matches ? 'dark' : 'light') : appearance
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', getComputedStyle(root).backgroundColor)
    }
    const syncPreference = (event: StorageEvent) => {
      if (event.key === storageKey || event.key === null) setAppearanceState(readAppearance())
    }

    applyTheme()
    media.addEventListener('change', applyTheme)
    window.addEventListener('storage', syncPreference)
    return () => {
      media.removeEventListener('change', applyTheme)
      window.removeEventListener('storage', syncPreference)
    }
  }, [appearance])

  return { appearance, setAppearance }
}
