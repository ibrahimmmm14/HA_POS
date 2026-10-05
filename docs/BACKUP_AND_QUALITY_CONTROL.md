# Client Data, Backups & Quality Control

HA_POS keeps every client file, audiogram, invoice, device serial and repair ticket in a
single SQLite file (`prisma/dev.db`, set by `DATABASE_URL` in `.env`). If that file is lost
or corrupted, all patient and sales history is gone. This guide covers how to protect it.

## 1. Where the data lives

| What | Where |
| --- | --- |
| Live database | `prisma/dev.db` (path comes from `DATABASE_URL`) |
| Schema / migrations | `prisma/schema.prisma`, `prisma/migrations/` |
| Backups | `backups/ha_pos-YYYYMMDD-HHMMSS.db` (git-ignored) |

The database holds personal health data (national IDs, phone numbers, audiograms).
**Never commit a database that contains real clients to git.** The `prisma/dev.db` in the
repository today holds demo seed data only; see "Moving off the committed database" below.

## 2. Daily backup

```bash
npm run db:backup
```

- Uses SQLite `VACUUM INTO`, which produces a consistent copy even while the app is running.
- Opens the copy and runs `PRAGMA integrity_check`; the command fails (exit code 1) if the
  copy is damaged, so a scheduler can alert.
- Keeps the newest 30 copies. Change with `BACKUP_KEEP=60`; change the folder with
  `BACKUP_DIR=D:\HA_POS_Backups`.

### Schedule it

**Windows (Task Scheduler)**: create a daily task at closing time (e.g. 23:00):

- Program: `cmd.exe`
- Arguments: `/c cd /d C:\ha_pos && npm run db:backup >> backups\backup.log 2>&1`

**Linux / macOS (cron)**:

```cron
0 23 * * * cd /opt/ha_pos && npm run db:backup >> backups/backup.log 2>&1
```

### Keep a copy off the machine (3-2-1 rule)

Keep **3** copies, on **2** different media, **1** off-site. A backup on the same disk as the
database does not survive a dead disk, theft, fire or ransomware. Point `BACKUP_DIR` at, or
sync `backups/` to, at least one of:

- An encrypted cloud folder (OneDrive / Google Drive for Business).
- An external USB drive rotated weekly and kept off-site (e.g. at the main branch).

Backups contain patient data: keep the destination access-restricted and encrypted
(BitLocker for USB drives, the business tier of the cloud provider).

## 3. Restore

1. Stop the app.
2. `npm run db:restore -- backups/ha_pos-20261005-230000.db`
   - Checks the backup's integrity first and refuses a damaged file.
   - Saves the current database as `prisma/dev.before-restore-<time>.db` so the restore can be undone.
3. `npm run db:deploy` (applies any newer migrations to the restored copy).
4. Start the app and open a few recent client files to confirm.

**Test a restore once a month** on a spare PC or a copy of the folder. A backup that has
never been restored is not known to work.

## 4. Data quality control

```bash
npm run qc            # human-readable report
QC_JSON=1 npm run qc  # JSON, for a dashboard or log
```

The check is read-only and exits 1 if it finds any **ERROR**. It covers:

| Area | ERROR | WARN / INFO |
| --- | --- | --- |
| Client files | no phone; two files with the same national ID | non-Saudi mobile format, missing/invalid national ID, insurance without policy no. |
| Invoices | grand total ≠ subtotal + VAT; remaining due out of range | VAT not 15%, balance unpaid > 30 days |
| Hearing aids (serials) | sold without client or invoice; trial without client | sold without warranty end date |
| Earmold orders | | past expected date, delivered but not invoiced |
| Repairs | ticket with no history | overdue, ready > 14 days not collected, 2+ repairs of one device in 90 days |

Suggested routine:

- **Daily** (scheduled right after the backup): `npm run qc`; the branch manager reviews errors.
- **Weekly**: front desk fixes WARN items for their branch (missing IDs, phone formats).
- **Monthly**: review repeat repairs per brand/model with the supplier; test a restore.

## 5. Repair tracking standard

Every device brought in for service gets a repair ticket (`/repairs`, or "+ Repair" on the
client profile):

1. **Received**: type or scan the serial number; brand, model and warranty fill in from
   inventory. Record the fault as the client describes it and give an expected ready date.
2. **Diagnosing / Repairing / Sent to manufacturer**: write the technician's diagnosis; add
   a note at each hand-off (courier ref, parts used).
3. **Ready for pickup**: the client gets a WhatsApp notice automatically.
4. **Delivered**: closes the ticket and records the completion date.

Every status change and note is stored in the ticket's history with time and user, and
earlier repairs of the same serial number are listed on the ticket.

## 6. Moving off the committed database

`prisma/dev.db` is currently tracked by git. Before entering real client data:

1. Take a backup: `npm run db:backup`.
2. Point the live database outside the repository, e.g. in `.env`:
   `DATABASE_URL="file:C:/HA_POS_Data/ha_pos.db"`, copy your existing `dev.db` there,
   and run `npm run db:deploy`.
3. Then the repository can stop tracking `prisma/dev.db` (`git rm --cached prisma/dev.db`
   and add it to `.gitignore`) without risking live data.
