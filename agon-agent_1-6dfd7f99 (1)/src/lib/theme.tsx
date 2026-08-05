import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type ThemeMode = 'dark' | 'light';

interface ThemeContextValue {
  theme: ThemeMode;
  setTheme: (t: ThemeMode) => void;
  toggleTheme: () => void;
  isLight: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = 'dawaraksh-theme';

function readStored(): ThemeMode {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'light' || v === 'dark') return v;
  } catch {
    /* ignore */
  }
  return 'dark';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(() =>
    typeof window !== 'undefined' ? readStored() : 'dark'
  );

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.classList.toggle('light', theme === 'light');
    document.documentElement.classList.toggle('dark', theme === 'dark');
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  const setTheme = useCallback((t: ThemeMode) => setThemeState(t), []);
  const toggleTheme = useCallback(
    () => setThemeState((t) => (t === 'dark' ? 'light' : 'dark')),
    []
  );

  const value = useMemo(
    () => ({ theme, setTheme, toggleTheme, isLight: theme === 'light' }),
    [theme, setTheme, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

/** Chart palette that follows active theme */
export function useChartTheme() {
  const { isLight } = useTheme();
  if (isLight) {
    return {
      grid: 'rgba(139,90,43,0.12)',
      tick: '#8B6914',
      legend: '#6B4F2A',
      tooltipBg: '#FFF8EE',
      tooltipBorder: 'rgba(184,134,11,0.35)',
      tooltipLabel: '#7A5C3A',
      tooltipItem: '#3D2914',
      temp: '#B8860B',
      humidity: '#B91C1C',
      stock: '#A16207',
      mass: '#DC2626',
      gas: '#C2410C',
      cardBorder: 'rgba(184,134,11,0.22)',
      cardBg: 'rgba(255,248,238,0.9)',
    };
  }
  return {
    grid: 'rgba(255,255,255,0.05)',
    tick: '#64748b',
    legend: '#94a3b8',
    tooltipBg: '#0b1526',
    tooltipBorder: 'rgba(34,211,238,0.2)',
    tooltipLabel: '#94a3b8',
    tooltipItem: '#e2e8f0',
    temp: '#22d3ee',
    humidity: '#a78bfa',
    stock: '#34d399',
    mass: '#38bdf8',
    gas: '#fbbf24',
    cardBorder: 'rgba(255,255,255,0.08)',
    cardBg: 'rgba(255,255,255,0.03)',
  };
}
