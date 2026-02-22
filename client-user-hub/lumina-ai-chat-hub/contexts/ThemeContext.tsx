
import React, { createContext, useContext, useState, useEffect } from 'react';
import { ThemeConfig, ThemePreset } from '../types';

interface ThemeContextType {
  theme: ThemeConfig;
  setTheme: (theme: ThemeConfig) => void;
  resetTheme: () => void;
  applyPreset: (preset: ThemePreset) => void;
}

const presets: Record<ThemePreset, ThemeConfig> = {
  lumina: {
    preset: 'lumina',
    primaryColor: '#13b6ec',
    surfaceColor: '#1a2c32',
    backgroundColor: '#101d22',
    secondaryColor: '#92bbc9',
    textColor: '#f8fafc',
    borderRadius: 'large',
    fontFamily: "'Plus Jakarta Sans'",
    baseFontSize: '16px',
  },
  'lumina-light': {
    preset: 'lumina-light',
    primaryColor: '#13b6ec',
    surfaceColor: '#FFFFFF',
    backgroundColor: '#F8FAFC',
    secondaryColor: '#475569', // Darker slate for light theme
    textColor: '#0F172A',
    borderRadius: 'large',
    fontFamily: "'Plus Jakarta Sans'",
    baseFontSize: '16px',
  },
  facebook: {
    preset: 'facebook',
    primaryColor: '#0866FF',
    surfaceColor: '#FFFFFF',
    backgroundColor: '#F0F2F5',
    secondaryColor: '#4B4F56', // Standard FB dark grey
    textColor: '#1c1e21',
    borderRadius: 'small',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    baseFontSize: '14px',
  },
  wechat: {
    preset: 'wechat',
    primaryColor: '#07C160',
    surfaceColor: '#FFFFFF',
    backgroundColor: '#EDEDED',
    secondaryColor: '#576B95', // WeChat's signature blue-grey for secondary text
    textColor: '#191919',
    borderRadius: 'small',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    baseFontSize: '15px',
  },
  retro80s: {
    preset: 'retro80s',
    primaryColor: '#FF00FF',
    surfaceColor: '#2D0054',
    backgroundColor: '#1A0033',
    secondaryColor: '#FF00FF',
    textColor: '#00FFFF',
    borderRadius: 'none',
    fontFamily: "'Orbitron'",
    baseFontSize: '14px',
  },
  gameboy: {
    preset: 'gameboy',
    primaryColor: '#306230',
    surfaceColor: '#8bac0f',
    backgroundColor: '#9bbc0f',
    secondaryColor: '#0f380f', // Use darkest green for all text to ensure legibility
    textColor: '#0f380f',
    borderRadius: 'none',
    fontFamily: "'Press Start 2P'",
    baseFontSize: '10px',
  },
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeConfig>(() => {
    const saved = localStorage.getItem('lumina-theme');
    return saved ? JSON.parse(saved) : presets.lumina;
  });

  const setTheme = (newTheme: ThemeConfig) => {
    setThemeState(newTheme);
    localStorage.setItem('lumina-theme', JSON.stringify(newTheme));
  };

  const applyPreset = (preset: ThemePreset) => {
    setTheme(presets[preset]);
  };

  const resetTheme = () => setTheme(presets.lumina);

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    root.style.setProperty('--primary-color', theme.primaryColor);
    root.style.setProperty('--surface-color', theme.surfaceColor);
    root.style.setProperty('--background-color', theme.backgroundColor);
    root.style.setProperty('--secondary-color', theme.secondaryColor);
    root.style.setProperty('--text-color', theme.textColor);
    root.style.setProperty('--font-family', theme.fontFamily);
    root.style.setProperty('--base-font-size', theme.baseFontSize);
    
    const radiusMap = {
      none: '0px',
      small: '4px',
      medium: '8px',
      large: '16px',
      full: '9999px',
    };
    root.style.setProperty('--border-radius', radiusMap[theme.borderRadius]);

    // Apply preset class to body
    Object.keys(presets).forEach(p => body.classList.remove(`theme-${p}`));
    body.classList.add(`theme-${theme.preset}`);

    // Robust light/dark mode detection
    const isLight = ['wechat', 'facebook', 'gameboy', 'lumina-light'].includes(theme.preset);
    if (isLight) {
        root.classList.remove('dark');
    } else {
        root.classList.add('dark');
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resetTheme, applyPreset }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};
