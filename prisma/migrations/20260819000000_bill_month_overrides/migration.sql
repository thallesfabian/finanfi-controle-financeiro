CREATE TABLE "BillMonthOverride" (
  "id" TEXT NOT NULL,
  "month" INTEGER NOT NULL,
  "year" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "dueDay" INTEGER NOT NULL,
  "category" TEXT NOT NULL,
  "paymentMethod" TEXT,
  "billId" TEXT NOT NULL,
  CONSTRAINT "BillMonthOverride_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BillMonthOverride_billId_fkey" FOREIGN KEY ("billId") REFERENCES "Bill"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "BillMonthOverride_billId_month_year_key" ON "BillMonthOverride"("billId", "month", "year");
