import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { telegramUser, cityId, schoolId } = body || {};

  if (!telegramUser?.id || !cityId || !schoolId) {
    return NextResponse.json({ error: "Недостаточно данных" }, { status: 400 });
  }

  const telegramId = String(telegramUser.id);

  const upsertPayload = {
    telegram_id: telegramId,
    username: telegramUser.username ?? null,
    first_name: telegramUser.first_name ?? null,
    last_name: telegramUser.last_name ?? null,
    photo_url: telegramUser.photo_url ?? null,
    current_school_id: schoolId,
  };

  const { data: user, error } = await supabaseAdmin
    .from("users")
    .upsert(upsertPayload, { onConflict: "telegram_id" })
    .select("*")
    .single();

  if (error) {
    console.error("Error upserting user", error);
    return NextResponse.json(
      { error: "Ошибка сохранения пользователя" },
      { status: 500 }
    );
  }

  return NextResponse.json({ user });
}
