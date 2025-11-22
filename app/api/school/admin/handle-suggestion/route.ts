import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../../lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { telegramUser, suggestionId, decision } = body || {};

  if (!telegramUser?.id || !suggestionId || !decision) {
    return NextResponse.json(
      { error: "Недостаточно данных" },
      { status: 400 }
    );
  }

  if (decision !== "approve" && decision !== "reject") {
    return NextResponse.json(
      { error: "Некорректное решение" },
      { status: 400 }
    );
  }

  const telegramId = String(telegramUser.id);

  const { data: userRow, error: userErr } = await supabaseAdmin
    .from("users")
    .select("id, current_school_id")
    .eq("telegram_id", telegramId)
    .maybeSingle();

  if (userErr || !userRow?.current_school_id) {
    return NextResponse.json(
      { error: "Пользователь не привязан к школе" },
      { status: 400 }
    );
  }

  const schoolId = userRow.current_school_id as string;

  const { data: schoolRow, error: schoolErr } = await supabaseAdmin
    .from("schools")
    .select("id, school_admin_id")
    .eq("id", schoolId)
    .maybeSingle();

  if (schoolErr || !schoolRow || schoolRow.school_admin_id !== userRow.id) {
    return NextResponse.json(
      { error: "Вы не являетесь админом этой школы" },
      { status: 403 }
    );
  }

  const { data: suggestion, error: suggErr } = await supabaseAdmin
    .from("post_suggestions")
    .select("id, title, content, status")
    .eq("id", suggestionId)
    .eq("school_id", schoolId)
    .maybeSingle();

  if (suggErr || !suggestion) {
    return NextResponse.json(
      { error: "Предложение не найдено" },
      { status: 404 }
    );
  }

  if (suggestion.status !== "pending") {
    return NextResponse.json(
      { error: "Предложение уже обработано" },
      { status: 400 }
    );
  }

  if (decision === "approve") {
    const { error: postErr } = await supabaseAdmin.from("posts").insert({
      school_id: schoolId,
      title: suggestion.title,
      content: suggestion.content || null,
      status: "published",
    });

    if (postErr) {
      console.error("Error creating post from suggestion", postErr);
      return NextResponse.json(
        { error: "Ошибка публикации новости" },
        { status: 500 }
      );
    }
  }

  const { error: updErr } = await supabaseAdmin
    .from("post_suggestions")
    .update({
      status: decision === "approve" ? "approved" : "rejected",
      reviewed_at: new Date().toISOString(),
      reviewed_by_user_id: userRow.id,
    })
    .eq("id", suggestionId);

  if (updErr) {
    console.error("Error updating suggestion", updErr);
    return NextResponse.json(
      { error: "Ошибка обновления статуса" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
