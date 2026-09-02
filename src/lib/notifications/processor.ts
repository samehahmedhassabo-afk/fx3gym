import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { NotificationChannel } from "@/lib/enums";

const MAX_ATTEMPTS = 5;
const RETRY_DELAYS_MS = [5_000, 30_000, 2 * 60_000, 10 * 60_000, 60 * 60_000];

type SendResult = "SENT" | "FAILED";

export interface NotificationProcessorOptions {
  batchSize?: number;
  sender?: (notification: {
    id: string;
    channel: string;
    recipient: string;
    body: string;
    type: string;
  }) => Promise<SendResult>;
}

export class NotificationProcessor {
  private readonly batchSize: number;
  private readonly sender: (notification: {
    id: string;
    channel: string;
    recipient: string;
    body: string;
    type: string;
  }) => Promise<SendResult>;

  constructor(options: NotificationProcessorOptions = {}) {
    this.batchSize = options.batchSize ?? 20;
    this.sender =
      options.sender ??
      (async () => {
        return "SENT";
      });
  }

  async processQueue() {
    const now = new Date();
    const staleFailed = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    await db.$transaction(async (tx) => {
      const queued = await tx.notification.findMany({
        where: { status: "QUEUED" },
        orderBy: { createdAt: "asc" },
        take: this.batchSize,
      });

      const retryable = await tx.notification.findMany({
        where: {
          status: "FAILED",
          OR: [{ scheduledFor: null }, { scheduledFor: { lte: now } }],
          ...(RETRY_DELAYS_MS.length > 0 ? {} : {}),
        },
        orderBy: { createdAt: "asc" },
        take: this.batchSize,
      });

      const candidates = [...queued, ...retryable.filter((n) => !queued.some((q) => q.id === n.id))];

      for (const notification of candidates) {
        try {
          const result = await this.sender({
            id: notification.id,
            channel: notification.channel,
            recipient: notification.recipient,
            body: notification.body,
            type: notification.type,
          });

          if (result === "SENT") {
            await tx.notification.update({
              where: { id: notification.id },
              data: { status: "SENT", sentAt: now, errorMsg: null, scheduledFor: null },
            });
          } else {
            await this.incrementFailure(tx, notification);
          }
        } catch {
          await this.incrementFailure(tx, notification);
        }
      }
    });
  }

  private async incrementFailure(tx: any, notification: {
    id: string;
    attempts?: number | null;
  }) {
    const attempts = (notification.attempts ?? 0) + 1;
    const nextRetry =
      attempts < RETRY_DELAYS_MS.length ? new Date(Date.now() + RETRY_DELAYS_MS[attempts - 1]) : null;

    await tx.notification.update({
      where: { id: notification.id },
      data: {
        status: "FAILED",
        attempts,
        errorMsg: "send_failed",
        scheduledFor: nextRetry,
      },
    });
  }
}
