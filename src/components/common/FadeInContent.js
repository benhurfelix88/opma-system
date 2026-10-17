import React from 'react';
import { Box } from '@mui/material';
import { keyframes } from '@mui/system';

const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const FadeInContent = ({ children }) => {
  return (
    <Box
      sx={{
        animation: `${fadeIn} 0.3s ease-out`,
        width: '100%',
        height: '100%',
      }}
    >
      {children}
    </Box>
  );
};

export default FadeInContent; 