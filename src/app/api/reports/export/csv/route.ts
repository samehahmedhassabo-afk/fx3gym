import { requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { toCsv } from "@/lib/reports/csv";
import { ReportPeriod, periodRange } from "@/lib/reports";

export async function GET(request: Request) {
  const session = await requirePermission("reports.view");
  const url = new URL(request.url);
  const period = ["month", "year", "all", "custom"].includes(url.searchParams.get("period") ?? "")
    ? (url.searchParams.get("period") as ReportPeriod)
    : "month";
  const custom =
    period === "custom"
      ? { from: url.searchParams.get("from") ?? undefined, to: url.searchParams.get("to") ?? undefined }
      : undefined;

  const { start, end } = periodRange(period, custom);

  const [payments, expenses] = await Promise.all([
    db.payment.findMany({
      where: { paidAt: { gte: start, lte: end } },
      orderBy: { paidAt: "asc" },
      select: {
        invoiceNumber: true,
        paidAt: true,
        amount: true,
        method: true,
        type: true,
        member: { select: { firstName: true, lastName: true } },
        subscription: { select: { plan: { select: { name: true } } } },
      },
    }),
    db.expense.findMany({
      where: { paidAt: { gte: start, lte: end } },
      orderBy: { paidAt: "asc" },
      select: {
        paidAt: true,
        amount: true,
        category: true,
        description: true,
        payroll: { select: { employee: { select: { fullName: true } } } },
      },
    }),
  ]);

  const pad = (n: number) => String(n).padStart(2, "0");
  const filename = `fx3-report-${start.getFullYear()}${pad(start.getMonth() + 1)}${pad(start.getDate())}-${pad(end.getFullYear())}${pad(end.getMonth() + 1)}${pad(end.getDate())}.csv`;

  const paymentRows = payments.map((p) => ({
    Section: "Payments",
    Invoice: p.invoiceNumber,
    Date: new Date(p.paidAt).toISOString(),
    Amount: p.amount,
    Method: p.method,
    Type: p.type,
    Member: p.member ? `${p.member.firstName} ${p.member.lastName}` : "",
    Plan: p.subscription?.plan?.name ?? "",
  }));

  const expenseRows = expenses.map((e) => ({
    Section: "Expenses",
    Date: new Date(e.paidAt).toISOString(),
    Amount: e.amount,
    Category: e.category,
    Description: e.description ?? "",
    Employee: e.payroll?.employee?.fullName ?? "",
  }));

  const headers = ["Section", "Invoice", "Date", "Amount", "Method", "Type", "Member", "Plan", "Category", "Description", "Employee"];
  const rows = [...paymentRows, ...expenseRows].map((row) => {
    const normalized: Record<string, unknown> = { Section: row.Section, Date: row.Date, Amount: row.Amount };
    if ("Invoice" in row) normalized.Invoice = row.Invoice;
    if ("Method" in row) normalized.Method = row.Method;
    if ("Type" in row) normalized.Type = row.Type;
    if ("Member" in row) normalized.Member = row.Member;
    if ("Plan" in row) normalized.Plan = row.Plan;
    if ("Category" in row) normalized.Category = row.Category;
    if ("Description" in row) normalized.Description = row.Description;
    if ("Employee" in row) normalized.Employee = row.Employee;
    return normalized;
  });

  const body = toCsv(rows, headers);
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
