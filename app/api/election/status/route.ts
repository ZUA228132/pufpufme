import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { telegramUser } = body || {};

  if (!telegramUser?.id) {
    return NextResponse.json({ ok: false, message: "Нет данных Telegram-пользователя" }, { status: 400 });
  }

  const telegramId = String(telegramUser.id);

  const { data: userRow, error: userErr } = await supabaseAdmin
    .from("users")
    .select("id, current_school_id")
    .eq("telegram_id", telegramId)
    .maybeSingle();

  if (userErr || !userRow?.current_school_id) {
    return NextResponse.json({ ok: false, message: "Пользователь не привязан к школе" });
  }

  const schoolId = userRow.current_school_id as string;

  const { data: schoolRow, error: schoolErr } = await supabaseAdmin
    .from("schools")
    .select("id, school_admin_id")
    .eq("id", schoolId)
    .maybeSingle();

  if (schoolErr || !schoolRow) {
    return NextResponse.json({ ok: false, message: "Школа не найдена" });
  }

  let electionRow: any = null;
  const { data: elections, error: electErr } = await supabaseAdmin
    .from("elections")
    .select("*")
    .eq("school_id", schoolId)
    .order("starts_at", { ascending: false })
    .limit(1);

  if (!electErr && elections && elections.length > 0) {
    electionRow = elections[0];
  }

  const now = new Date();
  if (electionRow && electionRow.status === "active") {
    const endsAt = new Date(electionRow.ends_at);
    if (endsAt.getTime() <= now.getTime()) {
      const { data: votesAgg, error: votesErr } = await supabaseAdmin
        .from("votes")
        .select("candidate_id, count(id) as votes_count")
        .eq("election_id", electionRow.id)
        .group("candidate_id")
        .order("votes_count", { ascending: false });

      if (!votesErr && votesAgg && votesAgg.length > 0) {
        const winnerCandidateId = votesAgg[0].candidate_id;
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
          .update({ status: "finished", winner_candidate_id: winnerCandidateId })
          .eq("id", electionRow.id);

        electionRow.status = "finished";
        electionRow.winner_candidate_id = winnerCandidateId;
      }
    }
  }

  const { data: candidatesRaw, error: candErr } = await supabaseAdmin
    .from("admin_candidates")
    .select("id, display_name, class_name, photo_url")
    .eq("school_id", schoolId)
    .order("created_at", { ascending: true });

  if (candErr) {
    console.error("Error loading candidates", candErr);
  }

  const candidateIds = (candidatesRaw ?? []).map((c) => c.id);
  let votesAgg: any[] = [];
  if (electionRow && candidateIds.length > 0) {
    const { data: votesAggData } = await supabaseAdmin
      .from("votes")
      .select("candidate_id, count(id) as votes_count")
      .eq("election_id", electionRow.id)
      .group("candidate_id");
    votesAgg = votesAggData ?? [];
  }

  const votesMap: Record<string, number> = {};
  for (const v of votesAgg) {
    votesMap[v.candidate_id] = Number(v.votes_count || 0);
  }

  let myVoteCandidateId: string | null = null;
  if (electionRow) {
    const { data: myVote } = await supabaseAdmin
      .from("votes")
      .select("candidate_id")
      .eq("election_id", electionRow.id)
      .eq("voter_user_id", userRow.id)
      .maybeSingle();
    if (myVote) {
      myVoteCandidateId = myVote.candidate_id;
    }
  }

  const candidates = (candidatesRaw ?? []).map((c) => ({
    id: c.id,
    display_name: c.display_name,
    class_name: c.class_name,
    photo_url: c.photo_url,
    votes_count: votesMap[c.id] ?? 0,
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
