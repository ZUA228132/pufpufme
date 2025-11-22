import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// В проде эти переменные обязательно должны быть заданы в Vercel
if (!url || !serviceKey) {
  console.warn("Supabase admin client: env vars are not set");
}

export const supabaseAdmin = createClient(url ?? "", serviceKey ?? "", {
  auth: { persistSession: false }
});
