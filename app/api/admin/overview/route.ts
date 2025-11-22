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

  // проверяем, что это глобальный админ
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

  // заявки на школы
  const { data: requests, error: reqErr } = await supabaseAdmin
    .from("school_requests")
    .select(
      "id, city_name, school_name, address, status, requested_by_user_id, created_at"
    )
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (reqErr) {
    console.error("Error loading school_requests", reqErr);
  }

  // школы
  const { data: schools, error: schErr } = await supabaseAdmin
    .from("schools")
    .select("id, name, school_admin_id, city_id");

  // финальный массив с городами
  let schoolsWithCity: {
    id: string;
    name: string;
    school_admin_id: string | null;
    city_name: string | null;
  }[] = [];

  if (schErr) {
    console.error("Error loading schools", schErr);
  } else if (schools && schools.length > 0) {
    // собираем уникальные city_id
    const cityIds = Array.from(
      new Set(
        schools
          .map((s: any) => s.city_id)
          .filter((v: any) => v !== null && v !== undefined)
      )
    ) as string[];

    const citiesMap: Record<string, string> = {};

    if (cityIds.length > 0) {
      const { data: cities } = await supabaseAdmin
        .from("cities")
        .select("id, name")
        .in("id", cityIds);

      for (const c of cities ?? []) {
        citiesMap[c.id] = c.name;
      }
    }

    schoolsWithCity = schools.map((s: any) => ({
      id: s.id as string,
      name: s.name as string,
      school_admin_id: (s.school_admin_id as string | null) ?? null,
      city_name: s.city_id ? citiesMap[s.city_id as string] ?? null : null,
    }));
  }

  return NextResponse.json({
    ok: true,
    pending_requests: requests ?? [],
    schools: schoolsWithCity,
  });
}
