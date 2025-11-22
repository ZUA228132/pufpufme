import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { telegramUser, cityId, cityName, schoolName, address } = body || {};

  if (!telegramUser?.id || !schoolName || (!cityId && !cityName)) {
    return NextResponse.json({ error: "Недостаточно данных" }, { status: 400 });
  }

  const telegramId = String(telegramUser.id);

  const { data: adminUser, error: userErr } = await supabaseAdmin
    .from("users")
    .select("id, is_global_admin")
    .eq("telegram_id", telegramId)
    .maybeSingle();

  if (userErr) {
    console.error("create-school: load admin error", userErr);
    return NextResponse.json({ error: "Ошибка проверки прав" }, { status: 500 });
  }

  if (!adminUser || !adminUser.is_global_admin) {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }

  let finalCityId = cityId as string | null;

  if (!finalCityId && cityName) {
    const { data: existingCity } = await supabaseAdmin
      .from("cities")
      .select("id")
      .ilike("name", cityName.trim())
      .maybeSingle();

    if (existingCity) {
      finalCityId = existingCity.id as string;
    } else {
      const { data: newCity, error: cityErr } = await supabaseAdmin
        .from("cities")
        .insert({ name: cityName.trim() })
        .select("id")
        .single();

      if (cityErr || !newCity) {
        console.error("create-school: create city error", cityErr);
        return NextResponse.json({ error: "Не удалось создать город" }, { status: 500 });
      }

      finalCityId = newCity.id as string;
    }
  }

  if (!finalCityId) {
    return NextResponse.json({ error: "Не удалось определить город" }, { status: 400 });
  }

  const { data: school, error } = await supabaseAdmin
    .from("schools")
    .insert({
      city_id: finalCityId,
      name: schoolName.trim(),
      address: address || null,
    })
    .select("*")
    .single();

  if (error || !school) {
    console.error("create-school: create school error", error);
    return NextResponse.json({ error: "Не удалось создать школу" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, school });
}
