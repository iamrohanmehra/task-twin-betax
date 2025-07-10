import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (code) {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // Create or update app user
      const { email, user_metadata } = data.user;
      const name = user_metadata.full_name || user_metadata.name || email;

      if (email) {
        await supabase
          .from("app_users")
          .upsert({ email, name }, { onConflict: "email" });
      }
    }
  }

  return NextResponse.redirect(requestUrl.origin);
}
