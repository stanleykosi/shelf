import { migrate } from "drizzle-orm/postgres-js/migrator";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const databaseUrl = process.env.MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("Set MIGRATION_DATABASE_URL or DATABASE_URL before running migrations.");
}

const client = postgres(databaseUrl, { max: 1 });
const database = drizzle(client);

await migrate(database, { migrationsFolder: "drizzle" });
await client.end();

console.log("Shelf database migrations completed.");
