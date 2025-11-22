import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { telegramUser } = body || {};

  if (!telegramUser?.id) {
    return NextResponse.json(
      { ok: false, message: "Нет данных Telegram-пользователя" },
      { status: 400 }
    );
  }

  const telegramId = String(telegramUser.id);

  // Находим пользователя и его школу
  const { data: userRow, error: userErr } = await supabaseAdmin
    .from("users")
    .select("id, current_school_id")
    .eq("telegram_id", telegramId)
    .maybeSingle();

  if (userErr || !userRow?.current_school_id) {
    return NextResponse.json({
      ok: false,
      message: "Пользователь не привязан к школе",
    });
  }

  const schoolId = userRow.current_school_id as string;

  // Школа (для проверки, есть ли админ)
  const { data: schoolRow, error: schoolErr } = await supabaseAdmin
    .from("schools")
    .select("id, school_admin_id")
    .eq("id", schoolId)
    .maybeSingle();

  if (schoolErr || !schoolRow) {
    return NextResponse.json({
      ok: false,
      message: "Школа не найдена",
    });
  }

  // Последние выборы по этой школе
  const { data: elections, error: electErr } = await supabaseAdmin
    .from("elections")
    .select("*")
    .eq("school_id", schoolId)
    .order("starts_at", { ascending: false })
    .limit(1);

  let electionRow: any = null;
  if (!electErr && elections && elections.length > 0) {
    electionRow = elections[0];
  }

  const now = new Date();

  // Если выборы активны и уже истёк срок — подводим итоги
  if (electionRow && electionRow.status === "active") {
    const endsAt = new Date(electionRow.ends_at);

    if (endsAt.getTime() <= now.getTime()) {
      const { data: votesData, error: votesErr } = await supabaseAdmin
        .from("votes")
        .select("candidate_id")
        .eq("election_id", electionRow.id);

      if (!votesErr && votesData && votesData.length > 0) {
        const counters: Record<string, number> = {};

        for (const v of votesData) {
          const cid = v.candidate_id as string;
          counters[cid] = (counters[cid] ?? 0) + 1;
        }

        // ищем кандидата с максимальным количеством голосов
        let winnerCandidateId: string | null = null;
        let maxVotes = -1;

        for (const cid of Object.keys(counters)) {
          const count = counters[cid];
          if (count > maxVotes) {
            maxVotes = count;
            winnerCandidateId = cid;
          }
        }

        if (winnerCandidateId) {
          // назначаем победителя админом школы
          const { data: winnerCandidate } = await supabaseAdmin
            .from("admin_candidates")
            .select("user_id")
            .eq("id", winnerCandidateId)
            .maybeSingle();

          if (winnerCandidate) {
            await supabaseAdmin
              .from("schools")
              .update({ school_admin_id: winnerCandidate.user_id })
              .eq("id", schoolId);
          }

          await supabaseAdmin
            .from("elections")
            .update({
              status: "finished",
              winner_candidate_id: winnerCandidateId,
            })
            .eq("id", electionRow.id);

          electionRow.status = "finished";
          electionRow.winner_candidate_id = winnerCandidateId;
        } else {
          // голосов нет — просто закрываем выборы без победителя
          await supabaseAdmin
            .from("elections")
            .update({ status: "finished" })
            .eq("id", electionRow.id);

          electionRow.status = "finished";
        }
      }
    }
  }

  // Кандидаты по школе
  const { data: candidatesRaw, error: candErr } = await supabaseAdmin
    .from("admin_candidates")
    .select("id, display_name, class_name, photo_url")
    .eq("school_id", schoolId)
    .order("created_at", { ascending: true });

  if (candErr) {
    console.error("Error loading candidates", candErr);
  }

  // Карта голосов по кандидатам + мой голос
  const votesMap: Record<string, number> = {};
  let myVoteCandidateId: string | null = null;

  if (electionRow) {
    const { data: votesData } = await supabaseAdmin
      .from("votes")
      .select("candidate_id, voter_user_id")
      .eq("election_id", electionRow.id);

    for (const v of votesData ?? []) {
      const cid = v.candidate_id as string;
      votesMap[cid] = (votesMap[cid] ?? 0) + 1;
      if (v.voter_user_id === userRow.id) {
        myVoteCandidateId = cid;
      }
    }
  }

  const candidates = (candidatesRaw ?? []).map((c: any) => ({
    id: c.id as string,
    display_name: (c.display_name as string | null) ?? null,
    class_name: (c.class_name as string | null) ?? null,
    photo_url: (c.photo_url as string | null) ?? null,
    votes_count: votesMap[c.id as string] ?? 0,
  }));

  return NextResponse.json({
    ok: true,
    school_has_admin: !!schoolRow.school_admin_id,
    election: electionRow
      ? {
          id: electionRow.id,
          status: electionRow.status,
          starts_at: electionRow.starts_at,
          ends_at: electionRow.ends_at,
          winner_candidate_id: electionRow.winner_candidate_id,
        }
      : null,
    candidates,
    my_vote_candidate_id: myVoteCandidateId,
  });
}
