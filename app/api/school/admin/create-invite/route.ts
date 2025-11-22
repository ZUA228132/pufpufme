import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { supabaseAdmin } from "../../../../../lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { telegramUser, maxUses } = body || {};

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

  if (schoolErr || !schoolRow || schoolRow.school_admin_id !== userRow.id) {
    return NextResponse.json(
      { ok: false, error: "Нет прав админа школы" },
      { status: 403 }
    );
  }

  const uses =
    typeof maxUses === "number" && maxUses > 0 ? Math.floor(maxUses) : null;

  const code = randomBytes(6).toString("base64url");

  const { error: insErr } = await supabaseAdmin.from("school_invites").insert({
    school_id: schoolId,
    code,
    max_uses: uses,
    created_by_user_id: userRow.id,
  });

  if (insErr) {
    console.error("create-invite error", insErr);
    return NextResponse.json(
      { ok: false, error: "Ошибка создания ссылки" },
      { status: 500 }
    );
  }

  const origin = req.headers.get("origin") || "";
  const webUrl = origin ? `${origin}/invite/${code}` : `/invite/${code}`;

  const botUsername =
    process.env.NEXT_PUBLIC_TELEGRAM_BOT || "puff_school_bot";
  const tgLink = `https://t.me/${botUsername}?startapp=invite_${code}`;

  return NextResponse.json({
    ok: true,
    code,
    url: tgLink,
    web_url: webUrl,
    tg_link: tgLink,
  });
}
