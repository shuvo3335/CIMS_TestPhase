import { z } from 'zod';
import { reqStr, optStr, reqNum, optNum, reqDate, fileList } from '@/components/form/zodHelpers';

const amendment = z.object({
  date: reqDate('Amendment date'),
  value: reqNum('Amendment value'),
  remarks: optStr(500),
  files: fileList.refine((f) => f.length > 0, 'Upload the LC amendment file'),
});

const lcItem = z
  .object({
    spiId: reqStr('SPI'),
    lcNo: reqStr('LC number', 60),
    issueDate: reqDate('LC issue date'),
    expiryDate: reqDate('LC expiry date'),
    doneQty: reqNum('LC done qty'),
    amount: reqNum('LC amount'),
    currency: reqStr('LC currency', 5),
    insuranceCoverNoteNo: reqStr('Insurance cover note no', 60),
    files: fileList,
    amendments: z.array(amendment).default([]),
  })
  .superRefine((v, ctx) => {
    if (v.issueDate && v.expiryDate && v.expiryDate <= v.issueDate) {
      ctx.addIssue({ path: ['expiryDate'], code: 'custom', message: 'Expiry must be after issue date' });
    }
  });

export const lcSchema = z
  .object({
    lcType: z.enum(['SIGHT', 'USANCE'], { errorMap: () => ({ message: 'LC type is required' }) }),
    paymentDurationDays: optNum('Payment duration'),
    bank: reqStr('Bank name'),
    contractId: reqStr('Sales contract'),
    lcs: z.array(lcItem).min(1, 'Add at least one LC'),
  })
  .superRefine((v, ctx) => {
    if (v.lcType === 'USANCE' && !(v.paymentDurationDays > 0)) {
      ctx.addIssue({ path: ['paymentDurationDays'], code: 'custom', message: 'Payment duration is required for Usance LC' });
    }
    const seen = new Set();
    v.lcs.forEach((l, i) => {
      if (l.spiId && seen.has(l.spiId)) ctx.addIssue({ path: ['lcs', i, 'spiId'], code: 'custom', message: 'This SPI is already used in another LC' });
      seen.add(l.spiId);
    });
  });

export const emptyLc = (currency = 'USD') => ({
  spiId: '',
  lcNo: '',
  issueDate: '',
  expiryDate: '',
  doneQty: '',
  amount: '',
  currency,
  insuranceCoverNoteNo: '',
  files: [],
  amendments: [],
});

export const lcDefaults = { lcType: '', paymentDurationDays: '', bank: '', contractId: '', lcs: [] };

const s = (v) => (v === null || v === undefined ? '' : String(v));

export const toFormValues = (lc) => ({
  lcType: lc.lcType,
  paymentDurationDays: s(lc.paymentDurationDays),
  bank: lc.bank,
  contractId: lc.contractId,
  lcs: [
    {
      spiId: lc.spiId,
      lcNo: lc.lcNo,
      issueDate: lc.issueDate,
      expiryDate: lc.expiryDate,
      doneQty: s(lc.doneQty),
      amount: s(lc.amount),
      currency: lc.currency,
      insuranceCoverNoteNo: lc.insuranceCoverNoteNo ?? '',
      files: lc.files || [],
      amendments: (lc.amendments || []).map((a) => ({ date: a.date, value: s(a.value), remarks: a.remarks ?? '', files: a.files || [] })),
    },
  ],
});
