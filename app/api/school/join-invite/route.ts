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

  // Ищем инвайт
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

  // Проверяем лимит использований
  if (
    typeof inviteRow.max_uses === "number" &&
    inviteRow.max_uses > 0 &&
    (inviteRow.used_count || 0) >= inviteRow.max_uses
  ) {
    return NextResponse.json(
      { ok: false, error: "Лимит использований ссылки исчерпан" },
      { status: 400 }
    );
  }

  // Ищем пользователя по telegram_id
  const { data: existingUser, error: userErr } = await supabaseAdmin
    .from("users")
    .select("id, is_global_admin")
    .eq("telegram_id", telegramId)
    .maybeSingle();

  if (userErr) {
    console.error("join-invite user lookup error", userErr);
    return NextResponse.json(
      { ok: false, error: "Ошибка пользователя" },
      { status: 500 }
    );
  }

  let userId: string | null = null;

  // Если пользователь уже есть — просто обновляем привязку к школе
  if (existingUser) {
    userId = existingUser.id as string;
    const { error: updUserErr } = await supabaseAdmin
      .from("users")
      .update({
        current_school_id: inviteRow.school_id,
      })
      .eq("id", userId);

    if (updUserErr) {
      console.error("join-invite user update error", updUserErr);
      return NextResponse.json(
        { ok: false, error: "Не удалось обновить пользователя" },
        { status: 500 }
      );
    }
  } else {
    // Если пользователя нет — создаём
    const { data: inserted, error: insErr } = await supabaseAdmin
      .from("users")
      .insert({
        telegram_id: telegramId,
        username: telegramUser.username ?? null,
        first_name: telegramUser.first_name ?? null,
        last_name: telegramUser.last_name ?? null,
        photo_url: telegramUser.photo_url ?? null,
        display_name:
          telegramUser.first_name ||
          telegramUser.last_name ||
          telegramUser.username ||
          null,
        current_school_id: inviteRow.school_id,
      })
      .select("id")
      .maybeSingle();

    if (insErr || !inserted) {
      console.error("join-invite user insert error", insErr);
      return NextResponse.json(
        { ok: false, error: "Не удалось создать пользователя" },
        { status: 500 }
      );
    }

    userId = inserted.id as string;
  }

  // Обновляем счётчик инвайта
  const { error: updInvErr } = await supabaseAdmin
    .from("school_invites")
    .update({
      used_count: (inviteRow.used_count || 0) + 1,
      is_active:
        typeof inviteRow.max_uses === "number" &&
        inviteRow.max_uses > 0 &&
        (inviteRow.used_count || 0) + 1 >= inviteRow.max_uses
          ? false
          : inviteRow.is_active,
    })
    .eq("id", inviteRow.id);

  if (updInvErr) {
    console.error("join-invite counter update error", updInvErr);
  }

  return NextResponse.json({
    ok: true,
    school_id: inviteRow.school_id,
    user_id: userId,
  });
}
