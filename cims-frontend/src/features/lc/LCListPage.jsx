import { Fragment, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Button, Chip, Card, Box, Stack, Typography, TextField, InputAdornment, IconButton, Tooltip, Collapse,
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useSnackbar } from 'notistack';
import PageHeader from '@/components/PageHeader';
import { StatusChip } from '@/components/Common';
import { EmptyState, ErrorState } from '@/components/States';
import { useConfirm } from '@/components/ConfirmProvider';
import { lcHooks, contractHooks, piHooks } from '@/hooks/useApi';
import { latestLcValue, lcStatus, toNum, round2 } from '@/utils/calc';
import { fmtDate, fmtQty, fmtMoney } from '@/utils/format';
import { labelOf, LC_TYPES } from '@/utils/constants';

const STATUS_LABEL = { ACTIVE: 'Active', EXPIRING: 'Expiring soon', EXPIRED: 'Expired' };

export default function LCListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useSearchParams();
  const contractFilter = search.get('contract');
  const { data: lcs = [], isLoading, isError, error, refetch } = lcHooks.useList();
  const { data: contracts = [] } = contractHooks.useList();
  const { data: pis = [] } = piHooks.useList();
  const remove = lcHooks.useRemove();
  const confirm = useConfirm();
  const { enqueueSnackbar } = useSnackbar();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState({});

  // One group per sales contract that has at least one LC.
  const groups = useMemo(() => {
    const byContract = new Map();
    lcs.forEach((lc) => {
      if (contractFilter && lc.contractId !== contractFilter) return;
      if (!byContract.has(lc.contractId)) byContract.set(lc.contractId, []);
      byContract.get(lc.contractId).push({ ...lc, latestValue: latestLcValue(lc), status: lcStatus(lc) });
    });
    const q = query.trim().toLowerCase();
    return [...byContract.entries()]
      .map(([contractId, items]) => {
        const contract = contracts.find((c) => c.id === contractId) || {};
        const pi = pis.find((p) => p.contractId === contractId);
        const pendingSpis = pi ? pi.spis.length - pi.lcCount : 0;
        const sorted = items.sort((a, b) => String(a.spiNo).localeCompare(String(b.spiNo), undefined, { numeric: true }));
        const lcValue = round2(sorted.reduce((a, l) => a + toNum(l.latestValue), 0));
        return {
          contractId,
          contract,
          contractNo: contract.contractNo ?? items[0].contractNo,
          buyer: contract.buyer ?? items[0].buyer,
          seller: contract.seller ?? items[0].seller,
          commodity: contract.commodity ?? items[0].commodity,
          currency: contract.currency ?? items[0].currency,
          items: sorted,
          lcValue,
          pendingSpis,
          pendingValue: Math.max(0, round2(toNum(contract.totalPrice) - lcValue)),
        };
      })
      .filter((g) => {
        if (!q) return true;
        const hay = [g.contractNo, g.buyer, g.seller, g.commodity, ...g.items.flatMap((l) => [l.lcNo, l.spiNo, l.bank])].join(' ').toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => String(a.contractNo).localeCompare(String(b.contractNo), undefined, { numeric: true }));
  }, [lcs, contracts, pis, contractFilter, query]);

  const toggle = (id) => setOpen((o) => ({ ...o, [id]: !o[id] }));

  const onDelete = async (lc) => {
    const ok = await confirm({
      title: 'Delete record?',
      message: `LC ${lc.lcNo} (SPI ${lc.spiNo}) and its amendments will be permanently deleted.`,
      confirmText: 'Delete',
      danger: true,
    });
    if (!ok) return;
    try {
      await remove.mutateAsync(lc.id);
      enqueueSnackbar(`LC ${lc.lcNo} deleted`, { variant: 'success' });
    } catch (e) {
      await confirm({ title: 'Could not delete', message: e.message, alertOnly: true, danger: true });
    }
  };

  if (isError) return <ErrorState error={error} onRetry={refetch} />;

  return (
    <>
      <PageHeader
        title="LC List"
        subtitle="Letters of credit grouped by sales contract. Click a contract to see its LCs."
        breadcrumbs={[{ label: 'Letter of Credit' }, { label: 'List' }]}
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/lc/new')}>
            Open LC
          </Button>
        }
      />
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
        <TextField
          size="small"
          placeholder="Search contract, buyer, LC no, SPI, bank…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          sx={{ minWidth: 320 }}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }}
        />
        {contractFilter && (
          <Chip color="secondary" label={`Contract: ${groups[0]?.contractNo ?? 'selected'}`} onDelete={() => setSearch({})} />
        )}
        <Box sx={{ flex: 1 }} />
        {groups.length > 0 && (
          <Button size="small" onClick={() => setOpen(groups.every((g) => open[g.contractId]) ? {} : Object.fromEntries(groups.map((g) => [g.contractId, true])))}>
            {groups.every((g) => open[g.contractId]) ? 'Collapse all' : 'Expand all'}
          </Button>
        )}
      </Stack>

      <Card>
        {isLoading ? (
          <Box sx={{ p: 4 }}><Typography color="text.secondary">Loading…</Typography></Box>
        ) : groups.length === 0 ? (
          <EmptyState compact title="No LCs yet" message="Opened LCs will appear here, grouped by sales contract." />
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell width={48} />
                  <TableCell>Contract No</TableCell>
                  <TableCell>Buyer</TableCell>
                  <TableCell>Seller</TableCell>
                  <TableCell>Commodity</TableCell>
                  <TableCell align="right">LCs Opened</TableCell>
                  <TableCell align="right">Total LC Value</TableCell>
                  <TableCell align="right">Pending LC</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {groups.map((g) => {
                  const isOpen = !!open[g.contractId];
                  return (
                    <Fragment key={g.contractId}>
                      <TableRow hover onClick={() => toggle(g.contractId)} sx={{ cursor: 'pointer', '& > td': { borderBottom: isOpen ? 0 : undefined } }}>
                        <TableCell>
                          <IconButton size="small" aria-label={isOpen ? 'Collapse' : 'Expand'}>
                            {isOpen ? <KeyboardArrowDownIcon /> : <KeyboardArrowRightIcon />}
                          </IconButton>
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>{g.contractNo}</TableCell>
                        <TableCell>{g.buyer}</TableCell>
                        <TableCell>{g.seller}</TableCell>
                        <TableCell>{g.commodity}</TableCell>
                        <TableCell align="right">{g.items.length}</TableCell>
                        <TableCell align="right">{fmtMoney(g.lcValue, g.currency)}</TableCell>
                        <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                          {g.pendingSpis > 0 ? (
                            <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end">
                              <Box sx={{ textAlign: 'right' }}>
                                <Typography variant="body2" fontWeight={650} color="warning.main">
                                  {fmtMoney(g.pendingValue, g.currency)}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {g.pendingSpis} SPI(s) pending
                                </Typography>
                              </Box>
                              <Button
                                size="small"
                                variant="outlined"
                                color="secondary"
                                startIcon={<AddIcon />}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/lc/new?contract=${g.contractId}`);
                                }}
                              >
                                Open LC
                              </Button>
                            </Stack>
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              —
                            </Typography>
                          )}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell colSpan={8} sx={{ py: 0, borderBottom: isOpen ? undefined : 0 }}>
                          <Collapse in={isOpen} timeout="auto" unmountOnExit>
                            <Box sx={{ py: 1.5 }}>
                              <TableContainer>
                                <Table size="small">
                                  <TableHead>
                                    <TableRow>
                                      <TableCell>SPI No</TableCell>
                                      <TableCell>LC No</TableCell>
                                      <TableCell>LC Type</TableCell>
                                      <TableCell align="right">Payment (days)</TableCell>
                                      <TableCell>Bank</TableCell>
                                      <TableCell>Issue Date</TableCell>
                                      <TableCell>Expiry Date</TableCell>
                                      <TableCell align="right">LC Done Qty</TableCell>
                                      <TableCell align="right">LC Amount</TableCell>
                                      <TableCell align="right">Amendments</TableCell>
                                      <TableCell align="right">Current Value</TableCell>
                                      <TableCell>Insurance Cover Note</TableCell>
                                      <TableCell>Status</TableCell>
                                      <TableCell align="right">Actions</TableCell>
                                    </TableRow>
                                  </TableHead>
                                  <TableBody>
                                    {g.items.map((l) => (
                                      <TableRow key={l.id} hover>
                                        <TableCell sx={{ whiteSpace: 'nowrap' }}>{l.spiNo}</TableCell>
                                        <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{l.lcNo}</TableCell>
                                        <TableCell>{labelOf(LC_TYPES, l.lcType)}</TableCell>
                                        <TableCell align="right">{l.paymentDurationDays ?? '—'}</TableCell>
                                        <TableCell>{l.bank}</TableCell>
                                        <TableCell sx={{ whiteSpace: 'nowrap' }}>{fmtDate(l.issueDate)}</TableCell>
                                        <TableCell sx={{ whiteSpace: 'nowrap' }}>{fmtDate(l.expiryDate)}</TableCell>
                                        <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>{fmtQty(l.doneQty, l.unit)}</TableCell>
                                        <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>{fmtMoney(l.amount, l.currency)}</TableCell>
                                        <TableCell align="right">{l.amendments?.length ?? 0}</TableCell>
                                        <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontWeight: 600 }}>{fmtMoney(l.latestValue, l.currency)}</TableCell>
                                        <TableCell>{l.insuranceCoverNoteNo}</TableCell>
                                        <TableCell><StatusChip value={l.status} label={STATUS_LABEL[l.status]} /></TableCell>
                                        <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                                          <Tooltip title="View"><IconButton size="small" onClick={() => navigate(`/lc/${l.id}`)}><VisibilityOutlinedIcon fontSize="small" /></IconButton></Tooltip>
                                          <Tooltip title="Edit"><IconButton size="small" onClick={() => navigate(`/lc/${l.id}/edit`)}><EditOutlinedIcon fontSize="small" /></IconButton></Tooltip>
                                          <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => onDelete(l)}><DeleteOutlineIcon fontSize="small" /></IconButton></Tooltip>
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </TableContainer>
                            </Box>
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>
    </>
  );
}
