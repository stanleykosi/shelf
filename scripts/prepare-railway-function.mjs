import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const repository = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = path.join(repository, "infrastructure/railway-worker.ts");
const outputPath = path.join(repository, ".railway/worker.generated.ts");
const packageFile = JSON.parse(await readFile(path.join(repository, "package.json"), "utf8"));
const postgresVersion = packageFile.dependencies.postgres;

if (!/^\d+\.\d+\.\d+$/.test(postgresVersion)) {
  throw new Error("Pin postgres to an exact version before preparing the Railway Function.");
}

const source = await readFile(sourcePath, "utf8");
const localImport = 'from "postgres"';
if (!source.includes(localImport)) throw new Error("The Railway worker's postgres import changed.");

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, source.replace(localImport, `from "postgres@${postgresVersion}"`));
console.log(`Prepared pinned Railway Function: ${outputPath}`);
