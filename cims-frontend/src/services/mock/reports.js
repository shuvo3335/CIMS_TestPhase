import { repos, delay, ApiError } from './core';
import { sumBy, calcLcPending, latestLcValue } from '@/utils/calc';

/**
 * Joins Shipment × Contract × PI × LC into vessel-wise report rows
 * (one row per vessel + contract). The backend will expose the same shape.
 */
function buildContractRow(shipment, sc) {
  const c = repos.contracts.find(sc.contractId) || {};
  const pi = repos.pis.filter((p) => p.contractId === sc.contractId)[0];
  const lcs = repos.lcs.filter((l) => l.contractId === sc.contractId);
  const lcDoneQty = sumBy(lcs, 'doneQty');
  const blQty = sumBy(sc.spiDocs || [], 'blQty');

  const spiRows = (pi?.spis || []).map((spi) => {
    const lc = lcs.find((l) => l.spiId === spi.id);
    const doc = (sc.spiDocs || []).find((d) => d.spiId === spi.id) || {};
    return {
      spiId: spi.id,
      spiNo: spi.spiNo,
      spiQty: spi.qty,
      spiAmount: spi.amount,
      lcNo: lc?.lcNo ?? null,
      lcBank: lc?.bank ?? null,
      lcType: lc?.lcType ?? null,
      lcDoneQty: lc?.doneQty ?? null,
      lcValue: lc ? latestLcValue(lc) : null,
      lcCurrency: lc?.currency ?? c.currency,
      lcExpiry: lc?.expiryDate ?? null,
      amendments: lc?.amendments?.length ?? 0,
      insuranceCoverNoteNo: lc?.insuranceCoverNoteNo ?? null,
      blNo: doc.blNo || null,
      blDate: doc.blDate || null,
      blQty: doc.blQty ?? null,
      ciNo: doc.ciNo || null,
      ciDate: doc.ciDate || null,
      ciAmount: doc.ciAmount ?? null,
    };
  });

  return {
    id: `${shipment.id}:${sc.contractId}`,
    shipmentId: shipment.id,
    contractId: sc.contractId,
    vesselName: shipment.vesselName,
    imoNo: shipment.imoNo,
    vesselStatus: shipment.status,
    contractNo: c.contractNo,
    commodity: c.commodity,
    origin: c.origin,
    unit: c.unit,
    currency: c.currency,
    shipmentFrom: c.shipmentFrom,
    shipmentTo: c.shipmentTo,
    eta: shipment.eta,
    etc: shipment.etc,
    spd: shipment.spd,
    sld: shipment.sld,
    lcNos: lcs.map((l) => l.lcNo).filter(Boolean),
    blNos: (sc.spiDocs || []).map((d) => d.blNo).filter(Boolean),
    contractQty: c.totalQty,
    blQty,
    lcDoneQty,
    lcPendingQty: calcLcPending(c.totalQty, lcDoneQty),
    loi: sc.loi,
    loiDate: sc.loiDate,
    docPaymentAcceptance: sc.docPaymentAcceptance,
    docPaymentDate: sc.docPaymentDate,
    dutyPaidQty: sc.dutyPaidQty,
    dischargePermissionQty: sc.dischargePermissionQty,
    remarks: sc.remarks,
    pol: pi?.pol,
    pod: pi?.pod,
    spiRows,
  };
}

/** Row for a contract that is not on any vessel yet; vessel/ETA/ETC/SPD/SLD/BL stay empty until assigned. */
function buildUnassignedRow(c) {
  const lcs = repos.lcs.filter((l) => l.contractId === c.id);
  const pi = repos.pis.filter((p) => p.contractId === c.id)[0];
  const lcDoneQty = sumBy(lcs, 'doneQty');
  return {
    id: `unassigned:${c.id}`,
    shipmentId: null,
    contractId: c.id,
    vesselName: null,
    imoNo: null,
    vesselStatus: null,
    contractNo: c.contractNo,
    commodity: c.commodity,
    origin: c.origin,
    unit: c.unit,
    currency: c.currency,
    shipmentFrom: c.shipmentFrom,
    shipmentTo: c.shipmentTo,
    eta: null,
    etc: null,
    spd: null,
    sld: null,
    lcNos: lcs.map((l) => l.lcNo).filter(Boolean),
    blNos: [],
    contractQty: c.totalQty,
    blQty: 0,
    lcDoneQty,
    lcPendingQty: calcLcPending(c.totalQty, lcDoneQty),
    loi: null,
    loiDate: null,
    docPaymentAcceptance: null,
    docPaymentDate: null,
    dutyPaidQty: null,
    dischargePermissionQty: null,
    remarks: c.remarks,
    pol: pi?.pol,
    pod: pi?.pod,
    spiRows: [],
  };
}

export const reports = {
  async vesselRows() {
    await delay();
    const shipments = repos.shipments.all();
    const assigned = new Set(shipments.flatMap((s) => (s.contracts || []).map((sc) => sc.contractId)));
    const unassigned = repos.contracts.all().filter((c) => !assigned.has(c.id)).map(buildUnassignedRow);
    return [...shipments.flatMap((s) => (s.contracts || []).map((sc) => buildContractRow(s, sc))), ...unassigned];
  },
  async vesselDetail(shipmentId) {
    await delay(150);
    const s = repos.shipments.find(shipmentId);
    if (!s) throw new ApiError('Vessel not found', 404);
    return { shipment: s, rows: (s.contracts || []).map((sc) => buildContractRow(s, sc)) };
  },
};
