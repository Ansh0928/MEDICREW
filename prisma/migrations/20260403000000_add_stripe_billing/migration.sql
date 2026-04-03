-- AlterTable: add Stripe billing fields to Patient
ALTER TABLE "Patient" ADD COLUMN "stripeCustomerId" TEXT;
ALTER TABLE "Patient" ADD COLUMN "stripeSubscriptionId" TEXT;
ALTER TABLE "Patient" ADD COLUMN "subscriptionPlan" TEXT NOT NULL DEFAULT 'free';
ALTER TABLE "Patient" ADD COLUMN "subscriptionStatus" TEXT NOT NULL DEFAULT 'active';
ALTER TABLE "Patient" ADD COLUMN "subscriptionPeriodEnd" TIMESTAMP(3);
