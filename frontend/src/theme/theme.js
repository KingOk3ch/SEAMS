import { createTheme } from '@mui/material/styles';

export const createCustomTheme = (mode) => createTheme({
  palette: {
    mode,
    primary: {
      main: '#5C7E6D',
      dark: '#4A6A5A',
      light: '#7A9B8A',
      contrastText: '#fff',
    },
    secondary: {
      main: '#C46A4C',
      dark: '#B05A3D',
      light: '#D68B70',
      contrastText: '#fff',
    },
    success: { main: '#10B981' },
    warning: { main: '#F59E0B' },
    error: { main: '#DC2626' },
    info: { main: '#4F5F8D' },
    background: {
      default: mode === 'light' ? '#F8FAF9' : '#1A1D1E',
      paper: mode === 'light' ? '#FFFFFF' : '#25292A',
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
          fontWeight: 600,
          transition: 'all 0.2s ease-in-out',
          '&:hover': { transform: 'scale(1.02)' },
          '&:active': { transform: 'scale(1)' },
        },
        contained: {
          boxShadow: 'none',
          '&:hover': { boxShadow: '0 4px 12px rgba(92, 126, 109, 0.2)' },
        },
        outlined: {
          borderWidth: 2,
          '&:hover': {
            borderWidth: 2,
            backgroundColor: mode === 'light' ? '#F0F5F2' : 'rgba(92, 126, 109, 0.1)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: mode === 'light' 
            ? '0 2px 8px rgba(0, 0, 0, 0.08)' 
            : '0 2px 8px rgba(0, 0, 0, 0.4)',
        },
      },
    },
  },
});