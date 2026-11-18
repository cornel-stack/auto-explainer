import React, {createContext, useContext} from 'react';
import {COLORS, DARK, GHOST_OPACITY} from './tokens';

export type ThemeMode = 'light' | 'dark';

export interface ThemeValue {
  dark: boolean;
  bg: string;
  bgTop: string;
  ink: string;
  ink2: string;
  panel: string;
  ghost: string;
  ghostOpacity: number;
}

const LIGHT: ThemeValue = {
  dark: false,
  bg: COLORS.bg,
  bgTop: '#FFFFFF',
  ink: COLORS.ink,
  ink2: COLORS.ink2,
  panel: COLORS.panel,
  ghost: COLORS.ghost,
  ghostOpacity: GHOST_OPACITY,
};

const DARK_THEME: ThemeValue = {
  dark: true,
  bg: DARK.bg,
  bgTop: DARK.bgTop,
  ink: DARK.ink,
  ink2: DARK.ink2,
  panel: DARK.panel,
  ghost: DARK.ghost,
  ghostOpacity: 0.28,
};

export const themeFor = (mode: ThemeMode): ThemeValue =>
  mode === 'dark' ? DARK_THEME : LIGHT;

export const ThemeContext = createContext<ThemeValue>(LIGHT);
export const useTheme = (): ThemeValue => useContext(ThemeContext);

export const ThemeProvider: React.FC<{
  mode: ThemeMode;
  children: React.ReactNode;
}> = ({mode, children}) => (
  <ThemeContext.Provider value={themeFor(mode)}>
    {children}
  </ThemeContext.Provider>
);
