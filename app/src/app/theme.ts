export type Theme = 'light' | 'dark';

const KEY = 'planetshift.theme';

export const parseTheme = (value: string | null | undefined): Theme | null =>
  value === 'light' || value === 'dark' ? value : null;

export const effectiveTheme = (stored: Theme | null, prefersDark: boolean): Theme =>
  stored ?? (prefersDark ? 'dark' : 'light');

export const toggled = (theme: Theme): Theme => (theme === 'dark' ? 'light' : 'dark');

export const readStoredTheme = (): Theme | null => {
  try {
    return parseTheme(localStorage.getItem(KEY));
  } catch {
    return null;
  }
};

export const storeTheme = (theme: Theme): void => {
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    // storage unavailable: the choice lasts for this page only
  }
};

export const prefersDark = (): boolean =>
  typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches;

export const applyTheme = (stored: Theme | null): void => {
  if (stored) document.documentElement.dataset.theme = stored;
  else delete document.documentElement.dataset.theme;
};
