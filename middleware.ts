import { NextResponse, type NextRequest } from "next/server";
import type { CookieOptions } from "@supabase/ssr";
import { createServerClient } from "@supabase/ssr";
import { demoAuthCookieName, isDemoLoginEnabled } from "@/lib/demo-auth";
import { isLocale } from "@/lib/i18n";

const protectedSegment = /^\/(ar|en)\/dashboard/;

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const first = pathname.split("/")[1];

  if (!isLocale(first)) {
    const url = request.nextUrl.clone();
    url.pathname = `/ar${pathname === "/" ? "" : pathname}`;
    return NextResponse.redirect(url);
  }

  let response = NextResponse.next({ request });

  if (protectedSegment.test(pathname)) {
    if (isDemoLoginEnabled() && request.cookies.get(demoAuthCookieName)?.value === "admin") {
      return response;
    }

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://example.supabase.co",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "missing-anon-key",
      {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: (cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) => {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
            response = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          }
        }
      }
    );

    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      const url = request.nextUrl.clone();
      url.pathname = `/${first}/login`;
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"]
};
