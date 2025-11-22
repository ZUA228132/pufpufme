import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { telegramUser, reportedUserId, reason } = body || {};

  if (!telegramUser?.id || !reportedUserId) {
    return NextResponse.json(
      { error: "Недостаточно данных" },
      { status: 400 }
    );
  }

  const telegramId = String(telegramUser.id);

  const { data: reporter, error: reporterErr } = await supabaseAdmin
    .from("users")
    .select("id, current_school_id")
    .eq("telegram_id", telegramId)
    .maybeSingle();

  if (reporterErr || !reporter?.current_school_id) {
    return NextResponse.json(
      { error: "Пользователь не привязан к школе" },
      { status: 400 }
    );
  }

  const schoolId = reporter.current_school_id as string;

  const { error } = await supabaseAdmin.from("user_reports").insert({
    school_id: schoolId,
    reporter_user_id: reporter.id,
    reported_user_id: reportedUserId,
    reason: reason || null,
  });

  if (error) {
    console.error("Error inserting report", error);
    return NextResponse.json(
      { error: "Ошибка отправки жалобы" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
