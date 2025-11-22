import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { telegramUser, schoolId } = body || {};

  if (!telegramUser?.id || !schoolId) {
    return NextResponse.json({ error: "Недостаточно данных" }, { status: 400 });
  }

  const telegramId = String(telegramUser.id);

  const { data: adminUser, error: userErr } = await supabaseAdmin
    .from("users")
    .select("id, is_global_admin")
    .eq("telegram_id", telegramId)
    .maybeSingle();

  if (userErr) {
    console.error("delete-school: load admin error", userErr);
    return NextResponse.json({ error: "Ошибка проверки прав" }, { status: 500 });
  }

  if (!adminUser || !adminUser.is_global_admin) {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }

  // Сначала отвяжем пользователей от школы
  const { error: updUsersErr } = await supabaseAdmin
    .from("users")
    .update({ current_school_id: null })
    .eq("current_school_id", schoolId);

  if (updUsersErr) {
    console.error("delete-school: update users error", updUsersErr);
  }

  const { error } = await supabaseAdmin
    .from("schools")
    .delete()
    .eq("id", schoolId);

  if (error) {
    console.error("delete-school: delete school error", error);
    return NextResponse.json({ error: "Не удалось удалить школу" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
