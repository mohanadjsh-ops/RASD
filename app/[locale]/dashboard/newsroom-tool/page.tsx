import { getMessages, isLocale } from "@/lib/i18n";
import { NewsroomTool } from "./tool";

export default async function NewsroomToolPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: localeParam } = await params;
  const locale = isLocale(localeParam) ? localeParam : "ar";
  const t = await getMessages(locale);
  return <NewsroomTool labels={t} />;
}
