-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "mediaMeta" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "mediaType" TEXT NOT NULL DEFAULT 'text',
ADD COLUMN     "reactions" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "replyToId" TEXT;
