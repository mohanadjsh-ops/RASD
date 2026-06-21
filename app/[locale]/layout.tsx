import { notFound } from "next/navigation";
import { direction, getMessages, isLocale } from "@/lib/i18n";

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const messages = await getMessages(locale);

  return (
    <html lang={locale} dir={direction(locale)}>
      <body>
        <div data-brand={messages.brand}>{children}</div>
      </body>
    </html>
  );
}
