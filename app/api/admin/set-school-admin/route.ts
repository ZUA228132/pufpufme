import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { telegramUser, schoolId, userId } = body || {};

  if (!telegramUser?.id || !schoolId || !userId) {
    return NextResponse.json({ error: "Недостаточно данных" }, { status: 400 });
  }

  const telegramId = String(telegramUser.id);

  const { data: adminUser, error: userErr } = await supabaseAdmin
    .from("users")
    .select("id, is_global_admin")
    .eq("telegram_id", telegramId)
    .maybeSingle();

  if (userErr || !adminUser?.is_global_admin) {
    return NextResponse.json(
      { error: "Доступ только для главного админа" },
      { status: 403 }
    );
  }

  const { error } = await supabaseAdmin
    .from("schools")
    .update({ school_admin_id: userId })
    .eq("id", schoolId);

  if (error) {
    console.error("Error setting school admin", error);
    return NextResponse.json({ error: "Не удалось назначить админа" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
