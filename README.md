# CIMS (Contract & Import Management System)

CIMS tracks imported commodities through their whole lifecycle and produces a **vessel-wise import report**:

```
Sales Contract ─ PI ─< SPIs ─ LC (+ amendments) · Insurance Cover Note · BL · CI
        │
        └── shipped on one Vessel (a vessel can carry many contracts)
```

| Module | What it does |
|---|---|
| Sales Contract | Contract entry (commodity, qty, price, packaging, shipment period, documents) and list |
| PI / SPI | One PI per contract, split into SPIs; Σ SPI qty must equal contract qty |
| LC | One LC per SPI, Sight/Usance, bank, insurance cover note, amendment history with files |
| Shipment | Vessel details, contracts carried, BL & CI per SPI, LOI, duty paid / discharge permission qty |
| Vessel Report | AG Grid report (one row per vessel + contract), filters, CSV export, printable single-vessel view |
| Administration | Users & roles (Admin / User, no sign-up), lookups, SPI tolerance setting |

## Repository layout
| Folder | Status |
|---|---|
| [`cims-frontend/`](cims-frontend/) | React + Vite + MUI + AG Grid. Working, uses browser-stored mock data |
| `cims-backend/` | Planned |

## Quick start
```bash
cd cims-frontend
cp .env.example .env    # optional, defaults work without it
npm install
npm run dev             # http://localhost:5173
```
Demo logins: `admin / admin123` (Admin) and `user / user123` (User).

See [`cims-frontend/README.md`](cims-frontend/README.md) for architecture, business rules and the backend hand-off plan.
