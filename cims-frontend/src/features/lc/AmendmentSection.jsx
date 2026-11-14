import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import { Box, Stack, Typography, Button, IconButton, Tooltip, Chip, alpha } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { RHFText } from '@/components/form/RHFFields';
import { RHFFileUploader } from '@/components/FileUploader';
import { FormGrid, Span } from '@/components/Common';
import { ordinal, fmtMoney } from '@/utils/format';

/** LC amendment history (1st, 2nd, …). Each amendment needs its own file. */
export default function AmendmentSection({ lcIndex, currency }) {
  const { control } = useFormContext();
  const base = `lcs.${lcIndex}.amendments`;
  const { fields, append, remove } = useFieldArray({ control, name: base, keyName: 'key' });
  const amendments = useWatch({ control, name: base }) || [];
  const original = useWatch({ control, name: `lcs.${lcIndex}.amount` });

  return (
    <Box sx={(t) => ({ mt: 2, p: 2, borderRadius: 2, border: `1px dashed ${t.palette.divider}`, bgcolor: alpha(t.palette.warning.main, 0.03) })}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: fields.length ? 2 : 0 }}>
        <Box>
          <Typography variant="subtitle2">LC Amendments {fields.length > 0 && `(${fields.length})`}</Typography>
          <Typography variant="caption" color="text.secondary">
            {fields.length
              ? `Original ${fmtMoney(original, currency)} → current ${fmtMoney(amendments[amendments.length - 1]?.value || original, currency)}`
              : 'Record LC amendments here if the LC is amended.'}
          </Typography>
        </Box>
        <Button size="small" startIcon={<AddIcon />} color="warning" variant="outlined" onClick={() => append({ date: '', value: '', remarks: '', files: [] })}>
          Add Amendment
        </Button>
      </Stack>
      <Stack spacing={2}>
        {fields.map((f, i) => (
          <Box key={f.key} sx={{ p: 2, borderRadius: 2, border: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
              <Chip size="small" color="warning" label={`${ordinal(i + 1)} Amendment`} />
              <Tooltip title="Remove amendment">
                <IconButton size="small" color="error" onClick={() => remove(i)}>
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
            <FormGrid>
              <RHFText name={`${base}.${i}.date`} label="Amendment Date" type="date" required />
              <RHFText name={`${base}.${i}.value`} label={`${ordinal(i + 1)} Amendment Value`} type="number" required endAdornment={currency} />
              <RHFText name={`${base}.${i}.remarks`} label="Remarks / Changes" />
              <Span>
                <RHFFileUploader name={`${base}.${i}.files`} compact hint="LC amendment file (required)" />
              </Span>
            </FormGrid>
          </Box>
        ))}
      </Stack>
    </Box>
  );
}
