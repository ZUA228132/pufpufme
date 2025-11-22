import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../../lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { telegramUser, description, address, logoUrl, bannerUrl } = body || {};

  if (!telegramUser?.id) {
    return NextResponse.json(
      { ok: false, error: "Нет данных Telegram-пользователя" },
      { status: 400 }
    );
  }

  const telegramId = String(telegramUser.id);

  const { data: userRow, error: userErr } = await supabaseAdmin
    .from("users")
    .select("id, current_school_id")
    .eq("telegram_id", telegramId)
    .maybeSingle();

  if (userErr || !userRow?.current_school_id) {
    return NextResponse.json(
      { ok: false, error: "Пользователь не привязан к школе" },
      { status: 400 }
    );
  }

  const schoolId = userRow.current_school_id as string;

  const { data: schoolRow, error: schoolErr } = await supabaseAdmin
    .from("schools")
    .select("id, school_admin_id")
    .eq("id", schoolId)
    .maybeSingle();

  if (schoolErr || !schoolRow) {
    return NextResponse.json(
      { ok: false, error: "Школа не найдена" },
      { status: 404 }
    );
  }

  if (schoolRow.school_admin_id !== userRow.id) {
    return NextResponse.json(
      { ok: false, error: "Вы не админ этой школы" },
      { status: 403 }
    );
  }

  const { error: updErr } = await supabaseAdmin
    .from("schools")
    .update({
      description: description ?? null,
      address: address ?? null,
      logo_url: logoUrl ?? null,
      banner_url: bannerUrl ?? null,
    })
    .eq("id", schoolId);

  if (updErr) {
    console.error("update-profile error", updErr);
    return NextResponse.json(
      { ok: false, error: "Ошибка сохранения профиля" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
