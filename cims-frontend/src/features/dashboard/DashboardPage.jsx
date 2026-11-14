import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Card, CardContent, Typography, Stack, Button, List, ListItemButton, ListItemText, Skeleton, alpha, LinearProgress } from '@mui/material';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import AccountBalanceOutlinedIcon from '@mui/icons-material/AccountBalanceOutlined';
import EventBusyOutlinedIcon from '@mui/icons-material/EventBusyOutlined';
import DirectionsBoatOutlinedIcon from '@mui/icons-material/DirectionsBoatOutlined';
import PendingActionsOutlinedIcon from '@mui/icons-material/PendingActionsOutlined';
import AddIcon from '@mui/icons-material/Add';
import PageHeader from '@/components/PageHeader';
import { SectionCard, StatusChip } from '@/components/Common';
import { EmptyState } from '@/components/States';
import { contractHooks, lcHooks, piHooks, shipmentHooks, useVesselReport, useLookups } from '@/hooks/useApi';
import { useAuthStore } from '@/store/authStore';
import { lcStatus, sumBy, calcLcPending } from '@/utils/calc';
import { fmtDate, fmtQty } from '@/utils/format';

function Kpi({ icon, label, value, hint, color = 'primary', loading, onClick }) {
  return (
    <Card sx={{ cursor: onClick ? 'pointer' : 'default', transition: 'transform .15s', '&:hover': onClick ? { transform: 'translateY(-2px)' } : undefined }} onClick={onClick}>
      <CardContent>
        <Stack direction="row" spacing={2} alignItems="center">
          <Box sx={(t) => ({ width: 46, height: 46, borderRadius: 2.5, display: 'grid', placeItems: 'center', color: `${color}.main`, bgcolor: alpha(t.palette[color].main, 0.12) })}>{icon}</Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" color="text.secondary" noWrap>
              {label}
            </Typography>
            {loading ? <Skeleton width={60} height={34} /> : <Typography variant="h5">{value}</Typography>}
          </Box>
        </Stack>
        {hint && (
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1.25 }}>
            {hint}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const contracts = contractHooks.useList();
  const pis = piHooks.useList();
  const lcs = lcHooks.useList();
  const shipments = shipmentHooks.useList();
  const report = useVesselReport();
  const { data: lookups } = useLookups();

  const stats = useMemo(() => {
    const cs = contracts.data ?? [];
    const ls = lcs.data ?? [];
    const ps = pis.data ?? [];
    const expiring = ls.filter((l) => lcStatus(l) === 'EXPIRING').sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));
    const totalSpis = sumBy(ps, (p) => p.spis.length);
    const pendingQty = sumBy(cs.filter((c) => c.status === 'ACTIVE'), (c) => calcLcPending(c.totalQty, sumBy(ls.filter((l) => l.contractId === c.id), 'doneQty')));
    return {
      activeContracts: cs.filter((c) => c.status === 'ACTIVE').length,
      contractsWithoutPi: cs.filter((c) => c.status === 'ACTIVE' && !c.piId).length,
      openLcs: ls.filter((l) => lcStatus(l) !== 'EXPIRED').length,
      lcsPendingSpis: totalSpis - ls.length,
      expiring,
      pendingQty,
    };
  }, [contracts.data, lcs.data, pis.data]);

  const byStatus = useMemo(() => {
    const list = shipments.data ?? [];
    return (lookups?.vesselStatuses ?? []).map((s) => ({ status: s, count: list.filter((x) => x.status === s).length })).filter((x) => x.count > 0);
  }, [shipments.data, lookups]);

  const upcoming = useMemo(
    () => [...(shipments.data ?? [])].filter((s) => s.status !== 'Discharged').sort((a, b) => (a.eta || '').localeCompare(b.eta || '')).slice(0, 5),
    [shipments.data],
  );

  const loading = contracts.isLoading || lcs.isLoading || pis.isLoading;
  const totalVessels = shipments.data?.length ?? 0;

  return (
    <>
      <PageHeader
        title={`Welcome back, ${user?.name?.split(' ')[0] ?? ''}`}
        subtitle="Overview of contracts, LCs and vessels in transit"
        actions={
          <>
            <Button variant="outlined" startIcon={<AddIcon />} onClick={() => navigate('/contracts/new')}>
              New Contract
            </Button>
            <Button variant="contained" onClick={() => navigate('/reports/vessels')}>
              Vessel Report
            </Button>
          </>
        }
      />

      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(5, 1fr)' }, mb: 3 }}>
        <Kpi icon={<DescriptionOutlinedIcon />} label="Active Contracts" value={stats.activeContracts} loading={loading} hint={`${stats.contractsWithoutPi} awaiting PI`} onClick={() => navigate('/contracts')} />
        <Kpi icon={<AccountBalanceOutlinedIcon />} label="Open LCs" value={stats.openLcs} color="secondary" loading={loading} hint={`${stats.lcsPendingSpis} SPI(s) awaiting LC`} onClick={() => navigate('/lc')} />
        <Kpi icon={<EventBusyOutlinedIcon />} label="LCs Expiring ≤ 15 days" value={stats.expiring.length} color="warning" loading={loading} onClick={() => navigate('/lc')} />
        <Kpi icon={<DirectionsBoatOutlinedIcon />} label="Vessels" value={totalVessels} color="info" loading={shipments.isLoading} onClick={() => navigate('/shipments')} />
        <Kpi icon={<PendingActionsOutlinedIcon />} label="LC Pending Qty" value={fmtQty(stats.pendingQty)} color="error" loading={loading} hint="Across active contracts" />
      </Box>

      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr 1fr' } }}>
        <SectionCard title="Vessels by Status">
          {byStatus.length === 0 ? (
            <EmptyState compact title="No vessels" />
          ) : (
            <Stack spacing={1.75}>
              {byStatus.map((s) => (
                <Box key={s.status}>
                  <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                    <StatusChip value={s.status} />
                    <Typography fontWeight={700}>{s.count}</Typography>
                  </Stack>
                  <LinearProgress variant="determinate" value={(s.count / totalVessels) * 100} color="secondary" sx={{ height: 6, borderRadius: 3 }} />
                </Box>
              ))}
            </Stack>
          )}
        </SectionCard>

        <SectionCard title="Upcoming Arrivals" contentSx={{ p: 1 }}>
          {upcoming.length === 0 ? (
            <EmptyState compact title="No vessels in transit" />
          ) : (
            <List dense disablePadding>
              {upcoming.map((s) => (
                <ListItemButton key={s.id} onClick={() => navigate(`/reports/vessels/${s.id}`)} sx={{ borderRadius: 2 }}>
                  <ListItemText primary={s.vesselName} secondary={`${s.commodities.join(', ')} · ETA ${fmtDate(s.eta)}`} slotProps={{ primary: { fontWeight: 650 } }} />
                  <StatusChip value={s.status} />
                </ListItemButton>
              ))}
            </List>
          )}
        </SectionCard>

        <SectionCard title="LCs Expiring Soon" contentSx={{ p: 1 }}>
          {stats.expiring.length === 0 ? (
            <EmptyState compact title="Nothing expiring" message="No LC expires in the next 15 days." />
          ) : (
            <List dense disablePadding>
              {stats.expiring.slice(0, 6).map((l) => (
                <ListItemButton key={l.id} onClick={() => navigate(`/lc/${l.id}`)} sx={{ borderRadius: 2 }}>
                  <ListItemText primary={l.lcNo} secondary={`${l.bank} · ${l.contractNo}`} slotProps={{ primary: { fontWeight: 650 } }} />
                  <Typography variant="caption" color="warning.main" fontWeight={700}>
                    {fmtDate(l.expiryDate)}
                  </Typography>
                </ListItemButton>
              ))}
            </List>
          )}
        </SectionCard>
      </Box>

      {report.data && report.data.length > 0 && (
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 3 }}>
          {report.data.length} vessel-contract row(s) in the vessel report.
        </Typography>
      )}
    </>
  );
}
