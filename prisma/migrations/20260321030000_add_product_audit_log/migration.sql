-- CreateTable
CREATE TABLE "product_audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "changes" TEXT,
    "user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_audit_logs_product_id_idx" ON "product_audit_logs"("product_id");

-- CreateIndex
CREATE INDEX "product_audit_logs_tenant_id_idx" ON "product_audit_logs"("tenant_id");

-- CreateIndex
CREATE INDEX "product_audit_logs_created_at_idx" ON "product_audit_logs"("created_at");

-- AddForeignKey
ALTER TABLE "product_audit_logs" ADD CONSTRAINT "product_audit_logs_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
