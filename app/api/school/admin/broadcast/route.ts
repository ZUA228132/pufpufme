import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../../lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { telegramUser, text } = body || {};

  if (!telegramUser?.id || !text) {
    return NextResponse.json(
      { error: "Недостаточно данных" },
      { status: 400 }
    );
  }

  const telegramId = String(telegramUser.id);

  try {
    const { data: userRow, error: userErr } = await supabaseAdmin
      .from("users")
      .select("id, current_school_id")
      .eq("telegram_id", telegramId)
      .maybeSingle();

    if (userErr || !userRow) {
      console.error("broadcast: user load error", userErr);
      return NextResponse.json(
        { error: "Пользователь не найден" },
        { status: 400 }
      );
    }

    if (!userRow.current_school_id) {
      return NextResponse.json(
        { error: "Пользователь не привязан к школе" },
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
      console.error("broadcast: school load error", schoolErr);
      return NextResponse.json(
        { error: "Школа не найдена" },
        { status: 400 }
      );
    }

    if (schoolRow.school_admin_id !== userRow.id) {
      return NextResponse.json(
        { error: "Только админ школы может отправлять рассылку" },
        { status: 403 }
      );
    }

    const { error } = await supabaseAdmin.from("broadcasts").insert({
      school_id: schoolId,
      author_user_id: userRow.id,
      text,
    });

    if (error) {
      console.error("broadcast: insert error", error);
      return NextResponse.json(
        { error: "Ошибка сохранения рассылки" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("broadcast fatal error", err);
    return NextResponse.json(
      { error: "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
}
