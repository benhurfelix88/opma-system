import React from 'react';
import { Box, Typography, Paper, Stack } from '@mui/material';

const RideEntryCountsList = ({ entries, emptyMessage = 'No manual entry records yet' }) => {
  if (!entries || entries.length === 0) {
    return (
      <Box
        sx={{
          textAlign: 'center',
          py: 2,
          color: 'text.secondary',
          bgcolor: 'background.paper',
          borderRadius: 2,
          border: (theme) => `1px solid ${theme.palette.divider}`,
        }}
      >
        <Typography variant="body2">{emptyMessage}</Typography>
      </Box>
    );
  }

  return (
    <Stack spacing={1}>
      {entries.map((entry, index) => {
        const dateLabel = entry.entryDate
          ? new Date(`${entry.entryDate}T12:00:00`).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })
          : '';
        const meta = [dateLabel, entry.entryTimeLabel].filter(Boolean).join(' · ');

        return (
          <Paper
            key={entry.id ?? index}
            elevation={0}
            sx={{
              p: 1.25,
              borderRadius: 1.5,
              border: (theme) => `1px solid ${theme.palette.divider}`,
              bgcolor: 'background.paper',
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 1,
                minWidth: 0,
              }}
            >
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.8rem' }} noWrap>
                  {entry.rideName}
                </Typography>
                {meta ? (
                  <Typography variant="caption" color="text.secondary" display="block" noWrap>
                    {meta}
                  </Typography>
                ) : null}
              </Box>
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: 700, color: 'primary.main', flexShrink: 0, whiteSpace: 'nowrap' }}
              >
                +{entry.customerCount}
              </Typography>
            </Box>
          </Paper>
        );
      })}
    </Stack>
  );
};

export default RideEntryCountsList;
