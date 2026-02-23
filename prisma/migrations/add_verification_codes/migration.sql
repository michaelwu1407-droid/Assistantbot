model VerificationCode {
  id String @id @default(cuid())
  
  workspaceId String
  phoneNumber String
  
  code String
  expiresAt DateTime
  createdAt DateTime @default(now())
  
  @@unique([workspaceId, phoneNumber])
  @@map("verification_codes")
}
