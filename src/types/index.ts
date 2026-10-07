export type Role =
  | 'super_admin'
  | 'branch_manager'
  | 'cashier'
  | 'inventory_officer'
  | 'audiologist'
  | 'accountant';

export interface User {
  id: string;
  username: string;
  nameAr: string;
  nameEn: string;
  role: Role;
  branchIds: string[];
  currentBranchId: string;
}

export interface Branch {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  cityAr: string;
  cityEn: string;
  addressAr: string;
  addressEn: string;
  phone: string;
  taxNumber: string;
  defaultWarehouseId: string;
}

export interface Warehouse {
  id: string;
  branchId: string;
  code: string;
  nameAr: string;
  nameEn: string;
}

export type ItemCategory =
  | 'hearing_aids'
  | 'earmolds'
  | 'batteries'
  | 'spare_parts'
  | 'accessories';

export interface Item {
  id: string;
  sku: string;
  barcode: string;
  nameAr: string;
  nameEn: string;
  category: ItemCategory;
  brand: string;
  model: string;
  unit: string;
  costPrice: number;
  salePrice: number;
  taxRate: number; // e.g. 0.15
  hasSerials: boolean;
  warrantyMonths: number;
  minStockLevel: number;
  image?: string;
  stockByWarehouse: Record<string, number>; // warehouseId -> qty
}

export type SerialStatus = 'in_stock' | 'sold' | 'in_repair' | 'trial';

export interface SerialUnit {
  id: string;
  itemId: string;
  serialNumber: string;
  branchId: string;
  warehouseId: string;
  status: SerialStatus;
  invoiceId?: string;
  clientId?: string;
  warrantyEndDate?: string;
}

export interface Doctor {
  id: string;
  nameAr: string;
  nameEn: string;
  specialtyAr: string;
  specialtyEn: string;
  phone: string;
  hospitalId: string;
  commissionPercent: number;
}

export interface Hospital {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  cityAr: string;
  cityEn: string;
  phone: string;
}

export interface InsuranceCompany {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  phone: string;
  defaultCoveragePercent: number;
  requiresPreApproval: boolean;
}

export interface Client {
  id: string;
  fileNo: string;
  nationalId: string;
  nameAr: string;
  nameEn: string;
  phone: string;
  secondaryPhone?: string;
  gender: 'male' | 'female';
  dob: string;
  age: number;
  cityAr: string;
  cityEn: string;
  address: string;
  doctorId?: string;
  hospitalId?: string;
  insuranceId?: string;
  insurancePolicyNo?: string;
  notes?: string;
  createdAt: string;
  /** Branch the patient file belongs to */
  branchId?: string;
}

export interface Audiogram {
  id: string;
  clientId: string;
  date: string;
  audiologistName: string;
  testType: string; // e.g., "Pure Tone Audiometry (PTA)"
  frequencies: number[]; // [125, 250, 500, 1000, 2000, 4000, 8000]
  leftAir: Record<number, number | null>; // Hz -> dB HL
  rightAir: Record<number, number | null>;
  leftBone: Record<number, number | null>;
  rightBone: Record<number, number | null>;
  ptaLeft: number;
  ptaRight: number;
  sdsLeft: number; // Speech discrimination score %
  sdsRight: number;
  notes?: string;
}

export type EarmoldStatus =
  | 'pending'
  | 'sent_to_lab'
  | 'in_production'
  | 'ready'
  | 'delivered';

export type EarmoldShellType =
  | 'hard_acrylic'
  | 'soft_silicone'
  | 'skeleton'
  | 'semi_skeleton'
  | 'canal'
  | 'micro_cic';

export type EarmoldVentType =
  | 'none'
  | '1.0mm'
  | '1.5mm'
  | '2.0mm'
  | '3.0mm'
  | 'pressure';

export interface EarmoldOrder {
  id: string;
  orderNo: string;
  clientId: string;
  ear: 'left' | 'right' | 'both';
  shellType: EarmoldShellType;
  color: string;
  ventType: EarmoldVentType;
  deviceBrand?: string;
  deviceModel?: string;
  impressionDate: string;
  impressionBy: string;
  workshop: string;
  expectedDate: string;
  status: EarmoldStatus;
  price: number;
  cost: number;
  notes?: string;
  invoiceId?: string;
  createdAt: string;
}

