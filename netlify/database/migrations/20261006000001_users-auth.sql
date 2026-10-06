-- User accounts and access control: password, active flag, per-user permission overrides,
-- plus a log of sign-in activity.
ALTER TABLE "users" ADD COLUMN "passwordHash" TEXT;
-- JSON array of permission keys that replaces the role's defaults; NULL = use the role's defaults
ALTER TABLE "users" ADD COLUMN "permissions" TEXT;
ALTER TABLE "users" ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "users" ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN "lastLoginAt" TEXT;
ALTER TABLE "users" ADD COLUMN "createdAt" TEXT;

-- CreateTable
CREATE TABLE "login_logs" (
    "id" TEXT NOT NULL,
    "timestamp" TEXT NOT NULL,
    "userId" TEXT,
    "username" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "detail" TEXT,

    CONSTRAINT "login_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "login_logs_timestamp_idx" ON "login_logs"("timestamp");
CREATE INDEX "login_logs_username_idx" ON "login_logs"("username");

-- Demo accountant account (no password until an administrator sets one)
INSERT INTO "users" ("id", "username", "nameAr", "nameEn", "role", "branchIds", "currentBranchId")
VALUES ('usr-05', 'accountant', 'أ. منى الدوسري (محاسبة)', 'Mona Al-Dosari (Accountant)', 'accountant', '["br-01","br-02","br-03"]', 'br-01')
ON CONFLICT ("id") DO NOTHING;
