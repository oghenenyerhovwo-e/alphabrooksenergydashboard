-- CreateIndex
CREATE INDEX "Lead_createdById_idx" ON "Lead"("createdById");

-- CreateIndex
CREATE INDEX "Lead_qualifiedById_idx" ON "Lead"("qualifiedById");

-- CreateIndex
CREATE INDEX "QuoteRequest_createdById_idx" ON "QuoteRequest"("createdById");

-- CreateIndex
CREATE INDEX "QuoteRequest_qualifiedById_idx" ON "QuoteRequest"("qualifiedById");

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_qualifiedById_fkey" FOREIGN KEY ("qualifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteRequest" ADD CONSTRAINT "QuoteRequest_qualifiedById_fkey" FOREIGN KEY ("qualifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteRequest" ADD CONSTRAINT "QuoteRequest_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
