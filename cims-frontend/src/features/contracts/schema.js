import { z } from 'zod';
import { reqStr, optStr, reqNum, optNum, reqDate, fileList } from '@/components/form/zodHelpers';

export const contractSchema = z
  .object({
    contractNo: reqStr('Contract No', 60),
    date: reqDate('Contract date'),
    buyer: reqStr('Buyer name'),
    seller: reqStr('Seller name'),
    incoterms: reqStr('Incoterms', 10),
    commodity: reqStr('Commodity name').transform((s) => s.toUpperCase()),
    origin: reqStr('Origin'),
    totalQty: reqNum('Total quantity'),
    unit: reqStr('Unit', 10),
    unitPrice: reqNum('Unit price'),
    currency: reqStr('Currency', 5),
    packaging: z.enum(['BULK', 'CONTAINER'], { required_error: 'Packaging is required' }),
    perContainerQty: optNum('Per container qty'),
    shipmentFrom: reqDate('Shipment from'),
    shipmentTo: reqDate('Shipment to'),
    status: z.enum(['ACTIVE', 'CLOSED']),
    remarks: optStr(),
    files: fileList,
  })
  .superRefine((v, ctx) => {
    if (v.packaging === 'CONTAINER' && !(v.perContainerQty > 0)) {
      ctx.addIssue({ path: ['perContainerQty'], code: 'custom', message: 'Per container qty is required for container shipments' });
    }
    if (v.shipmentFrom && v.shipmentTo && v.shipmentTo < v.shipmentFrom) {
      ctx.addIssue({ path: ['shipmentTo'], code: 'custom', message: 'Shipment To must be on or after Shipment From' });
    }
  });

export const contractDefaults = {
  contractNo: '',
  date: new Date().toISOString().slice(0, 10),
  buyer: '',
  seller: '',
  incoterms: 'CFR',
  commodity: '',
  origin: '',
  totalQty: '',
  unit: 'MT',
  unitPrice: '',
  currency: 'USD',
  packaging: 'BULK',
  perContainerQty: '',
  shipmentFrom: '',
  shipmentTo: '',
  status: 'ACTIVE',
  remarks: '',
  files: [],
};

/** Map an API record onto form values (numbers → strings for inputs, nulls → ''). */
export const toFormValues = (c) =>
  Object.fromEntries(Object.keys(contractDefaults).map((k) => [k, c[k] === null || c[k] === undefined ? contractDefaults[k] : k === 'files' ? c[k] : typeof c[k] === 'number' ? String(c[k]) : c[k]]));
