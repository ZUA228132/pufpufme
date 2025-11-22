import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("posts")
    .select("id, title, content")
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    console.error("Error loading posts", error);
    return NextResponse.json({ posts: [] }, { status: 500 });
  }

  return NextResponse.json({ posts: data ?? [] });
}
