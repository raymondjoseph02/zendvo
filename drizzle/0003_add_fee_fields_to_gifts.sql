-- Add fee and total_amount columns to gifts table
ALTER TABLE "gifts"
ADD COLUMN "fee" double precision DEFAULT 0 NOT NULL;

ALTER TABLE "gifts"
ADD COLUMN "total_amount" double precision NOT NULL;