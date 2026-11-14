import { Box, Stack, Typography, LinearProgress, alpha } from '@mui/material';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import ErrorRoundedIcon from '@mui/icons-material/ErrorRounded';
import { fmtQty } from '@/utils/format';

/** Sticky bar comparing contract qty vs. allocated qty (Σ SPI qty). */
export default function QtySummaryBar({ contractQty, allocated, unit, tolerancePct = 0, ok, label = 'SPI total' }) {
  const remaining = (Number(contractQty) || 0) - (Number(allocated) || 0);
  const pct = contractQty ? Math.min(100, (allocated / contractQty) * 100) : 0;
  const color = ok ? 'success' : remaining < 0 ? 'error' : 'warning';

  return (
    <Box
      sx={(t) => ({
        position: 'sticky',
        top: 72,
        zIndex: 5,
        p: 2,
        borderRadius: 2.5,
        border: `1px solid ${alpha(t.palette[color].main, 0.35)}`,
        bgcolor: t.palette.mode === 'dark' ? alpha(t.palette[color].main, 0.12) : alpha(t.palette[color].main, 0.06),
        backdropFilter: 'blur(6px)',
      })}
    >
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 1, sm: 4 }} alignItems={{ sm: 'center' }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ color: `${color}.main` }}>
          {ok ? <CheckCircleRoundedIcon /> : <ErrorRoundedIcon />}
          <Typography fontWeight={700}>{ok ? 'Quantities match' : remaining > 0 ? 'Quantity not fully allocated' : 'Quantity exceeded'}</Typography>
        </Stack>
        <Metric label="Contract qty" value={fmtQty(contractQty, unit)} />
        <Metric label={label} value={fmtQty(allocated, unit)} />
        <Metric label="Remaining" value={fmtQty(remaining, unit)} color={`${color}.main`} />
        {tolerancePct > 0 && <Metric label="Tolerance" value={`±${tolerancePct}%`} />}
      </Stack>
      <LinearProgress variant="determinate" value={pct} color={color} sx={{ mt: 1.5, height: 6, borderRadius: 3 }} />
    </Box>
  );
}

function Metric({ label, value, color }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography fontWeight={700} sx={{ color }}>
        {value}
      </Typography>
    </Box>
  );
}
