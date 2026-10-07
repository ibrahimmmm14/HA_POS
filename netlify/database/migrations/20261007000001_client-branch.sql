-- Each patient file belongs to a branch, so non-administrators only see their own branch's patients.
ALTER TABLE "clients" ADD COLUMN "branchId" TEXT;

-- Existing patients: the branch of their first invoice, else their first repair ticket, else the first branch.
UPDATE "clients" c SET "branchId" = COALESCE(
  (SELECT i."branchId" FROM "invoices" i WHERE i."clientId" = c."id" ORDER BY i."date" ASC LIMIT 1),
  (SELECT r."branchId" FROM "repair_tickets" r WHERE r."clientId" = c."id" ORDER BY r."createdAt" ASC LIMIT 1),
  (SELECT b."id" FROM "branches" b ORDER BY b."id" ASC LIMIT 1)
);

ALTER TABLE "clients" ALTER COLUMN "branchId" SET NOT NULL;
ALTER TABLE "clients" ADD CONSTRAINT "clients_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "clients_branchId_idx" ON "clients"("branchId");
