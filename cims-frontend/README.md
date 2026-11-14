# CIMS Frontend (Contract & Import Management System)

React 18 + Vite + JavaScript · MUI v6 · AG Grid Community · React Hook Form + Zod · TanStack Query · Zustand.

## Run
```bash
npm install
npm run dev      # http://localhost:5173
npm run build
npm run lint
```
Demo logins: `admin / admin123` (Admin) and `user / user123` (User).

## Data (frontend-only phase)
All data goes through `src/services/api/index.js`. For now it uses the mock services in
`src/services/mock/*`, which persist to **localStorage**. Uploaded files are kept in **IndexedDB**
(`src/services/fileStore.js`). Sample data loads on first run. Admin → Settings → *Reset demo data* restores it.

**Backend hand-off:** add `src/services/http/*` with the same function signatures, export it from
`services/api/index.js` when `VITE_API_MODE=http`. Pages and hooks do not change.

## Domain rules (enforced in `utils/calc.js`, Zod schemas, and the mock services)
- Vessel 1 ─< n Contracts; each contract ships on one vessel.
- Contract 1 ─ 1 PI ─< n SPIs; Σ SPI qty must equal contract qty (± tolerance %, Admin → Settings).
- Each SPI has 1 LC (with amendments; each amendment needs a file), 1 insurance cover note, 1 BL and 1 CI.
- LC pending qty = contract qty − Σ LC done qty.
- Delete guards: contract with PI or vessel; PI with LCs; SPI with LC.

## Structure
```
src/app        App, router (lazy routes)
src/layouts    AppLayout (header, collapsible drawer, footer), nav config
src/components DataGrid (AG Grid wrapper), RHF fields, FileUploader, dialogs, states
src/features   auth, dashboard, contracts, pi, lc, shipments, reports, users, settings
src/services   api entry, mock services, storage, fileStore
src/hooks      TanStack Query hooks, unsaved-changes guard, submit helper
src/utils      calc (business rules), format, constants
```
