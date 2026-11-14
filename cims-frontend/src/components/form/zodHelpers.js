import { z } from 'zod';

/** '' / null / undefined → undefined (so "required" fires); anything else → Number (NaN fails as "must be a number"). */
const toNumberOrUndef = (v) => (v === '' || v === null || v === undefined ? undefined : Number(v));

/** Required positive number from a text input. */
export const reqNum = (label, { min = 0, allowZero = false } = {}) =>
  z.preprocess(
    toNumberOrUndef,
    z
      .number({ required_error: `${label} is required`, invalid_type_error: `${label} must be a number` })
      .refine((n) => (allowZero ? n >= min : n > min), { message: `${label} must be greater than ${min}` }),
  );

/** Optional non-negative number. */
export const optNum = (label) =>
  z.preprocess(
    toNumberOrUndef,
    z.number({ invalid_type_error: `${label} must be a number` }).min(0, `${label} cannot be negative`).optional(),
  );

export const reqStr = (label, max = 200) =>
  z.string({ required_error: `${label} is required` }).trim().min(1, `${label} is required`).max(max, `Max ${max} characters`);

export const optStr = (max = 1000) => z.string().trim().max(max).optional().or(z.literal(''));

export const reqDate = (label) => z.string({ required_error: `${label} is required` }).min(1, `${label} is required`);
export const optDate = () => z.string().optional().nullable().or(z.literal(''));

export const fileMeta = z.object({
  id: z.string(),
  name: z.string(),
  size: z.number().optional(),
  type: z.string().optional(),
  uploadedAt: z.string().optional(),
  sample: z.boolean().optional(),
});
export const fileList = z.array(fileMeta).default([]);
