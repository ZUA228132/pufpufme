import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { telegramUser, candidateId } = body || {};

  if (!telegramUser?.id || !candidateId) {
    return NextResponse.json({ error: "Недостаточно данных" }, { status: 400 });
  }

  const telegramId = String(telegramUser.id);

  const { data: userRow, error: userErr } = await supabaseAdmin
    .from("users")
    .select("id, current_school_id")
    .eq("telegram_id", telegramId)
    .maybeSingle();

  if (userErr || !userRow?.current_school_id) {
    return NextResponse.json({ error: "Пользователь не привязан к школе" }, { status: 400 });
  }

  const schoolId = userRow.current_school_id as string;

  const { data: candidateRow, error: candErr } = await supabaseAdmin
    .from("admin_candidates")
    .select("id, school_id")
    .eq("id", candidateId)
    .maybeSingle();

  if (candErr || !candidateRow || candidateRow.school_id !== schoolId) {
    return NextResponse.json({ error: "Кандидат не найден для вашей школы" }, { status: 400 });
  }

  const { data: electionRow, error: electErr } = await supabaseAdmin
    .from("elections")
    .select("*")
    .eq("school_id", schoolId)
    .eq("status", "active")
    .maybeSingle();

  if (electErr || !electionRow) {
    return NextResponse.json({ error: "Нет активного голосования" }, { status: 400 });
  }

  const now = new Date();
  const ends = new Date(electionRow.ends_at);
  if (ends.getTime() <= now.getTime()) {
    return NextResponse.json({ error: "Голосование уже завершено" }, { status: 400 });
  }

  const { error: voteErr } = await supabaseAdmin
    .from("votes")
    .insert({
      election_id: electionRow.id,
      voter_user_id: userRow.id,
      candidate_id: candidateId,
    });

  if (voteErr) {
    if ((voteErr as any).code === "23505") {
      return NextResponse.json({ error: "Вы уже голосовали" }, { status: 400 });
    }
    console.error("Error inserting vote", voteErr);
    return NextResponse.json({ error: "Ошибка голосования" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
