-- CreateTable
CREATE TABLE "NotificationChannelPref" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "notificationType" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationChannelPref_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NotificationChannelPref_userId_notificationType_channel_key" ON "NotificationChannelPref"("userId", "notificationType", "channel");

-- CreateIndex
CREATE INDEX "NotificationChannelPref_userId_channel_enabled_idx" ON "NotificationChannelPref"("userId", "channel", "enabled");

-- AddForeignKey
ALTER TABLE "NotificationChannelPref" ADD CONSTRAINT "NotificationChannelPref_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
