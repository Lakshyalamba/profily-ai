// Start the traced Node build with runtime secrets and a stable data directory.
import { cp } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
try {
  process.loadEnvFile(path.join(root, ".env.local"));
} catch (error) {
  if (error.code !== "ENOENT")
    throw new Error("Could not load the local environment configuration.");
}
process.env.HOSTNAME ||= "127.0.0.1";
process.env.PORT ||= "3000";
process.env.PROFILY_DATA_DIR = path.resolve(
  root,
  process.env.PROFILY_DATA_DIR || ".data/profiles",
);
try {
  await cp(
    path.join(root, ".next/static"),
    path.join(root, ".next/standalone/.next/static"),
    { recursive: true },
  );
} catch {
  throw new Error(
    "Production build is missing. Run npm run build before npm start.",
  );
}
await cp(
  path.join(root, "public"),
  path.join(root, ".next/standalone/public"),
  { recursive: true },
);
await import(pathToFileURL(path.join(root, ".next/standalone/server.js")).href);
