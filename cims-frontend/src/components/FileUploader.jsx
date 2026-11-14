import { useRef, useState } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { Box, Stack, Typography, IconButton, Tooltip, LinearProgress, alpha, FormHelperText } from '@mui/material';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined';
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useSnackbar } from 'notistack';
import { saveFile, openFile, downloadFile } from '@/services/fileStore';
import { fmtFileSize, fmtDate } from '@/utils/format';
import { DOC_ACCEPT, MAX_FILE_MB } from '@/utils/constants';

const fileIcon = (type = '') =>
  type.includes('pdf') ? <PictureAsPdfOutlinedIcon color="error" /> : type.startsWith('image/') ? <ImageOutlinedIcon color="info" /> : <InsertDriveFileOutlinedIcon color="action" />;

/** Read-only list of attachments with preview / download. */
export function FileList({ files, onRemove, dense }) {
  const { enqueueSnackbar } = useSnackbar();
  const run = (fn, meta) => fn(meta).catch((e) => enqueueSnackbar(e.message, { variant: 'warning' }));
  if (!files?.length) return <Typography variant="body2" color="text.secondary">No documents attached.</Typography>;
  return (
    <Stack spacing={1}>
      {files.map((f) => (
        <Stack
          key={f.id}
          direction="row"
          alignItems="center"
          spacing={1.5}
          sx={{ px: 1.5, py: dense ? 0.5 : 1, borderRadius: 2, border: 1, borderColor: 'divider', bgcolor: 'background.paper' }}
        >
          {fileIcon(f.type)}
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="body2" noWrap fontWeight={600} title={f.name}>
              {f.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {fmtFileSize(f.size)} · {fmtDate(f.uploadedAt)}
              {f.sample ? ' · sample' : ''}
            </Typography>
          </Box>
          <Tooltip title="Preview">
            <IconButton size="small" onClick={() => run(openFile, f)}>
              <VisibilityOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Download">
            <IconButton size="small" onClick={() => run(downloadFile, f)}>
              <DownloadOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          {onRemove && (
            <Tooltip title="Remove">
              <IconButton size="small" color="error" onClick={() => onRemove(f)}>
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Stack>
      ))}
    </Stack>
  );
}

/** Drag & drop uploader. Files go to IndexedDB immediately; value = array of metadata. */
export function FileUploader({ value = [], onChange, multiple = true, accept = DOC_ACCEPT, hint, error, compact }) {
  const inputRef = useRef(null);
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const { enqueueSnackbar } = useSnackbar();

  const handleFiles = async (fileList) => {
    const files = [...fileList];
    const tooBig = files.filter((f) => f.size > MAX_FILE_MB * 1024 * 1024);
    if (tooBig.length) enqueueSnackbar(`Skipped files over ${MAX_FILE_MB} MB: ${tooBig.map((f) => f.name).join(', ')}`, { variant: 'warning' });
    const ok = files.filter((f) => f.size <= MAX_FILE_MB * 1024 * 1024);
    if (!ok.length) return;
    setBusy(true);
    try {
      const metas = await Promise.all(ok.map(saveFile));
      onChange(multiple ? [...value, ...metas] : metas.slice(0, 1));
    } catch (e) {
      enqueueSnackbar(`Upload failed: ${e.message}`, { variant: 'error' });
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <Stack spacing={1.5}>
      <Box
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          handleFiles(e.dataTransfer.files);
        }}
        sx={(t) => ({
          cursor: 'pointer',
          textAlign: 'center',
          py: compact ? 1.5 : 3,
          px: 2,
          borderRadius: 2,
          border: '1.5px dashed',
          borderColor: error ? 'error.main' : drag ? 'secondary.main' : alpha(t.palette.text.secondary, 0.35),
          bgcolor: drag ? alpha(t.palette.secondary.main, 0.08) : alpha(t.palette.primary.main, 0.02),
          transition: 'all .15s',
          '&:hover, &:focus-visible': { borderColor: 'secondary.main', bgcolor: alpha(t.palette.secondary.main, 0.05), outline: 'none' },
        })}
      >
        <input ref={inputRef} type="file" hidden multiple={multiple} accept={accept} onChange={(e) => handleFiles(e.target.files)} />
        <Stack direction={compact ? 'row' : 'column'} spacing={compact ? 1 : 0.5} alignItems="center" justifyContent="center">
          <CloudUploadOutlinedIcon color="secondary" fontSize={compact ? 'small' : 'large'} />
          <Typography variant="body2" fontWeight={600}>
            Drag & drop {multiple ? 'files' : 'a file'} here or <Box component="span" sx={{ color: 'secondary.main' }}>browse</Box>
          </Typography>
          {!compact && (
            <Typography variant="caption" color="text.secondary">
              {hint || `PDF, images, Word or Excel · up to ${MAX_FILE_MB} MB each`}
            </Typography>
          )}
        </Stack>
      </Box>
      {busy && <LinearProgress color="secondary" />}
      {error && <FormHelperText error>{error}</FormHelperText>}
      {value.length > 0 && <FileList files={value} dense={compact} onRemove={(f) => onChange(value.filter((x) => x.id !== f.id))} />}
    </Stack>
  );
}

export function RHFFileUploader({ name, ...props }) {
  const { control, formState } = useFormContext();
  const err = name.split('.').reduce((acc, k) => acc?.[k], formState.errors);
  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => <FileUploader value={field.value || []} onChange={field.onChange} error={err?.message || err?.root?.message} {...props} />}
    />
  );
}
