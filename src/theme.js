import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#6B5B95',
      light: '#8675AB',
      dark: '#534775',
      contrastText: '#fff',
    },
    background: {
      default: '#F5F3F7',
      paper: '#fff',
    },
    text: {
      primary: '#2C2C2C',
      secondary: '#6B5B95',
    },
  },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#F5F3F7',
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: '#F5F3F7',
          borderRight: '1px solid rgba(107, 91, 149, 0.1)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 4px 8px rgba(107, 91, 149, 0.2)',
          },
        },
      },
    },
  },
});

export default theme; 