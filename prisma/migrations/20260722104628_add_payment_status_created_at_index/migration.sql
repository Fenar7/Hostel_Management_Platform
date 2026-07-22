-- CreateIndex
CREATE INDEX "Payment_paymentStatus_createdAt_idx" ON "Payment"("paymentStatus", "createdAt");

-- RenameIndex
ALTER INDEX "User_supabaseAuthId_key" RENAME TO "User_cognitoSub_key";
