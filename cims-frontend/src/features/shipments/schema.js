import { z } from 'zod';
import { reqStr, optStr, optNum, reqDate, optDate, fileList } from '@/components/form/zodHelpers';
import { sumBy } from '@/utils/calc';

const spiDoc = z.object({
  spiId: z.string(),
  blNo: optStr(60),
  blDate: optDate(),
  blQty: optNum('BL qty'),
  ciNo: optStr(60),
  ciDate: optDate(),
  ciAmount: optNum('CI amount'),
});

const shipmentContract = z
  .object({
    contractId: reqStr('Contract'),
    loi: z.enum(['PENDING', 'YES', 'NO']),
    loiDate: optDate(),
    docPaymentAcceptance: z.enum(['PENDING', 'ACCEPTED', 'PAID']),
    docPaymentDate: optDate(),
    dutyPaidQty: optNum('Duty paid qty'),
    dischargePermissionQty: optNum('Discharge permission qty'),
    remarks: optStr(1000),
    spiDocs: z.array(spiDoc).default([]),
  })
  .superRefine((v, ctx) => {
    const bl = sumBy(v.spiDocs, 'blQty');
    if ((v.dutyPaidQty ?? 0) > bl + 1e-9) ctx.addIssue({ path: ['dutyPaidQty'], code: 'custom', message: 'Cannot exceed total BL qty' });
    if ((v.dischargePermissionQty ?? 0) > bl + 1e-9) {
      ctx.addIssue({ path: ['dischargePermissionQty'], code: 'custom', message: 'Cannot exceed total BL qty' });
    }
  });

export const shipmentSchema = z
  .object({
    vesselName: reqStr('Vessel name', 100).transform((s) => s.toUpperCase()),
    vesselType: reqStr('Vessel type'),
    imoNo: z.string().trim().regex(/^\d{7}$/, 'IMO number must be exactly 7 digits'),
    flag: reqStr('Flag'),
    portOfRegistry: reqStr('Port of registry'),
    holdHatch: optStr(30),
    demurrageRate: optNum('Demurrage rate'),
    status: reqStr('Vessel status'),
    eta: reqDate('Estimated arrival date'),
    etd: optDate(),
    nominationFiles: fileList,
    contracts: z.array(shipmentContract).min(1, 'Add at least one contract to this vessel'),
  })
  .superRefine((v, ctx) => {
    const seen = new Set();
    v.contracts.forEach((c, i) => {
      if (c.contractId && seen.has(c.contractId)) ctx.addIssue({ path: ['contracts', i, 'contractId'], code: 'custom', message: 'Contract added twice' });
      seen.add(c.contractId);
    });
  });

export const emptyShipmentContract = () => ({
  contractId: '',
  loi: 'PENDING',
  loiDate: '',
  docPaymentAcceptance: 'PENDING',
  docPaymentDate: '',
  dutyPaidQty: '',
  dischargePermissionQty: '',
  remarks: '',
  spiDocs: [],
});

export const shipmentDefaults = {
  vesselName: '',
  vesselType: '',
  imoNo: '',
  flag: '',
  portOfRegistry: '',
  holdHatch: '',
  demurrageRate: '',
  status: 'Not Start Yet',
  eta: '',
  etd: '',
  nominationFiles: [],
  contracts: [emptyShipmentContract()],
};

const s = (v) => (v === null || v === undefined ? '' : String(v));

export const emptySpiDoc = (spiId) => ({ spiId, blNo: '', blDate: '', blQty: '', ciNo: '', ciDate: '', ciAmount: '' });

/** Builds SPI doc rows aligned to the PI's current SPIs, keeping any saved BL/CI data. */
export const alignSpiDocs = (pi, saved = []) =>
  (pi?.spis || []).map((spi) => {
    const d = saved.find((x) => x.spiId === spi.id);
    return d
      ? { spiId: spi.id, blNo: d.blNo ?? '', blDate: d.blDate ?? '', blQty: s(d.blQty), ciNo: d.ciNo ?? '', ciDate: d.ciDate ?? '', ciAmount: s(d.ciAmount) }
      : emptySpiDoc(spi.id);
  });

export const toFormValues = (sh, pis) => ({
  vesselName: sh.vesselName,
  vesselType: sh.vesselType,
  imoNo: sh.imoNo,
  flag: sh.flag,
  portOfRegistry: sh.portOfRegistry,
  holdHatch: sh.holdHatch ?? '',
  demurrageRate: s(sh.demurrageRate),
  status: sh.status,
  eta: sh.eta ?? '',
  etd: sh.etd ?? '',
  nominationFiles: sh.nominationFiles || [],
  contracts: sh.contracts.map((c) => ({
    contractId: c.contractId,
    loi: c.loi || 'PENDING',
    loiDate: c.loiDate ?? '',
    docPaymentAcceptance: c.docPaymentAcceptance || 'PENDING',
    docPaymentDate: c.docPaymentDate ?? '',
    dutyPaidQty: s(c.dutyPaidQty),
    dischargePermissionQty: s(c.dischargePermissionQty),
    remarks: c.remarks ?? '',
    spiDocs: alignSpiDocs(pis.find((p) => p.contractId === c.contractId), c.spiDocs),
  })),
});
