import { useMemo, useRef, useState, useCallback } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { Box, Card, Stack, TextField, InputAdornment, Button, IconButton, Tooltip, Typography } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useSnackbar } from 'notistack';
import { useUiStore } from '@/store/uiStore';
import { useConfirm } from './ConfirmProvider';
import { EmptyState } from './States';

function ActionsCell({ data, context }) {
  if (!data || data.__total) return null;
  const { onView, onEdit, onDelete } = context;
  return (
    <Stack direction="row" spacing={0.25} alignItems="center" sx={{ height: '100%' }}>
      {onView && (
        <Tooltip title="View">
          <IconButton size="small" color="info" onClick={(e) => { e.stopPropagation(); onView(data); }}>
            <VisibilityOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
      {onEdit && (
        <Tooltip title="Edit">
          <IconButton size="small" color="primary" onClick={(e) => { e.stopPropagation(); onEdit(data); }}>
            <EditOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
      {onDelete && (
        <Tooltip title="Delete">
          <IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); context.requestDelete(data); }}>
            <DeleteOutlineIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
    </Stack>
  );
}

/**
 * Standard CIMS grid: quick search, column filters, pagination, CSV export,
 * and a pinned actions column (view / edit / delete with confirmation).
 */
export default function DataGrid({
  rowData,
  columnDefs,
  loading,
  onView,
  onEdit,
  onDelete,
  deleteMessage = () => 'This record will be permanently deleted.',
  exportFileName = 'export',
  toolbar,
  height = 'calc(100vh - 290px)',
  pinnedBottomRowData,
  onRowClicked,
  getRowId,
  emptyText = 'No records yet',
  gridOptions,
}) {
  const gridRef = useRef(null);
  const [quick, setQuick] = useState('');
  const themeMode = useUiStore((s) => s.themeMode);
  const confirm = useConfirm();
  const { enqueueSnackbar } = useSnackbar();

  const requestDelete = useCallback(
    async (row) => {
      const ok = await confirm({ title: 'Delete record?', message: deleteMessage(row), confirmText: 'Delete', danger: true });
      if (!ok) return;
      try {
        await onDelete(row);
        enqueueSnackbar('Deleted successfully', { variant: 'success' });
      } catch (e) {
        enqueueSnackbar(e.message, { variant: 'error' });
      }
    },
    [confirm, deleteMessage, onDelete, enqueueSnackbar],
  );

  const cols = useMemo(() => {
    const hasActions = onView || onEdit || onDelete;
    return hasActions
      ? [
          ...columnDefs,
          {
            headerName: 'Actions',
            colId: '__actions',
            pinned: 'right',
            width: 132,
            minWidth: 132,
            maxWidth: 132,
            sortable: false,
            filter: false,
            resizable: false,
            suppressMovable: true,
            cellRenderer: ActionsCell,
          },
        ]
      : columnDefs;
  }, [columnDefs, onView, onEdit, onDelete]);

  const defaultColDef = useMemo(() => ({ sortable: true, filter: true, resizable: true, minWidth: 110, flex: 1 }), []);
  const context = useMemo(() => ({ onView, onEdit, onDelete, requestDelete }), [onView, onEdit, onDelete, requestDelete]);

  const exportCsv = () =>
    gridRef.current?.api.exportDataAsCsv({
      fileName: `${exportFileName}.csv`,
      columnKeys: gridRef.current.api.getColumns().map((c) => c.getColId()).filter((id) => id !== '__actions'),
    });

  return (
    <Card>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }} sx={{ p: 2 }}>
        <TextField
          placeholder="Search all columns…"
          value={quick}
          onChange={(e) => setQuick(e.target.value)}
          sx={{ maxWidth: { sm: 320 } }}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }}
        />
        <Box sx={{ flex: 1, display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>{toolbar}</Box>
        <Button variant="outlined" color="secondary" startIcon={<FileDownloadOutlinedIcon />} onClick={exportCsv} disabled={!rowData?.length}>
          Export CSV
        </Button>
      </Stack>
      <Box className={themeMode === 'dark' ? 'ag-theme-quartz-dark' : 'ag-theme-quartz'} sx={{ height, minHeight: 380, px: 2, pb: 2 }}>
        <AgGridReact
          ref={gridRef}
          rowData={rowData}
          columnDefs={cols}
          defaultColDef={defaultColDef}
          context={context}
          quickFilterText={quick}
          loading={loading}
          pagination
          paginationPageSize={20}
          paginationPageSizeSelector={[10, 20, 50, 100]}
          pinnedBottomRowData={pinnedBottomRowData}
          onRowClicked={onRowClicked ? (e) => !e.data?.__total && onRowClicked(e.data) : undefined}
          rowClass={onRowClicked ? 'cims-row-clickable' : undefined}
          getRowId={getRowId}
          animateRows
          enableCellTextSelection
          noRowsOverlayComponent={() => (
            <EmptyState compact title={emptyText} message={quick ? 'No rows match your search.' : 'Records you add will appear here.'} />
          )}
          {...gridOptions}
        />
      </Box>
    </Card>
  );
}

/** Small helper for numeric columns. */
export const numCol = (field, headerName, extra = {}) => ({
  field,
  headerName,
  type: 'rightAligned',
  filter: 'agNumberColumnFilter',
  valueFormatter: (p) =>
    p.value === null || p.value === undefined || p.value === ''
      ? ''
      : Number(p.value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  ...extra,
});

export const dateCol = (field, headerName, extra = {}) => ({
  field,
  headerName,
  filter: 'agDateColumnFilter',
  minWidth: 125,
  valueFormatter: (p) => {
    if (!p.value) return '';
    const d = new Date(p.value);
    return Number.isNaN(d) ? '' : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  },
  filterParams: {
    comparator: (filterDate, cell) => {
      if (!cell) return -1;
      const d = new Date(cell);
      d.setHours(0, 0, 0, 0);
      return d < filterDate ? -1 : d > filterDate ? 1 : 0;
    },
  },
  ...extra,
});

export function GridCellText({ children }) {
  return <Typography variant="body2" component="span">{children}</Typography>;
}
