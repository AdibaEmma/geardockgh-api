-- AlterTable
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "options_json" TEXT;

-- AlterTable
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "selected_options_json" TEXT;

-- AlterTable
ALTER TABLE "preorders" ADD COLUMN IF NOT EXISTS "selected_options_json" TEXT;
