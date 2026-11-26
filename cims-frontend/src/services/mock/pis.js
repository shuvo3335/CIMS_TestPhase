import { repos, delay, ApiError, eqi, assertCan } from './core';
import { uid } from '../storage';
import { settings } from './lookups';
import { calcSpiAmount, checkSpiTotal, toNum, sumBy } from '@/utils/calc';
import { fmtQty } from '@/utils/format';

const enrich = (pi) => {
  const c = repos.contracts.find(pi.contractId) || {};
  const lcs = repos.lcs.filter((l) => l.piId === pi.id);
  return {
    ...pi,
    contractNo: c.contractNo,
    buyer: c.buyer,
    seller: c.seller,
    commodity: c.commodity,
    origin: c.origin,
    contractQty: c.totalQty,
    unit: c.unit,
    currency: c.currency,
    totalSpiQty: sumBy(pi.spis, 'qty'),
    totalSpiAmount: sumBy(pi.spis, 'amount'),
    lcCount: lcs.length,
    spis: (pi.spis || []).map((s) => {
      const lc = lcs.find((l) => l.spiId === s.id);
      return { ...s, lcId: lc?.id ?? null, lcNo: lc?.lcNo ?? null };
    }),
  };
};

function validate(data, existingId) {
  const contract = repos.contracts.find(data.contractId);
  if (!contract) throw new ApiError('Please select a valid sales contract', 400, 'contractId');

  const other = repos.pis.filter((p) => p.contractId === data.contractId && p.id !== existingId);
  if (other.length) throw new ApiError(`Contract ${contract.contractNo} already has a PI (${other[0].piNo})`, 409, 'contractId');
  if (!existingId && contract.status !== 'ACTIVE') {
    throw new ApiError('Only active / running contracts can have a new PI', 400, 'contractId');
  }
  if (repos.pis.filter((p) => p.id !== existingId && eqi(p.piNo, data.piNo)).length) {
    throw new ApiError(`PI No "${data.piNo}" already exists`, 409, 'piNo');
  }

  const spis = data.spis || [];
  if (!spis.length) throw new ApiError('Add at least one SPI');
  const nos = spis.map((s) => String(s.spiNo).trim().toLowerCase());
  if (new Set(nos).size !== nos.length) throw new ApiError('SPI numbers must be unique within the PI');
  if (spis.some((s) => toNum(s.qty) <= 0)) throw new ApiError('Every SPI quantity must be greater than zero');

  const { spiTolerancePct } = settings.getSync();
  const chk = checkSpiTotal(spis, contract.totalQty, spiTolerancePct);
  if (!chk.ok) {
    throw new ApiError(
      `Total SPI quantity (${fmtQty(chk.total)}) must equal contract quantity (${fmtQty(chk.contractQty)})` +
        (spiTolerancePct ? ` within ±${spiTolerancePct}%` : '') +
        `. Difference: ${fmtQty(chk.diff)}.`,
      422,
    );
  }
  return contract;
}

function normalize(data) {
  const unitPrice = toNum(data.unitPrice);
  return {
    ...data,
    unitPrice,
    spis: data.spis.map((s) => ({
      id: s.id || uid('spi_'),
      spiNo: String(s.spiNo).trim(),
      qty: toNum(s.qty),
      amount: calcSpiAmount(s.qty, unitPrice),
    })),
  };
}

export const pis = {
  async list() {
    await delay();
    return repos.pis.all().map(enrich);
  },
  async get(id) {
    await delay(150);
    const pi = repos.pis.find(id);
    if (!pi) throw new ApiError('PI not found', 404);
    return enrich(pi);
  },
  async create(data) {
    assertCan('pi', 'create');
    await delay();
    validate(data);
    return enrich(repos.pis.insert(normalize(data)));
  },
  async update(id, data) {
    assertCan('pi', 'edit');
    await delay();
    const current = repos.pis.find(id);
    if (!current) throw new ApiError('PI not found', 404);
    const lcs = repos.lcs.filter((l) => l.piId === id);
    if (lcs.length && data.contractId !== current.contractId) {
      throw new ApiError('Contract cannot change once LCs are opened against this PI', 409, 'contractId');
    }
    const keptIds = new Set((data.spis || []).map((s) => s.id).filter(Boolean));
    const removedWithLc = lcs.filter((l) => !keptIds.has(l.spiId));
    if (removedWithLc.length) {
      const spi = current.spis.find((s) => s.id === removedWithLc[0].spiId);
      throw new ApiError(`SPI ${spi?.spiNo} has LC ${removedWithLc[0].lcNo} and cannot be removed`, 409);
    }
    validate(data, id);
    return enrich(repos.pis.update(id, normalize(data)));
  },
  async remove(id) {
    assertCan('pi', 'delete');
    await delay();
    const lcs = repos.lcs.filter((l) => l.piId === id);
    if (lcs.length) throw new ApiError(`This PI has ${lcs.length} LC(s). Delete those LCs first.`, 409);
    repos.pis.remove(id);
  },
};
