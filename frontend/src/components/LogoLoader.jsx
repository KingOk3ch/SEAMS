import React from 'react';
import { Box } from '@mui/material';
import logoImage from '../assets/seamslogo.png';

// A highly reusable loading component that enforces brand consistency across the platform.
// Accepts optional props to adjust sizing and spacing depending on where it is rendered.
const LogoLoader = ({ minHeight = "60vh", size = 150 }) => {
  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight={minHeight}>
      <Box
        component="img"
        src={logoImage}
        alt="Loading SEAMS..."
        sx={{
          width: size,
          animation: 'pulse 1.5s infinite ease-in-out',
          '@keyframes pulse': {
            '0%': { transform: 'scale(0.95)', opacity: 0.7 },
            '50%': { transform: 'scale(1.05)', opacity: 1 },
            '100%': { transform: 'scale(0.95)', opacity: 0.7 },
          }
        }}
      />
    </Box>
  );
};

export default LogoLoader;