# Hearing Aid POS & Audiology Clinic Management System (HA_POS)

> A modern, bilingual (Arabic RTL / English) multi-branch Point-of-Sale, clinical audiology, custom earmold/CIC laboratory, and inventory management ERP system tailored for hearing health centers, audiologists, and medical device distributors.

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [System Architecture](#-system-architecture)
- [Directory Structure](#-directory-structure)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
- [User Roles & Access Control](#-user-roles--access-control)
- [Core Workflows](#-core-workflows)
  - [1. Fast POS Terminal](#1-fast-pos-terminal)
  - [2. Hearing Aid Invoicing & Serial Tracking](#2-hearing-aid-invoicing--serial-tracking)
  - [3. Interactive PTA Audiograms](#3-interactive-pta-audiograms)
  - [4. Custom Earmold / CIC Lab Orders](#4-custom-earmold--cic-lab-orders)
  - [5. Inter-Branch Stock Transfers](#5-inter-branch-stock-transfers)
  - [6. ZATCA E-Invoicing & Document Printing](#6-zatca-e-invoicing--document-printing)
  - [7. Automated WhatsApp & SMS Messaging](#7-automated-whatsapp--sms-messaging)
- [Data Storage & Seed Data](#-data-storage--seed-data)
- [Scripts & Commands](#-scripts--commands)
- [Roadmap & Enhancements](#-roadmap--enhancements)

---

## 🌟 Overview

**HA_POS** is purpose-built for hearing care businesses. Unlike generic retail POS software, HA_POS incorporates clinical, laboratory, and high-value medical device workflows into a single unified platform:

- **Audiological Records**: Pure Tone Audiometry (PTA) charts, hearing loss classification, doctor and hospital referral tracking.
- **Custom Earmold / CIC Workshop**: Impression tracking, shell materials, vent specifications, and 1-click conversion to sales invoices.
- **Strict Device Traceability**: Serial number / IMEI tracking for hearing aid units, warranty timelines, and trial/loaner tracking.
- **Bilingual & Localization**: Seamless Arabic (RTL) and English (LTR) interface with Saudi ZATCA e-invoicing Phase 1 & 2 compliance.

---

## 🚀 Key Features

### 🛒 Point of Sale & Invoicing
- **Fast POS Terminal**: Built for high-volume sales of hearing aid batteries, cleaning kits, filters, spare parts, and accessories with barcode scanner support.
- **Full Clinical Invoicing**: Detailed invoice generation supporting deposits (*دفعة مقدمة*), split payments (Cash, Mada, Visa, Bank Transfer, Insurance), line discounts, and delivery statuses (*Delivered, Ready, Trial*).
- **Insurance Claims Invoicing**: Separate flow for medical insurance policies, approval authorization numbers, and patient co-pay breakdowns.
- **ZATCA Phase 1 & 2 QR Code**: Automatic TLV Base64 QR code generation embedded on invoices.
- **Print Formats**:
  - **A4 Bilingual Tax Invoice** with ZATCA QR code, doctor/hospital details, and payment breakdown.
  - **80mm Thermal Receipt** for fast point-of-sale checkout.
  - **Workshop / Lab Order Ticket** with ear impression specs.

### 🦻 Clinical Audiology & Patient CRM
- **Interactive Audiogram Plotter**:
  - Pure Tone Audiometry (PTA) chart covering 125 Hz to 8000 Hz.
  - Right Ear (🔴 Red circle `O`) and Left Ear (🔵 Blue cross `X`) for Air and Bone Conduction.
  - Automatic PTA average computation and hearing loss degree classification (Normal, Mild, Moderate, Severe, Profound).
  - Speech Discrimination Score (SDS%) tracking.
- **Patient Profile**: Comprehensive medical file with national ID, referring doctors, hospital affiliations, insurance policies, and past purchases.

### 🧪 Custom Earmold & CIC Workshop
- **Custom Lab Order Workflow**:
  - Ear selection (Left, Right, Both).
  - Shell materials: Hard Acrylic, Soft Silicone, Skeleton, Semi-Skeleton, Canal, Micro CIC.
  - Vent configurations: None, 1.0mm, 1.5mm, 2.0mm, 3.0mm, Pressure Vent.
  - Status pipeline: `Pending` ➔ `Sent to Lab` ➔ `In Production` ➔ `Ready` ➔ `Delivered`.
  - **1-Click Conversion**: Convert ready lab orders into a finalized sales invoice with a single click.

### 📦 Multi-Branch Inventory & Serial Tracking
- **Multi-Branch & Warehouse Isolation**: Track inventory across multiple branches (e.g., Riyadh Main, Jeddah Clinic, Dammam Center) and localized warehouses.
- **Unit Serial Number Management**: Track individual hearing aid units by serial number with warranty end dates and status (`in_stock`, `sold`, `in_repair`, `trial`).
- **Inter-Branch Stock Transfers**: Formal transfer requisition, dispatch, in-transit tracking, and receipt with serial assignment.
- **Low Stock Alerts**: Real-time notifications when items breach minimum reorder levels.

### 💬 Patient Messaging & Notifications
- **Automated Communication**: Pre-configured WhatsApp and SMS triggers for:
  - Custom Earmold ready for collection.
  - Sales invoice & payment receipt links.
  - Fitting & follow-up appointment reminders.
  - Battery replacement & service notices.
- **Template Engine**: Dynamic placeholder variables (`{client_name}`, `{order_no}`, `{branch}`, `{date}`).
- **Delivery Log**: Sent, delivered, and failed message status log.

### 📊 Reports & Executive Analytics
- Real-time KPIs: Today's sales, Monthly Gross Revenue, Pending Lab Orders, Low Stock Alerts.
- Sales analysis by Branch, Salesperson, Item Category, and Payment Method.
- Inventory valuation and stock movement audit trail.
- Action audit logging across branches and users.

---

## 🏛 System Architecture

```mermaid
graph TD
    Client[Web Browser / POS Terminal] -->|HTTP / JSON| NextApp[Next.js 14 App Router]
    
    subgraph Frontend [UI Layer - React 18 & Tailwind CSS]
        LangCtx[Language Context: AR RTL / EN LTR]
        BranchCtx[Branch Switcher Context]
        Components[Fast POS | Invoice Form | Audiogram Chart | Lab Orders]
    end

    subgraph Backend [API Routes - Route Handlers]
        InvoicesAPI[/api/invoices]
        ClientsAPI[/api/clients]
        AudiogramsAPI[/api/audiograms]
        EarmoldsAPI[/api/earmolds]
        InventoryAPI[/api/items]
        TransfersAPI[/api/transfers]
        ReportsAPI[/api/reports]
        MessagingAPI[/api/messaging]
    end

    subgraph DataLayer [Storage & Compliance]
        SQLiteDB[(Prisma ORM & SQLite: prisma/dev.db)]
        ZatcaQR[ZATCA TLV Base64 QR Generator]
        SeedData[Prisma Seed Script: prisma/seed.ts]
    end

    NextApp --> Frontend
    Frontend --> Backend
    Backend --> DataLayer
```

---

## 📁 Directory Structure

```text
HA_POS/
├── data/
│   └── db.json                   # Local JSON database with active state
├── src/
│   ├── app/                      # Next.js 14 App Router
│   │   ├── api/                  # RESTful API route handlers
│   │   │   ├── audiograms/       # Audiogram CRUD endpoints
│   │   │   ├── audit-logs/       # System action logging
│   │   │   ├── branches/         # Branch master endpoints
│   │   │   ├── clients/          # Client/Patient records
│   │   │   ├── earmolds/         # Custom order pipeline
│   │   │   ├── invoices/         # Invoices, returns, and ZATCA QR
│   │   │   ├── items/            # Products, stock, and serials
│   │   │   ├── messaging/        # SMS & WhatsApp dispatch & logs
│   │   │   ├── migration/        # Data import & validation
│   │   │   ├── reports/          # KPI calculations & reports
│   │   │   └── transfers/        # Inter-branch transfer workflow
│   │   ├── clients/              # Patient profiles & audiogram review
│   │   ├── earmolds/             # Lab order tracking & creation
│   │   ├── inventory/            # Warehouse stock & branch transfers
│   │   ├── invoices/             # Full invoice listing & editor
│   │   ├── messaging/            # Communication center & templates
│   │   ├── migration/            # Legacy data migration interface
│   │   ├── pos/                  # Fast touch/barcode POS terminal
│   │   ├── reports/              # Executive analytics & charts
│   │   ├── settings/             # System settings & master data
│   │   ├── layout.tsx            # Global layout, fonts, and providers
│   │   └── page.tsx              # Executive dashboard & live KPIs
│   ├── components/
│   │   ├── clinical/             # AudiogramChart (SVG) & AudiogramForm
│   │   ├── common/               # LanguageContext, BranchContext, Providers
│   │   ├── earmolds/             # EarmoldOrderForm, LabOrderPrint
│   │   ├── invoices/             # FastPosTerminal, InvoiceForm, A4InvoicePrint, ThermalReceiptPrint
│   │   └── layout/               # Header, Sidebar, Navigation
│   ├── lib/
│   │   ├── db.ts                 # File-based database adapter & CRUD helpers
│   │   ├── seedData.ts           # Initial demo dataset (branches, items, clients)
│   │   ├── utils.ts              # Currency, date, and Tailwind helpers
│   │   ├── zatcaQr.ts            # ZATCA TLV encoding implementation
│   │   └── i18n/                 # Arabic & English localization dictionaries
│   │       ├── ar.ts
│   │       └── en.ts
│   └── types/
│       └── index.ts              # TypeScript domain types & interfaces
├── HA_POS_System_Plan.md         # Comprehensive functional & technical blueprint
├── package.json                  # Dependencies and scripts
├── tailwind.config.ts            # Tailwind CSS styling configuration
└── tsconfig.json                 # TypeScript compiler configuration
```

---

## 💻 Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router, Server & Client Components)
- **Language**: [TypeScript 5](https://www.typescriptlang.org/)
- **UI & Styling**: [Tailwind CSS 3](https://tailwindcss.com/), [PostCSS](https://postcss.org/), [Lucide React](https://lucide.dev/) (Icons)
- **State & Context**: React Context API for Language (AR/EN RTL/LTR) and Branch Selection
- **Database & ORM**: [Prisma ORM 6](https://www.prisma.io/) with local **SQLite** database (`prisma/dev.db`) — type-safe models, automated migrations, and seed scripts
- **Standards & Regulations**: Saudi ZATCA E-Invoicing TLV QR Code generation

---

## ⚡ Getting Started

### Prerequisites
- **Node.js**: v18.17.0 or higher
- **npm** or **yarn** / **pnpm**

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/ibrahimmmm14/HA_POS.git
   cd HA_POS
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```

4. **Access the application**:
   Open your browser and navigate to:
   ```text
   http://localhost:3000
   ```

The database (`data/db.json`) is automatically initialized on the first run with sample Saudi branches, hearing aid models, serial units, earmold orders, and patient records.

---

## 👥 User Roles & Access Control

| Role | Primary Responsibilities | Scope |
|---|---|---|
| **Super Admin** | Full access to all branches, master data, users, and audit logs | All Branches |
| **Branch Manager** | Inventory control, staff performance, branch reporting, discount approvals | Assigned Branch |
| **Cashier / Sales** | POS counter sales, device invoicing, deposit recording, receipt printing | Assigned Branch Terminal |
| **Audiologist / Specialist** | Patient audiogram charting, earmold specs, fitting notes | Clinical Rooms |
| **Inventory Officer** | Stock receipt, serial number registration, inter-branch transfers | Warehouses |
| **Accountant / Finance** | Payment reconciliation, insurance claims review, tax reporting | Financials |

---

## 🔄 Core Workflows

### 1. Fast POS Terminal
- Accessible at `/pos`.
- Optimized for quick over-the-counter sales of batteries (Size 10, 13, 312, 675), wax guards, cleaning supplies, and accessories.
- Real-time product search by code, barcode, or category.
- Instant split payment handling (Cash, Mada, Visa) and one-click receipt printing.

### 2. Hearing Aid Invoicing & Serial Tracking
- Accessible at `/invoices`.
- Complete workflow mirroring specialized audiology clinical invoices:
  - Client selection or instant registration.
  - Linked Doctor and Hospital referral tracking.
  - Hearing aid item selection with specific serial number assignment.
  - Split payments: Deposit paid, remaining balance due, or insurance co-pay.
  - Delivery checklist: *Delivered*, *Ready for Delivery*, or *Trial Loaner*.
  - A4 Tax Invoice generation with ZATCA Phase 1/2 QR code.

### 3. Interactive PTA Audiograms
- Accessible within patient files at `/clients`.
- Pure Tone Audiometry chart plotting:
  - Frequencies: 125Hz, 250Hz, 500Hz, 1000Hz, 2000Hz, 4000Hz, 8000Hz.
  - Hearing threshold in dB HL (-10 dB to 120 dB).
  - Separate Air and Bone conduction entries for Left and Right ears.
  - Real-time calculation of Pure Tone Average (PTA) and Speech Discrimination Score (SDS%).

### 4. Custom Earmold / CIC Lab Orders
- Accessible at `/earmolds`.
- Captures impression date, technician, shell type (Hard Acrylic, Silicone, Skeleton, etc.), and vent size.
- Generates a **Workshop Order Form** printable for the lab.
- Tracks order status through delivery and provides **Convert to Invoice** to carry all details directly into a sales invoice.

### 5. Inter-Branch Stock Transfers
- Accessible at `/inventory`.
- Supports multi-branch stock movements:
  1. Origin branch initiates transfer request with quantities and serials.
  2. Inventory is flagged as *In-Transit*.
  3. Destination branch inspects and marks *Received*, updating warehouse stock balances automatically.

### 6. ZATCA E-Invoicing & Document Printing
- Generates Phase 1 & Phase 2 compliant TLV Base64 QR codes directly in `src/lib/zatcaQr.ts` encoding:
  1. Seller Name
  2. VAT Registration Number
  3. Timestamp (ISO 8601)
  4. Invoice Total (with VAT)
  5. VAT Total Amount
- Printable views format seamlessly on standard A4 paper and 80mm ESC/POS thermal printers.

### 7. Automated WhatsApp & SMS Messaging
- Accessible at `/messaging`.
- Triggers notifications to patients upon invoice creation or earmold completion.
- Configurable message templates with custom Arabic and English phrasing.

---

## 💾 Database Architecture & Data Storage

The application uses **Prisma ORM 6** with an embedded **SQLite** database located at:
```text
prisma/dev.db
```

### Database Schema Models
Defined in `prisma/schema.prisma`:
- **Branches & Warehouses**: Multi-branch physical locations and inventory depots (`Branch`, `Warehouse`).
- **Users & Permissions**: System users, credentials, roles, and branch assignments (`User`).
- **Master Data**: Referring doctors, affiliated hospitals, and health insurance providers (`Doctor`, `Hospital`, `InsuranceCompany`).
- **Inventory & Traceability**: Catalog items, barcodes, prices, stock per warehouse, and serial units with warranty tracking (`Item`, `SerialUnit`).
- **Clinical & Lab**: Patients/Clients, Pure Tone Audiometry (PTA) tests, and custom earmold workshop orders (`Client`, `Audiogram`, `EarmoldOrder`).
- **Sales & Financials**: Point-of-Sale & Clinical invoices with item lines, tax calculations, deposits, and split payments (`Invoice`).
- **Stock Movement**: Inter-branch transfers, warehouse dispatches, and receptions (`StockTransfer`).
- **Messaging & Audit**: Notification templates, WhatsApp/SMS message dispatch logs, and action audit trail (`MessageTemplate`, `MessageLog`, `AuditLog`).

### Setting Up & Managing the Database

1. **Run Migrations (Create Tables)**:
   ```bash
   npm run db:migrate
   ```
   This executes `prisma migrate dev --name init` which creates `prisma/dev.db` and applies all migrations from `prisma/migrations/`.

2. **Seed Initial Data**:
   ```bash
   npm run db:seed
   ```
   Executes `prisma/seed.ts` via `ts-node` to populate the database with realistic sample records:
   - **Branches**: Riyadh Main Center, Jeddah Medical Branch, Dammam Clinic.
   - **Items**: High-end digital hearing aids (Phonak, Oticon, Signia), custom CIC earmolds, Rayovac zinc-air batteries, wax filters.
   - **Serial Units**: Tracked units with active warranty and trial statuses.
   - **Patients & Invoices**: Realistic bilingual patient files, audiograms, and invoices.

3. **Visual Database Browser (Prisma Studio)**:
   ```bash
   npm run db:studio
   ```
   Opens a modern web GUI at `http://localhost:5555` to view, filter, insert, and edit records in real time.

---

## 🛠 Scripts & Commands

| Command | Description |
|---|---|
| `npm run dev` | Starts the Next.js local development server on port 3000 |
| `npm run build` | Builds the optimized production bundle |
| `npm run start` | Runs the compiled production build |
| `npm run lint` | Runs ESLint to check for code quality and syntax issues |
| `npm run db:migrate` | Runs Prisma schema migration to create or update the SQLite database schema |
| `npm run db:seed` | Populates the SQLite database with initial demo & master dataset |
| `npm run db:studio` | Launches visual Prisma Studio GUI on `http://localhost:5555` to inspect and edit database records |
| `npm run db:deploy` | Applies pending migrations to an existing database (use after pulling updates) |
| `npm run db:backup` | Verified snapshot of the live database into `backups/` (see [docs/BACKUP_AND_QUALITY_CONTROL.md](docs/BACKUP_AND_QUALITY_CONTROL.md)) |
| `npm run db:restore -- <file>` | Restores a backup after an integrity check, keeping a copy of the current database |
| `npm run qc` | Read-only data quality report (client files, invoices, serials, earmolds, repairs) |
| `npm run typecheck` | TypeScript check without building |

---

## 🗺 Roadmap & Enhancements

- [ ] WhatsApp Business Cloud API & SMS Gateway integration (Twilio / Unifonic).
- [ ] ZATCA Phase 2 Cryptographic Stamp & XML Clearance integration.
- [ ] Direct digital audiometer hardware integration (NOAH standard / Noahlink).
- [ ] Offline POS caching with automatic sync when connection is restored.
- [ ] Patient portal for viewing hearing test results and warranty status.

---

## 📄 License

This project is proprietary software developed for Hearing Aid & Audiology Center operations. All rights reserved.
