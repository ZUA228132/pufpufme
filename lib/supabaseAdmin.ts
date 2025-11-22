import { createClient } from "@supabase/supabase-js";
import type { Database } from "../types/database";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!url || !serviceKey) {
  console.warn("Supabase admin client env vars are not set");
}

export const supabaseAdmin = createClient<Database>(url, serviceKey, {
  auth: {
    persistSession: false
  }
});
