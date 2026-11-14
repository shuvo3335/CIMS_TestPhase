import { useRouteError, Link as RouterLink } from 'react-router-dom';
import { Box, Button, Typography, Stack } from '@mui/material';
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined';

export default function RouteError() {
  const err = useRouteError();
  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', p: 3, bgcolor: 'background.default' }}>
      <Stack alignItems="center" spacing={2} sx={{ textAlign: 'center', maxWidth: 480 }}>
        <ReportProblemOutlinedIcon color="error" sx={{ fontSize: 56 }} />
        <Typography variant="h5">Something went wrong</Typography>
        <Typography color="text.secondary">{err?.statusText || err?.message || 'An unexpected error occurred.'}</Typography>
        <Stack direction="row" spacing={1.5}>
          <Button variant="outlined" onClick={() => window.location.reload()}>
            Reload
          </Button>
          <Button variant="contained" component={RouterLink} to="/">
            Go to dashboard
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}
