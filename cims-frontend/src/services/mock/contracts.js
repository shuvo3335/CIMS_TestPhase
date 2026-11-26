import { repos, delay, ApiError, eqi, assertCan } from './core';
import { calcTotalPrice, toNum } from '@/utils/calc';
import { useAuthStore } from '@/store/authStore';

const findPi = (contractId) => repos.pis.filter((p) => p.contractId === contractId)[0];
const findShipment = (contractId) =>
  repos.shipments.filter((s) => (s.contracts || []).some((c) => c.contractId === contractId))[0];

const enrich = (c) => {
  const pi = findPi(c.id);
  const sh = findShipment(c.id);
  return {
    ...c,
    piId: pi?.id ?? null,
    piNo: pi?.piNo ?? null,
    spiCount: pi?.spis?.length ?? 0,
    shipmentId: sh?.id ?? null,
    vesselName: sh?.vesselName ?? null,
  };
};

function normalize(data) {
  const out = { ...data, totalQty: toNum(data.totalQty), unitPrice: toNum(data.unitPrice) };
  out.totalPrice = calcTotalPrice(out.totalQty, out.unitPrice);
  out.perContainerQty = out.packaging === 'CONTAINER' ? toNum(data.perContainerQty) : null;
  return out;
}

function assertUnique(contractNo, exceptId) {
  if (repos.contracts.filter((c) => c.id !== exceptId && eqi(c.contractNo, contractNo)).length) {
    throw new ApiError(`Contract No "${contractNo}" already exists`, 409, 'contractNo');
  }
}

export const contracts = {
  async list() {
    await delay();
    return repos.contracts.all().map(enrich);
  },
  async get(id) {
    await delay(150);
    const c = repos.contracts.find(id);
    if (!c) throw new ApiError('Sales contract not found', 404);
    return enrich(c);
  },
  async create(data) {
    assertCan('sales_contract', 'create');
    await delay();
    assertUnique(data.contractNo);
    const user = useAuthStore.getState().user;
    return enrich(repos.contracts.insert({ ...normalize(data), createdById: user?.id ?? null, createdByName: user?.name ?? null }));
  },
  async update(id, data) {
    assertCan('sales_contract', 'edit');
    await delay();
    const current = repos.contracts.find(id);
    if (!current) throw new ApiError('Sales contract not found', 404);
    assertUnique(data.contractNo, id);
    const next = normalize(data);
    if (findPi(id) && toNum(current.totalQty) !== next.totalQty) {
      throw new ApiError(
        'Total quantity cannot change after a PI has been opened. Delete or adjust the PI first.',
        409,
        'totalQty',
      );
    }
    return enrich(repos.contracts.update(id, next));
  },
  async remove(id) {
    assertCan('sales_contract', 'delete');
    await delay();
    if (findPi(id)) throw new ApiError('This contract has a PI. Delete the PI first.', 409);
    if (findShipment(id)) throw new ApiError('This contract is linked to a vessel/shipment. Remove it there first.', 409);
    repos.contracts.remove(id);
  },
};
