// Isolated browser fixtures only. Never run this against a shared or production database.
import postgres from "postgres";
import { state, userForMagicIdentity } from "../src/domain/store";
import { serializeState } from "../src/domain/state-serialization";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl || process.env.FRONTEND_QA_FIXTURES !== "true")
  throw new Error("Explicit QA fixture opt-in required");
const target = new URL(databaseUrl);
if (
  target.hostname !== "127.0.0.1" ||
  target.port !== "55439" ||
  target.username !== "shelf_scan_qa"
) {
  throw new Error("Only the isolated local frontend QA database is supported");
}
const user = userForMagicIdentity({
  issuer: "did:qa:frontend-owner",
  ownerIssuer: "did:qa:frontend-owner",
  email: "frontend-fixture@example.invalid",
  walletAddress: "11111111111111111111111111111111",
  walletVerifiedAt: new Date().toISOString(),
});
user.shelfName = "QA fixture — familiar Products";
user.shelfProductIds = ["product-doritos-snack", "product-olay-skincare"];
user.watchCompanyIds = ["company-pepsico"];
user.cashRaw = "25000000";
user.holdings = [
  {
    instrumentId: "instrument-pepx",
    companyId: "company-pepsico",
    symbol: "PEPx",
    rawAmount: "125000000",
    reservedRaw: "0",
    externalRaw: "0",
    decimals: 8,
    multiplier: "1",
    totalCostUsdcRaw: "150000000",
  },
];
user.records = [
  {
    id: "qa-record",
    type: "buy",
    status: "finalized",
    recordedAt: "2026-09-24T08:00:00Z",
    asset: "PEPx",
    rawAmount: "125000000",
    usdcRaw: "150000000",
    feeRaw: "750000",
    multiplier: "1",
  },
];
state.sessions.set("frontend-qa-session", {
  userId: user.id,
  authMethod: "email",
  expiresAt: new Date(Date.now() + 86400000).toISOString(),
});
state.orders.set("qa-order", {
  id: "qa-order",
  userId: user.id,
  clientIntentId: "qa-intent",
  type: "buy",
  status: "draft",
  version: 1,
  createdAt: new Date().toISOString(),
  legs: [
    {
      id: "qa-leg",
      position: 0,
      companyId: "company-pepsico",
      instrumentId: "instrument-pepx",
      side: "buy",
      inventoryScope: "tracked",
      requestedInputRaw: "10000000",
      status: "draft",
    },
  ],
});
state.audits.push({
  action: "frontend_qa_fixture",
  at: new Date().toISOString(),
  actorId: user.id,
  reason: "Synthetic local browser verification; no real holdings or money.",
});
const sql = postgres(databaseUrl, { max: 1, ssl: false });
await sql`insert into runtime_states (key, version, payload, updated_at) values ('default', 1, ${sql.json(
  serializeState(state)
)}, now()) on conflict (key) do update set payload=excluded.payload, updated_at=now()`;
await sql.end();
console.log(
  "Isolated frontend QA fixtures ready; no external services called."
);
