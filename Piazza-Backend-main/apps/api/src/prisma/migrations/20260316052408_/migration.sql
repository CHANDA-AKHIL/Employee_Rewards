-- AlterTable
ALTER TABLE "employees" ADD COLUMN     "is_admin_approved" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "is_super_admin" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "challenge_participations" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "challenge_id" TEXT NOT NULL,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "challenge_participations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "challenge_participations_employee_id_challenge_id_key" ON "challenge_participations"("employee_id", "challenge_id");

-- AddForeignKey
ALTER TABLE "challenge_participations" ADD CONSTRAINT "challenge_participations_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_participations" ADD CONSTRAINT "challenge_participations_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "challenges"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
