import { z } from "zod";

const booleanString = z.enum(["true", "false"]).transform((value) => value === "true");
const optionalSecret = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().min(1).optional(),
);
const optionalUrl = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().url().optional(),
);
const optionalSupportContact = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z
    .string()
    .url()
    .refine((value) => ["https:", "mailto:"].includes(new URL(value).protocol), {
      message: "SUPPORT_CONTACT must use https or mailto.",
    })
    .optional(),
);

const schema = z.object({
  APP_ENV: z.enum(["local", "integration", "private-beta"]).default("local"),
  APP_ORIGIN: z.string().url().default("http://localhost:3000"),
  PRESTOCKS_API_URL: z.string().url().default("https://prestocks.com/api/prestocks"),
  XSTOCKS_API_BASE_URL: z.string().url().default("https://api.xstocks.fi/api/v2/"),
  DATABASE_URL: optionalSecret,
  DATABASE_SSL: booleanString.default(false),
  SOLANA_NETWORK: z.enum(["devnet", "mainnet-beta"]).default("devnet"),
  ENABLE_REAL_TRADING: booleanString.default(false),
  ENABLE_DEPOSITS: booleanString.default(false),
  ENABLE_AI_ALLOCATION_SUGGESTIONS: booleanString.default(false),
  FINANCIAL_POLICY_VERSION: z.string().default("bootstrap-deny-all-v1"),
  APP_FEE_BPS: z.coerce.number().int().min(0).max(100).default(50),
  MAGIC_SECRET_KEY: optionalSecret,
  MAGIC_GOOGLE_REDIRECT_URI: optionalUrl,
  SUPPORT_CONTACT: optionalSupportContact,
  SESSION_TOKEN_HMAC_KEY: optionalSecret,
  OWNER_MAGIC_ISSUER: optionalSecret,
  WORKER_SHARED_SECRET: optionalSecret,
  OPENROUTER_API_KEY: optionalSecret,
  OPENROUTER_VISION_MODEL: z.string().default("z-ai/glm-5.3-flash"),
  OPENROUTER_TEXT_MODEL: z.string().default("z-ai/glm-5.3-flash"),
  OPENROUTER_PROVIDER_POLICY: z.literal("zdr-deny-required").default("zdr-deny-required"),
  AI_DAILY_LIMIT_USD: z.coerce.number().positive().default(2),
  AI_MONTHLY_LIMIT_USD: z.coerce.number().positive().default(20),
  SOLANA_RPC_URL: optionalSecret,
  SOLANA_GENESIS_HASH: optionalSecret,
  JUPITER_API_KEY: optionalSecret,
  SPONSOR_PUBLIC_KEY: optionalSecret,
  SPONSOR_SECRET_KEY: optionalSecret,
  DATA_ENCRYPTION_KEY: optionalSecret,
  FEE_USDC_TOKEN_ACCOUNT: optionalSecret,
});

type AppEnv = z.infer<typeof schema>;

export function readEnv(source: Record<string, string | undefined> = process.env): AppEnv {
  const env = schema.parse(source);
  if (env.ENABLE_REAL_TRADING && env.SOLANA_NETWORK !== "mainnet-beta") {
    throw new Error("Real trading requires mainnet-beta.");
  }
  if (
    env.ENABLE_REAL_TRADING &&
    (!env.SPONSOR_PUBLIC_KEY ||
      !env.SPONSOR_SECRET_KEY ||
      !env.DATA_ENCRYPTION_KEY ||
      !env.FEE_USDC_TOKEN_ACCOUNT ||
      !env.SOLANA_RPC_URL ||
      !env.SOLANA_GENESIS_HASH ||
      !env.JUPITER_API_KEY)
  ) {
    throw new Error(
      "Real trading requires sponsor, encryption, and fee-account configuration.",
    );
  }
  if (env.ENABLE_DEPOSITS && !env.ENABLE_REAL_TRADING) {
    throw new Error("Deposits cannot start before real trading activation.");
  }
  return env;
}

export const env = readEnv();
