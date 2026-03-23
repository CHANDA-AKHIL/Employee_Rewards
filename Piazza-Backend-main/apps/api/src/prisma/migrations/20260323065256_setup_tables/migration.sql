-- AlterTable
ALTER TABLE "challenge_participations" ADD COLUMN     "submission_url" TEXT;

-- AlterTable
ALTER TABLE "challenges" ADD COLUMN     "briefUrl" TEXT;

-- AlterTable
ALTER TABLE "employees" ADD COLUMN     "emailOtp" TEXT,
ADD COLUMN     "emailOtpExpiry" TIMESTAMP(3),
ADD COLUMN     "isEmailVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "organization" TEXT;
