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
};

type School = {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  banner_url: string | null;
  is_premium: boolean;
  is_admin: boolean;
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

  useEffect(() => {
    if (tg) {
      loadFeed();
    }
  }, [tg]);

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
        <div className="px-4 pb-4 -mt-8 flex items-end gap-3">
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
          <button
            onClick={handleElection}
            className="rounded-2xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs"
          >
            Голосование
          </button>
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
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
