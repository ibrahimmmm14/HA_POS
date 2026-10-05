# Client Data, Backups & Quality Control

HA_POS keeps every client file, audiogram, invoice, device serial and repair ticket in
**Netlify Database**, a managed Postgres database attached to the `ha-pos` Netlify site.
This guide covers where that data lives, how to keep your own copies, and how to check it.

## 1. Where the data lives

| What | Where |
| --- | --- |
| Live database | Netlify Database (Postgres), shown in the Netlify dashboard under the site's **Database** tab |
| Connection | `NETLIFY_DB_URL`, injected by Netlify in deploys and by `npx netlify dev` locally. Never commit it |
| Tables & demo data | `netlify/database/migrations/*.sql`, applied by Netlify on each deploy |
| Your backup copies | `backups/ha_pos-YYYYMMDD-HHMMSS.json.gz` (git-ignored) |

The database holds personal health data (national IDs, phone numbers, audiograms).
**Never commit a connection string or a backup file to git.** The GitHub repository is public.

To see the stored rows: open **Database Records** in the app's sidebar, or the Database tab
of the site in Netlify.

## 2. Backups

Two layers:

1. **Provider backups.** Netlify Database runs on Neon, which keeps history and can restore the
   whole database to an earlier point in time from its console. Check the retention period
   on your plan and use this first after a serious mistake.
2. **Your own copy** (`npm run db:backup`). It doesn't depend on Netlify or Neon being
   reachable and it isn't affected by an account problem.

```bash
npx netlify dev:exec npm run db:backup
```

- `netlify dev:exec` injects `NETLIFY_DB_URL` (run `npx netlify link` once first). You can
  also set `NETLIFY_DB_URL` yourself.
- Exports every table in one consistent read to a gzipped JSON file, then reads the file
  back and checks the row counts. Fails with exit code 1 on any problem, so a scheduler can alert.
- Keeps the newest 30 files. Change with `BACKUP_KEEP=60`; change the folder with
  `BACKUP_DIR=D:\HA_POS_Backups`.

### Schedule it

**Windows (Task Scheduler)**: create a daily task at closing time (e.g. 23:00):

- Program: `cmd.exe`
- Arguments: `/c cd /d C:\ha_pos && npx netlify dev:exec npm run db:backup >> backups\backup.log 2>&1`

**Linux / macOS (cron)**:

```cron
0 23 * * * cd /opt/ha_pos && npx netlify dev:exec npm run db:backup >> backups/backup.log 2>&1
```

Keep `backups/` on an encrypted drive or an access-restricted business cloud folder
(OneDrive / Google Drive for Business), and rotate a USB copy off-site weekly. These files
contain patient data.

## 3. Restore

```bash
npx netlify dev:exec npm run db:restore -- backups/ha_pos-20261005-230000.json.gz
```

- Adds back every row in the backup that is missing from the database, in one transaction.
- **Never changes or deletes an existing row**, so it is safe on the live database (to
  recover records deleted by mistake) and on a fresh one (to rebuild everything).
- To roll the whole database back to an earlier state instead, use the provider's
  point-in-time restore (section 2).

**Test a restore once a month** into a spare database or a database branch. A backup that has
never been restored is not known to work.

## 4. Data quality control

```bash
npx netlify dev:exec npm run qc            # human-readable report
QC_JSON=1 npx netlify dev:exec npm run qc  # JSON, for a dashboard or log
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

- **Daily** (scheduled right after the backup): run `qc`; the branch manager reviews errors.
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
