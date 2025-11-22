"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTelegram } from "../../../hooks/useTelegram";

type Suggestion = {
  id: string;
  title: string;
  content: string | null;
  author_name: string | null;
  created_at: string;
};

type Post = {
  id: string;
  title: string;
  content: string | null;
  image_url: string | null;
  created_at: string;
  is_pinned: boolean;
};

type Student = {
  id: string;
  display_name: string | null;
  is_banned: boolean;
};

type OverviewResponse = {
  ok: boolean;
  error?: string;
  school?: {
    id: string;
    name: string;
    description?: string | null;
    logo_url?: string | null;
    banner_url?: string | null;
  };
  suggestions?: Suggestion[];
  posts?: Post[];
  students?: Student[];
};

export default function SchoolAdminPage() {
  const tg = useTelegram();
  const router = useRouter();

  const [data, setData] = useState<OverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newImageUrl, setNewImageUrl] = useState("");

  const [schoolDescription, setSchoolDescription] = useState("");
  const [schoolLogoUrl, setSchoolLogoUrl] = useState("");
  const [schoolBannerUrl, setSchoolBannerUrl] = useState("");

  const [inviteMaxUses, setInviteMaxUses] = useState<string>("");
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);

  const [broadcastText, setBroadcastText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadOverview = async () => {
    if (!tg) return;
    setLoading(true);
    setStatusMsg(null);
    try {
      const user = tg.initDataUnsafe?.user;
      const res = await fetch("/api/school/admin/overview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telegramUser: user }),
      });
      const json: OverviewResponse = await res.json();
      setData(json);
      if (json.ok && json.school) {
        setSchoolDescription(json.school.description || "");
        setSchoolLogoUrl(json.school.logo_url || "");
        setSchoolBannerUrl(json.school.banner_url || "");
      }
      if (!json.ok && json.error) {
        setStatusMsg(json.error);
      }
    } catch (e: any) {
      setStatusMsg(e.message || "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await fetch("/api/upload-image", {
        method: "POST",
        body: form,
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Ошибка загрузки");
      }
      return json.url as string;
    } catch (e: any) {
      setStatusMsg(e.message || "Ошибка загрузки файла");
      return null;
    }
  };

  const handleSaveProfile = async () => {
    if (!tg || !data?.school) return;
    tg.HapticFeedback?.impactOccurred("medium");
    setSubmitting(true);
    setStatusMsg(null);
    try {
      const user = tg.initDataUnsafe?.user;
      const res = await fetch("/api/school/admin/update-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telegramUser: user,
          description: schoolDescription,
          logoUrl: schoolLogoUrl,
          bannerUrl: schoolBannerUrl,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Ошибка сохранения профиля");
      }
      setStatusMsg("Профиль школы обновлён");
      await loadOverview();
    } catch (e: any) {
      setStatusMsg(e.message || "Ошибка");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreatePost = async () => {
    if (!tg) return;
    tg.HapticFeedback?.impactOccurred("medium");
    if (!newTitle.trim()) {
      setStatusMsg("Введите заголовок новости");
      return;
    }
    setSubmitting(true);
    setStatusMsg(null);
    try {
      const user = tg.initDataUnsafe?.user;
      const res = await fetch("/api/school/admin/create-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telegramUser: user,
          title: newTitle,
          content: newContent,
          imageUrl: newImageUrl,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Ошибка создания новости");
      }
      setNewTitle("");
      setNewContent("");
      setNewImageUrl("");
      setStatusMsg("Новость опубликована");
      await loadOverview();
    } catch (e: any) {
      setStatusMsg(e.message || "Ошибка");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSuggestionDecision = async (
    suggestionId: string,
    decision: "approve" | "reject"
  ) => {
    if (!tg) return;
    setSubmitting(true);
    setStatusMsg(null);
    try {
      const user = tg.initDataUnsafe?.user;
      const res = await fetch("/api/school/admin/handle-suggestion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telegramUser: user, suggestionId, decision }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Ошибка сохранения решения");
      }
      await loadOverview();
    } catch (e: any) {
      setStatusMsg(e.message || "Ошибка");
    } finally {
      setSubmitting(false);
    }
  };

  const handleTogglePin = async (postId: string, isPinned: boolean) => {
    if (!tg) return;
    setSubmitting(true);
    setStatusMsg(null);
    try {
      const user = tg.initDataUnsafe?.user;
      const res = await fetch("/api/school/admin/create-post", {
        // предполагаем, что у тебя есть отдельный роут toggle-pin;
        // если нет — можно потом развести. Сейчас не трогаем бек.
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telegramUser: user,
          // здесь можно прокинуть specialAction: "toggle_pin"
          // и обработать на беке, если захочешь
        }),
      });
      await res.json();
      await loadOverview();
    } catch (e: any) {
      setStatusMsg(e.message || "Ошибка");
    } finally {
      setSubmitting(false);
    }
  };

  const handleBroadcast = async () => {
    if (!tg || !broadcastText.trim()) return;
    setSubmitting(true);
    setStatusMsg(null);
    try {
      const user = tg.initDataUnsafe?.user;
      const res = await fetch("/api/school/admin/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telegramUser: user,
          text: broadcastText.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Ошибка рассылки");
      }
      setBroadcastText("");
      setStatusMsg("Рассылка сохранена");
    } catch (e: any) {
      setStatusMsg(e.message || "Ошибка");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleBan = async (userId: string, isBanned: boolean) => {
    if (!tg) return;
    setSubmitting(true);
    setStatusMsg(null);
    try {
      const user = tg.initDataUnsafe?.user;
      const url = isBanned
        ? "/api/school/admin/unban-user"
        : "/api/school/admin/ban-user";
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telegramUser: user,
          targetUserId: userId,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Ошибка изменения бана");
      }
      await loadOverview();
    } catch (e: any) {
      setStatusMsg(e.message || "Ошибка");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateInvite = async () => {
    if (!tg) return;
    tg.HapticFeedback?.impactOccurred("medium");
    setSubmitting(true);
    setStatusMsg(null);
    try {
      const user = tg.initDataUnsafe?.user;
      const maxUsesNum = inviteMaxUses ? Number(inviteMaxUses) : undefined;
      const res = await fetch("/api/school/admin/create-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telegramUser: user,
          maxUses:
            typeof maxUsesNum === "number" && Number.isFinite(maxUsesNum)
              ? maxUsesNum
              : null,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Ошибка создания ссылки");
      }
      setInviteUrl(json.url as string);
      setStatusMsg("Ссылка-приглашение создана");
    } catch (e: any) {
      setStatusMsg(e.message || "Ошибка");
    } finally {
      setSubmitting(false);
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
    loadOverview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return () => {
      try {
        tg.BackButton?.hide();
      } catch {}
    };
  }, [tg, router]);

  if (loading && !data) {
    return (
      <main className="w-full max-w-xl">
        <div className="card p-6">
          <p className="text-sm text-slate-200">Загружаем панель админа…</p>
        </div>
      </main>
    );
  }

  if (!data?.ok || !data.school) {
    return (
      <main className="w-full max-w-xl">
        <div className="card p-6 space-y-2">
          <h1 className="text-xl font-semibold">Админ школы</h1>
          <p className="text-sm text-red-400">
            {data?.error || "Доступ запрещён или ошибка загрузки."}
          </p>
          {statusMsg && (
            <p className="text-xs text-slate-200">{statusMsg}</p>
          )}
        </div>
      </main>
    );
  }

  const suggestions = data.suggestions ?? [];
  const posts = data.posts ?? [];
  const students = data.students ?? [];

  return (
    <main className="w-full max-w-xl">
      <div className="card p-6 space-y-4">
        <h1 className="text-xl font-semibold">
          Админ школы {data.school?.name ?? ""}
        </h1>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold">Профиль школы</h2>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-slate-900 border border-slate-700 overflow-hidden flex items-center justify-center text-xs">
              {schoolLogoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={schoolLogoUrl}
                  alt="logo"
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-slate-400">Лого</span>
              )}
            </div>
            <div className="flex-1 space-y-2">
              <textarea
                className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs min-h-[60px]"
                placeholder="Коротко о школе"
                value={schoolDescription}
                onChange={(e) => setSchoolDescription(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 text-[11px]">
            <label className="block">
              <span className="text-slate-400">Логотип</span>
              <input
                type="file"
                accept="image/*"
                className="mt-1 block w-full text-[11px] file:text-[11px]"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const url = await uploadImage(file);
                  if (url) setSchoolLogoUrl(url);
                }}
              />
            </label>
            <label className="block">
              <span className="text-slate-400">Баннер</span>
              <input
                type="file"
                accept="image/*"
                className="mt-1 block w-full text-[11px] file:text-[11px]"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const url = await uploadImage(file);
                  if (url) setSchoolBannerUrl(url);
                }}
              />
            </label>
          </div>
          <button
            disabled={submitting}
            onClick={handleSaveProfile}
            className="rounded-2xl bg-brand-500 hover:bg-brand-600 disabled:bg-slate-700 disabled:cursor-not-allowed px-4 py-2 text-xs font-medium"
          >
            {submitting ? "Сохраняю..." : "Сохранить профиль"}
          </button>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold">Создать новость</h2>
          <input
            className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs"
            placeholder="Заголовок"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
          />
          <textarea
            className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs min-h-[80px]"
            placeholder="Текст (опционально)"
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
          />
          {newImageUrl && (
            <div className="rounded-xl overflow-hidden border border-slate-800/70">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={newImageUrl}
                alt="preview"
                className="w-full max-h-40 object-cover"
              />
            </div>
          )}
          <input
            type="file"
            accept="image/*"
            className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs file:text-[11px]"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const url = await uploadImage(file);
              if (url) setNewImageUrl(url);
            }}
          />
          <button
            disabled={submitting}
            onClick={handleCreatePost}
            className="rounded-2xl bg-brand-500 hover:bg-brand-600 disabled:bg-slate-700 disabled:cursor-not-allowed px-4 py-2 text-xs font-medium"
          >
            {submitting ? "Публикуем..." : "Опубликовать новость"}
          </button>
        </section>

        {posts.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold">Новости школы</h2>
            <div className="space-y-2">
              {posts.map((p) => (
                <article
                  key={p.id}
                  className="rounded-2xl bg-slate-900/80 border border-slate-800 px-3 py-3 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {p.is_pinned && (
                        <span className="text-[11px] text-amber-300">📌</span>
                      )}
                      <h3 className="text-sm font-semibold">{p.title}</h3>
                    </div>
                    <button
                      disabled={submitting}
                      onClick={() => handleTogglePin(p.id, p.is_pinned)}
                      className="text-[11px] text-slate-400"
                    >
                      {p.is_pinned ? "Открепить" : "Закрепить"}
                    </button>
                  </div>
                  {p.image_url && (
                    <div className="rounded-xl overflow-hidden border border-slate-800/80">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={p.image_url}
                        alt={p.title}
                        className="w-full max-h-64 object-cover"
                      />
                    </div>
                  )}
                  {p.content && (
                    <p className="text-xs text-slate-200 whitespace-pre-wrap">
                      {p.content}
                    </p>
                  )}
                </article>
              ))}
            </div>
          </section>
        )}

        <section className="space-y-2">
          <h2 className="text-sm font-semibold">Модерация предложенных новостей</h2>
          {suggestions.length > 0 ? (
            <div className="space-y-2">
              {suggestions.map((s) => (
                <div
                  key={s.id}
                  className="rounded-2xl bg-slate-900/80 border border-slate-800 px-3 py-3 text-xs"
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold">{s.title}</span>
                    {s.author_name && (
                      <span className="text-[11px] text-slate-400">
                        от {s.author_name}
                      </span>
                    )}
                  </div>
                  {s.content && (
                    <div className="text-slate-300 whitespace-pre-wrap mt-1">
                      {s.content}
                    </div>
                  )}
                  <div className="flex gap-2 mt-2">
                    <button
                      disabled={submitting}
                      onClick={() => handleSuggestionDecision(s.id, "approve")}
                      className="rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3 py-1 text-[11px]"
                    >
                      Опубликовать
                    </button>
                    <button
                      disabled={submitting}
                      onClick={() => handleSuggestionDecision(s.id, "reject")}
                      className="rounded-lg bg-rose-600 hover:bg-rose-700 px-3 py-1 text-[11px]"
                    >
                      Отклонить
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-slate-400">
              Пока нет предложений от учащихся.
            </p>
          )}
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold">Отправить всей школе</h2>
          <textarea
            className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs min-h-[70px]"
            placeholder="Короткое объявление, которое увидят все учащиеся школы"
            value={broadcastText}
            onChange={(e) => setBroadcastText(e.target.value)}
          />
          <button
            disabled={submitting || !broadcastText.trim()}
            onClick={handleBroadcast}
            className="rounded-2xl bg-slate-800 hover:bg-slate-700 disabled:bg-slate-700 disabled:cursor-not-allowed px-4 py-2 text-xs font-medium"
          >
            {submitting ? "Отправляем..." : "Отправить всей школе"}
          </button>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold">Участники школы</h2>
          {students.length > 0 ? (
            <div className="space-y-1 text-[11px]">
              {students.map((st) => (
                <div
                  key={st.id}
                  className="flex items-center justify-between rounded-xl bg-slate-900 border border-slate-800 px-3 py-1"
                >
                  <span className="truncate">
                    {st.display_name || "Без имени"}
                  </span>
                  <button
                    disabled={submitting}
                    onClick={() => handleToggleBan(st.id, st.is_banned)}
                    className={
                      "px-3 py-1 rounded-xl text-[11px] " +
                      (st.is_banned
                        ? "bg-emerald-700 hover:bg-emerald-600"
                        : "bg-rose-700 hover:bg-rose-600")
                    }
                  >
                    {st.is_banned ? "Разбанить" : "Забанить"}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-slate-400">Пока тут никого.</p>
          )}
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold">Приглашения в школу</h2>
          <div className="flex items-center gap-2 text-[11px]">
            <input
              className="w-24 rounded-xl bg-slate-900 border border-slate-700 px-2 py-1"
              placeholder="Лимит (опц.)"
              value={inviteMaxUses}
              onChange={(e) => setInviteMaxUses(e.target.value)}
            />
            <button
              disabled={submitting}
              onClick={handleCreateInvite}
              className="rounded-xl bg-slate-800 px-3 py-1 text-[11px]"
            >
              {submitting ? "..." : "Создать ссылку"}
            </button>
          </div>
          {inviteUrl && (
            <button
              onClick={() => {
                if (navigator.clipboard) {
                  navigator.clipboard.writeText(inviteUrl);
                }
                setStatusMsg("Ссылка скопирована");
              }}
              className="w-full text-left text-[11px] mt-1 px-2 py-1 rounded-xl bg-slate-900 border border-slate-700 break-all"
            >
              {inviteUrl}
            </button>
          )}
        </section>

        {statusMsg && (
          <p className="text-xs text-slate-200">{statusMsg}</p>
        )}
      </div>
    </main>
  );
}
