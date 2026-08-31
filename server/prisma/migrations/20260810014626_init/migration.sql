-- CreateEnum
CREATE TYPE "PostStatus" AS ENUM ('draft', 'published');

-- CreateEnum
CREATE TYPE "PageStatus" AS ENUM ('draft', 'published');

-- CreateEnum
CREATE TYPE "NavItemType" AS ENUM ('INTERNAL_PAGE', 'EXTERNAL_URL');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'admin',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NavItem" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" "NavItemType" NOT NULL,
    "pageKey" TEXT,
    "url" TEXT,
    "showInNavbar" BOOLEAN NOT NULL DEFAULT false,
    "showInFooter" BOOLEAN NOT NULL DEFAULT false,
    "isParent" BOOLEAN NOT NULL DEFAULT false,
    "parentId" TEXT,
    "orderNavbar" INTEGER NOT NULL DEFAULT 0,
    "orderFooter" INTEGER,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NavItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HomeSection" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT,
    "data" JSONB NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomeSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Page" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "pageKey" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "layout" JSONB NOT NULL,
    "status" "PageStatus" NOT NULL DEFAULT 'draft',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Page_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Media" (
    "id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "bucket" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "alt" TEXT,
    "title" TEXT,
    "description" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "cropX" DOUBLE PRECISION,
    "cropY" DOUBLE PRECISION,
    "cropWidth" DOUBLE PRECISION,
    "cropHeight" DOUBLE PRECISION,
    "cropRatio" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Post" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "coverMediaId" TEXT,
    "status" "PostStatus" NOT NULL DEFAULT 'draft',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "views" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "siteName" TEXT NOT NULL,
    "cnpj" TEXT,
    "professionalRegistration" TEXT,
    "contactEmail" TEXT,
    "logoUrl" TEXT,
    "phone" TEXT,
    "socials" JSONB NOT NULL DEFAULT '[]',
    "whatsappEnabled" BOOLEAN NOT NULL DEFAULT false,
    "whatsappLink" TEXT,
    "whatsappMessage" TEXT,
    "whatsappPosition" TEXT,
    "hideScheduleCta" BOOLEAN NOT NULL DEFAULT false,
    "brandTagline" VARCHAR(80),
    "theme" JSONB NOT NULL DEFAULT '{}',
    "address" JSONB,
    "officeHours" JSONB,
    "metaDescription" VARCHAR(320),
    "ogImageUrl" TEXT,
    "gaId" TEXT,
    "gscVerification" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormSubmission" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "formBlockId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "summary" JSONB,
    "userAgent" TEXT,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FormSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "NavItem_showInNavbar_orderNavbar_idx" ON "NavItem"("showInNavbar", "orderNavbar");

-- CreateIndex
CREATE INDEX "NavItem_showInFooter_orderFooter_idx" ON "NavItem"("showInFooter", "orderFooter");

-- CreateIndex
CREATE INDEX "NavItem_parentId_idx" ON "NavItem"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "NavItem_parentId_orderNavbar_key" ON "NavItem"("parentId", "orderNavbar");

-- CreateIndex
CREATE UNIQUE INDEX "NavItem_parentId_orderFooter_key" ON "NavItem"("parentId", "orderFooter");

-- CreateIndex
CREATE INDEX "HomeSection_order_idx" ON "HomeSection"("order");

-- CreateIndex
CREATE INDEX "HomeSection_visible_idx" ON "HomeSection"("visible");

-- CreateIndex
CREATE UNIQUE INDEX "Page_slug_key" ON "Page"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Page_pageKey_key" ON "Page"("pageKey");

-- CreateIndex
CREATE UNIQUE INDEX "Post_slug_key" ON "Post"("slug");

-- CreateIndex
CREATE INDEX "Post_status_idx" ON "Post"("status");

-- CreateIndex
CREATE INDEX "Post_publishedAt_idx" ON "Post"("publishedAt");

-- CreateIndex
CREATE INDEX "Post_isFeatured_status_idx" ON "Post"("isFeatured", "status");

-- CreateIndex
CREATE INDEX "Post_status_views_idx" ON "Post"("status", "views");

-- CreateIndex
CREATE INDEX "Post_status_publishedAt_idx" ON "Post"("status", "publishedAt");

-- CreateIndex
CREATE INDEX "FormSubmission_pageId_idx" ON "FormSubmission"("pageId");

-- CreateIndex
CREATE INDEX "FormSubmission_formBlockId_idx" ON "FormSubmission"("formBlockId");

-- CreateIndex
CREATE INDEX "FormSubmission_createdAt_idx" ON "FormSubmission"("createdAt");

-- AddForeignKey
ALTER TABLE "NavItem" ADD CONSTRAINT "NavItem_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "NavItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_coverMediaId_fkey" FOREIGN KEY ("coverMediaId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormSubmission" ADD CONSTRAINT "FormSubmission_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page"("id") ON DELETE CASCADE ON UPDATE CASCADE;
