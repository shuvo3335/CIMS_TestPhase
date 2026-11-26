import { Controller, useFormContext } from 'react-hook-form';
import { TextField, MenuItem, InputAdornment, Autocomplete } from '@mui/material';

const getError = (errors, name) => name.split('.').reduce((acc, k) => acc?.[k], errors);

/**
 * Text / number / date / select field bound to the surrounding <FormProvider>.
 * Pass `options` ([{value,label}] or [string]) to render a select.
 */
export function RHFText({ name, label, options, type = 'text', required, startAdornment, endAdornment, helperText, onValueChange, slotProps, ...rest }) {
  const { control, formState } = useFormContext();
  const err = getError(formState.errors, name);
  const isDate = type === 'date';
  const opts = options?.map((o) => (typeof o === 'string' ? { value: o, label: o } : o));

  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <TextField
          {...field}
          value={field.value ?? ''}
          onChange={(e) => {
            field.onChange(e.target.value);
            onValueChange?.(e.target.value);
          }}
          label={label}
          type={opts ? undefined : type}
          select={!!opts}
          required={required}
          error={!!err}
          helperText={err?.message || helperText}
          onWheel={type === 'number' ? (e) => e.target.blur() : undefined}
          slotProps={{
            ...slotProps,
            inputLabel: { shrink: isDate || undefined, ...slotProps?.inputLabel },
            input: {
              startAdornment: startAdornment ? <InputAdornment position="start">{startAdornment}</InputAdornment> : undefined,
              endAdornment: endAdornment ? <InputAdornment position="end">{endAdornment}</InputAdornment> : undefined,
              ...slotProps?.input,
            },
            htmlInput: { ...(type === 'number' ? { step: 'any', min: 0 } : {}), ...slotProps?.htmlInput },
          }}
          {...rest}
        >
          {opts?.map((o) => (
            <MenuItem key={o.value} value={o.value} disabled={o.disabled}>
              {o.label}
            </MenuItem>
          ))}
        </TextField>
      )}
    />
  );
}

/** Searchable select (Autocomplete) storing just the option value. */
export function RHFAutocomplete({ name, label, options, required, disabled, onValueChange, helperText, getOptionDisabled, onCreate }) {
  const { control, formState } = useFormContext();
  const err = getError(formState.errors, name);
  const opts = options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o));

  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <Autocomplete
          options={opts}
          disabled={disabled}
          // With onCreate, a just-added value can briefly be missing from `options` while the list refreshes.
          value={opts.find((o) => o.value === field.value) || (onCreate && field.value ? { value: field.value, label: field.value } : null)}
          filterOptions={
            onCreate
              ? (all, state) => {
                  const typed = state.inputValue.trim();
                  const matches = all.filter((o) => o.label.toLowerCase().includes(typed.toLowerCase()));
                  const exact = all.some((o) => o.label.toLowerCase() === typed.toLowerCase());
                  return typed && !exact ? [...matches, { value: typed, label: `Add "${typed}"`, isNew: true }] : matches;
                }
              : undefined
          }
          onChange={async (_, o) => {
            if (o?.isNew) {
              const name = o.value;
              try {
                await onCreate(name);
              } catch {
                return; // creation failed; leave the field unchanged
              }
              field.onChange(name);
              onValueChange?.(name);
              return;
            }
            field.onChange(o?.value ?? '');
            onValueChange?.(o?.value ?? '');
          }}
          onBlur={field.onBlur}
          getOptionLabel={(o) => o.label}
          getOptionDisabled={getOptionDisabled}
          isOptionEqualToValue={(a, b) => a.value === b.value}
          renderOption={(props, o) => (
            <li {...props} key={o.value}>
              {o.render ?? o.label}
            </li>
          )}
          renderInput={(params) => (
            <TextField {...params} label={label} required={required} error={!!err} helperText={err?.message || helperText} />
          )}
        />
      )}
    />
  );
}
