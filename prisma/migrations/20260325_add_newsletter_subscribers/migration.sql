-- CreateTable
CREATE TABLE IF NOT EXISTS "newsletter_subscribers" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'website',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "subscribed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unsubscribed_at" TIMESTAMP(3),

    CONSTRAINT "newsletter_subscribers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "newsletter_subscribers_email_tenant_id_key" ON "newsletter_subscribers"("email", "tenant_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "newsletter_subscribers_tenant_id_idx" ON "newsletter_subscribers"("tenant_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "newsletter_subscribers_is_active_idx" ON "newsletter_subscribers"("is_active");
