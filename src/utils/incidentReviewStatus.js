export const REVIEW_STATUS_OPTIONS = ['Approved', 'Disapproved'];

export const normalizeReviewStatus = (status) => {
  if (status === 'Validated') return 'Approved';
  if (status === 'Reviewed') return 'Disapproved';
  if (REVIEW_STATUS_OPTIONS.includes(status)) return status;
  return 'Pending';
};

export const getReviewStatusColor = (status) => {
  const normalized = normalizeReviewStatus(status);
  switch (normalized) {
    case 'Approved':
      return 'success';
    case 'Disapproved':
      return 'error';
    case 'Pending':
    default:
      return 'warning';
  }
};

export const getReviewStatusChipSx = (status) => {
  const color = getReviewStatusColor(status);
  const colorMap = {
    success: 'green',
    error: 'red',
    warning: 'orange',
    default: 'gray',
  };
  const chipColor = colorMap[color] || 'gray';
  return {
    color: chipColor,
    borderColor: chipColor,
    backgroundColor: 'transparent',
  };
};
