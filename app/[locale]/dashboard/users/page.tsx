import { requireAdmin } from "@/lib/auth";
import { getMessages, isLocale } from "@/lib/i18n";
import { UsersAdmin } from "./users-admin";

export default async function UsersPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: localeParam } = await params;
  const locale = isLocale(localeParam) ? localeParam : "ar";
  await requireAdmin(locale);
  const t = await getMessages(locale);

  return <UsersAdmin labels={t} />;
}
