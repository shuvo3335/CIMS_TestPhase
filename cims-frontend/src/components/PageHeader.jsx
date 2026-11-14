import { Breadcrumbs, Link, Stack, Typography, Box } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';

/** Page title + breadcrumbs + right-aligned actions. Used on every page. */
export default function PageHeader({ title, subtitle, breadcrumbs = [], actions }) {
  return (
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      spacing={2}
      alignItems={{ xs: 'flex-start', md: 'flex-end' }}
      justifyContent="space-between"
      sx={{ mb: 3 }}
      className="no-print"
    >
      <Box sx={{ minWidth: 0 }}>
        {breadcrumbs.length > 0 && (
          <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} sx={{ mb: 0.75, fontSize: 13 }}>
            {breadcrumbs.map((b, i) =>
              b.to && i < breadcrumbs.length - 1 ? (
                <Link key={b.label} component={RouterLink} to={b.to} underline="hover" color="text.secondary">
                  {b.label}
                </Link>
              ) : (
                <Typography key={b.label} fontSize={13} color="text.primary">
                  {b.label}
                </Typography>
              ),
            )}
          </Breadcrumbs>
        )}
        <Typography variant="h5" component="h1">
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {subtitle}
          </Typography>
        )}
      </Box>
      {actions && (
        <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
          {actions}
        </Stack>
      )}
    </Stack>
  );
}
