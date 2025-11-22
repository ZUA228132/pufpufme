import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { telegramUser, title, content } = body || {};

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

  const { error } = await supabaseAdmin.from("post_suggestions").insert({
    school_id: schoolId,
    author_user_id: userRow.id,
    title,
    content: content || null,
    status: "pending",
  });

  if (error) {
    console.error("Error inserting post suggestion", error);
    return NextResponse.json(
      { error: "Ошибка создания предложения новости" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
