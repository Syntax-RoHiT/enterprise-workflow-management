

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from 'react';

export type ThemeId =
  | 'midnight'    // current default — dark cyan/purple
  | 'daylight'    // clean light mode
  | 'ocean'       // deep blue dark
  | 'sunset'      // warm orange/rose dark
  | 'forest'      // green-tinted dark
  | 'cyberpunk';  // neon pink/yellow dark

export type ThemeMode = 'light' | 'dark';

export interface ThemeMeta {
  id: ThemeId;
  name: string;
  mode: ThemeMode;
  accent: string;      // preview swatch color
  accentAlt: string;   // secondary swatch
  bgPreview: string;   // card preview bg
}

export const THEMES: ThemeMeta[] = [
  { id: 'midnight',  name: 'Midnight',  mode: 'dark',  accent: '#33d6ef', accentAlt: '#a855f7', bgPreview: '#0B1220' },
  { id: 'daylight',  name: 'Daylight',  mode: 'light', accent: '#0891b2', accentAlt: '#7c3aed', bgPreview: '#f8fafc' },
  { id: 'ocean',     name: 'Ocean',     mode: 'dark',  accent: '#38bdf8', accentAlt: '#2dd4bf', bgPreview: '#0c1929' },
  { id: 'sunset',    name: 'Sunset',    mode: 'dark',  accent: '#fb923c', accentAlt: '#f43f5e', bgPreview: '#1a0f0a' },
  { id: 'forest',    name: 'Forest',    mode: 'dark',  accent: '#4ade80', accentAlt: '#a3e635', bgPreview: '#0a1a0f' },
  { id: 'cyberpunk', name: 'Cyberpunk', mode: 'dark',  accent: '#f472b6', accentAlt: '#facc15', bgPreview: '#150a1a' },
];

const _safelist = ['theme-midnight', 'theme-daylight', 'theme-ocean', 'theme-sunset', 'theme-forest', 'theme-cyberpunk'];

const STORAGE_KEY = 'nexus:theme';
const SYSTEM_KEY = 'nexus:useSystemTheme';

interface ThemeCtx {
  theme: ThemeId;
  mode: ThemeMode;
  useSystemTheme: boolean;
  setTheme: (id: ThemeId) => void;
  setUseSystemTheme: (v: boolean) => void;
  themes: ThemeMeta[];
}

const ThemeContext = createContext<ThemeCtx>({
  theme: 'midnight',
  mode: 'dark',
  useSystemTheme: false,
  setTheme: () => {},
  setUseSystemTheme: () => {},
  themes: THEMES,
});

function getSystemMode(): ThemeMode {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function applyTheme(themeId: ThemeId, useSystem: boolean) {
  const html = document.documentElement;

  THEMES.forEach((t) => html.classList.remove(`theme-${t.id}`));
  html.classList.remove('dark', 'light');

  if (useSystem) {
    const sysMode = getSystemMode();

    const sysTheme = sysMode === 'light' ? 'daylight' : 'midnight';
    html.classList.add(`theme-${sysTheme}`);
    html.classList.add(sysMode);
    return sysTheme;
  }

  const meta = THEMES.find((t) => t.id === themeId) ?? THEMES[0];
  html.classList.add(`theme-${meta.id}`);
  html.classList.add(meta.mode);
  return meta.id;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(() => {
    return (localStorage.getItem(STORAGE_KEY) as ThemeId) || 'midnight';
  });
  const [useSystemTheme, setUseSystemState] = useState(() => {
    return localStorage.getItem(SYSTEM_KEY) === 'true';
  });

  const activeTheme = useSystemTheme
    ? (getSystemMode() === 'light' ? 'daylight' : 'midnight')
    : theme;
  const mode = THEMES.find((t) => t.id === activeTheme)?.mode ?? 'dark';

  useEffect(() => {
    applyTheme(theme, useSystemTheme);
  }, [theme, useSystemTheme]);

  useEffect(() => {
    if (!useSystemTheme) return;
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const handler = () => applyTheme(theme, true);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [useSystemTheme, theme]);

  const setTheme = useCallback((id: ThemeId) => {
    setThemeState(id);
    setUseSystemState(false);
    localStorage.setItem(STORAGE_KEY, id);
    localStorage.setItem(SYSTEM_KEY, 'false');
  }, []);

  const setUseSystemTheme = useCallback((v: boolean) => {
    setUseSystemState(v);
    localStorage.setItem(SYSTEM_KEY, String(v));
  }, []);

  return (
    <ThemeContext.Provider
      value={{ theme: activeTheme, mode, useSystemTheme, setTheme, setUseSystemTheme, themes: THEMES }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
