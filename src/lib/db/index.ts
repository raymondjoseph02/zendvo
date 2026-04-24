import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const databaseUrl =
  process.env.DATABASE_URL ||
  "postgres://postgres:postgres@localhost:5432/zendvo";

const pool = new Pool({
  connectionString: databaseUrl,
});

export const db = drizzle(pool, { schema });
export default db;


// Migration utilities should be imported directly from ./migration-checker 
// to avoid bundling Node.js modules in Edge Runtime
