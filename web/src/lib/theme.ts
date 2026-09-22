/**
 * Colour-scheme preference. The stylesheet defines every colour with `light-dark()`, so all
 * this module has to do is set `data-theme` on the root element; the operating-system
 * preference applies whenever no explicit choice is stored.
 */
export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'docket:theme';

/** The operating-system preference, defaulting to light where media queries are unavailable. */
export function systemTheme(): Theme {
  if (typeof window.matchMedia !== 'function') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** The stored choice, or null when the user has never toggled or storage is unavailable. */
export function savedTheme(): Theme | null {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : null;
  } catch {
    return null;
  }
}

/** Applies a theme to the document; null removes the override and follows the system again. */
export function applyTheme(theme: Theme | null): void {
  if (theme === null) delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme;
}

/** The theme currently in effect: the stored choice if any, otherwise the system preference. */
export function currentTheme(): Theme {
  return savedTheme() ?? systemTheme();
}

/** Applies and remembers a choice; storage failures (private windows) only lose persistence. */
export function setTheme(theme: Theme): void {
  applyTheme(theme);
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* The choice still applies for this visit. */
  }
}
