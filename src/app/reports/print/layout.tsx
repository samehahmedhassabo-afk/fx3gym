/** الصفحات المطبوعة دايماً بالوضع النهاري مهما كان مظهر التطبيق */
export default function ReportsPrintLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-theme="light" className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      {children}
    </div>
  );
}
