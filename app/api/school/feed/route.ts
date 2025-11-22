import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

// Упрощённая заглушка: возвращает последние опубликованные посты без фильтра по школе.
// На практике нужно фильтровать по current_school_id текущего пользователя.
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("posts")
    .select("id, title, content")
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    console.error(error);
    return NextResponse.json({ posts: [] }, { status: 500 });
  }

  return NextResponse.json({ posts: data ?? [] });
}