export interface InvoiceLine {
  id: string;
  itemId: string;
  itemCode: string;
  itemNameAr: string;
  itemNameEn: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  grossAmount: number;
  discountPercent: number;
  discountValue: number;
  netAmount: number;
  taxPercent: number;
  taxAmount: number;
  totalAmount: number;
  warehouseId: string;
  serialNumbers?: string[];
  isDelivered: boolean;
  isReady: boolean;
  isTrial: boolean;
  notes?: string;
}

export type PaymentMethod =
  | 'cash'
  | 'mada'
  | 'visa'
  | 'bank_transfer'
  | 'insurance'
  | 'split';

export interface SplitPayment {
  cashAmount: number;
  madaAmount: number;
  visaAmount: number;
  insuranceAmount: number;
  depositAmount: number;
}

export interface InsuranceDetails {
  companyId: string;
  approvalNo: string;
  coveredAmount: number;
  patientCopay: number;
}

export interface Invoice {
  id: string;
  invoiceNo: string;
  date: string;
  deliveryDate: string;
  branchId: string;
  warehouseId: string;
  costCenter: string;
  workshop: string;
  clientId: string;
  doctorId?: string;
  hospitalId?: string;
  sellerName: string;
  lines: InvoiceLine[];
  subtotalBeforeTax: number;
  totalDiscount: number;
  taxAmount: number;
  grandTotal: number;
  depositPaid: number;
  amountPaid: number;
  remainingDue: number;
  paymentMethod: PaymentMethod;
  paymentDetails?: SplitPayment;
  isInsurance: boolean;
  insuranceDetails?: InsuranceDetails;
  deliveryStatus: 'delivered' | 'ready' | 'trial' | 'pending';
  returnOfInvoiceId?: string;
  status: 'active' | 'voided' | 'returned';
  earmoldOrderId?: string;
  notes?: string;
}

export interface StockTransfer {
  id: string;
  transferNo: string;
  fromBranchId: string;
  fromWarehouseId: string;
  toBranchId: string;
  toWarehouseId: string;
  status: 'pending' | 'in_transit' | 'completed' | 'cancelled';
  requestedBy: string;
  approvedBy?: string;
  receivedBy?: string;
  items: {
    itemId: string;
    itemCode: string;
    itemNameAr: string;
    itemNameEn: string;
    quantity: number;
    serials?: string[];
  }[];
  createdAt: string;
  completedAt?: string;
  notes?: string;
}

export interface MessageLog {
  id: string;
  clientId: string;
  clientName: string;
  phone: string;
  channel: 'whatsapp' | 'sms';
  trigger: 'order_ready' | 'repair_ready' | 'invoice_receipt' | 'appointment' | 'battery_reminder';
  content: string;
  status: 'sent' | 'delivered' | 'failed';
  sentAt: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  branchId: string;
  action: string;
  entityType: string;
  entityId: string;
  details: string;
}

export interface MessageTemplate {
  id: string;
  trigger: 'order_ready' | 'repair_ready' | 'invoice_receipt' | 'appointment' | 'battery_reminder';
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
}

// ─── Device Repairs ───────────────────────────────────────────────────────

export type RepairStatus =
  | 'received'
  | 'diagnosing'
  | 'sent_to_manufacturer'
  | 'repairing'
  | 'ready'
  | 'delivered'
  | 'cancelled';

export interface RepairEvent {
  id: string;
  ticketId: string;
  timestamp: string;
  fromStatus?: RepairStatus | null;
  toStatus: RepairStatus;
  note?: string | null;
  userName: string;
}

export interface RepairTicket {
  id: string;
  ticketNo: string;
  clientId: string;
  branchId: string;
  serialNumber?: string | null;
  deviceBrand: string;
  deviceModel: string;
  ear: 'left' | 'right' | 'both';
  issue: string;
  underWarranty: boolean;
  repairedBy: string;
  status: RepairStatus;
  receivedAt: string;
  expectedDate?: string | null;
  completedAt?: string | null;
  cost: number;
  charge: number;
  diagnosis?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  events?: RepairEvent[];
}
