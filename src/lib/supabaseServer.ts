import { createClient } from "@supabase/supabase-js";
import { createServerClient as createSSRServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Server-side Supabase client with service role (bypasses RLS)
export const supaAdmin = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

// Server-side Supabase client for authenticated user (respects RLS)
// Fixed for Next.js 15 to properly pass auth context
export async function createServerClient() {
  const cookieStore = await cookies();

  const client = createSSRServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
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
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  );

  // Ensure the session is loaded and the JWT is set for database queries
  await client.auth.getSession();

  return client;
}

// Legacy export for backwards compatibility
export const supa = supaAdmin;