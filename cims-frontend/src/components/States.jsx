import { Box, Stack, Typography, Skeleton, Card, CardContent, Button, alpha } from '@mui/material';
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

export function EmptyState({ title = 'Nothing here yet', message, action, compact, icon }) {
  return (
    <Stack alignItems="center" spacing={1} sx={{ py: compact ? 3 : 6, px: 2, textAlign: 'center' }}>
      <Box
        sx={(t) => ({
          width: compact ? 44 : 56,
          height: compact ? 44 : 56,
          borderRadius: '50%',
          display: 'grid',
          placeItems: 'center',
          bgcolor: alpha(t.palette.secondary.main, 0.12),
          color: 'secondary.main',
        })}
      >
        {icon || <InboxOutlinedIcon />}
      </Box>
      <Typography variant="subtitle1">{title}</Typography>
      {message && (
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 420 }}>
          {message}
        </Typography>
      )}
      {action}
    </Stack>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <Card>
      <CardContent>
        <Stack alignItems="center" spacing={1.5} sx={{ py: 4, textAlign: 'center' }}>
          <ErrorOutlineIcon color="error" sx={{ fontSize: 44 }} />
          <Typography variant="h6">Something went wrong</Typography>
          <Typography variant="body2" color="text.secondary">
            {error?.message || 'Unexpected error'}
          </Typography>
          {onRetry && (
            <Button variant="outlined" onClick={onRetry}>
              Try again
            </Button>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}

export function FormSkeleton({ sections = 2 }) {
  return (
    <Stack spacing={3}>
      {Array.from({ length: sections }).map((_, i) => (
        <Card key={i}>
          <CardContent>
            <Skeleton width={180} height={28} sx={{ mb: 2 }} />
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' } }}>
              {Array.from({ length: 6 }).map((__, j) => (
                <Skeleton key={j} variant="rounded" height={40} />
              ))}
            </Box>
          </CardContent>
        </Card>
      ))}
    </Stack>
  );
}
