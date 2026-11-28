import { Fragment, useMemo, useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Button, Card, Box, Stack, Typography, TextField, InputAdornment, IconButton, Tooltip, Collapse, Link,
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
import { piHooks } from '@/hooks/useApi';
import { fmtDate, fmtQty, fmtMoney } from '@/utils/format';
import Can from '@/components/Can';

/** One row per sales contract (with its PI); expand to see every SPI with all its details. */
export default function PIListPage() {
  const navigate = useNavigate();
  const { data = [], isLoading, isError, error, refetch } = piHooks.useList();
  const remove = piHooks.useRemove();
  const confirm = useConfirm();
  const { enqueueSnackbar } = useSnackbar();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState({});

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data
      .filter((pi) => {
        if (!q) return true;
        const hay = [pi.contractNo, pi.piNo, pi.buyer, pi.seller, pi.commodity, pi.pol, pi.pod, ...pi.spis.flatMap((s) => [s.spiNo, s.lcNo])].join(' ').toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => String(a.contractNo).localeCompare(String(b.contractNo), undefined, { numeric: true }));
  }, [data, query]);

  const toggle = (id) => setOpen((o) => ({ ...o, [id]: !o[id] }));
  const allOpen = groups.length > 0 && groups.every((g) => open[g.id]);

  const onDelete = async (pi) => {
    const ok = await confirm({
      title: 'Delete record?',
      message: `PI ${pi.piNo} and all of its SPIs will be permanently deleted.`,
      confirmText: 'Delete',
      danger: true,
    });
    if (!ok) return;
    try {
      await remove.mutateAsync(pi.id);
      enqueueSnackbar(`PI ${pi.piNo} deleted`, { variant: 'success' });
    } catch (e) {
      await confirm({ title: 'Could not delete', message: e.message, alertOnly: true, danger: true });
    }
  };

  if (isError) return <ErrorState error={error} onRetry={refetch} />;

  return (
    <>
      <PageHeader
        title="PI List"
        subtitle="Proforma invoices grouped by sales contract. Click a contract to see all of its SPIs."
        breadcrumbs={[{ label: 'Proforma Invoice' }, { label: 'List' }]}
        actions={
          <Can module="pi" action="create"><Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/pi/new')}>
            New PI
          </Button></Can>
        }
      />
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
        <TextField
          size="small"
          placeholder="Search contract, PI, SPI, buyer, LC no, port…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          sx={{ minWidth: 320 }}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }}
        />
        <Box sx={{ flex: 1 }} />
        {groups.length > 0 && (
          <Button size="small" onClick={() => setOpen(allOpen ? {} : Object.fromEntries(groups.map((g) => [g.id, true])))}>
            {allOpen ? 'Collapse all' : 'Expand all'}
          </Button>
        )}
      </Stack>

      <Card>
        {isLoading ? (
          <Box sx={{ p: 4 }}>
            <Typography color="text.secondary">Loading…</Typography>
          </Box>
        ) : groups.length === 0 ? (
          <EmptyState compact title="No PIs yet" message="Proforma invoices will appear here, grouped by sales contract." />
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell width={48} />
                  <TableCell>Contract No</TableCell>
                  <TableCell>PI No</TableCell>
                  <TableCell>Buyer</TableCell>
                  <TableCell>Seller</TableCell>
                  <TableCell>Commodity</TableCell>
                  <TableCell>Origin</TableCell>
                  <TableCell align="center">Contract Qty</TableCell>
                  <TableCell align="center">SPIs</TableCell>
                  <TableCell align="center">Total SPI Amount</TableCell>
                  <TableCell align="center">LCs Opened</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {groups.map((pi) => {
                  const isOpen = !!open[pi.id];
                  const pending = pi.spis.length - pi.lcCount;
                  return (
                    <Fragment key={pi.id}>
                      <TableRow hover onClick={() => toggle(pi.id)} sx={{ cursor: 'pointer', '& > td': { borderBottom: isOpen ? 0 : undefined } }}>
                        <TableCell>
                          <IconButton size="small" aria-label={isOpen ? 'Collapse' : 'Expand'}>
                            {isOpen ? <KeyboardArrowDownIcon /> : <KeyboardArrowRightIcon />}
                          </IconButton>
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>{pi.contractNo}</TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>{pi.piNo}</TableCell>
                        <TableCell>{pi.buyer}</TableCell>
                        <TableCell>{pi.seller}</TableCell>
                        <TableCell>{pi.commodity}</TableCell>
                        <TableCell>{pi.origin}</TableCell>
                        <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>{fmtQty(pi.contractQty, pi.unit)}</TableCell>
                        <TableCell align="center">{pi.spis.length}</TableCell>
                        <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>{fmtMoney(pi.totalSpiAmount, pi.currency)}</TableCell>
                        <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>
                          {pi.lcCount} / {pi.spis.length}
                          {pending > 0 && (
                            <Typography component="span" variant="caption" color="warning.main" sx={{ ml: 0.75 }}>
                              ({pending} pending)
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="right" sx={{ whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
                          <Tooltip title="View PI"><IconButton size="small" onClick={() => navigate(`/pi/${pi.id}`)}><VisibilityOutlinedIcon fontSize="small" /></IconButton></Tooltip>
                          <Can module="pi" action="edit"><Tooltip title="Edit PI"><IconButton size="small" onClick={() => navigate(`/pi/${pi.id}/edit`)}><EditOutlinedIcon fontSize="small" /></IconButton></Tooltip></Can>
                          <Can module="pi" action="delete"><Tooltip title="Delete PI"><IconButton size="small" color="error" onClick={() => onDelete(pi)}><DeleteOutlineIcon fontSize="small" /></IconButton></Tooltip></Can>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell colSpan={12} sx={{ py: 0, borderBottom: isOpen ? undefined : 0 }}>
                          <Collapse in={isOpen} timeout="auto" unmountOnExit>
                            <Box sx={{ py: 1.5 }}>
                              <TableContainer>
                                <Table size="small">
                                  <TableHead>
                                    <TableRow>
                                      <TableCell>SPI #</TableCell>
                                      <TableCell>SPI No</TableCell>
                                      {/* <TableCell>Commodity</TableCell>
                                      <TableCell>Origin</TableCell> */}
                                      <TableCell align="center">SPI Qty</TableCell>
                                      <TableCell align="center">Unit Price</TableCell>
                                      <TableCell align="center">SPI Amount</TableCell>
                                      <TableCell>SPI Date</TableCell>
                                      <TableCell>Validity</TableCell>
                                      <TableCell>Port of Loading</TableCell>
                                      <TableCell>Port of Discharge</TableCell>
                                      <TableCell>LC</TableCell>
                                      <TableCell>Actions</TableCell>
                                    </TableRow>
                                  </TableHead>
                                  <TableBody>
                                    {pi.spis.map((s, i) => (
                                      <TableRow key={s.id} hover>
                                        <TableCell>{i + 1} / {pi.spis.length}</TableCell>
                                        <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{s.spiNo}</TableCell>
                                        {/* <TableCell>{pi.commodity}</TableCell>
                                        <TableCell>{pi.origin}</TableCell> */}
                                        <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>{fmtQty(s.qty, pi.unit)}</TableCell>
                                        <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>{fmtMoney(pi.unitPrice, pi.currency)}</TableCell>
                                        <TableCell align="center" sx={{ whiteSpace: 'nowrap', fontWeight: 600 }}>{fmtMoney(s.amount, pi.currency)}</TableCell>
                                        <TableCell sx={{ whiteSpace: 'nowrap' }}>{fmtDate(pi.spiDate)}</TableCell>
                                        <TableCell sx={{ whiteSpace: 'nowrap' }}>{fmtDate(pi.spiValidity)}</TableCell>
                                        <TableCell>{pi.pol}</TableCell>
                                        <TableCell>{pi.pod}</TableCell>
                                        <TableCell sx={{ whiteSpace: 'nowrap' }}>
                                          {s.lcId ? (
                                            <Link component={RouterLink} to={`/lc/${s.lcId}`} fontWeight={600}>
                                              {s.lcNo}
                                            </Link>
                                          ) : (
                                            <StatusChip value="PENDING" label="LC pending" />
                                          )}
                                        </TableCell>
                                        <TableCell align="right" sx={{ whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
                          <Tooltip title="View PI"><IconButton size="small" onClick={() => navigate(`/pi/${pi.id}`)}><VisibilityOutlinedIcon fontSize="small" /></IconButton></Tooltip>
                          <Can module="pi" action="edit"><Tooltip title="Edit PI"><IconButton size="small" onClick={() => navigate(`/pi/${pi.id}/edit`)}><EditOutlinedIcon fontSize="small" /></IconButton></Tooltip></Can>
                          <Can module="pi" action="delete"><Tooltip title="Delete PI"><IconButton size="small" color="error" onClick={() => onDelete(pi)}><DeleteOutlineIcon fontSize="small" /></IconButton></Tooltip></Can>
                        </TableCell>
                                      </TableRow>
                                    ))}
                                    <TableRow>
                                      <TableCell colSpan={2} sx={{ fontWeight: 700 }}>Total</TableCell>
                                      <TableCell align="right" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{fmtQty(pi.totalSpiQty, pi.unit)}</TableCell>
                                      <TableCell />
                                      <TableCell align="right" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{fmtMoney(pi.totalSpiAmount, pi.currency)}</TableCell>
                                      <TableCell colSpan={4} />
                                    </TableRow>
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
