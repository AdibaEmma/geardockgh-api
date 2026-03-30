-- CreateEnum
CREATE TYPE "ShippingMethod" AS ENUM ('AIR', 'SEA');

-- AlterTable
ALTER TABLE "products" ADD COLUMN "shipping_method" "ShippingMethod";
