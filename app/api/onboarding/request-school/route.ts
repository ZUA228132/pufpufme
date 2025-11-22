import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { telegramUser, cityName, schoolName, address } = body || {};

  if (!telegramUser?.id || !cityName || !schoolName) {
    return NextResponse.json({ error: "Недостаточно данных" }, { status: 400 });
  }

  const telegramId = String(telegramUser.id);

  const upsertPayload = {
    telegram_id: telegramId,
    username: telegramUser.username ?? null,
    first_name: telegramUser.first_name ?? null,
    last_name: telegramUser.last_name ?? null,
    photo_url: telegramUser.photo_url ?? null,
  };

  const { data: userRow, error: userErr } = await supabaseAdmin
    .from("users")
    .upsert(upsertPayload, { onConflict: "telegram_id" })
    .select("id")
    .single();

  if (userErr || !userRow) {
    console.error("Error upserting user for request", userErr);
    return NextResponse.json({ error: "Ошибка пользователя" }, { status: 500 });
  }

  const { error } = await supabaseAdmin.from("school_requests").insert({
    requested_by_user_id: userRow.id,
    city_name: cityName,
    school_name: schoolName,
    address: address || null,
    status: "pending",
  });

  if (error) {
    console.error("Error inserting school request", error);
    return NextResponse.json(
      { error: "Ошибка создания заявки" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
