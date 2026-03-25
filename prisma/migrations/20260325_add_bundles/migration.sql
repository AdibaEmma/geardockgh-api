-- CreateTable
CREATE TABLE IF NOT EXISTS "bundles" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "tagline" TEXT,
    "description" TEXT,
    "price_pesewas" INTEGER NOT NULL,
    "compare_price_pesewas" INTEGER,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "is_preorder" BOOLEAN NOT NULL DEFAULT false,
    "stock_count" INTEGER NOT NULL DEFAULT 0,
    "image_url" TEXT,
    "category" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "bundles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "bundle_items" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "bundle_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "is_bonus" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bundle_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "bundles_slug_tenant_id_key" ON "bundles"("slug", "tenant_id");
CREATE INDEX IF NOT EXISTS "bundles_tenant_id_idx" ON "bundles"("tenant_id");
CREATE INDEX IF NOT EXISTS "bundles_is_published_idx" ON "bundles"("is_published");
CREATE INDEX IF NOT EXISTS "bundles_is_featured_idx" ON "bundles"("is_featured");
CREATE INDEX IF NOT EXISTS "bundle_items_bundle_id_idx" ON "bundle_items"("bundle_id");
CREATE INDEX IF NOT EXISTS "bundle_items_product_id_idx" ON "bundle_items"("product_id");

-- AddForeignKey
ALTER TABLE "bundle_items" ADD CONSTRAINT "bundle_items_bundle_id_fkey" FOREIGN KEY ("bundle_id") REFERENCES "bundles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bundle_items" ADD CONSTRAINT "bundle_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
