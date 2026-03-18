/*
  Warnings:

  - Added the required column `balance_pesewas` to the `preorders` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "preorders" ADD COLUMN     "balance_pesewas" INTEGER NOT NULL,
ADD COLUMN     "paystack_balance_reference" TEXT;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "preorder_deposit_type" TEXT,
ADD COLUMN     "preorder_deposit_value" INTEGER,
ADD COLUMN     "preorder_min_units" INTEGER,
ADD COLUMN     "preorder_slots_taken" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "notification_logs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "preorder_id" TEXT,
    "order_id" TEXT,
    "customer_id" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "template_name" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "payload" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error" TEXT,
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notification_logs_tenant_id_idx" ON "notification_logs"("tenant_id");

-- CreateIndex
CREATE INDEX "notification_logs_customer_id_idx" ON "notification_logs"("customer_id");

-- CreateIndex
CREATE INDEX "notification_logs_preorder_id_idx" ON "notification_logs"("preorder_id");

-- CreateIndex
CREATE INDEX "notification_logs_status_idx" ON "notification_logs"("status");
