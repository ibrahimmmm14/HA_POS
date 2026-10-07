# Users, Permissions & Sign-in Log

Everyone must sign in. Each API route checks the signed-in user's permissions on the server,
so hiding a menu item is never the only protection.

## First-time setup (once, right after deploying)

1. Open the site. While no account has a password, the sign-in page shows **First-time setup**.
2. Choose a strong password for the administrator account (`admin`). Setup closes permanently
   as soon as any password exists.
3. Do this immediately after deploying: whoever opens the page first sets the administrator password.
   To lock it down further, set a `SETUP_CODE` environment variable in Netlify; the setup form then
   asks for that code too.

Optional environment variables (Netlify → Site settings → Environment variables):

| Variable | Purpose |
| --- | --- |
| `SETUP_CODE` | Code required on the first-time setup form |
| `SESSION_SECRET` | 16+ random characters used to sign session cookies. If unset, a key derived from `NETLIFY_DB_URL` is used. Changing it signs everyone out |

## Roles and permissions

A role gives a default set of permissions; an administrator can **customise** the list for one user.
A *System administrator* (`super_admin`) always has every permission.

| Permission | Opens |
| --- | --- |
| `dashboard`, `pos`, `invoices`, `earmolds`, `repairs`, `clients` | the matching screens |
| `inventory`, `serials`, `transfers` | stock, serial numbers, branch transfers |
| `items_add` | adding new items to the catalogue **(administrator only)** |
| `inventory_prices` | editing item prices, single and per category **(administrator only)** |
| `messaging` | messaging |
| `migration`, `records` | data import, raw database records **(administrator only)** |
| `reports`, `finance` | reports and the finance report |
| `settings` | branches, hospitals, doctors, insurance companies (master data) **(administrator only)** |
| `users` | this screen: users, permissions, sign-in log **(administrator only)** |

### Administrator-only permissions

`settings`, `items_add`, `inventory_prices`, `migration`, `records` and `users` can only be held by a
*System administrator*. They are not part of any other role, the permissions screen shows them locked, and
the server ignores them even if an old custom list contains them. Everyone can still *read* master data
(branches, doctors, hospitals, insurance companies) and the item list, because invoices and POS need them.

## Branch isolation

Everyone except a system administrator only sees the data of the branch(es) assigned to them.
This is enforced on the server in every route, not just hidden in the menus:

| Data | Rule |
| --- | --- |
| Patients | each patient file belongs to one branch (`clients.branchId`); other branches' patients cannot be listed, opened or edited, and only an administrator can move a patient |
| Invoices, repairs | by their own branch; creating one for another branch, a patient of another branch, or from another branch's warehouse is refused |
| Lab orders, audiograms, messages | follow the patient's branch; converting a lab order creates the invoice in the patient's branch |
| Items | the catalogue is shared, but stock levels and serial numbers only show the user's own warehouses |
| Transfers | a branch sees what it sends and receives; only the **sending** branch dispatches or cancels, only the **receiving** branch confirms receipt |
| Dashboard, reports, finance, activity log | only the user's branches |

A record of another branch is reported as "not found", so its existence is not revealed.
Existing patients were assigned to the branch of their first invoice (otherwise their first repair, otherwise the first branch).
Audit-log entries now record the real user and branch that made the change.

## Managing users (Users & Permissions screen)

- **Add user**: a temporary password is generated; the user must change it at first sign-in.
- **Edit**: names, role, branches, permissions, active/disabled.
- **Set password**: administrator sets a new temporary password (also lifts a lockout).
- Safeguards: you cannot disable yourself, change your own role, or remove the last active administrator.
- Disabling a user, changing permissions, or changing/resetting a password takes effect on the next request.

## Sign-in security

- Passwords are stored as salted `scrypt` hashes (8 characters minimum).
- Sessions are signed, HttpOnly, SameSite=Lax cookies lasting 12 hours.
- 5 failed attempts for a username within 15 minutes lock that username for the rest of the window.
- Changing or resetting a password ends that user's other open sessions.

## Sign-in log

**Users & Permissions → Sign-in Log** lists sign-ins, sign-outs, failed attempts (with the reason),
lockouts, password changes and resets, with time (Riyadh), IP address and browser. Filter by date, user and result.

## Finance report

**Finance Report** (permission `finance`): choose a period (today, last 7 days, this month, last month,
this year, or any dates) and optionally a branch. It shows net sales, VAT, discounts, collections by payment
method, receivables, estimated cost of goods and gross profit, with breakdowns by day, branch and item category.
Voided and returned invoices are excluded. Cost uses each item's *current* cost price, so it is an estimate for
past periods. Export to CSV or print from the page.

## Backups

Backups from `npm run db:backup` include the `users` table (password hashes). Treat them as sensitive.

## Warehouses (المستودعات)

- **Create / edit** from Settings → *المستودعات* (administrator only). Each warehouse belongs to one branch; a warehouse that holds stock, serial numbers or open transfers cannot be moved to another branch.
- **Link to users** in the user dialog (*المستودعات المسموح بها*). Pick one or more warehouses of the user's branches; leave empty to allow every warehouse of their branches. Administrators are never limited.
- A user only sees stock, serial numbers and transfers of the warehouses they work with, and invoices take stock only from those warehouses.
- **Stock transfers between warehouses** (same branch or another one) are a popup inside the **المخزون** (Inventory) screen: pending → sent (needs the sending warehouse) → received (needs the receiving warehouse); a transfer can be cancelled by the sender before receipt. The quantity must be available in the sending warehouse. Stock moves when the receiver confirms.
- **Serial number lookup** is a popup in the Inventory screen. It shows the product and where the unit is even when it sits in another warehouse or branch; the patient and invoice are shown only when they belong to the user's branches.
- The old pages `/inventory/transfers` and `/inventory/serials` redirect to `/inventory`.
