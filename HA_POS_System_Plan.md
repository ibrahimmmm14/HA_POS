# Hearing Aid POS & Inventory Management System — Project Plan

## 1. Project Summary

A multi-branch Point-of-Sale, inventory, and clinical-data platform for a company that sells and fits **hearing aids (HA), earmolds/CIC, HA batteries, spare parts, and HA accessories**. The system replaces/augments an existing legacy POS (see reference screenshot) and adds inventory control, user/branch access control, custom earmold ordering, insurance invoicing, and SMS/WhatsApp client messaging.

**Reference system observations** (from the uploaded screenshot — an Arabic-language invoice/sales screen):
- Invoice header: invoice #, return #, date, delivery date/time, client info (name, address, phone), tax number
- Sales rep / seller, warehouse, cost center, workshop, doctor fields already tracked per invoice
- Payment methods: Cash, Visa/MADA, "Mada" split payments, deposit ("دفعة مقدمة"), discount % and value
- Line items grid: item code, item, unit, quantity, price, gross, discount %, discount value, net, tax, final total, warehouse, notes
- Delivery checkboxes: "Delivered," "Ready for delivery," "Trial letter"
- Totals panel: total before tax, tax, total after tax, deposit paid, due, remaining
- Toolbar: New, Save/Print settings, Print, Edit, Delete, Cancel, navigation arrows, Returns, Related operations, Items

This confirms the domain workflow (invoice ↔ order ↔ delivery ↔ insurance ↔ payment) that the new system must preserve and improve on.

---

## 2. Goals

1. Modern, bilingual (Arabic RTL / English) multi-branch POS + inventory system.
2. Import/migrate key data from the old system (clients, items, invoices, doctors, hospitals).
3. Full role-based access control per branch and per function.
4. Custom order workflow for earmolds/CIC with a printable order form, convertible into an invoice.
5. Insurance invoicing as a distinct flow from normal cash sales.
6. Client (patient) records with audiological and medical context (audiogram, hospital, doctor).
7. SMS & WhatsApp messaging to clients (order ready, appointment, invoice/receipt).
8. Inter-branch stock transfer with full traceability.
9. Centralized dashboard and reporting for management across all branches.

---

## 3. User Roles & Access Control

| Role | Typical Access |
|---|---|
| **Super Admin** | Full access to all branches, users, settings, master data, reports |
| **Branch Manager** | Full access within their branch(es): inventory, invoices, staff performance, reports |
| **Sales / Cashier** | Create invoices/orders, view stock, manage clients, no cost/report visibility |
| **Warehouse / Inventory Officer** | Stock in/out, branch transfers, stock counts, low-stock alerts |
| **Audiologist / Fitting Specialist** | Client audiograms, order specs (ear mold/CIC), device fitting notes |
| **Accountant / Finance** | Payments, insurance reconciliation, discounts approval, financial reports |
| **Call Center / Front Desk** | Client data entry, appointment scheduling, SMS/WhatsApp sending |

**Access control features:**
- User linked to one or more branches; can switch branch context if authorized.
- Permission matrix per module (view / add / edit / delete / print / export / approve-discount).
- Action audit log (who created/edited/deleted/voided an invoice or item, with timestamp).
- Optional: max discount % per role, requiring manager approval above threshold.
- Session/device restrictions (e.g., cashier can only invoice from their assigned branch terminal).

---

## 4. Core Modules

### 4.1 Master Data Management
- **Branches**: name, address, phone, tax number, default warehouse.
- **Items / Catalog**: categories — *Hearing Aids*, *Earmolds/CIC*, *HA Batteries*, *Spare Parts*, *Accessories*. Fields: SKU, barcode, brand, model, unit, cost price, sale price, tax class, serial/IMEI tracking (for HA units), warranty period, reorder level, image.
- **Hospitals**: name, address, contract/insurance status, contact person.
- **Doctors**: name, specialty, linked hospital(s), commission/referral tracking (optional).
- **Insurance Companies**: name, contract terms, approval requirements, price lists/discount agreements.
- **Payment Methods**: Cash, Visa/Mada, bank transfer, insurance, installment.
- **Tax Settings**: VAT rate(s), tax-exempt categories.
- **SMS/WhatsApp Templates**: order ready, appointment reminder, invoice copy, birthday/follow-up.

