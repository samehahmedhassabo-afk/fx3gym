export const SEGMENTS = ["FROZEN", "EXPIRING_7", "CHURN_RISK", "TOP_TIER", "NO_ACTIVE"] as const;
export type BroadcastSegment = (typeof SEGMENTS)[number];

export const SEGMENT_LABELS_AR: Record<BroadcastSegment, string> = {
  FROZEN: "أعضاء مجمّدين",
  EXPIRING_7: "اشتراكات تنتهي خلال 7 أيام",
  CHURN_RISK: "عرضة للتسرب",
  TOP_TIER: "أعلى فئة ولاء",
  NO_ACTIVE: "بدون اشتراك ساري",
};
