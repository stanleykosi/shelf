const supportedLengths = new Set([8, 12, 13, 14]);

export function isValidGtin(value: string): boolean {
  if (!/^\d+$/.test(value) || !supportedLengths.has(value.length)) return false;

  const digits = [...value].map(Number);
  const checkDigit = digits.pop()!;
  const weightedSum = digits
    .reverse()
    .reduce((sum, digit, index) => sum + digit * (index % 2 === 0 ? 3 : 1), 0);
  const expectedCheckDigit = (10 - (weightedSum % 10)) % 10;
  return checkDigit === expectedCheckDigit;
}
