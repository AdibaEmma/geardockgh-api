-- CreateEnum
CREATE TYPE "LeadSource" AS ENUM ('NEWSLETTER', 'REGISTRATION', 'WHATSAPP_INQUIRY', 'STOCK_NOTIFICATION', 'CART_ACTIVITY', 'WISHLIST', 'DIRECT_VISIT', 'REFERRAL');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'ENGAGED', 'QUALIFIED', 'CONVERTED', 'INACTIVE');

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "customer_id" TEXT,
    "email" TEXT NOT NULL,
    "source" "LeadSource" NOT NULL,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "score" INTEGER NOT NULL DEFAULT 0,
    "first_touch_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_activity_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "converted_at" TIMESTAMP(3),
    "converted_order_id" TEXT,
    "metadata" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_activities" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "product_id" TEXT,
    "metadata" TEXT,
    "score_delta" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_scoring_rules" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lead_scoring_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "leads_tenant_id_idx" ON "leads"("tenant_id");
CREATE INDEX "leads_status_idx" ON "leads"("status");
CREATE INDEX "leads_score_idx" ON "leads"("score");
CREATE INDEX "leads_source_idx" ON "leads"("source");
CREATE INDEX "leads_customer_id_idx" ON "leads"("customer_id");
CREATE INDEX "leads_last_activity_at_idx" ON "leads"("last_activity_at");
CREATE UNIQUE INDEX "leads_email_tenant_id_key" ON "leads"("email", "tenant_id");

-- CreateIndex
CREATE INDEX "lead_activities_lead_id_idx" ON "lead_activities"("lead_id");
CREATE INDEX "lead_activities_tenant_id_idx" ON "lead_activities"("tenant_id");
CREATE INDEX "lead_activities_action_idx" ON "lead_activities"("action");
CREATE INDEX "lead_activities_created_at_idx" ON "lead_activities"("created_at");

-- CreateIndex
CREATE INDEX "lead_scoring_rules_tenant_id_idx" ON "lead_scoring_rules"("tenant_id");
CREATE UNIQUE INDEX "lead_scoring_rules_tenant_id_action_key" ON "lead_scoring_rules"("tenant_id", "action");

-- AddForeignKey
ALTER TABLE "lead_activities" ADD CONSTRAINT "lead_activities_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
