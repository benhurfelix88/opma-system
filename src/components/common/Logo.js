import React from 'react';
import { Box } from '@mui/material';

const Logo = ({ size = 'medium' }) => {
  const sizes = {
    small: 80,
    medium: 100,
    large: 120,
  };

  return (
    <Box
      component="img"
      src={process.env.PUBLIC_URL + "/images/logo.png"}
      alt="ARMS Logo"
      sx={{
        width: sizes[size],
        height: 'auto',
        maxHeight: sizes[size],
        objectFit: 'contain',
        '&:hover': {
          transform: 'scale(1.05)',
          transition: 'transform 0.3s ease-in-out',
        },
      }}
    />
  );
};

export default Logo; 