import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "../src/repo/schema";

const sql = neon(process.env.DB_URL!);
export const db = drizzle({ client: sql, schema });
