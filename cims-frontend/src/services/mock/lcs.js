import { repos, delay, ApiError, eqi } from './core';
import { toNum } from '@/utils/calc';
import { fmtQty } from '@/utils/format';

const enrich = (lc) => {
  const c = repos.contracts.find(lc.contractId) || {};
  const pi = repos.pis.find(lc.piId) || {};
  const spi = (pi.spis || []).find((s) => s.id === lc.spiId) || {};
  return {
    ...lc,
    contractNo: c.contractNo,
    buyer: c.buyer,
    seller: c.seller,
    commodity: c.commodity,
    unit: c.unit,
    piNo: pi.piNo,
    spiNo: spi.spiNo,
    spiQty: spi.qty,
    spiAmount: spi.amount,
  };
};

function resolveSpi(contractId, spiId) {
  const pi = repos.pis.filter((p) => p.contractId === contractId)[0];
  if (!pi) throw new ApiError('Selected contract has no PI. Open the PI first.', 400, 'contractId');
  const spi = pi.spis.find((s) => s.id === spiId);
  if (!spi) throw new ApiError('Selected SPI does not belong to this contract', 400);
  return { pi, spi };
}

function validateLc(header, item, exceptId) {
  if (!header.contractId) throw new ApiError('Please select a sales contract', 400, 'contractId');
  if (header.lcType === 'USANCE' && toNum(header.paymentDurationDays) <= 0) {
    throw new ApiError('Payment duration is required for Usance LC', 400, 'paymentDurationDays');
  }
  const { pi, spi } = resolveSpi(header.contractId, item.spiId);
  const taken = repos.lcs.filter((l) => l.spiId === item.spiId && l.id !== exceptId)[0];
  if (taken) throw new ApiError(`SPI ${spi.spiNo} already has LC ${taken.lcNo}. One LC per SPI.`, 409);
  if (repos.lcs.filter((l) => l.id !== exceptId && eqi(l.lcNo, item.lcNo)).length) {
    throw new ApiError(`LC No "${item.lcNo}" already exists`, 409);
  }
  if (item.issueDate && item.expiryDate && item.expiryDate <= item.issueDate) {
    throw new ApiError(`LC ${item.lcNo}: expiry date must be after issue date`);
  }
  if (toNum(item.doneQty) > toNum(spi.qty)) {
    throw new ApiError(`LC ${item.lcNo}: done qty (${fmtQty(item.doneQty)}) exceeds SPI ${spi.spiNo} qty (${fmtQty(spi.qty)})`);
  }
  (item.amendments || []).forEach((a, i) => {
    if (!a.files?.length) throw new ApiError(`LC ${item.lcNo}: amendment #${i + 1} requires an amendment file`);
  });
  return { pi, spi };
}

function build(header, item, pi) {
  return {
    contractId: header.contractId,
    lcType: header.lcType,
    paymentDurationDays: header.lcType ? toNum(header.paymentDurationDays) || null : null,
    bank: header.bank,
    piId: pi.id,
    spiId: item.spiId,
    lcNo: String(item.lcNo).trim(),
    issueDate: item.issueDate,
    expiryDate: item.expiryDate,
    doneQty: toNum(item.doneQty),
    amount: toNum(item.amount),
    currency: item.currency,
    insuranceCoverNoteNo: item.insuranceCoverNoteNo,
    files: item.files || [],
    amendments: (item.amendments || []).map((a, i) => ({ ...a, seq: i + 1, value: toNum(a.value) })),
  };
}

export const lcs = {
  async list() {
    await delay();
    return repos.lcs.all().map(enrich);
  },
  async get(id) {
    await delay(150);
    const lc = repos.lcs.find(id);
    if (!lc) throw new ApiError('LC not found', 404);
    return enrich(lc);
  },
  /** Open several LCs (one per SPI) against one contract in a single save. */
  async createMany(header, items) {
    await delay();
    if (!items?.length) throw new ApiError('Add at least one LC');
    const spiIds = items.map((i) => i.spiId);
    if (new Set(spiIds).size !== spiIds.length) throw new ApiError('Each LC must be for a different SPI');
    const lcNos = items.map((i) => String(i.lcNo).trim().toLowerCase());
    if (new Set(lcNos).size !== lcNos.length) throw new ApiError('LC numbers must be unique');
    const rows = items.map((item) => {
      const { pi } = validateLc(header, item);
      return build(header, item, pi);
    });
    return rows.map((r) => enrich(repos.lcs.insert(r)));
  },
  async update(id, header, item) {
    await delay();
    if (!repos.lcs.find(id)) throw new ApiError('LC not found', 404);
    const { pi } = validateLc(header, item, id);
    return enrich(repos.lcs.update(id, build(header, item, pi)));
  },
  async remove(id) {
    await delay();
    repos.lcs.remove(id);
  },
};
