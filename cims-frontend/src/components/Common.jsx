import { Card, CardHeader, CardContent, Box, Typography, Chip, Stack, alpha } from '@mui/material';

/** Titled form/detail section. */
export function SectionCard({ title, subtitle, action, children, icon, sx, contentSx }) {
  return (
    <Card sx={sx}>
      <CardHeader
        title={
          <Stack direction="row" spacing={1} alignItems="center">
            {icon && <Box sx={{ display: 'flex', color: 'secondary.main' }}>{icon}</Box>}
            <span>{title}</span>
          </Stack>
        }
        subheader={subtitle}
        action={action}
        sx={{ '& .MuiCardHeader-action': { alignSelf: 'center', m: 0 } }}
      />
      <CardContent sx={contentSx}>{children}</CardContent>
    </Card>
  );
}

/** Label/value pair for view pages and auto-filled fields. */
export function ReadOnlyField({ label, value, emphasize }) {
  return (
    <Box
      sx={(t) => ({
        px: 1.5,
        py: 1,
        borderRadius: 2,
        bgcolor: alpha(t.palette.primary.main, t.palette.mode === 'dark' ? 0.08 : 0.035),
        border: `1px solid ${alpha(t.palette.primary.main, 0.08)}`,
        minHeight: 40,
      })}
    >
      <Typography variant="caption" color="text.secondary" display="block" sx={{ lineHeight: 1.3 }}>
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={emphasize ? 700 : 550} sx={{ wordBreak: 'break-word' }}>
        {value === null || value === undefined || value === '' ? '—' : value}
      </Typography>
    </Box>
  );
}

/** Responsive grid of ReadOnlyFields. items: [{label, value, emphasize?}] */
export function DetailGrid({ items, columns = 3 }) {
  return (
    <Box
      sx={{
        display: 'grid',
        gap: 1.5,
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', md: `repeat(${columns}, minmax(0, 1fr))` },
      }}
    >
      {items.filter(Boolean).map((it) => (
        <ReadOnlyField key={it.label} {...it} />
      ))}
    </Box>
  );
}

/** Responsive form grid (12-col style using CSS grid). */
export function FormGrid({ children, columns = 3 }) {
  return (
    <Box
      sx={{
        display: 'grid',
        gap: 2,
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', md: `repeat(${columns}, minmax(0, 1fr))` },
        alignItems: 'start',
      }}
    >
      {children}
    </Box>
  );
}

export const Span = ({ cols = 'full', children }) => (
  <Box sx={{ gridColumn: cols === 'full' ? '1 / -1' : { xs: 'auto', md: `span ${cols}` } }}>{children}</Box>
);

const STATUS_COLORS = {
  ACTIVE: 'success',
  CLOSED: 'default',
  EXPIRED: 'error',
  EXPIRING: 'warning',
  ADMIN: 'secondary',
  USER: 'default',
  'Not Start Yet': 'default',
  'On Loading': 'info',
  'Loading Complete': 'primary',
  Sailed: 'secondary',
  Arrived: 'warning',
  Discharging: 'warning',
  Discharged: 'success',
  YES: 'success',
  NO: 'default',
  PENDING: 'warning',
  ACCEPTED: 'success',
  PAID: 'success',
};

export function StatusChip({ value, label, size = 'small', color }) {
  if (!value) return null;
  return <Chip size={size} label={label || value} color={color || STATUS_COLORS[value] || 'default'} variant="outlined" sx={{ fontWeight: 650 }} />;
}
