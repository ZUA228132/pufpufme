import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export async function POST(req: NextRequest) {
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
    .select("id, is_global_admin")
    .eq("telegram_id", telegramId)
    .maybeSingle();

  if (userErr) {
    console.error("Error loading user for admin overview", userErr);
    return NextResponse.json({ ok: false, error: "Ошибка пользователя" });
  }

  if (!userRow?.is_global_admin) {
    return NextResponse.json(
      { ok: false, error: "Доступ только для главного админа" },
      { status: 403 }
    );
  }

  const { data: requests, error: reqErr } = await supabaseAdmin
    .from("school_requests")
    .select("id, city_name, school_name, address, status, requested_by_user_id, created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (reqErr) {
    console.error("Error loading school_requests", reqErr);
  }

  const { data: schools, error: schErr } = await supabaseAdmin
    .from("schools")
    .select("id, name, school_admin_id, city_id");

  let schoolsWithCity = schools ?? [];
  if (schErr) {
    console.error("Error loading schools", schErr);
  } else {
    const cityIds = Array.from(new Set((schools ?? []).map((s) => s.city_id).filter(Boolean)));
    let citiesMap: Record<string, string> = {};
    if (cityIds.length > 0) {
      const { data: cities } = await supabaseAdmin
        .from("cities")
        .select("id, name")
        .in("id", cityIds as string[]);
      for (const c of cities ?? []) {
        citiesMap[c.id] = c.name;
      }
    }
    schoolsWithCity = (schools ?? []).map((s) => ({
      id: s.id,
      name: s.name,
      school_admin_id: s.school_admin_id,
      city_name: s.city_id ? citiesMap[s.city_id] ?? null : null,
    }));
  }


  const { data: reports, error: reportsErr } = await supabaseAdmin
    .from("user_reports")
    .select(
      "id, school_id, reporter_user_id, reported_user_id, reason, status, created_at"
    )
    .in("status", ["escalated", "pending_school"]);

  if (reportsErr) {
    console.error("Error loading user_reports", reportsErr);
  }

  const { data: bans, error: bansErr } = await supabaseAdmin
    .from("school_bans")
    .select("id, school_id, user_id, active, created_at")
    .eq("active", true);

  if (bansErr) {
    console.error("Error loading school_bans", bansErr);
  }

  return NextResponse.json({
    ok: true,
    pending_requests: requests ?? [],
    schools: schoolsWithCity,
    reports: reports ?? [],
    active_bans: bans ?? [],
  });
}
