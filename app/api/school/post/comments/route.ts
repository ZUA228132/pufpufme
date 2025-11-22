import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../../lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { telegramUser, postId } = body || {};

    if (!telegramUser?.id || !postId) {
      return NextResponse.json(
        { ok: false, error: "Нет данных для комментариев" },
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
      console.error("comments user error", userErr);
      return NextResponse.json(
        { ok: false, error: "Ошибка пользователя" },
        { status: 500 }
      );
    }

    if (!userRow?.current_school_id) {
      return NextResponse.json(
        { ok: false, error: "Вы не в школе" },
        { status: 400 }
      );
    }

    const { data: postRow, error: postErr } = await supabaseAdmin
      .from("posts")
      .select("id, school_id")
      .eq("id", postId)
      .maybeSingle();

    if (postErr) {
      console.error("comments post error", postErr);
    }

    if (!postRow || postRow.school_id !== userRow.current_school_id) {
      return NextResponse.json(
        { ok: false, error: "Нет доступа к этому посту" },
        { status: 403 }
      );
    }

    const { data: comments, error: commErr } = await supabaseAdmin
      .from("post_comments")
      .select("id, user_id, content, created_at")
      .eq("post_id", postId)
      .order("created_at", { ascending: true })
      .limit(50);

    if (commErr) {
      console.error("comments load error", commErr);
      return NextResponse.json(
        { ok: false, error: "Ошибка загрузки комментариев" },
        { status: 500 }
      );
    }

    const userIds = Array.from(
      new Set((comments ?? []).map((c: any) => c.user_id).filter(Boolean))
    ) as string[];

    let usersMap: Record<string, string> = {};
    if (userIds.length > 0) {
      const { data: users } = await supabaseAdmin
        .from("users")
        .select("id, first_name, last_name, username")
        .in("id", userIds);

      for (const u of users ?? []) {
        const fullName = [u.first_name, u.last_name].filter(Boolean).join(" ");
        usersMap[u.id] = fullName || u.username || "Участник";
      }
    }

    const result = (comments ?? []).map((c: any) => ({
      id: c.id,
      content: c.content,
      created_at: c.created_at,
      author_name: usersMap[c.user_id] ?? "Участник",
    }));

    return NextResponse.json({ ok: true, comments: result });
  } catch (err) {
    console.error("comments fatal", err);
    return NextResponse.json(
      { ok: false, error: "Серверная ошибка комментариев" },
      { status: 500 }
    );
  }
}
