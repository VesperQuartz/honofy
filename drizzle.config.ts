import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/repo/schema.ts",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DB_URL!,
  },
});
