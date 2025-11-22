import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { telegramUser, displayName, className } = body || {};

  if (!telegramUser?.id || !displayName) {
    return NextResponse.json({ error: "Недостаточно данных" }, { status: 400 });
  }

  const telegramId = String(telegramUser.id);

  const { data: userRow, error: userErr } = await supabaseAdmin
    .from("users")
    .select("id, current_school_id, first_name, last_name")
    .eq("telegram_id", telegramId)
    .maybeSingle();

  if (userErr || !userRow?.current_school_id) {
    return NextResponse.json({ error: "Пользователь не привязан к школе" }, { status: 400 });
  }

  const schoolId = userRow.current_school_id as string;

  const { data: existingCandidate } = await supabaseAdmin
    .from("admin_candidates")
    .select("id")
    .eq("school_id", schoolId)
    .eq("user_id", userRow.id)
    .maybeSingle();

  if (existingCandidate) {
    return NextResponse.json({ error: "Вы уже выдвигали кандидатуру" }, { status: 400 });
  }

  const { data: newCandidate, error: candErr } = await supabaseAdmin
    .from("admin_candidates")
    .insert({
      school_id: schoolId,
      user_id: userRow.id,
      display_name: displayName,
      class_name: className || null,
      status: "approved",
    })
    .select("id")
    .single();

  if (candErr || !newCandidate) {
    console.error("Error inserting candidate", candErr);
    return NextResponse.json({ error: "Ошибка сохранения кандидата" }, { status: 500 });
  }

  const { data: countApproved, error: countErr } = await supabaseAdmin
    .from("admin_candidates")
    .select("id", { count: "exact", head: true })
    .eq("school_id", schoolId)
    .eq("status", "approved");

  if (countErr) {
    console.error("Error counting candidates", countErr);
  }

  const candidatesCount = countApproved?.length === 0 ? 0 : countApproved;

  const { data: existingElection } = await supabaseAdmin
    .from("elections")
    .select("id, status")
    .eq("school_id", schoolId)
    .eq("status", "active")
    .maybeSingle();

  if (!existingElection && typeof candidatesCount === "number" && candidatesCount >= 6) {
    const now = new Date();
    const ends = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const { error: electErr } = await supabaseAdmin
      .from("elections")
      .insert({
        school_id: schoolId,
        status: "active",
        starts_at: now.toISOString(),
        ends_at: ends.toISOString(),
      });

    if (electErr) {
      console.error("Error starting election", electErr);
    }
  }

  return NextResponse.json({ ok: true });
}
