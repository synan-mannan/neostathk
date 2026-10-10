import dotenv from "dotenv";
import path from "path";
import { z } from "zod";

// Load .env relative to current working directory / backend root
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  FRONTEND_URL: z.string().url().default("http://localhost:3000"),
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required")
    .default(
      "postgresql://postgres:ahmed32@42@localhost:5432/neostats_hackathon",
    ),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid or missing environment variables:");
  console.error(parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;
