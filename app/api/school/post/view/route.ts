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

  const { error: insErr } = await supabaseAdmin.from("post_views").insert({
    post_id: postId as string,
    user_id: userRow.id,
  });

  if (insErr) {
    console.error("view insert error", insErr);
    // не критично
  }

  return NextResponse.json({ ok: true });
}
