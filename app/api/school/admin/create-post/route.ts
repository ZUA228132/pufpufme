import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../../lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { telegramUser, title, content, imageUrl } = body || {};

  if (!telegramUser?.id || !title) {
    return NextResponse.json(
      { error: "Недостаточно данных" },
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
      { error: "Пользователь не привязан к школе" },
      { status: 400 }
    );
  }

  const schoolId = userRow.current_school_id as string;

  const { data: schoolRow, error: schoolErr } = await supabaseAdmin
    .from("schools")
    .select("id, school_admin_id")
    .eq("id", schoolId)
    .maybeSingle();

  if (schoolErr || !schoolRow || schoolRow.school_admin_id !== userRow.id) {
    return NextResponse.json(
      { error: "Вы не являетесь админом этой школы" },
      { status: 403 }
    );
  }

  const { error } = await supabaseAdmin.from("posts").insert({
    school_id: schoolId,
    title,
    content: content || null,
    image_url: imageUrl || null,
    status: "published",
  });

  if (error) {
    console.error("Error creating post", error);
    return NextResponse.json(
      { error: "Ошибка создания новости" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
