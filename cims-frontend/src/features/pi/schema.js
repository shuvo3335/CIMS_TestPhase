import { z } from 'zod';
import { reqStr, reqNum, reqDate, fileList } from '@/components/form/zodHelpers';

export const piSchema = z
  .object({
    contractId: reqStr('Sales contract'),
    piNo: reqStr('PI No', 60),
    lcType: z.enum(['SIGHT', 'USANCE'], { required_error: 'LC type is required', invalid_type_error: 'LC type is required' }),
    spiDate: reqDate('SPI date'),
    spiValidity: reqDate('SPI validity'),
    unitPrice: reqNum('SPI unit price'),
    pol: reqStr('Port of loading'),
    pod: reqStr('Port of discharge'),
    files: fileList,
    spis: z
      .array(
        z.object({
          id: z.string().optional(),
          lcId: z.string().nullable().optional(),
          spiNo: reqStr('SPI No', 60),
          qty: reqNum('SPI qty'),
        }),
      )
      .min(1, 'Add at least one SPI'),
  })
  .superRefine((v, ctx) => {
    if (v.spiDate && v.spiValidity && v.spiValidity < v.spiDate) {
      ctx.addIssue({ path: ['spiValidity'], code: 'custom', message: 'Validity must be on or after SPI date' });
    }
    const seen = new Map();
    v.spis.forEach((s, i) => {
      const k = s.spiNo?.trim().toLowerCase();
      if (!k) return;
      if (seen.has(k)) ctx.addIssue({ path: ['spis', i, 'spiNo'], code: 'custom', message: 'Duplicate SPI No' });
      seen.set(k, i);
    });
  });

export const piDefaults = {
  contractId: '',
  piNo: '',
  lcType: '',
  spiDate: new Date().toISOString().slice(0, 10),
  spiValidity: '',
  unitPrice: '',
  pol: '',
  pod: '',
  files: [],
  spis: [{ spiNo: '', qty: '' }],
};

export const toFormValues = (pi) => ({
  contractId: pi.contractId,
  piNo: pi.piNo,
  lcType: pi.lcType,
  spiDate: pi.spiDate,
  spiValidity: pi.spiValidity,
  unitPrice: String(pi.unitPrice),
  pol: pi.pol,
  pod: pi.pod,
  files: pi.files || [],
  spis: pi.spis.map((s) => ({ id: s.id, lcId: s.lcId, spiNo: s.spiNo, qty: String(s.qty) })),
});
