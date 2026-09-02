import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth";
import { NotificationProcessor } from "@/lib/notifications/processor";

export async function processNotifications() {
  await requirePermission("notifications.create");
  const processor = new NotificationProcessor({
    batchSize: 20,
    sender: async () => "SENT",
  });
  await processor.processQueue();
  revalidatePath("/notifications");
}
