import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

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
    return NextResponse.json(
      { ok: false, error: "Пользователь не привязан к школе" },
      { status: 400 }
    );
  }

  const schoolId = userRow.current_school_id as string;

  const { data: schoolRow, error: schoolErr } = await supabaseAdmin
    .from("schools")
    .select("id, name, description, logo_url, banner_url, is_premium, school_admin_id")
    .eq("id", schoolId)
    .maybeSingle();

  if (schoolErr || !schoolRow) {
    return NextResponse.json(
      { ok: false, error: "Школа не найдена" },
      { status: 404 }
    );
  }

  const { data: posts, error: postsErr } = await supabaseAdmin
    .from("posts")
    .select("id, title, content, image_url, created_at, is_pinned")
    .eq("school_id", schoolId)
    .eq("status", "published")
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(50);

  if (postsErr) {
    console.error("Error loading posts", postsErr);
    return NextResponse.json(
      { ok: false, error: "Ошибка загрузки постов" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    school: {
      id: schoolRow.id as string,
      name: schoolRow.name as string,
      description: (schoolRow.description as string | null) ?? null,
      logo_url: (schoolRow.logo_url as string | null) ?? null,
      banner_url: (schoolRow.banner_url as string | null) ?? null,
      is_premium: !!schoolRow.is_premium,
      is_admin: schoolRow.school_admin_id === userRow.id,
    },
    posts: posts ?? [],
  });
}
