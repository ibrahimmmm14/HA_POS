import fs from 'fs';
import path from 'path';
import {
  Branch,
  Warehouse,
  User,
  Doctor,
  Hospital,
  InsuranceCompany,
  Item,
  SerialUnit,
  Client,
  Audiogram,
  EarmoldOrder,
  Invoice,
  StockTransfer,
  MessageTemplate,
  MessageLog,
  AuditLog,
} from '@/types';
import {
  initialBranches,
  initialWarehouses,
  initialUsers,
  initialDoctors,
  initialHospitals,
  initialInsuranceCompanies,
  initialItems,
  initialSerialUnits,
  initialClients,
  initialAudiograms,
  initialEarmoldOrders,
  initialInvoices,
  initialTransfers,
  initialTemplates,
  initialMessageLogs,
  initialAuditLogs,
} from './seedData';

export interface DatabaseSchema {
  branches: Branch[];
  warehouses: Warehouse[];
  users: User[];
  doctors: Doctor[];
  hospitals: Hospital[];
  insuranceCompanies: InsuranceCompany[];
  items: Item[];
  serialUnits: SerialUnit[];
  clients: Client[];
  audiograms: Audiogram[];
  earmoldOrders: EarmoldOrder[];
  invoices: Invoice[];
  transfers: StockTransfer[];
  templates: MessageTemplate[];
  messageLogs: MessageLog[];
  auditLogs: AuditLog[];
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

function getInitialData(): DatabaseSchema {
  return {
    branches: initialBranches,
    warehouses: initialWarehouses,
    users: initialUsers,
    doctors: initialDoctors,
    hospitals: initialHospitals,
    insuranceCompanies: initialInsuranceCompanies,
    items: initialItems,
    serialUnits: initialSerialUnits,
    clients: initialClients,
    audiograms: initialAudiograms,
    earmoldOrders: initialEarmoldOrders,
    invoices: initialInvoices,
    transfers: initialTransfers,
    templates: initialTemplates,
    messageLogs: initialMessageLogs,
    auditLogs: initialAuditLogs,
  };
}

export function readDb(): DatabaseSchema {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_FILE)) {
      const initial = getInitialData();
      fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf-8');
      return initial;
    }
    const content = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(content) as DatabaseSchema;
  } catch (error) {
    console.error('Error reading database file, resetting to initial state:', error);
    return getInitialData();
  }
}

export function writeDb(data: DatabaseSchema): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error writing to database file:', error);
  }
}

// Helper to log system actions
export function logAudit(
  action: string,
  entityType: string,
  entityId: string,
  details: string,
  userId = 'usr-01',
  userName = 'د. طارق العتيبي',
  branchId = 'br-01'
) {
  const db = readDb();
  const log: AuditLog = {
    id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
    userId,
    userName,
    branchId,
    action,
    entityType,
    entityId,
    details,
  };
  db.auditLogs.unshift(log);
  writeDb(db);
}
