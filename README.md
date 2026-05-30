# EMR — Electronic Medical Records System

Single-facility EMR. Cash payments only. Built with Django 4.2 + React 18 (Vite) + PostgreSQL.

## Quickstart

```bash
cp .env.example .env        # fill in secrets
docker-compose up --build   # starts db (5432), backend (8000), frontend (5173)
```

Visit: http://localhost:5173

## Modules

| # | Module | Description |
|---|--------|-------------|
| 1 | Auth / Shell | JWT login, OpenMRS-style sidebar layout |
| 2 | Patient Registration | Patient records, `P-YYYY-NNNNN` IDs |
| 3 | OPD / Consultation | Triage, clinical notes, visits `V-YYYY-NNNNN` |
| 4 | Laboratory | Lab orders `LB-YYYY-NNNNN`, results |
| 5 | Pharmacy | Dispensing + main store, prescriptions `RX-YYYY-NNNNN` |
| 6 | Cashier / Billing | Invoices `INV-YYYY-NNNNN`, CASH & MOBILE_MONEY only |
| 7 | Room & Doctor Assignment | Bed/room allocation, doctor scheduling |
| 8 | Reporting Dashboard | Aggregate views, charts |

## Roles

- **Receptionist** — patient registration, visit creation
- **Nurse** — triage, vitals
- **Doctor** — consultation, prescriptions, lab orders
- **Lab Technician** — result entry
- **Pharmacist** — dispensing, stock management
- **Cashier** — billing, payments
- **Admin** — full access, reporting

## Currency

All monetary values in **TZS** (Tanzanian Shilling), stored as integers, displayed as `TZS X,XXX`.

## Stack

- **Backend:** Django 4.2, DRF, SimpleJWT, PostgreSQL
- **Frontend:** React 18, Vite, Tailwind CSS, React Router, Axios
- **Auth:** JWT (access 8h, refresh 1d)
