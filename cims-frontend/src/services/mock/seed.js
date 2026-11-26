import { readJSON, writeJSON, clearAll } from '../storage';
import { clearFiles } from '../fileStore';
import { repos } from './core';
import { hashPassword } from './authUsers';
import { calcSpiAmount, calcTotalPrice } from '@/utils/calc';

const SEED_VERSION = 1;

const sampleFile = (name) => ({
  id: `sample_${name.replace(/\W+/g, '_')}`,
  name,
  size: 245_760,
  type: 'application/pdf',
  uploadedAt: '2026-08-20T09:00:00.000Z',
  sample: true,
});

async function seed() {
  repos.users.replaceAll([
    { id: 'u_admin', userId: 'admin', name: 'System Administrator', role: 'ADMIN', active: true, passwordHash: await hashPassword('admin123'), createdAt: new Date().toISOString() },
    { id: 'u_demo', userId: 'user', name: 'Commercial Officer', role: 'USER', active: true, passwordHash: await hashPassword('user123'), createdAt: new Date().toISOString() },
  ]);

  const now = new Date().toISOString();
  const stamp = { createdAt: now, updatedAt: now };

  // ── Contract 1: full chain (PI → 7 SPIs → 7 LCs → vessel) ────────────────
  const c1 = {
    id: 'sc_bw001', contractNo: 'NGI/BW/2026/001', date: '2026-08-10', buyer: 'NGI Foods Ltd.', seller: 'Agro Trade Bulgaria EOOD',
    incoterms: 'CFR', commodity: 'BULGARIAN WHEAT', origin: 'Bulgaria', totalQty: 55000, unit: 'MT', unitPrice: 245, currency: 'USD',
    packaging: 'BULK', perContainerQty: null, shipmentFrom: '2026-09-01', shipmentTo: '2026-09-30', status: 'ACTIVE',
    remarks: 'Milling wheat, protein 12.5% min.', files: [sampleFile('Sales Contract NGI-BW-001.pdf')], ...stamp,
  };
  c1.totalPrice = calcTotalPrice(c1.totalQty, c1.unitPrice);

  const qtys = [8000, 8000, 8000, 8000, 8000, 7500, 7500];
  const pi1 = {
    id: 'pi_bw001', contractId: c1.id, piNo: 'PI-ATB-2026-118', lcType: 'SIGHT', spiDate: '2026-08-20', spiValidity: '2026-10-20',
    unitPrice: 245, pol: 'Varna, Bulgaria', pod: 'Chattogram, Bangladesh', files: [sampleFile('PI-ATB-2026-118.pdf')],
    spis: qtys.map((q, i) => ({ id: `spi_bw_${i + 1}`, spiNo: `PI-ATB-2026-118/${i + 1}`, qty: q, amount: calcSpiAmount(q, 245) })),
    ...stamp,
  };

  const banks = ['Sonali Bank PLC', 'Dutch-Bangla Bank PLC', 'BRAC Bank PLC', 'Eastern Bank PLC', 'City Bank PLC', 'Janata Bank PLC', 'Agrani Bank PLC'];
  const lcs1 = pi1.spis.map((s, i) => ({
    id: `lc_bw_${i + 1}`, contractId: c1.id, piId: pi1.id, spiId: s.id, lcType: 'SIGHT', paymentDurationDays: null, bank: banks[i],
    lcNo: `LC-0526-${String(3401 + i)}`, issueDate: '2026-08-25', expiryDate: '2026-12-31', doneQty: s.qty, amount: s.amount,
    currency: 'USD', insuranceCoverNoteNo: `ICN/2026/${String(7701 + i)}`, files: [sampleFile(`LC-0526-${3401 + i}.pdf`)],
    amendments: i === 0
      ? [{ seq: 1, date: '2026-09-05', value: 1_999_200, remarks: 'Shipment period extended by 10 days', files: [sampleFile('LC-0526-3401 Amendment 1.pdf')] }]
      : [],
    ...stamp,
  }));

  // ── Contract 2: PI opened, LCs partially opened (2 of 3) ─────────────────
  const c2 = {
    id: 'sc_yp002', contractNo: 'NGI/YP/2026/002', date: '2026-09-02', buyer: 'NGI Foods Ltd.', seller: 'Prairie Pulse Exports Inc.',
    incoterms: 'CIF', commodity: 'CANADIAN YELLOW PEAS', origin: 'Canada', totalQty: 12000, unit: 'MT', unitPrice: 410, currency: 'USD',
    packaging: 'CONTAINER', perContainerQty: 25, shipmentFrom: '2026-10-15', shipmentTo: '2026-11-30', status: 'ACTIVE', remarks: '', files: [], ...stamp,
  };
  c2.totalPrice = calcTotalPrice(c2.totalQty, c2.unitPrice);
  const pi2 = {
    id: 'pi_yp002', contractId: c2.id, piNo: 'PPE-PI-5520', lcType: 'USANCE', spiDate: '2026-09-10', spiValidity: '2026-11-10', unitPrice: 410,
    pol: 'Vancouver, Canada', pod: 'Chattogram, Bangladesh', files: [],
    spis: [1, 2, 3].map((n) => ({ id: `spi_yp_${n}`, spiNo: `PPE-PI-5520/${n}`, qty: 4000, amount: calcSpiAmount(4000, 410) })),
    ...stamp,
  };
  const lcs2 = pi2.spis.slice(0, 2).map((s, i) => ({
    id: `lc_yp_${i + 1}`, contractId: c2.id, piId: pi2.id, spiId: s.id, lcType: 'USANCE', paymentDurationDays: 180, bank: 'Eastern Bank PLC',
    lcNo: `EBL-UPAS-26-${String(880 + i)}`, issueDate: '2026-09-18', expiryDate: '2026-11-28', doneQty: s.qty, amount: s.amount,
    currency: 'USD', insuranceCoverNoteNo: `ICN/2026/${8800 + i}`, files: [], amendments: [], ...stamp,
  }));

  // ── Contract 3: fresh, no PI yet ──────────────────────────────────────────
  const c3 = {
    id: 'sc_sb003', contractNo: 'NGI/SB/2026/003', date: '2026-10-20', buyer: 'NGI Foods Ltd.', seller: 'Santos Grain Trading S.A.',
    incoterms: 'CFR', commodity: 'BRAZILIAN SOYBEAN', origin: 'Brazil', totalQty: 30000, unit: 'MT', unitPrice: 455, currency: 'USD',
    packaging: 'BULK', perContainerQty: null, shipmentFrom: '2026-12-01', shipmentTo: '2027-01-15', status: 'ACTIVE', remarks: '', files: [], ...stamp,
  };
  c3.totalPrice = calcTotalPrice(c3.totalQty, c3.unitPrice);

  const blQtys = [7985.5, 8002.1, 7996.75, 8000, 7990.2, 7498.3, 7505];
  const shipment = {
    id: 'sh_oceanpride', vesselName: 'MV OCEAN PRIDE', vesselType: 'Supramax', imoNo: '9456123', flag: 'Panama', portOfRegistry: 'Panama City',
    holdHatch: '5/5', demurrageRate: 14500, status: 'Sailed', eta: '2026-11-25', etc: '2026-11-20', spd: '2026-10-01', sld: '2026-10-02',
    nominationFiles: [sampleFile('Vessel Nomination - MV Ocean Pride.pdf')],
    contracts: [
      {
        contractId: c1.id, loi: 'YES', loiDate: '2026-10-05', docPaymentAcceptance: 'ACCEPTED', docPaymentDate: '2026-10-20',
        dutyPaidQty: 24000, dischargePermissionQty: 16000, remarks: 'Partial duty paid; balance on arrival.',
        spiDocs: pi1.spis.map((s, i) => ({
          spiId: s.id, blNo: `VAR/CTG/26/${String(101 + i)}`, blDate: '2026-10-01', blQty: blQtys[i],
          ciNo: `CI-ATB-26-${String(501 + i)}`, ciDate: '2026-10-02', ciAmount: calcSpiAmount(blQtys[i], 245),
        })),
      },
    ],
    ...stamp,
  };

  repos.contracts.replaceAll([c1, c2, c3].map((c) => ({ ...c, createdById: 'u_demo', createdByName: 'Commercial Officer' })));
  repos.pis.replaceAll([pi1, pi2]);
  repos.lcs.replaceAll([...lcs1, ...lcs2]);
  repos.shipments.replaceAll([shipment]);
  writeJSON('seedVersion', SEED_VERSION);
}

export async function ensureSeeded() {
  if (readJSON('seedVersion', 0) >= SEED_VERSION) return;
  await seed();
}

/** Wipes all local data and re-seeds the demo dataset. */
export async function resetDemoData() {
  clearAll();
  await clearFiles();
  await seed();
}
