import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../../lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { telegramUser } = body || {};

  if (!telegramUser?.id) {
    return NextResponse.json(
      { ok: false, error: "Нет данных Telegram-пользователя" },
      { status: 400 }
    );
  }

  const telegramId = String(telegramUser.id);

  const { data: userRow, error: userErr } = await supabaseAdmin
    .from("users")
    .select("id, current_school_id")
    .eq("telegram_id", telegramId)
    .maybeSingle();

  if (userErr || !userRow?.current_school_id) {
    return NextResponse.json({
      ok: false,
      error: "Пользователь не привязан к школе",
    });
  }

  const schoolId = userRow.current_school_id as string;

  const { data: schoolRow, error: schoolErr } = await supabaseAdmin
    .from("schools")
    .select("id, name, school_admin_id")
    .eq("id", schoolId)
    .maybeSingle();

  if (schoolErr || !schoolRow) {
    return NextResponse.json({
      ok: false,
      error: "Школа не найдена",
    });
  }

  if (schoolRow.school_admin_id !== userRow.id) {
    return NextResponse.json({
      ok: false,
      error: "Вы не являетесь админом этой школы",
    });
  }

  const { data: suggestions } = await supabaseAdmin
    .from("post_suggestions")
    .select(
      "id, title, content, image_url, created_at, author_user_id, users:author_user_id(first_name, last_name, username)"
    )
    .eq("school_id", schoolId)
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  const { data: posts } = await supabaseAdmin
    .from("posts")
    .select("id, title, content, created_at")
    .eq("school_id", schoolId)
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(20);

  const { data: studentsRaw } = await supabaseAdmin
    .from("users")
    .select("id, display_name, current_school_id")
    .eq("current_school_id", schoolId);

  const { data: bans } = await supabaseAdmin
    .from("school_bans")
    .select("id, user_id, active")
    .eq("school_id", schoolId)
    .eq("active", true);

  const bannedIds = new Set((bans ?? []).map((b) => b.user_id as string));

  const students =
    studentsRaw?.map((u) => ({
      id: u.id as string,
      display_name: (u.display_name as string | null) ?? null,
      is_banned: bannedIds.has(u.id as string),
    })) ?? [];

  const mappedSuggestions =
    suggestions?.map((s: any) => ({
      id: s.id as string,
      title: s.title as string,
      content: (s.content as string | null) ?? null,
      created_at: s.created_at as string,
      author_name:
        s.users
          ? ((s.users.first_name && s.users.last_name)
              ? `${s.users.first_name} ${s.users.last_name}`
              : (s.users.username as string | null) ?? s.users.first_name ?? null)
          : null,
    })) ?? [];

  return NextResponse.json({
    ok: true,
    school: {
      id: schoolRow.id as string,
      name: schoolRow.name as string,
    },
    suggestions: mappedSuggestions,
    posts: (posts ?? []) as any[],
    students,
  });
}
