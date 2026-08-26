import { MD3LightTheme, type MD3Theme } from 'react-native-paper';

export const theme: MD3Theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#0f766e',
    onPrimary: '#ffffff',
    primaryContainer: '#ccfbf1',
    onPrimaryContainer: '#042f2e',
    secondary: '#52525b',
    background: '#f4f5f7',
    surface: '#ffffff',
  },
};
