export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeColors {
  // Background colors
  background: string;
  foreground: string;

  // Card colors
  card: string;
  cardForeground: string;

  // Primary colors
  primary: string;
  primaryForeground: string;

  // Secondary colors
  secondary: string;
  secondaryForeground: string;

  // Muted colors
  muted: string;
  mutedForeground: string;

  // Accent colors
  accent: string;
  accentForeground: string;

  // Destructive colors
  destructive: string;
  destructiveForeground: string;

  // Border and input
  border: string;
  input: string;
  ring: string;

  // Chart colors
  chart1: string;
  chart2: string;
  chart3: string;
  chart4: string;
  chart5: string;

  // Sidebar colors
  sidebarBackground: string;
  sidebarForeground: string;
  sidebarPrimary: string;
  sidebarPrimaryForeground: string;
  sidebarAccent: string;
  sidebarAccentForeground: string;
  sidebarBorder: string;
  sidebarRing: string;
}

export interface ThemeDefinition {
  id: string;
  name: string;
  mode: 'light' | 'dark';
  colors: ThemeColors;
}

// Default dark theme
export const darkTheme: ThemeDefinition = {
  id: 'dark',
  name: 'Dark',
  mode: 'dark',
  colors: {
    background: '224 71% 4%',
    foreground: '213 31% 91%',
    card: '224 71% 4%',
    cardForeground: '213 31% 91%',
    primary: '210 40% 98%',
    primaryForeground: '222.2 47.4% 1.2%',
    secondary: '222.2 47.4% 11.2%',
    secondaryForeground: '210 40% 98%',
    muted: '223 47% 11%',
    mutedForeground: '215.4 16.3% 56.9%',
    accent: '216 34% 17%',
    accentForeground: '210 40% 98%',
    destructive: '0 63% 31%',
    destructiveForeground: '210 40% 98%',
    border: '216 34% 17%',
    input: '216 34% 17%',
    ring: '216 34% 17%',
    chart1: '220 70% 50%',
    chart2: '160 60% 45%',
    chart3: '30 80% 55%',
    chart4: '280 65% 60%',
    chart5: '340 75% 55%',
    sidebarBackground: '240 5.9% 10%',
    sidebarForeground: '240 4.8% 95.9%',
    sidebarPrimary: '224.3 76.3% 48%',
    sidebarPrimaryForeground: '0 0% 100%',
    sidebarAccent: '240 3.7% 15.9%',
    sidebarAccentForeground: '240 4.8% 95.9%',
    sidebarBorder: '240 3.7% 15.9%',
    sidebarRing: '217.2 91.2% 59.8%',
  },
};

// Light theme
export const lightTheme: ThemeDefinition = {
  id: 'light',
  name: 'Light',
  mode: 'light',
  colors: {
    background: '0 0% 100%',
    foreground: '224 71% 4%',
    card: '0 0% 100%',
    cardForeground: '224 71% 4%',
    primary: '220.9 39.3% 11%',
    primaryForeground: '210 20% 98%',
    secondary: '220 14.3% 95.9%',
    secondaryForeground: '220.9 39.3% 11%',
    muted: '220 14.3% 95.9%',
    mutedForeground: '220 8.9% 46.1%',
    accent: '220 14.3% 95.9%',
    accentForeground: '220.9 39.3% 11%',
    destructive: '0 84.2% 60.2%',
    destructiveForeground: '210 20% 98%',
    border: '220 13% 91%',
    input: '220 13% 91%',
    ring: '224 71% 4%',
    chart1: '12 76% 61%',
    chart2: '173 58% 39%',
    chart3: '197 37% 24%',
    chart4: '43 74% 66%',
    chart5: '27 87% 67%',
    sidebarBackground: '0 0% 98%',
    sidebarForeground: '240 5.3% 26.1%',
    sidebarPrimary: '240 5.9% 10%',
    sidebarPrimaryForeground: '0 0% 98%',
    sidebarAccent: '240 4.8% 95.9%',
    sidebarAccentForeground: '240 5.9% 10%',
    sidebarBorder: '220 13% 91%',
    sidebarRing: '217.2 91.2% 59.8%',
  },
};

// Blue accent theme (dark)
export const blueDarkTheme: ThemeDefinition = {
  id: 'blue-dark',
  name: 'Blue Dark',
  mode: 'dark',
  colors: {
    ...darkTheme.colors,
    primary: '217.2 91.2% 59.8%',
    primaryForeground: '222.2 47.4% 11.2%',
    ring: '217.2 91.2% 59.8%',
    chart1: '217 91% 60%',
  },
};

// Green accent theme (dark)
export const greenDarkTheme: ThemeDefinition = {
  id: 'green-dark',
  name: 'Green Dark',
  mode: 'dark',
  colors: {
    ...darkTheme.colors,
    primary: '142.1 76.2% 36.3%',
    primaryForeground: '355.7 100% 97.3%',
    ring: '142.1 76.2% 36.3%',
    chart1: '142 76% 36%',
  },
};

// Purple accent theme (dark)
export const purpleDarkTheme: ThemeDefinition = {
  id: 'purple-dark',
  name: 'Purple Dark',
  mode: 'dark',
  colors: {
    ...darkTheme.colors,
    primary: '263.4 70% 50.4%',
    primaryForeground: '210 20% 98%',
    ring: '263.4 70% 50.4%',
    chart1: '263 70% 50%',
  },
};

// All available themes
export const themes: ThemeDefinition[] = [
  darkTheme,
  lightTheme,
  blueDarkTheme,
  greenDarkTheme,
  purpleDarkTheme,
];

// Get theme by ID
export function getTheme(id: string): ThemeDefinition | undefined {
  return themes.find((t) => t.id === id);
}

// Apply theme colors as CSS variables
export function applyTheme(theme: ThemeDefinition): void {
  const root = document.documentElement;

  // Set color scheme
  root.style.colorScheme = theme.mode;

  // Apply all color variables
  Object.entries(theme.colors).forEach(([key, value]) => {
    const cssVar = `--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
    root.style.setProperty(cssVar, value);
  });

  // Set dark class on html element
  if (theme.mode === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

// Get system preference
export function getSystemThemePreference(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
