import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { telegramUser, code } = body || {};

  if (!telegramUser?.id || !code) {
    return NextResponse.json(
      { ok: false, error: "Нет данных" },
      { status: 400 }
    );
  }

  const telegramId = String(telegramUser.id);

  const { data: inviteRow, error: invErr } = await supabaseAdmin
    .from("school_invites")
    .select("id, school_id, max_uses, used_count, is_active")
    .eq("code", code as string)
    .maybeSingle();

  if (invErr || !inviteRow || !inviteRow.is_active) {
    return NextResponse.json(
      { ok: false, error: "Ссылка недействительна" },
      { status: 400 }
    );
  }

  if (
    typeof inviteRow.max_uses === "number" &&
    inviteRow.max_uses > 0 &&
    inviteRow.used_count >= inviteRow.max_uses
  ) {
    return NextResponse.json(
      { ok: false, error: "Лимит переходов по ссылке исчерпан" },
      { status: 400 }
    );
  }

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

  const { error: updUserErr } = await supabaseAdmin
    .from("users")
    .update({ current_school_id: inviteRow.school_id })
    .eq("id", userRow.id);

  if (updUserErr) {
    console.error("join-invite user update error", updUserErr);
    return NextResponse.json(
      { ok: false, error: "Ошибка подключения к школе" },
      { status: 500 }
    );
  }

  const { error: updInvErr } = await supabaseAdmin
    .from("school_invites")
    .update({
      used_count: (inviteRow.used_count || 0) + 1,
      is_active:
        typeof inviteRow.max_uses === "number" &&
        inviteRow.max_uses > 0 &&
        inviteRow.used_count + 1 >= inviteRow.max_uses
          ? false
          : inviteRow.is_active,
    })
    .eq("id", inviteRow.id);

  if (updInvErr) {
    console.error("join-invite counter update error", updInvErr);
  }

  return NextResponse.json({ ok: true, school_id: inviteRow.school_id });
}
