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
| `inventory_prices` | editing item prices (single and per category) |
| `messaging`, `migration`, `records` | messaging, data import, database records |
| `reports`, `finance` | reports and the finance report |
| `settings` | branches, hospitals, doctors, insurance companies |
| `users` | this screen: users, permissions, sign-in log |

Users are also limited to the branches assigned to them (the finance report only shows those branches).

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
