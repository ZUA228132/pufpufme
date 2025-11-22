import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../../lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { telegramUser, postId } = body || {};

  if (!telegramUser?.id || !postId) {
    return NextResponse.json(
      { ok: false, error: "Недостаточно данных" },
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

  const { data: existing } = await supabaseAdmin
    .from("post_likes")
    .select("id")
    .eq("post_id", postId as string)
    .eq("user_id", userRow.id)
    .maybeSingle();

  if (existing) {
    const { error: delErr } = await supabaseAdmin
      .from("post_likes")
      .delete()
      .eq("id", existing.id);

    if (delErr) {
      console.error("like delete error", delErr);
      return NextResponse.json(
        { ok: false, error: "Ошибка обновления лайка" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, liked: false });
  } else {
    const { error: insErr } = await supabaseAdmin
      .from("post_likes")
      .insert({
        post_id: postId as string,
        user_id: userRow.id,
      });

    if (insErr) {
      console.error("like insert error", insErr);
      return NextResponse.json(
        { ok: false, error: "Ошибка лайка" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, liked: true });
  }
}
