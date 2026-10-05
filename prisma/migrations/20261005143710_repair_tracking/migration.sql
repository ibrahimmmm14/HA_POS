-- CreateTable
CREATE TABLE "repair_tickets" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ticketNo" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "serialNumber" TEXT,
    "deviceBrand" TEXT NOT NULL,
    "deviceModel" TEXT NOT NULL,
    "ear" TEXT NOT NULL,
    "issue" TEXT NOT NULL,
    "underWarranty" BOOLEAN NOT NULL DEFAULT false,
    "repairedBy" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "receivedAt" TEXT NOT NULL,
    "expectedDate" TEXT,
    "completedAt" TEXT,
    "cost" REAL NOT NULL DEFAULT 0,
    "charge" REAL NOT NULL DEFAULT 0,
    "diagnosis" TEXT,
    "notes" TEXT,
    "createdAt" TEXT NOT NULL,
    "updatedAt" TEXT NOT NULL,
    CONSTRAINT "repair_tickets_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "repair_events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ticketId" TEXT NOT NULL,
    "timestamp" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "note" TEXT,
    "userName" TEXT NOT NULL,
    CONSTRAINT "repair_events_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "repair_tickets" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "repair_tickets_ticketNo_key" ON "repair_tickets"("ticketNo");

-- CreateIndex
CREATE INDEX "repair_tickets_clientId_idx" ON "repair_tickets"("clientId");

-- CreateIndex
CREATE INDEX "repair_tickets_serialNumber_idx" ON "repair_tickets"("serialNumber");

-- CreateIndex
CREATE INDEX "repair_events_ticketId_idx" ON "repair_events"("ticketId");
