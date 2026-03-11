import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#2563EB', // Sleek, modern vibrant blue
      light: '#DBEAFE',
      dark: '#1D4ED8',
    },
    success: {
      main: '#10B981', // Emerald green
      light: '#D1FAE5',
    },
    warning: {
      main: '#F59E0B', // Warm amber
      light: '#FEF3C7',
    },
    info: {
      main: '#8B5CF6', // Premium violet/purple
      light: '#EDE9FE',
    },
    background: {
      default: '#F8FAFC', // Soft slate/gray for the app background
      paper: '#FFFFFF', // Pure white for cards
    },
    text: {
      primary: '#0F172A', // Slate 900 - softer on the eyes
      secondary: '#64748B', // Slate 500
    },
  },
  typography: {
    fontFamily: "'Poppins', sans-serif", // Keeping the premium font
    h4: {
      fontWeight: 600,
      color: '#0F172A',
      letterSpacing: '-0.02em',
    },
    h6: {
      fontWeight: 600,
      letterSpacing: '-0.01em',
    },
    body2: {
      fontWeight: 400,
    },
    button: {
      textTransform: 'none', // Keeps buttons from being ALL CAPS
      fontWeight: 500,
      fontSize: '0.95rem',
    },
  },
});

export default theme;