### 4.2 Client (Patient) Management
- Full name, age/DOB, gender, mobile number(s), national ID, address.
- Linked hospital and referring doctor.
- **Audiogram**: upload file/image or structured entry (dB by frequency, left/right ear) with date and audiologist.
- Device history: purchased HA(s), serial numbers, warranty/expiry, past earmold orders.
- Insurance details: company, policy/membership number, approval status.
- Notes/history timeline (visits, repairs, complaints).
- Search/filter by name, mobile, ID, hospital, doctor.

### 4.3 Inventory Management
- Multi-branch/multi-warehouse stock tracking.
- Stock in (purchase/receiving), stock out (sale, damage, transfer).
- **Branch-to-branch transfer**: request → approve → dispatch → receive, with transfer document/reference number and full audit trail.
- Serial/lot tracking for hearing aid units (for warranty and insurance claims).
- Low-stock / reorder-level alerts.
- Stock count / physical inventory reconciliation.
- Supplier management and purchase orders (recommended addition).

### 4.4 Earmold / CIC Custom Order Workflow
1. **Create Order**: client, ear (L/R/both), impression details, device brand/model, color, vent type, requested by (doctor/self), workshop/lab assigned, expected delivery date.
2. **Printable Order Form**: lab/workshop copy with impression specs and client + item details (mirrors the "workshop"/"مركز التكلفة" fields already in the legacy screen).
3. **Order Status Tracking**: Pending → Sent to Lab → In Production → Ready → Delivered.
4. **Convert Order → Invoice**: one click carries client, item, and pricing data into a new sales invoice; order remains linked for traceability.
5. Automatic SMS/WhatsApp when status changes to "Ready."

### 4.5 Sales / POS & Invoicing
- Fast POS screen for over-the-counter sales (batteries, accessories, spare parts) with barcode scanning.
- Full invoice screen for hearing aids/earmolds (mirroring legacy fields): client, seller, branch/warehouse, cost center, doctor, item grid with qty/price/discount/tax/net, deposit, remaining balance, delivery status checkboxes.
- Multiple payment methods per invoice, including split payments.
- Returns / credit notes linked to original invoice.
- Discount at line level and invoice level, with approval workflow if above allowed %.
- **Insurance Invoice** as a distinct invoice type: insurance company, approval/authorization number, patient co-pay vs. insurance-covered amount, separate insurance report/reconciliation.
- Print templates (A4 invoice, thermal receipt, order form) — Arabic & English.

### 4.6 SMS & WhatsApp Integration
- Provider-agnostic gateway (e.g., Twilio, Unifonic, WhatsApp Business API/Meta Cloud API — final choice depends on region/cost).
- Trigger points: order ready for pickup, invoice/receipt copy, appointment reminder, low-battery/service reminder, marketing/follow-up (opt-in).
- Template management with placeholders ({client_name}, {order_no}, {branch}, {date}).
- Delivery status log (sent/delivered/failed) per message.

### 4.7 Data Migration from Old System
- Export/import mapping for: clients, items & stock balances, open/historical invoices, doctors, hospitals.
- Migration tool with validation report (duplicates, missing mobile numbers, mismatched item codes).
- Run in a staging environment first; reconcile opening balances before go-live.

### 4.8 Dashboard & Reports
- **Executive Dashboard**: sales today/MTD/YTD, per branch, top-selling items, low stock alerts, pending orders, insurance pending approvals.
- **Sales Reports**: by branch, by salesperson, by item category, by payment method, by date range.
- **Inventory Reports**: stock on hand, stock movement, transfer history, near-expiry/warranty items, reorder suggestions.
- **Client/Doctor Reports**: referrals by doctor/hospital, repeat clients, audiogram due for review.
- **Insurance Reports**: pending/approved/rejected claims, aging, reconciliation vs. payments received.
- **User Activity / Audit Reports**: logins, edits/deletions, discount overrides.
- Export to Excel/PDF; scheduled email reports (optional).

