-- AlterTable: add subcategory column
ALTER TABLE "products" ADD COLUMN "subcategory" VARCHAR;

-- CreateIndex: composite index for category + subcategory filtering
CREATE INDEX "products_category_subcategory_idx" ON "products"("category", "subcategory");

-- Data migration: remap old flat categories to new tree structure
-- audio-headphones → audio + headphones
UPDATE "products" SET "category" = 'audio', "subcategory" = 'headphones' WHERE "category" = 'audio-headphones';

-- laptops-computers → computing + laptops
UPDATE "products" SET "category" = 'computing', "subcategory" = 'laptops' WHERE "category" = 'laptops-computers';

-- monitors-displays → computing + monitors
UPDATE "products" SET "category" = 'computing', "subcategory" = 'monitors' WHERE "category" = 'monitors-displays';

-- keyboards-mice → computing + keyboards-mice
UPDATE "products" SET "category" = 'computing', "subcategory" = 'keyboards-mice' WHERE "category" = 'keyboards-mice';

-- gaming-consoles → gaming + consoles
UPDATE "products" SET "category" = 'gaming', "subcategory" = 'consoles' WHERE "category" = 'gaming-consoles';

-- gaming-accessories → gaming + gaming-accessories
UPDATE "products" SET "category" = 'gaming', "subcategory" = 'gaming-accessories' WHERE "category" = 'gaming-accessories';

-- desks-furniture → home-office + desks-furniture
UPDATE "products" SET "category" = 'home-office', "subcategory" = 'desks-furniture' WHERE "category" = 'desks-furniture';

-- lighting → home-office + lighting
UPDATE "products" SET "category" = 'home-office', "subcategory" = 'lighting' WHERE "category" = 'lighting';

-- other → accessories (no subcategory)
UPDATE "products" SET "category" = 'accessories' WHERE "category" = 'other';
