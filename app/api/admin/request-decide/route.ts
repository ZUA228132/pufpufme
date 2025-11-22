import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { telegramUser, requestId, decision } = body || {};

  if (!telegramUser?.id || !requestId || !decision) {
    return NextResponse.json({ error: "Недостаточно данных" }, { status: 400 });
  }

  const telegramId = String(telegramUser.id);

  const { data: adminUser, error: userErr } = await supabaseAdmin
    .from("users")
    .select("id, is_global_admin")
    .eq("telegram_id", telegramId)
    .maybeSingle();

  if (userErr || !adminUser?.is_global_admin) {
    return NextResponse.json(
      { error: "Доступ только для главного админа" },
      { status: 403 }
    );
  }

  const { data: reqRow, error: reqErr } = await supabaseAdmin
    .from("school_requests")
    .select("*")
    .eq("id", requestId)
    .maybeSingle();

  if (reqErr || !reqRow) {
    return NextResponse.json({ error: "Заявка не найдена" }, { status: 404 });
  }

  if (decision === "rejected") {
    const { error } = await supabaseAdmin
      .from("school_requests")
      .update({
        status: "rejected",
        decision_by_admin_id: adminUser.id,
        decision_comment: "Отклонено главным админом",
      })
      .eq("id", requestId);

    if (error) {
      console.error("Error rejecting request", error);
      return NextResponse.json({ error: "Ошибка обновления заявки" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  }

  const cityName = reqRow.city_name as string;
  const schoolName = reqRow.school_name as string;
  const address = reqRow.address as string | null;

  const { data: existingCity } = await supabaseAdmin
    .from("cities")
    .select("id")
    .ilike("name", cityName)
    .maybeSingle();

  let cityId: string;
  if (existingCity) {
    cityId = existingCity.id;
  } else {
    const { data: newCity, error: cityErr } = await supabaseAdmin
      .from("cities")
      .insert({ name: cityName })
      .select("id")
      .single();
    if (cityErr || !newCity) {
      console.error("Error creating city", cityErr);
      return NextResponse.json({ error: "Не удалось создать город" }, { status: 500 });
    }
    cityId = newCity.id;
  }

  const { data: school, error: schoolErr } = await supabaseAdmin
    .from("schools")
    .insert({
      city_id: cityId,
      name: schoolName,
      address: address ?? null,
    })
    .select("id")
    .single();

  if (schoolErr || !school) {
    console.error("Error creating school", schoolErr);
    return NextResponse.json({ error: "Не удалось создать школу" }, { status: 500 });
  }

  const { error: updateReqErr } = await supabaseAdmin
    .from("school_requests")
    .update({
      status: "approved",
      decision_by_admin_id: adminUser.id,
      decision_comment: "Одобрено и создана школа",
    })
    .eq("id", requestId);

  if (updateReqErr) {
    console.error("Error updating request", updateReqErr);
  }

  const { error: updateUserErr } = await supabaseAdmin
    .from("users")
    .update({ current_school_id: school.id })
    .eq("id", reqRow.requested_by_user_id);

  if (updateUserErr) {
    console.error("Error updating requested user school", updateUserErr);
  }

  return NextResponse.json({ ok: true });
}
