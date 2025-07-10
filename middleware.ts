import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Protect admin routes
  if (
    req.nextUrl.pathname.startsWith("/admin") &&
    req.nextUrl.pathname !== "/admin-login"
  ) {
    if (!session) {
      return NextResponse.redirect(new URL("/admin-login", req.url));
    }

    // Check if user is admin
    const { data: appUser } = await supabase
      .from("app_users")
      .select("is_admin")
      .eq("email", session.user.email)
      .single();

    if (!appUser?.is_admin) {
      return NextResponse.redirect(new URL("/admin-login", req.url));
    }
  }

  return res;
}

export const config = {
  matcher: ["/admin/:path*"],
};
