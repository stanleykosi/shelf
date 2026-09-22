const decimalPattern = /^(0|[1-9]\d*)(\.\d{1,6})?$/;

export function parseUsdc(value: string): bigint {
  const trimmed = value.trim();
  if (!decimalPattern.test(trimmed))
    throw new Error("Enter a positive amount with up to 6 decimal places.");
  const [whole, fraction = ""] = trimmed.split(".");
  const raw = BigInt(whole) * 1_000_000n + BigInt(fraction.padEnd(6, "0"));
  if (raw <= 0n) throw new Error("Amount must be greater than zero.");
  return raw;
}

export function formatRaw(raw: string | bigint, decimals = 6): string {
  const value = typeof raw === "bigint" ? raw : BigInt(raw);
  const scale = 10n ** BigInt(decimals);
  const whole = value / scale;
  const fraction = (value % scale).toString().padStart(decimals, "0").replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole.toString();
}

export function feeFor(raw: bigint, bps = 50): bigint {
  if (raw < 0n) throw new Error("Fee basis cannot be negative.");
  return (raw * BigInt(bps)) / 10_000n;
}

export function splitBudget(total: bigint, companyIds: string[]): Map<string, bigint> {
  const unique = [...new Set(companyIds)].sort();
  if (unique.length === 0 || unique.length > 5)
    throw new Error("Choose between 1 and 5 companies.");
  const base = total / BigInt(unique.length);
  let remainder = total % BigInt(unique.length);
  const result = new Map<string, bigint>();
  for (const id of unique) {
    const extra = remainder > 0n ? 1n : 0n;
    result.set(id, base + extra);
    remainder -= extra;
  }
  return result;
}

export function allocateCost(
  totalCost: bigint,
  lotRaw: bigint,
  disposedRaw: bigint,
  isFinal: boolean,
): bigint {
  if (disposedRaw > lotRaw || disposedRaw < 0n) throw new Error("Invalid disposition quantity.");
  return isFinal ? totalCost : (totalCost * disposedRaw) / lotRaw;
}
