-- Initial database structure for Universal Self Drive Cars
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'ADMIN');
CREATE TYPE "CarCategory" AS ENUM ('HATCHBACK', 'SEDAN', 'MPV', 'SUV');
CREATE TYPE "BookingStatus" AS ENUM ('NEW', 'CONTACTED', 'CONFIRMED', 'CLOSED', 'CANCELLED');
CREATE TABLE "AdminUser" (
 "id" TEXT NOT NULL,
 "email" TEXT NOT NULL,
 "name" TEXT NOT NULL,
 "passwordHash" TEXT NOT NULL,
 "role" "Role" NOT NULL DEFAULT 'ADMIN',
 "active" BOOLEAN NOT NULL DEFAULT true,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Session" (
 "id" TEXT NOT NULL,
 "tokenHash" TEXT NOT NULL,
 "userId" TEXT NOT NULL,
 "expiresAt" TIMESTAMP(3) NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "LoginThrottle" (
 "id" TEXT NOT NULL,
 "attempts" INTEGER NOT NULL DEFAULT 0,
 "resetAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "LoginThrottle_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Car" (
 "id" TEXT NOT NULL,
 "slug" TEXT NOT NULL,
 "name" TEXT NOT NULL,
 "category" "CarCategory" NOT NULL,
 "description" TEXT NOT NULL DEFAULT '',
 "seats" INTEGER NOT NULL DEFAULT 5,
 "fuel" TEXT NOT NULL DEFAULT 'Petrol',
 "transmission" TEXT NOT NULL DEFAULT 'Manual',
 "mileage" TEXT NOT NULL DEFAULT '',
 "bootSpace" TEXT NOT NULL DEFAULT '',
 "engine" TEXT NOT NULL DEFAULT '',
 "imageUrl" TEXT NOT NULL DEFAULT '/cars/placeholder.svg',
 "gallery" TEXT[] DEFAULT ARRAY[]::TEXT[],
 "rating" DOUBLE PRECISION,
 "price12h" INTEGER NOT NULL DEFAULT 0,
 "priceDay" INTEGER NOT NULL,
 "price3Days" INTEGER NOT NULL DEFAULT 0,
 "priceWeek" INTEGER NOT NULL DEFAULT 0,
 "extraKmRate" INTEGER NOT NULL DEFAULT 6,
 "extraHourRate" INTEGER NOT NULL DEFAULT 200,
 "includedKm" INTEGER NOT NULL DEFAULT 350,
 "deposit" INTEGER NOT NULL DEFAULT 0,
 "featured" BOOLEAN NOT NULL DEFAULT false,
 "available" BOOLEAN NOT NULL DEFAULT true,
 "published" BOOLEAN NOT NULL DEFAULT true,
 "sortOrder" INTEGER NOT NULL DEFAULT 0,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "Car_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Location" (
 "id" TEXT NOT NULL,
 "name" TEXT NOT NULL,
 "subtitle" TEXT NOT NULL DEFAULT '',
 "description" TEXT NOT NULL DEFAULT '',
 "active" BOOLEAN NOT NULL DEFAULT true,
 "sortOrder" INTEGER NOT NULL DEFAULT 0,
 CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Faq" (
 "id" TEXT NOT NULL,
 "question" TEXT NOT NULL,
 "answer" TEXT NOT NULL,
 "published" BOOLEAN NOT NULL DEFAULT true,
 "sortOrder" INTEGER NOT NULL DEFAULT 0,
 CONSTRAINT "Faq_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Testimonial" (
 "id" TEXT NOT NULL,
 "name" TEXT NOT NULL,
 "area" TEXT NOT NULL DEFAULT '',
 "carName" TEXT NOT NULL DEFAULT '',
 "text" TEXT NOT NULL,
 "rating" INTEGER NOT NULL DEFAULT 5,
 "verified" BOOLEAN NOT NULL DEFAULT false,
 "published" BOOLEAN NOT NULL DEFAULT false,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "Testimonial_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "SiteSettings" (
 "id" TEXT NOT NULL DEFAULT 'main',
 "businessName" TEXT NOT NULL DEFAULT 'Universal Self Drive Cars',
 "whatsappNumber" TEXT NOT NULL DEFAULT '919700093666',
 "phoneNumber" TEXT NOT NULL DEFAULT '+91 97000 93666',
 "contactEmail" TEXT NOT NULL DEFAULT 'info@universalselfdrivecars.in',
 "address" TEXT NOT NULL DEFAULT 'Vanasthalipuram, Hyderabad',
 "mapsUrl" TEXT NOT NULL DEFAULT 'https://www.google.com/maps/search/?api=1&query=Vanasthalipuram+Hyderabad',
 "headline" TEXT NOT NULL DEFAULT 'Drive Your Way. No Deposit.',
 "description" TEXT NOT NULL DEFAULT 'Self-drive cars in Hyderabad. Zero security deposit and convenient doorstep delivery.',
 CONSTRAINT "SiteSettings_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "BookingIntent" (
 "id" TEXT NOT NULL,
 "carId" TEXT NOT NULL,
 "customerName" TEXT NOT NULL,
 "customerPhone" TEXT NOT NULL,
 "pickupLocation" TEXT NOT NULL,
 "pickupDate" TIMESTAMP(3),
 "returnDate" TIMESTAMP(3),
 "notes" TEXT NOT NULL DEFAULT '',
 "status" "BookingStatus" NOT NULL DEFAULT 'NEW',
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "BookingIntent_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "AuditLog" (
 "id" TEXT NOT NULL,
 "userId" TEXT,
 "action" TEXT NOT NULL,
 "resource" TEXT NOT NULL,
 "resourceId" TEXT NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");
CREATE UNIQUE INDEX "Car_slug_key" ON "Car"("slug");
CREATE INDEX "Car_published_category_sortOrder_idx" ON "Car"("published","category","sortOrder");
CREATE UNIQUE INDEX "Location_name_key" ON "Location"("name");
CREATE INDEX "BookingIntent_createdAt_idx" ON "BookingIntent"("createdAt");
CREATE INDEX "BookingIntent_status_idx" ON "BookingIntent"("status");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AdminUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BookingIntent" ADD CONSTRAINT "BookingIntent_carId_fkey" FOREIGN KEY ("carId") REFERENCES "Car"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
