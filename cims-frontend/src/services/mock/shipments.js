import { repos, delay, ApiError, eqi, assertCan } from './core';
import { toNum, sumBy } from '@/utils/calc';

const enrich = (s) => ({
  ...s,
  contracts: (s.contracts || []).map((sc) => {
    const c = repos.contracts.find(sc.contractId) || {};
    return { ...sc, contractNo: c.contractNo, commodity: c.commodity, contractQty: c.totalQty, unit: c.unit };
  }),
  contractNos: (s.contracts || []).map((sc) => repos.contracts.find(sc.contractId)?.contractNo).filter(Boolean),
  commodities: [
    ...new Set((s.contracts || []).map((sc) => repos.contracts.find(sc.contractId)?.commodity).filter(Boolean)),
  ],
  totalBlQty: sumBy(s.contracts || [], (sc) => sumBy(sc.spiDocs || [], 'blQty')),
});

function validate(data, exceptId) {
  if (!data.contracts?.length) throw new ApiError('Add at least one contract to this vessel');
  const ids = data.contracts.map((c) => c.contractId);
  if (new Set(ids).size !== ids.length) throw new ApiError('The same contract is added twice');
  ids.forEach((cid) => {
    const other = repos.shipments.filter((s) => s.id !== exceptId && (s.contracts || []).some((c) => c.contractId === cid))[0];
    if (other) {
      const c = repos.contracts.find(cid);
      throw new ApiError(`Contract ${c?.contractNo} is already assigned to vessel ${other.vesselName}`, 409);
    }
  });
  if (data.imoNo && repos.shipments.filter((s) => s.id !== exceptId && eqi(s.imoNo, data.imoNo) && eqi(s.vesselName, data.vesselName) && s.status !== 'Discharged').length) {
    throw new ApiError(`An active shipment for vessel ${data.vesselName} (IMO ${data.imoNo}) already exists`, 409);
  }
  data.contracts.forEach((sc) => {
    const c = repos.contracts.find(sc.contractId);
    const bl = sumBy(sc.spiDocs || [], 'blQty');
    if (toNum(sc.dutyPaidQty) > bl + 1e-9) throw new ApiError(`${c?.contractNo}: Duty paid qty exceeds total BL qty`);
    if (toNum(sc.dischargePermissionQty) > bl + 1e-9) {
      throw new ApiError(`${c?.contractNo}: Discharge permission qty exceeds total BL qty`);
    }
  });
}

const normalize = (data) => ({
  ...data,
  demurrageRate: data.demurrageRate === '' || data.demurrageRate == null ? null : toNum(data.demurrageRate),
  contracts: data.contracts.map((sc) => ({
    contractId: sc.contractId,
    loi: sc.loi,
    loiDate: sc.loiDate || null,
    docPaymentAcceptance: sc.docPaymentAcceptance,
    docPaymentDate: sc.docPaymentDate || null,
    dutyPaidQty: sc.dutyPaidQty === '' || sc.dutyPaidQty == null ? null : toNum(sc.dutyPaidQty),
    dischargePermissionQty:
      sc.dischargePermissionQty === '' || sc.dischargePermissionQty == null ? null : toNum(sc.dischargePermissionQty),
    remarks: sc.remarks || '',
    spiDocs: (sc.spiDocs || []).map((d) => ({
      spiId: d.spiId,
      blNo: d.blNo || '',
      blDate: d.blDate || null,
      blQty: d.blQty === '' || d.blQty == null ? null : toNum(d.blQty),
      ciNo: d.ciNo || '',
      ciDate: d.ciDate || null,
      ciAmount: d.ciAmount === '' || d.ciAmount == null ? null : toNum(d.ciAmount),
    })),
  })),
});

export const shipments = {
  async list() {
    await delay();
    return repos.shipments.all().map(enrich);
  },
  async get(id) {
    await delay(150);
    const s = repos.shipments.find(id);
    if (!s) throw new ApiError('Shipment not found', 404);
    return enrich(s);
  },
  async create(data) {
    assertCan('shipment', 'create');
    await delay();
    validate(data);
    return enrich(repos.shipments.insert(normalize(data)));
  },
  async update(id, data) {
    assertCan('shipment', 'edit');
    await delay();
    if (!repos.shipments.find(id)) throw new ApiError('Shipment not found', 404);
    validate(data, id);
    return enrich(repos.shipments.update(id, normalize(data)));
  },
  async remove(id) {
    assertCan('shipment', 'delete');
    await delay();
    repos.shipments.remove(id);
  },
};
