ALTER TABLE "Bill" ADD COLUMN "month" INTEGER;
ALTER TABLE "Bill" ADD COLUMN "year" INTEGER;
UPDATE "Bill" SET "month" = EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER, "year" = EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER WHERE "recurring" = false;
CREATE TABLE "MonthlyPlan" (
  "id" TEXT NOT NULL,
  "month" INTEGER NOT NULL,
  "year" INTEGER NOT NULL,
  "income" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "userId" TEXT NOT NULL,
  CONSTRAINT "MonthlyPlan_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MonthlyPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "MonthlyPlan_userId_month_year_key" ON "MonthlyPlan"("userId", "month", "year");
