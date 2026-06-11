/**
 * Contexte de theme: expose le theme courant (derive de brandColor) a
 * toute l'app. Par defaut, theme Accelyo; mis a jour une fois /me charge.
 */
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { buildTheme, defaultTheme, type Theme } from './theme';

const ThemeContext = createContext<Theme>(defaultTheme);

export function ThemeProvider({
  brandColor,
  children,
}: {
  brandColor?: string | null;
  children: ReactNode;
}) {
  const theme = useMemo(() => buildTheme(brandColor), [brandColor]);
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
