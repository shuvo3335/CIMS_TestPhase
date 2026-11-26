import { Table, TableHead, TableBody, TableRow, TableCell, Checkbox, Typography, Box } from '@mui/material';
import { MODULES, ACTIONS, ACTION_LABELS, normalizePermissions } from '@/utils/permissions';

/**
 * Module × action checkbox grid. Rows come from the permission registry, so a new
 * module appears here automatically. Create/Edit/Delete force View on.
 */
export default function PermissionGrid({ value = {}, onChange, disabled }) {
  const toggle = (moduleKey, action, checked) => {
    const cur = { ...(value[moduleKey] ?? {}) };
    cur[action] = checked;
    if (action === 'view' && !checked) {
      for (const a of ACTIONS) cur[a] = false; // no view → nothing else
    } else if (checked) {
      cur.view = true; // create / edit / delete imply view
    }
    onChange(normalizePermissions({ ...value, [moduleKey]: cur }));
  };

  return (
    <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 700 }}>Module</TableCell>
            {ACTIONS.map((a) => (
              <TableCell key={a} align="center" sx={{ fontWeight: 700 }}>
                {ACTION_LABELS[a]}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {MODULES.map((m) => (
            <TableRow key={m.key} hover>
              <TableCell>{m.label}</TableCell>
              {ACTIONS.map((a) => (
                <TableCell key={a} align="center" padding="checkbox">
                  {m.actions.includes(a) ? (
                    <Checkbox
                      size="small"
                      disabled={disabled}
                      checked={!!value[m.key]?.[a]}
                      onChange={(e) => toggle(m.key, a, e.target.checked)}
                      slotProps={{ input: { 'aria-label': `${m.label} ${ACTION_LABELS[a]}` } }}
                    />
                  ) : (
                    <Typography variant="caption" color="text.disabled">
                      —
                    </Typography>
                  )}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}
