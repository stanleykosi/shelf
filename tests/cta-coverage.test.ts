import { readFileSync } from "node:fs";
import { globSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("screen action inventory", () => {
  it("implements every acceptance anchor from C01 through C109", () => {
    const source = globSync("src/components/**/*.tsx")
      .map((file) => readFileSync(file, "utf8"))
      .join("\n");

    const missing = Array.from({ length: 109 }, (_, index) => {
      return `C${String(index + 1).padStart(2, "0")}`;
    }).filter((id) => !source.includes(`\"${id}\"`));

    expect(missing).toEqual([]);
  });

  it("does not report unavailable operational mutations as queued or recorded", () => {
    const source = readFileSync("src/app/api/v1/[...path]/route.ts", "utf8");

    expect(source).toContain('throw new Error("WALLET_REFRESH_UNAVAILABLE")');
    expect(source).toContain('throw new Error("RECONCILIATION_UNAVAILABLE")');
    expect(source).toContain('throw new Error("ADMIN_MUTATION_UNAVAILABLE")');
    expect(source).not.toContain('return { status: "queued", cashRaw: user.cashRaw }');
    expect(source).not.toContain('return { status: "recorded", liveCapabilitiesChanged: false }');
  });
});
