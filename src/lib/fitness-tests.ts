export const FITNESS_TEST_TYPES = [
  { value: "UPPER_BODY", labelEn: "Upper Body", labelAr: "أعلى الجسم" },
  { value: "LOWER_BODY", labelEn: "Lower Body", labelAr: "أسفل الجسم" },
  { value: "CORE", labelEn: "Core", labelAr: "الجذع" },
  { value: "FULL_BODY", labelEn: "Full Body", labelAr: "الجسم بالكامل" },
] as const;

export type FitnessTestTypeValue = (typeof FITNESS_TEST_TYPES)[number]["value"];

export function fitnessTestTypeLabel(testType: string, locale: "en" | "ar"): string {
  const found = FITNESS_TEST_TYPES.find((t) => t.value === testType);
  if (!found) return testType;
  return locale === "ar" ? found.labelAr : found.labelEn;
}
