import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { NotificationProcessor } from "@/lib/notifications/processor";

export async function POST() {
  const session = await requirePermission("notifications.create");
  const processor = new NotificationProcessor({
    batchSize: 20,
    sender: async (notification) => {
      return "SENT";
    },
  });

  await processor.processQueue();
  return NextResponse.json({ ok: true, message: "Notification queue processed." });
}
