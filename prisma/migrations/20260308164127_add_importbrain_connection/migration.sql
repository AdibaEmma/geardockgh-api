-- CreateTable
CREATE TABLE "importbrain_connections" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "importbrain_tenant_id" TEXT NOT NULL,
    "integration_id" TEXT NOT NULL,
    "api_key" TEXT NOT NULL,
    "api_url" TEXT NOT NULL,
    "callback_key" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "connected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "disconnected_at" TIMESTAMP(3),

    CONSTRAINT "importbrain_connections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "importbrain_connections_tenant_id_key" ON "importbrain_connections"("tenant_id");
