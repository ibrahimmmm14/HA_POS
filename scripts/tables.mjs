// Every HA_POS table as a Prisma delegate name, in foreign-key order
// (a table only references tables listed before it), so a restore can insert top to bottom.
export const TABLES = [
  'branch',
  'warehouse',
  'user',
  'hospital',
  'doctor',
  'insuranceCompany',
  'item',
  'serialUnit',
  'client',
  'audiogram',
  'earmoldOrder',
  'invoice',
  'stockTransfer',
  'messageTemplate',
  'messageLog',
  'auditLog',
  'loginLog',
  'repairTicket',
  'repairEvent',
];

export function timestamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

export function requireDatabaseUrl() {
  if (!process.env.NETLIFY_DB_URL) {
    console.error(
      'NETLIFY_DB_URL is not set. Run through the Netlify CLI so it is injected:\n' +
        '  npx netlify dev:exec npm run <script>\n' +
        'or set NETLIFY_DB_URL to the database connection string first.'
    );
    process.exit(1);
  }
}
