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

    const telegramId = String(telegramUser.id);

    const { data: userRow, error: userErr } = await supabaseAdmin
      .from("users")
      .select("id, current_school_id")
      .eq("telegram_id", telegramId)
      .maybeSingle();

    if (userErr) {
      console.error("user load error", userErr);
      return NextResponse.json(
        { ok: false, error: "Ошибка пользователя" },
        { status: 500 }
      );
    }

    if (!userRow?.current_school_id) {
      return NextResponse.json(
        { ok: false, error: "Вы ещё не выбрали школу" },
        { status: 400 }
      );
    }

    const schoolId = userRow.current_school_id as string;

    const { data: schoolRow, error: schoolErr } = await supabaseAdmin
      .from("schools")
      .select("id, school_admin_id")
      .eq("id", schoolId)
      .maybeSingle();

    if (schoolErr) {
      console.error("school load error", schoolErr);
      return NextResponse.json(
        { ok: false, error: "Ошибка школы" },
        { status: 500 }
      );
    }

    const { data: electionRow, error: electionErr } = await supabaseAdmin
      .from("elections")
      .select("*")
      .eq("school_id", schoolId)
      .eq("is_active", true)
      .maybeSingle();

    if (electionErr) {
      console.error("election load error", electionErr);
      return NextResponse.json(
        { ok: false, error: "Ошибка выборов" },
        { status: 500 }
      );
    }

    if (!electionRow) {
      return NextResponse.json({
        ok: true,
        school_has_admin: !!schoolRow?.school_admin_id,
        election: null,
        candidates: [],
        my_vote_candidate_id: null,
      });
    }

    const { data: candidates, error: candErr } = await supabaseAdmin
      .from("admin_candidates")
      .select("*")
      .eq("election_id", electionRow.id);

    if (candErr) {
      console.error("candidates load error", candErr);
    }

    const { data: votesAll, error: votesErr } = await supabaseAdmin
      .from("votes")
      .select("candidate_id, voter_user_id")
      .eq("election_id", electionRow.id);

    if (votesErr) {
      console.error("votes load error", votesErr);
    }

    const votesMap: Record<string, number> = {};
    let myVoteCandidateId: string | null = null;

    for (const v of votesAll ?? []) {
      const cid = v.candidate_id as string;
      votesMap[cid] = (votesMap[cid] || 0) + 1;
      if (v.voter_user_id === userRow.id) {
        myVoteCandidateId = cid;
      }
    }

    const candidatesWithCount = (candidates ?? []).map((c: any) => ({
      ...c,
      votes_count: votesMap[c.id] ?? 0,
    }));

    return NextResponse.json({
      ok: true,
      school_has_admin: !!schoolRow?.school_admin_id,
      election: {
        id: electionRow.id,
        status: electionRow.status,
        starts_at: electionRow.starts_at,
        ends_at: electionRow.ends_at,
        winner_candidate_id: electionRow.winner_candidate_id,
      },
      candidates: candidatesWithCount,
      my_vote_candidate_id: myVoteCandidateId,
    });
  } catch (err) {
    console.error("election status fatal", err);
    return NextResponse.json(
      { ok: false, error: "Серверная ошибка выборов" },
      { status: 500 }
    );
  }
}
