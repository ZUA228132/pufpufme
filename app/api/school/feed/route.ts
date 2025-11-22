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
    .select("id, current_school_id")
    .eq("telegram_id", telegramId)
    .maybeSingle();

  if (userErr || !userRow?.current_school_id) {
    return NextResponse.json(
      { ok: false, error: "Пользователь не привязан к школе" },
      { status: 400 }
    );
  }

  const schoolId = userRow.current_school_id as string;

  const { data: schoolRow, error: schoolErr } = await supabaseAdmin
    .from("schools")
    .select("id, name, description, logo_url, banner_url, is_premium, school_admin_id")
    .eq("id", schoolId)
    .maybeSingle();

  if (schoolErr || !schoolRow) {
    return NextResponse.json(
      { ok: false, error: "Школа не найдена" },
      { status: 404 }
    );
  }

  const { data: posts, error: postsErr } = await supabaseAdmin
    .from("posts")
    .select("id, title, content, image_url, created_at, is_pinned")
    .eq("school_id", schoolId)
    .eq("status", "published")
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(50);

  if (postsErr) {
    console.error("Error loading posts", postsErr);
    return NextResponse.json(
      { ok: false, error: "Ошибка загрузки постов" },
      { status: 500 }
    );
  }


  const postsWithMeta = posts ?? [];
  const postIds = postsWithMeta.map((p) => p.id as string);

  let likesByPost: Record<string, number> = {};
  let commentsByPost: Record<string, number> = {};
  let viewsByPost: Record<string, number> = {};
  let likedByMe: Record<string, boolean> = {};

  if (postIds.length > 0) {
    const { data: likes } = await supabaseAdmin
      .from("post_likes")
      .select("post_id, user_id")
      .in("post_id", postIds as string[]);

    if (likes) {
      for (const row of likes as any[]) {
        const pid = row.post_id as string;
        likesByPost[pid] = (likesByPost[pid] || 0) + 1;
        if (row.user_id === userRow.id) {
          likedByMe[pid] = true;
        }
      }
    }

    const { data: comments } = await supabaseAdmin
      .from("post_comments")
      .select("post_id")
      .in("post_id", postIds as string[]);

    if (comments) {
      for (const row of comments as any[]) {
        const pid = row.post_id as string;
        commentsByPost[pid] = (commentsByPost[pid] || 0) + 1;
      }
    }

    const { data: views } = await supabaseAdmin
      .from("post_views")
      .select("post_id")
      .in("post_id", postIds as string[]);

    if (views) {
      for (const row of views as any[]) {
        const pid = row.post_id as string;
        viewsByPost[pid] = (viewsByPost[pid] || 0) + 1;
      }
    }
  }
  return NextResponse.json({
    ok: true,
    school: {
      id: schoolRow.id as string,
      name: schoolRow.name as string,
      description: (schoolRow.description as string | null) ?? null,
      logo_url: (schoolRow.logo_url as string | null) ?? null,
      banner_url: (schoolRow.banner_url as string | null) ?? null,
      is_premium: !!schoolRow.is_premium,
      is_admin: schoolRow.school_admin_id === userRow.id,
      has_admin: !!schoolRow.school_admin_id,
    },
    posts: (postsWithMeta ?? []).map((p: any) => ({
      ...p,
      likes_count: likesByPost[p.id] || 0,
      comments_count: commentsByPost[p.id] || 0,
      views_count: viewsByPost[p.id] || 0,
      liked_by_me: !!likedByMe[p.id],
    })),
  });
}
