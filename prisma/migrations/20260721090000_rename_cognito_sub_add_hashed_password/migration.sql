-- Rename supabaseAuthId to cognitoSub on the User table
-- The field previously held the Supabase Auth user ID, but the project
-- has migrated to AWS Cognito. This is purely a rename — the column still
-- holds the Cognito `sub` claim UUID for each user.
ALTER TABLE "User" RENAME COLUMN "supabaseAuthId" TO "cognitoSub";

-- Add hashedPassword column for bcrypt-hashed passwords.
-- We keep plainTextPassword temporarily so existing users can still log in
-- during the migration period. The login route prefers hashedPassword when present.
ALTER TABLE "User" ADD COLUMN "hashedPassword" TEXT;
