-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EmailSequenceStatus') THEN
    CREATE TYPE "EmailSequenceStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED');
  END IF;
END$$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "email_sequences" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "EmailSequenceStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_sequences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "email_sequence_steps" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "sequence_id" TEXT NOT NULL,
    "step_order" INTEGER NOT NULL,
    "delay_hours" INTEGER NOT NULL,
    "subject" TEXT NOT NULL,
    "html_body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_sequence_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "email_sequence_enrollments" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "sequence_id" TEXT NOT NULL,
    "subscriber_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "current_step_order" INTEGER NOT NULL DEFAULT 0,
    "next_send_at" TIMESTAMP(3),
    "is_complete" BOOLEAN NOT NULL DEFAULT false,
    "cancelled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_sequence_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "email_sequences_tenant_id_idx" ON "email_sequences"("tenant_id");
CREATE INDEX IF NOT EXISTS "email_sequences_status_idx" ON "email_sequences"("status");
CREATE INDEX IF NOT EXISTS "email_sequence_steps_sequence_id_idx" ON "email_sequence_steps"("sequence_id");
CREATE INDEX IF NOT EXISTS "email_sequence_enrollments_next_send_at_idx" ON "email_sequence_enrollments"("next_send_at");
CREATE INDEX IF NOT EXISTS "email_sequence_enrollments_is_complete_idx" ON "email_sequence_enrollments"("is_complete");
CREATE UNIQUE INDEX IF NOT EXISTS "email_sequence_enrollments_sequence_id_email_key" ON "email_sequence_enrollments"("sequence_id", "email");

-- AddForeignKey
ALTER TABLE "email_sequence_steps" ADD CONSTRAINT "email_sequence_steps_sequence_id_fkey" FOREIGN KEY ("sequence_id") REFERENCES "email_sequences"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "email_sequence_enrollments" ADD CONSTRAINT "email_sequence_enrollments_sequence_id_fkey" FOREIGN KEY ("sequence_id") REFERENCES "email_sequences"("id") ON DELETE CASCADE ON UPDATE CASCADE;
