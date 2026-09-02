export function toCsvRow(values: Array<string | number | boolean | null | undefined>): string {
  return values
    .map((value) => {
      const text = value == null ? "" : String(value);
      if (text.includes('"') || text.includes(",") || text.includes("\n")) {
        return `"${text.replace(/"/g, '""')}"`;
      }
      return text;
    })
    .join(",");
}

export function toCsv(rows: Array<Record<string, unknown>>, headers: string[]): string;
export function toCsv(rows: Array<Array<string | number | boolean | null | undefined>>, headers: string[]): string;
export function toCsv(
  rows: Array<Record<string, unknown> | Array<string | number | boolean | null | undefined>>,
  headers: string[]
): string {
  const lines = [toCsvRow(headers)];
  for (const row of rows) {
    if (Array.isArray(row)) {
      lines.push(toCsvRow(row));
    } else {
      const values = headers.map((key) => (row as Record<string, unknown>)[key] ?? "");
      lines.push(toCsvRow(values as Array<string | number | boolean | null | undefined>));
    }
  }
  return lines.join("\n");
}

export function csvDownload(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
