ALTER TYPE "BookingStatus" ADD VALUE 'COMPLETED';

CREATE TABLE "Customer" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "googleId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "Customer_googleId_key" ON "Customer"("googleId");
CREATE INDEX "Customer_email_idx" ON "Customer"("email");

CREATE TABLE "CustomerSession" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tokenHash" TEXT NOT NULL,
  "customerId" TEXT NOT NULL REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "CustomerSession_tokenHash_key" ON "CustomerSession"("tokenHash");
CREATE INDEX "CustomerSession_expiresAt_idx" ON "CustomerSession"("expiresAt");

CREATE TABLE "CustomerOAuthState" (
  "tokenHash" TEXT NOT NULL PRIMARY KEY,
  "codeVerifier" TEXT NOT NULL,
  "nonce" TEXT NOT NULL,
  "returnTo" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "CustomerOAuthState_expiresAt_idx" ON "CustomerOAuthState"("expiresAt");

-- Existing enquiries stay unclaimed; never infer account ownership from a name/phone.
ALTER TABLE "BookingIntent" ADD COLUMN "customerId" TEXT;
ALTER TABLE "BookingIntent" ADD CONSTRAINT "BookingIntent_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "BookingIntent_customerId_createdAt_idx" ON "BookingIntent"("customerId", "createdAt");

CREATE TABLE "CarRating" (
  "bookingId" TEXT NOT NULL PRIMARY KEY,
  "score" INTEGER NOT NULL CHECK ("score" BETWEEN 1 AND 5),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CarRating_bookingId_fkey" FOREIGN KEY ("bookingId")
    REFERENCES "BookingIntent"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
