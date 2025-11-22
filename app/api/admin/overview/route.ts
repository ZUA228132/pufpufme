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

  try {
    const { data: me, error: meErr } = await supabaseAdmin
      .from("users")
      .select("id, is_global_admin")
      .eq("telegram_id", telegramId)
      .maybeSingle();

    if (meErr) {
      console.error("admin overview: load me error", meErr);
      return NextResponse.json(
        { ok: false, error: "Ошибка проверки прав" },
        { status: 500 }
      );
    }

    if (!me || !me.is_global_admin) {
      return NextResponse.json(
        { ok: false, error: "Недостаточно прав" },
        { status: 403 }
      );
    }

    const [
      { data: requests, error: reqErr },
      { data: schools, error: schoolsErr },
      { data: cities, error: citiesErr },
      { data: users, error: usersErr },
      { data: reports, error: reportsErr },
      { data: bans, error: bansErr },
    ] = await Promise.all([
      supabaseAdmin
        .from("school_requests")
        .select(
          "id, city_name, school_name, address, status, requested_by_user_id, created_at"
        )
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("schools")
        .select(
          "id, name, address, is_premium, school_admin_id, city_id, created_at"
        )
        .order("created_at", { ascending: false }),
      supabaseAdmin.from("cities").select("id, name"),
      supabaseAdmin
        .from("users")
        .select(
          "id, telegram_id, username, first_name, last_name, current_school_id, class_name, is_global_admin, premium_until, created_at"
        )
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("user_reports")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100),
      supabaseAdmin
        .from("school_bans")
        .select("*")
        .eq("active", true)
        .order("created_at", { ascending: false }),
    ]);

    if (reqErr) console.error("admin overview: school_requests error", reqErr);
    if (schoolsErr) console.error("admin overview: schools error", schoolsErr);
    if (citiesErr) console.error("admin overview: cities error", citiesErr);
    if (usersErr) console.error("admin overview: users error", usersErr);
    if (reportsErr) console.error("admin overview: reports error", reportsErr);
    if (bansErr) console.error("admin overview: bans error", bansErr);

    const cityById = new Map<string, string>();
    (cities ?? []).forEach((c: any) => {
      cityById.set(c.id, c.name);
    });

    const schoolById = new Map<string, any>();
    (schools ?? []).forEach((s: any) => {
      schoolById.set(s.id, s);
    });

    const userById = new Map<string, any>();
    (users ?? []).forEach((u: any) => {
      userById.set(u.id, u);
    });

    const studentsCount: Record<string, number> = {};
    (users ?? []).forEach((u: any) => {
      if (u.current_school_id) {
        const sid = u.current_school_id as string;
        studentsCount[sid] = (studentsCount[sid] || 0) + 1;
      }
    });

    const schoolsWithCity = (schools ?? []).map((s: any) => ({
      ...s,
      city_name: s.city_id ? cityById.get(s.city_id) ?? null : null,
      students_count: studentsCount[s.id] || 0,
      admin_username: s.school_admin_id
        ? userById.get(s.school_admin_id)?.username ?? null
        : null,
    }));

    const usersWithMeta = (users ?? []).map((u: any) => ({
      ...u,
      current_school_name: u.current_school_id
        ? schoolById.get(u.current_school_id)?.name ?? null
        : null,
    }));

    return NextResponse.json({
      ok: true,
      pending_requests: requests ?? [],
      schools: schoolsWithCity,
      reports: reports ?? [],
      active_bans: bans ?? [],
      users: usersWithMeta,
    });
  } catch (err) {
    console.error("admin overview fatal error", err);
    return NextResponse.json(
      { ok: false, error: "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
}
