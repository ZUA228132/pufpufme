import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { telegramUser, schoolId, isPremium } = body || {};

  if (!telegramUser?.id || !schoolId || typeof isPremium !== "boolean") {
    return NextResponse.json({ error: "Недостаточно данных" }, { status: 400 });
  }

  const telegramId = String(telegramUser.id);

  const { data: adminUser, error: userErr } = await supabaseAdmin
    .from("users")
    .select("id, is_global_admin")
    .eq("telegram_id", telegramId)
    .maybeSingle();

  if (userErr) {
    console.error("set-school-premium: load admin error", userErr);
    return NextResponse.json({ error: "Ошибка проверки прав" }, { status: 500 });
  }

  if (!adminUser || !adminUser.is_global_admin) {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }

  const { error } = await supabaseAdmin
    .from("schools")
    .update({ is_premium: isPremium })
    .eq("id", schoolId);

  if (error) {
    console.error("set-school-premium: update error", error);
    return NextResponse.json({ error: "Не удалось обновить премиум школы" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
