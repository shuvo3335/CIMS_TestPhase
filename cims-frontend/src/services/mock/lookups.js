import { readJSON, writeJSON } from '../storage';
import { delay, assertCan } from './core';

export const DEFAULT_LOOKUPS = {
  currencies: ['USD', 'EUR', 'GBP', 'BDT', 'CNY', 'JPY', 'AED', 'SGD'],
  incoterms: ['FOB', 'CFR', 'CIF', 'CIP', 'CPT', 'DAP', 'DDP', 'EXW', 'FAS', 'FCA'],
  banks: [
    'Sonali Bank PLC',
    'Janata Bank PLC',
    'Agrani Bank PLC',
    'Dutch-Bangla Bank PLC',
    'BRAC Bank PLC',
    'Eastern Bank PLC',
    'City Bank PLC',
    'Standard Chartered Bank',
    'HSBC',
  ],
  ports: [
    'Chattogram, Bangladesh',
    'Mongla, Bangladesh',
    'Payra, Bangladesh',
    'Constanta, Romania',
    'Varna, Bulgaria',
    'Odesa, Ukraine',
    'Novorossiysk, Russia',
    'Santos, Brazil',
    'Paranagua, Brazil',
    'Vancouver, Canada',
    'Kandla, India',
  ],
  vesselTypes: ['Bulk Carrier', 'Handysize', 'Supramax', 'Ultramax', 'Panamax', 'Kamsarmax', 'Container Ship', 'General Cargo'],
  vesselStatuses: ['Not Start Yet', 'On Loading', 'Loading Complete', 'Sailed', 'Arrived', 'Discharging', 'Discharged'],
  /** Buyer master: [{ id, name, ircNo, tinNo, binNo }] */
  buyers: [],
};

export const DEFAULT_SETTINGS = { spiTolerancePct: 0 };

export const lookups = {
  async get() {
    await delay(100);
    return { ...DEFAULT_LOOKUPS, ...readJSON('lookups', {}) };
  },
  async update(data) {
    assertCan('settings', 'edit');
    await delay();
    writeJSON('lookups', data);
    return data;
  },
};

export const settings = {
  async get() {
    await delay(100);
    return { ...DEFAULT_SETTINGS, ...readJSON('settings', {}) };
  },
  getSync() {
    return { ...DEFAULT_SETTINGS, ...readJSON('settings', {}) };
  },
  async update(data) {
    assertCan('settings', 'edit');
    await delay();
    writeJSON('settings', data);
    return data;
  },
};
