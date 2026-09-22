function safeSpreadsheetCell(value: string | undefined): string {
  const text = String(value ?? "");
  const protectedText = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${protectedText.replaceAll('"', '""')}"`;
}

export function financialRecordsCsv(records: FinancialRecord[]): string {
  const columns = [
    "recordedAt",
    "type",
    "status",
    "asset",
    "rawAmount",
    "usdcRaw",
    "feeRaw",
    "signature",
  ] as const;
  const header = "recorded_at,type,status,asset,raw_amount,usdc_raw,fee_raw,signature";
  const rows = records.map((record) =>
    columns.map((column) => safeSpreadsheetCell(record[column])).join(","),
  );
  return [header, ...rows].join("\n");
}
import type { FinancialRecord } from "@/domain/types";
