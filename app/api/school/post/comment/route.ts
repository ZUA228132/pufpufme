import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../../lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { telegramUser, postId, content } = body || {};

  if (!telegramUser?.id || !postId || !content) {
    return NextResponse.json(
      { ok: false, error: "Недостаточно данных" },
      { status: 400 }
    );
  }

  const text = (content as string).trim();
  if (!text) {
    return NextResponse.json(
      { ok: false, error: "Пустой комментарий" },
      { status: 400 }
    );
  }

  const telegramId = String(telegramUser.id);

  const { data: userRow, error: userErr } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("telegram_id", telegramId)
    .maybeSingle();

  if (userErr || !userRow) {
    return NextResponse.json(
      { ok: false, error: "Пользователь не найден" },
      { status: 400 }
    );
  }

  const { error: insErr } = await supabaseAdmin.from("post_comments").insert({
    post_id: postId as string,
    user_id: userRow.id,
    content: text,
  });

  if (insErr) {
    console.error("comment insert error", insErr);
    return NextResponse.json(
      { ok: false, error: "Ошибка комментария" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
