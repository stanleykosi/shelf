import type {
  AllocationDraft,
  AuthChallenge,
  FreshAuthorization,
  Share,
  StoreState,
  UserState,
} from "./store";
import type { Order } from "./types";

type StoredMap<Value> = Array<[string, Value]>;

export type StoredState = Omit<
  StoreState,
  | "users"
  | "issuerCompanies"
  | "orders"
  | "intents"
  | "intentHashes"
  | "shares"
  | "authChallenges"
  | "authTokenUses"
  | "sessions"
  | "freshAuthorizations"
  | "allocationDrafts"
  | "preparations"
> & {
  users: StoredMap<UserState>;
  issuerCompanies: StoredMap<StoreState["issuerCompanies"] extends Map<string, infer Value> ? Value : never>;
  orders: StoredMap<Order>;
  intents: StoredMap<string>;
  intentHashes: StoredMap<string>;
  shares: StoredMap<Share>;
  authChallenges: StoredMap<AuthChallenge>;
  authTokenUses: StoreState["authTokenUses"] extends Map<string, infer Value>
    ? StoredMap<Value>
    : never;
  sessions: StoreState["sessions"] extends Map<string, infer Value> ? StoredMap<Value> : never;
  freshAuthorizations: StoredMap<FreshAuthorization>;
  allocationDrafts: StoredMap<AllocationDraft>;
  preparations: StoredMap<StoreState["preparations"] extends Map<string, infer Value> ? Value : never>;
};

export function serializeState(state: StoreState): StoredState {
  return {
    ...state,
    users: [...state.users],
    issuerCompanies: [...state.issuerCompanies],
    orders: [...state.orders],
    intents: [...state.intents],
    intentHashes: [...state.intentHashes],
    shares: [...state.shares],
    authChallenges: [...state.authChallenges],
    authTokenUses: [...state.authTokenUses],
    sessions: [...state.sessions],
    freshAuthorizations: [...state.freshAuthorizations],
    allocationDrafts: [...state.allocationDrafts],
    preparations: [...state.preparations],
  };
}

export function deserializeState(stored: StoredState): StoreState {
  const restored: StoreState = {
    ...stored,
    retainedFinancialRecords: stored.retainedFinancialRecords ?? [],
    sponsorReservations: stored.sponsorReservations ?? [],
    users: new Map(stored.users),
    issuerCompanies: new Map(stored.issuerCompanies ?? []),
    orders: new Map(stored.orders),
    intents: new Map(stored.intents),
    intentHashes: new Map(stored.intentHashes),
    shares: new Map(stored.shares),
    authChallenges: new Map(stored.authChallenges),
    authTokenUses: new Map(stored.authTokenUses ?? []),
    sessions: new Map(stored.sessions ?? []),
    freshAuthorizations: new Map(stored.freshAuthorizations),
    allocationDrafts: new Map(stored.allocationDrafts),
    preparations: new Map(stored.preparations ?? []),
  };

  const verifiedUserIds = new Set<string>();
  for (const [userId, user] of restored.users) {
    if (!user.magicIssuer) {
      restored.users.delete(userId);
      continue;
    }
    verifiedUserIds.add(userId);
    user.reconciliationRequiredAssets ??= [];
  }

  for (const [orderId, order] of restored.orders) {
    const hasOnlyProviderQuotes = order.legs.every((leg) => {
      return !leg.quote || leg.quote.source === "jupiter";
    });
    if (!verifiedUserIds.has(order.userId) || !hasOnlyProviderQuotes) restored.orders.delete(orderId);
  }
  for (const [key, orderId] of restored.intents) {
    if (!restored.orders.has(orderId)) {
      restored.intents.delete(key);
      restored.intentHashes.delete(key);
    }
  }
  for (const [shareId, share] of restored.shares) {
    if (!verifiedUserIds.has(share.userId)) restored.shares.delete(shareId);
  }
  restored.lots = restored.lots.filter((lot) => verifiedUserIds.has(lot.userId));
  restored.consents = restored.consents.filter((entry) => verifiedUserIds.has(String(entry.userId)));
  restored.audits = restored.audits.filter((entry) => {
    return !entry.actorId || verifiedUserIds.has(String(entry.actorId));
  });
  return restored;
}
