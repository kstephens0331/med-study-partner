import { createClient } from "@supabase/supabase-js";
import { createServerClient as createSSRServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Server-side Supabase client with service role (bypasses RLS)
export const supaAdmin = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE;

  if (!url || !key) {
    console.error('Missing Supabase credentials:', { url: !!url, key: !!key });
    throw new Error('Missing SUPABASE_SERVICE_ROLE or NEXT_PUBLIC_SUPABASE_URL');
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    db: {
      schema: 'public',
    },
    global: {
      headers: {
        'apikey': key,
      },
    },
  });
};

// Server-side Supabase client for authenticated user (respects RLS)
export async function createServerClient() {
  const cookieStore = await cookies();

  return createSSRServerClient(
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
            // setAll called from Server Component - ignored
          }
        },
      },
      global: {
        headers: {
          'Cache-Control': 'no-store',
        },
      },
    }
  );
}

// Legacy export for backwards compatibility
export const supa = supaAdmin;