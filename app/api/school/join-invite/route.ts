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

  try {
    // 1. Найдём / создадим пользователя по telegram_id
    const upsertPayload: any = {
      telegram_id: telegramId,
      username: telegramUser.username ?? null,
      first_name: telegramUser.first_name ?? null,
      last_name: telegramUser.last_name ?? null,
      photo_url: telegramUser.photo_url ?? null,
    };

    const { data: userRow, error: userErr } = await supabaseAdmin
      .from("users")
      .upsert(upsertPayload, { onConflict: "telegram_id" })
      .select("*")
      .single();

    if (userErr || !userRow) {
      console.error("join-invite user upsert error", userErr);
      return NextResponse.json(
        { ok: false, error: "Не удалось сохранить пользователя" },
        { status: 500 }
      );
    }

    // 2. Проверим инвайт
    const { data: inviteRow, error: inviteErr } = await supabaseAdmin
      .from("school_invites")
      .select("id, school_id, max_uses, used_count, is_active")
      .eq("code", code)
      .maybeSingle();

    if (inviteErr) {
      console.error("join-invite load invite error", inviteErr);
      return NextResponse.json(
        { ok: false, error: "Ошибка поиска инвайта" },
        { status: 500 }
      );
    }

    if (
      !inviteRow ||
      inviteRow.is_active === false ||
      (typeof inviteRow.max_uses === "number" &&
        inviteRow.max_uses > 0 &&
        inviteRow.used_count >= inviteRow.max_uses)
    ) {
      return NextResponse.json(
        { ok: false, error: "Инвайт недействителен или закончились использования" },
        { status: 400 }
      );
    }

    // 3. Привяжем пользователя к школе
    const { error: updUserErr } = await supabaseAdmin
      .from("users")
      .update({ current_school_id: inviteRow.school_id })
      .eq("id", userRow.id);

    if (updUserErr) {
      console.error("join-invite user update error", updUserErr);
      return NextResponse.json(
        { ok: false, error: "Не удалось привязать пользователя к школе" },
        { status: 500 }
      );
    }

    // 4. Обновим счётчик использований инвайта
    const newUsedCount =
      (typeof inviteRow.used_count === "number" ? inviteRow.used_count : 0) + 1;

    const shouldStayActive =
      !(
        typeof inviteRow.max_uses === "number" &&
        inviteRow.max_uses > 0 &&
        newUsedCount >= inviteRow.max_uses
      ) && inviteRow.is_active;

    const { error: updInvErr } = await supabaseAdmin
      .from("school_invites")
      .update({
        used_count: newUsedCount,
        is_active: shouldStayActive,
      })
      .eq("id", inviteRow.id);

    if (updInvErr) {
      console.error("join-invite counter update error", updInvErr);
      // Не падаем с ошибкой для пользователя, просто логируем
    }

    // 5. Для красивого экрана вернём базовую инфу о школе
    const { data: schoolRow, error: schoolErr } = await supabaseAdmin
      .from("schools")
      .select("id, name, logo_url, banner_url")
      .eq("id", inviteRow.school_id)
      .maybeSingle();

    if (schoolErr) {
      console.error("join-invite load school error", schoolErr);
    }

    return NextResponse.json({
      ok: true,
      school_id: inviteRow.school_id,
      school: schoolRow ?? null,
    });
  } catch (err) {
    console.error("join-invite fatal error", err);
    return NextResponse.json(
      { ok: false, error: "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
}
