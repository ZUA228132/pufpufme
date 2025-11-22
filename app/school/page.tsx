"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTelegram } from "../../hooks/useTelegram";

type Post = {
  id: string;
  title: string;
  content: string | null;
  image_url: string | null;
  created_at: string;
  is_pinned: boolean;
  likes_count: number;
  comments_count: number;
  views_count: number;
  liked_by_me: boolean;
};
type Comment = {
  id: string;
  content: string;
  author_name: string | null;
  created_at: string;
};


type School = {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  banner_url: string | null;
  is_premium: boolean;
  is_admin: boolean;
  has_admin?: boolean;
};

type FeedResponse = {
  ok: boolean;
  error?: string;
  school?: School;
  posts?: Post[];
};

export default function SchoolPage() {
  const router = useRouter();
  const tg = useTelegram();
  const [school, setSchool] = useState<School | null>(null);

  const [posts, setPosts] = useState<Post[]>([]);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});

  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const [commentsByPost, setCommentsByPost] = useState<Record<string, Comment[]>>({});
  const [commentsLoading, setCommentsLoading] = useState<Record<string, boolean>>({});

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadFeed = async () => {
    if (!tg) return;
    setLoading(true);
    setError(null);
    try {
      const user = tg.initDataUnsafe?.user;
      const res = await fetch("/api/school/feed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telegramUser: user }),
      });
      const json: FeedResponse = await res.json();
      if (!json.ok) {
        setError(json.error || "Ошибка загрузки школы");
      } else {
        setSchool(json.school ?? null);
        setPosts(json.posts ?? []);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };


  const handleToggleLike = async (postId: string) => {
    if (!tg) return;
    tg.HapticFeedback?.impactOccurred("light");
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              liked_by_me: !p.liked_by_me,
              likes_count: p.likes_count + (p.liked_by_me ? -1 : 1),
            }
          : p
      )
    );
    try {
      const user = tg.initDataUnsafe?.user;
      await fetch("/api/school/post/like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telegramUser: user, postId }),
      });
    } catch {
      // не критично
    }
  };

  const handleSendComment = async (postId: string) => {
    if (!tg) return;
    tg.HapticFeedback?.impactOccurred("light");
    const text = (commentDrafts[postId] || "").trim();
    if (!text) return;
    try {
      const user = tg.initDataUnsafe?.user;
      const res = await fetch("/api/school/post/comment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telegramUser: user, postId, content: text }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Ошибка комментария");
      }
      setCommentDrafts((prev) => ({ ...prev, [postId]: "" }));
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, comments_count: p.comments_count + 1 } : p
        )
      );
    } catch {
      // можно добавить показ ошибки, но не засоряем интерфейс
    }
  };

  const handleToggleComments = async (postId: string) => {
    if (!tg) return;
    const isOpen = openComments[postId];
    if (isOpen) {
      setOpenComments((prev) => ({ ...prev, [postId]: false }));
      return;
    }
    // открыть и, если нужно, загрузить
    setOpenComments((prev) => ({ ...prev, [postId]: true }));
    if (commentsByPost[postId]?.length) {
      return;
    }
    setCommentsLoading((prev) => ({ ...prev, [postId]: true }));
    try {
      const user = tg.initDataUnsafe?.user;
      const res = await fetch("/api/school/post/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telegramUser: user, postId }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Ошибка загрузки комментариев");
      }
      setCommentsByPost((prev) => ({
        ...prev,
        [postId]: json.comments as Comment[],
      }));
    } catch (e) {
      // тихо игнорим, можно будет добавить тост
    } finally {
      setCommentsLoading((prev) => ({ ...prev, [postId]: false }));
    }
  };


  useEffect(() => {
    if (!tg) return;
    if (tg.BackButton) {
      tg.BackButton.show();
      tg.BackButton.onClick(() => {
        tg.HapticFeedback?.impactOccurred("light");
        router.back();
      });
    }
    loadFeed();
    return () => {
      try {
        tg.BackButton?.hide();
      } catch {}
    };
  }, [tg, router]);

  const handleElection = () => router.push("/school/election");
  const handleAdminPanel = () => router.push("/school/admin");
  const handleSuggest = () => router.push("/school/suggest");

  return (
    <main className="w-full max-w-2xl">
      <div className="card p-0 overflow-hidden">
        {/* Баннер школы */}
        <div className="relative h-32 w-full bg-gradient-to-r from-brand-500/40 via-fuchsia-500/30 to-sky-500/30">
          {school?.banner_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={school.banner_url}
              alt="banner"
              className="h-full w-full object-cover"
            />
          )}
        </div>

        {/* Профиль школы */}
        <div className="px-4 pb-4 flex items-end gap-3">
          <div className="h-16 w-16 rounded-2xl bg-slate-900 border border-white/10 flex items-center justify-center overflow-hidden">
            {school?.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={school.logo_url}
                alt={school.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-xl">
                {school?.name?.[0] ?? "🏫"}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold truncate">
                {school?.name ?? "Моя школа"}
              </h1>
              {school?.is_premium && (
                <span className="inline-flex items-center rounded-full bg-amber-400/20 border border-amber-300/60 px-2 py-[2px] text-[10px] text-amber-100">
                  ★ PUFF+
                </span>
              )}
            </div>
            {school?.description && (
              <p className="mt-1 text-xs text-slate-300 line-clamp-2">
                {school.description}
              </p>
            )}
          </div>
        </div>

        {/* Верхние кнопки */}
        <div className="px-4 pb-3 flex gap-2">
          <button
            onClick={handleSuggest}
            className="flex-1 rounded-2xl bg-brand-500 hover:bg-brand-600 px-3 py-2 text-xs font-medium"
          >
            + Новость
          </button>
          {!school?.has_admin && (
            <button
              onClick={handleElection}
              className="rounded-2xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs"
            >
              Голосование
            </button>
          )}
          {school?.is_admin && (
            <button
              onClick={handleAdminPanel}
              className="rounded-2xl bg-slate-900 border border-brand-500/70 px-3 py-2 text-xs"
            >
              Админ школы
            </button>
          )}
        </div>

        {/* Лента */}
        <div className="px-4 pb-4 max-h-[60vh] overflow-y-auto space-y-3">
          {loading && (
            <p className="text-xs text-slate-300">Загрузка ленты...</p>
          )}
          {error && !loading && (
            <p className="text-xs text-red-400">{error}</p>
          )}
          {!loading && !error && posts.length === 0 && (
            <p className="text-xs text-slate-400">
              Пока нет новостей. Предложи первую!
            </p>
          )}
          {posts.map((p) => (
            <article
              key={p.id}
              className="rounded-2xl bg-slate-900/80 border border-slate-800 px-3 py-3 space-y-2"
            >
              <div className="flex items-center gap-2">
                {p.is_pinned && (
                  <span className="text-[11px] text-amber-300">📌</span>
                )}
                <h2 className="text-sm font-semibold">{p.title}</h2>
              </div>
              {p.image_url && (
                <div className="mt-1 rounded-xl overflow-hidden border border-slate-800/80">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.image_url}
                    alt={p.title}
                    className="w-full max-h-64 object-cover"
                  />
                </div>
              )}
              {p.content && (
                <p className="mt-1 text-xs text-slate-300 whitespace-pre-wrap">
                  {p.content}
                </p>
              )}
              <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleToggleLike(p.id)}
                    className="flex items-center gap-1 active:scale-95"
                  >
                    <span>{p.liked_by_me ? "❤️" : "🤍"}</span>
                    <span>{p.likes_count}</span>
                  </button>
                  <div className="flex items-center gap-1">
                    <span>💬</span>
                    <span>{p.comments_count}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span>👁‍🗨</span>
                    <span>{p.views_count}</span>
                  </div>
                </div>
                <button
                  onClick={() => handleToggleComments(p.id)}
                  className="text-[11px] text-slate-400 underline-offset-2 active:scale-95"
                >
                  {openComments[p.id]
                    ? "Скрыть комментарии"
                    : commentsLoading[p.id]
                    ? "Загрузка..."
                    : "Показать комментарии"}
                </button>
              </div>
              {openComments[p.id] && (
                <div className="mt-1 space-y-1 max-h-40 overflow-y-auto pr-1">
                  {commentsByPost[p.id]?.length ? (
                    commentsByPost[p.id].map((c) => (
                      <div
                        key={c.id}
                        className="rounded-xl bg-slate-900/80 border border-slate-800 px-2 py-1"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-medium text-slate-100">
                            {c.author_name || "Участник"}
                          </span>
                          <span className="text-[9px] text-slate-500">
                            {new Date(c.created_at).toLocaleTimeString("ru-RU", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <p className="mt-[2px] text-[11px] text-slate-200 whitespace-pre-wrap">
                          {c.content}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-[11px] text-slate-500">
                      Пока нет комментариев
                    </p>
                  )}
                </div>
              )}
              <div className="mt-1 flex items-center gap-2">
                <input
                  className="flex-1 rounded-xl bg-slate-900 border border-slate-700 px-3 py-1 text-[11px]"
                  placeholder="Комментировать..."
                  value={commentDrafts[p.id] || ""}
                  onChange={(e) =>
                    setCommentDrafts((prev) => ({ ...prev, [p.id]: e.target.value }))
                  }
                />
                <button
                  onClick={() => handleSendComment(p.id)}
                  className="rounded-xl bg-slate-800 px-3 py-1 text-[11px]"
                >
                  OK
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
