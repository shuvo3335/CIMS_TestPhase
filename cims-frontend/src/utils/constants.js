export const ROLES = { ADMIN: 'ADMIN', USER: 'USER' };

export const PACKAGING = [
  { value: 'BULK', label: 'Bulk' },
  { value: 'CONTAINER', label: 'Container' },
];

export const LC_TYPES = [
  { value: 'SIGHT', label: 'Sight LC' },
  { value: 'USANCE', label: 'Usance LC' },
];

export const CONTRACT_STATUS = [
  { value: 'ACTIVE', label: 'Active / Running' },
  { value: 'CLOSED', label: 'Closed' },
];

export const UNITS = ['MT', 'KG', 'LTR', 'PCS'];

export const LOI_OPTIONS = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'YES', label: 'Received' },
  { value: 'NO', label: 'Not Required' },
];

export const DOC_ACCEPTANCE_OPTIONS = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'ACCEPTED', label: 'Accepted' },
  { value: 'PAID', label: 'Paid' },
];

export const labelOf = (options, value) => options.find((o) => o.value === value)?.label ?? value ?? '—';

/** Accepted document types for uploads */
export const DOC_ACCEPT = '.pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx';
export const MAX_FILE_MB = 20;
