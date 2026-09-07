import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseEnv } from "@/lib/supabase/config";

/**
 * Server-side Supabase client that respects the authenticated user's session
 * and therefore Row Level Security. Use this for all normal tenant-scoped
 * reads/writes inside server components, server actions, and API routes.
 *
 * Falls back to placeholder values when env vars aren't set yet so
 * unauthenticated pages (e.g. redirecting a logged-out visitor to /login)
 * still render locally without crashing the process; any call that actually
 * needs to reach Supabase will surface a clear network/auth error instead.
 */
export async function createClient() {
  const cookieStore = await cookies();
  const { url, anonKey } = getSupabaseEnv();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // setAll is called from a Server Component in some code paths;
          // this is safe to ignore if middleware refreshes sessions.
        }
      },
    },
  });
}
