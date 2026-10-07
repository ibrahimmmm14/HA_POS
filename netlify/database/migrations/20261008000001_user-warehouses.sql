-- Link users to warehouses: JSON array of warehouse ids a user may work with.
-- NULL means every warehouse of the user's branches.
ALTER TABLE "users" ADD COLUMN "warehouseIds" TEXT;
