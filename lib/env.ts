import { z } from "zod";

const optionalString = z.preprocess((value) => (value === "" ? undefined : value), z.string().optional());
const optionalUrl = z.preprocess((value) => (value === "" ? undefined : value), z.string().url().optional());
const optionalEmail = z.preprocess((value) => (value === "" ? undefined : value), z.string().email().optional());

const clientSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: optionalUrl,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: optionalString
});

const serverSchema = clientSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: optionalString,
  SUPABASE_SECRET_KEY: optionalString,
  SUPABASE_PROJECT_REF: optionalString,
  OPENAI_API_KEY: optionalString,
  RESEND_API_KEY: optionalString,
  ALERT_FROM_EMAIL: optionalEmail,
  CRON_SECRET: optionalString,
  APP_BASE_URL: optionalUrl,
  TELEGRAM_BOT_TOKEN: optionalString,
  TELEGRAM_DEFAULT_CHAT_ID: optionalString,
  TELEGRAM_OSINT_BOT_TOKEN: optionalString,
  TELEGRAM_OSINT_WEBHOOK_SECRET: optionalString
});

export const clientEnv = clientSchema.parse(process.env);
export const serverEnv = serverSchema.parse(process.env);
