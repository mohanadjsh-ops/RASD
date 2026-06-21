import "server-only";
import type { Locale } from "@/types/app";

const dictionaries = {
  ar: () => import("@/messages/ar.json").then((module) => module.default),
  en: () => import("@/messages/en.json").then((module) => module.default)
};

export const locales: Locale[] = ["ar", "en"];

export function isLocale(value: string | undefined): value is Locale {
  return value === "ar" || value === "en";
}

export function direction(locale: Locale) {
  return locale === "ar" ? "rtl" : "ltr";
}

export async function getMessages(locale: Locale) {
  return dictionaries[locale]();
}
