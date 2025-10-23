import type { Config } from "drizzle-kit";

export default {
  schema: "./drizzle/schema.ts",
  out: "./drizzle/migrations",
  driver: "sqlite",
  dbCredentials: {
    url: "./storage/orator.sqlite"
  }
} satisfies Config; 