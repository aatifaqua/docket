import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { applyTheme, currentTheme, savedTheme, setTheme, systemTheme } from './theme.ts';

function stubMatchMedia(dark: boolean): void {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({ matches: dark && query.includes('dark'), media: query })),
  );
}

describe('theme', () => {
  beforeEach(() => {
    window.localStorage.clear();
    delete document.documentElement.dataset.theme;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('reads the system preference and defaults to light without matchMedia', () => {
    stubMatchMedia(true);
    expect(systemTheme()).toBe('dark');
    stubMatchMedia(false);
    expect(systemTheme()).toBe('light');
    vi.stubGlobal('matchMedia', undefined);
    expect(systemTheme()).toBe('light');
  });

  it('ignores unknown or unreadable stored values', () => {
    expect(savedTheme()).toBeNull();
    window.localStorage.setItem('docket:theme', 'sepia');
    expect(savedTheme()).toBeNull();
    window.localStorage.setItem('docket:theme', 'dark');
    expect(savedTheme()).toBe('dark');
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(savedTheme()).toBeNull();
  });

  it('applies, remembers, and clears the override', () => {
    stubMatchMedia(false);
    setTheme('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(currentTheme()).toBe('dark');
    applyTheme(null);
    expect(document.documentElement.dataset.theme).toBeUndefined();
    window.localStorage.clear();
    expect(currentTheme()).toBe('light');
  });

  it('still applies the theme when storage rejects writes', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    setTheme('light');
    expect(document.documentElement.dataset.theme).toBe('light');
  });
});
