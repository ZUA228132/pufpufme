import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { telegramUser } = body || {};

    if (!telegramUser?.id) {
      return NextResponse.json(
        { ok: false, error: "Нет данных Telegram-пользователя" },
        { status: 400 }
      );
    }

    const tgId = String(telegramUser.id);

    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id, current_school_id")
      .eq("telegram_id", tgId)
      .maybeSingle();

    if (!userRow) {
      return NextResponse.json(
        { ok: false, error: "Пользователь не найден" },
        { status: 404 }
      );
    }

    const schoolId = userRow.current_school_id;
    if (!schoolId) {
      return NextResponse.json(
        { ok: false, error: "Вы не в школе" },
        { status: 400 }
      );
    }

    // --- Получаем активные выборы
    const { data: electionRow, error: electErr } = await supabaseAdmin
      .from("elections")
      .select("*")
      .eq("school_id", schoolId)
      .eq("is_active", true)
      .maybeSingle();

    if (electErr) {
      console.error(electErr);
      return NextResponse.json({ ok: false, error: "Ошибка выборов" });
    }

    if (!electionRow) {
      return NextResponse.json({ ok: true, election: null });
    }

    // --- Получаем кандидатов
    const { data: candidates } = await supabaseAdmin
      .from("admin_candidates")
      .select("*")
      .eq("election_id", electionRow.id);

    // --- Получаем ВСЕ голоса и считаем вручную
    const { data: votes } = await supabaseAdmin
      .from("votes")
      .select("candidate_id")
      .eq("election_id", electionRow.id);

    const votesMap: Record<string, number> = {};

    for (const v of votes ?? []) {
      const cid = v.candidate_id;
      votesMap[cid] = (votesMap[cid] || 0) + 1;
    }

    const resultCandidates = (candidates ?? []).map((c) => ({
      ...c,
      votes_count: votesMap[c.id] ?? 0,
    }));

    return NextResponse.json({
      ok: true,
      election: electionRow,
      candidates: resultCandidates,
    });
  } catch (err) {
    console.error("Election status err:", err);
    return NextResponse.json(
      { ok: false, error: "Серверная ошибка выборов" },
      { status: 500 }
    );
  }
}
