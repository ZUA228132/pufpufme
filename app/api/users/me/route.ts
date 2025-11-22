import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { telegramUser } = body || {};

  if (!telegramUser?.id) {
    return NextResponse.json(
      { error: "Нет данных Telegram-пользователя" },
      { status: 400 }
    );
  }

  const telegramId = String(telegramUser.id);

  const { data, error } = await supabaseAdmin
    .from("users")
    .select("id, is_global_admin, current_school_id")
    .eq("telegram_id", telegramId)
    .maybeSingle();

  if (error) {
    console.error("Error loading user in /api/users/me", error);
    return NextResponse.json({ user: null });
  }

  return NextResponse.json({ user: data });
}