---

## 5. Additional Features Seen in Comparable Systems (Recommended Additions)

- **Warranty & repair management**: log repair requests, track turnaround, warranty vs. paid repair.
- **Trial/demo device tracking**: loaner units given to clients for trial before purchase.
- **Appointment scheduling**: booking calendar per branch/audiologist, linked to SMS reminders.
- **Barcode/QR generation** for items and serials.
- **Loyalty / follow-up reminders** (e.g., battery replacement due, annual hearing test due).
- **Multi-language invoice printing** (Arabic/English side by side).
- **Offline mode** for POS terminal with sync when connection restored.
- **Backup & disaster recovery** schedule.
- **API integration hooks** for accounting software (e.g., export to QuickBooks/Zoho/local ERP) if needed later.

---

## 6. Suggested Technical Architecture

| Layer | Recommendation | Notes |
|---|---|---|
| Frontend | Web app (React or Vue) with RTL support, responsive for tablet/desktop POS terminals | Matches modern multi-branch, multi-device needs |
| Backend | REST/GraphQL API (Node.js/NestJS, or .NET, or Laravel — pick based on team skillset) | Should support role-based middleware per endpoint |
| Database | PostgreSQL or MySQL | Relational model fits invoices/inventory well; use proper foreign keys for branch/warehouse isolation |
| Auth | JWT-based sessions, role & branch claims | Add 2FA for admin/finance roles |
| Messaging | WhatsApp Business Cloud API + SMS gateway (Twilio/Unifonic) | Queue-based sending with retry/failure logging |
| File storage | Object storage (S3-compatible) for audiograms, images, printed order copies | |
| Printing | PDF generation service (e.g., wkhtmltopdf/Puppeteer) for A4 invoices & order forms | Template-driven for easy branding changes |
| Hosting | Cloud VM/container (branch terminals connect over internet) or on-prem server with VPN for multi-branch | Depends on internet reliability at branches |

---

## 7. Suggested Delivery Phases

| Phase | Scope |
|---|---|
| **Phase 1 — Foundation** | User/role/branch setup, master data (items, hospitals, doctors), client management, basic inventory |
| **Phase 2 — Sales Core** | POS invoicing, payment methods, discounts, returns, printing |
| **Phase 3 — Orders & Insurance** | Earmold/CIC order workflow + printable order form, order→invoice conversion, insurance invoicing |
| **Phase 4 — Multi-branch Operations** | Branch-to-branch transfers, per-branch dashboards, stock counts |
| **Phase 5 — Communication** | SMS/WhatsApp integration, templates, appointment reminders |
| **Phase 6 — Reporting & Migration** | Full report suite, dashboard, legacy data migration & go-live |
| **Phase 7 — Enhancements** | Warranty/repair tracking, trial devices, appointment scheduling, offline POS mode |

---

## 8. Open Questions to Confirm Before Development

1. Which SMS/WhatsApp provider is preferred or already contracted?
2. Which insurance companies need integration, and do they require a specific claim format/API, or is manual entry sufficient?
3. Should the system be cloud-hosted (SaaS-style, accessible from all branches online) or on-premise per branch with sync?
4. Do you need serial-number/warranty tracking per hearing aid unit (recommended for this industry)?
5. What data fields exist in the old system for export (client list, item list, invoice history) and in what format (Excel, database dump, other POS export)?
6. Do you need accounting-system integration (e.g., for VAT filing) or will finance be handled separately?

---

*This plan is a starting blueprint. Once the open questions above are answered, it can be turned into a detailed functional specification (screens, field-by-field forms, and a database schema) for development.*
