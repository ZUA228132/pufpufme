import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { telegramUser, userId, makePremium } = body || {};

  if (!telegramUser?.id || !userId || typeof makePremium !== "boolean") {
    return NextResponse.json({ error: "Недостаточно данных" }, { status: 400 });
  }

  const telegramId = String(telegramUser.id);

  const { data: adminUser, error: userErr } = await supabaseAdmin
    .from("users")
    .select("id, is_global_admin")
    .eq("telegram_id", telegramId)
    .maybeSingle();

  if (userErr) {
    console.error("set-user-premium: load admin error", userErr);
    return NextResponse.json({ error: "Ошибка проверки прав" }, { status: 500 });
  }

  if (!adminUser || !adminUser.is_global_admin) {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }

  const premium_until = makePremium
    ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
    : null;

  const { error } = await supabaseAdmin
    .from("users")
    .update({ premium_until })
    .eq("id", userId);

  if (error) {
    console.error("set-user-premium: update error", error);
    return NextResponse.json({ error: "Не удалось обновить премиум" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, premium_until });
}
