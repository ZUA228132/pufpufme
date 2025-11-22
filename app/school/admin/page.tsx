"use client";

import { useEffect, useState } from "react";
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
  created_at: string;
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
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newImageUrl, setNewImageUrl] = useState("");
  
  const [schoolDescription, setSchoolDescription] = useState("");
  const [schoolAddress, setSchoolAddress] = useState("");
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
      const json = await res.json();
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
      setStatusMsg(e.message);
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


  useEffect(() => {
    if (tg) {
      loadOverview();
    }
  }, [tg]);


  const handleSaveProfile = async () => {
    if (!tg || !data?.school) return;
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
          address: schoolAddress,
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


  const handleCreateInvite = async () => {
    if (!tg) return;
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
          maxUses: Number.isFinite(maxUsesNum) ? maxUsesNum : null,
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

  const handleCreatePost = async () => {
    if (!tg) return;
    if (!newTitle.trim()) {
      setStatusMsg("Введите заголовок новости.");
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
      if (!res.ok) {
        throw new Error(json.error || "Ошибка создания новости");
      }
      setNewTitle("");
      setNewContent("");
      setStatusMsg("Новость опубликована.");
      await loadOverview();
    } catch (e: any) {
      setStatusMsg(e.message);
    } finally {
      setSubmitting(false);
    }
  };


  const handleBroadcast = async () => {
    if (!tg) return;
    if (!broadcastText.trim()) {
      setStatusMsg("Введите текст рассылки.");
      return;
    }
    setSubmitting(true);
    setStatusMsg(null);
    try {
      const user = tg.initDataUnsafe?.user;
      const res = await fetch("/api/school/admin/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telegramUser: user,
          text: broadcastText,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Ошибка отправки рассылки");
      }
      setBroadcastText("");
      setStatusMsg("Рассылка сохранена.");
    } catch (e: any) {
      setStatusMsg(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSuggestionDecision = async (
    id: string,
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
        body: JSON.stringify({
          telegramUser: user,
          suggestionId: id,
          decision,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Ошибка обработки предложения");
      }
      setStatusMsg(
        decision === "approve"
          ? "Новость опубликована в ленте."
          : "Предложение отклонено."
      );
      await loadOverview();
    } catch (e: any) {
      setStatusMsg(e.message);
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
      if (!res.ok) {
        throw new Error(json.error || "Ошибка изменения бана");
      }
      setStatusMsg(isBanned ? "Пользователь разбанен." : "Пользователь заблокирован.");
      await loadOverview();
    } catch (e: any) {
      setStatusMsg(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="w-full max-w-xl">
        <div className="card p-6">
          <p className="text-sm text-slate-300">
            Загрузка панели админа школы...
          </p>
        </div>
      </main>
    );
  }

  if (!data?.ok) {
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
              <label className="block text-[11px]">
                <span className="text-slate-400">Описание</span>
                <textarea
                  className="mt-1 w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs min-h-[60px]"
                  placeholder="Коротко о школе"
                  value={schoolDescription}
                  onChange={(e) => setSchoolDescription(e.target.value)}
                />
              </label>
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
          <h2 className="text-sm font-semibold">Быстрая публикация новости</h2>
          <div className="space-y-2">
            <input
              className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs"
              placeholder="Заголовок новости"
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
                <img src={newImageUrl} alt="preview" className="w-full max-h-40 object-cover" />
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
          </div>
          <button
            disabled={submitting}
            onClick={handleCreatePost}
            className="rounded-2xl bg-brand-500 hover:bg-brand-600 disabled:bg-slate-700 disabled:cursor-not-allowed px-4 py-2 text-xs font-medium"
          >
            {submitting ? "Публикация..." : "Опубликовать новость"}
          </button>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold">Отправить всей школе</h2>
          <textarea
            className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs min-h-[60px]"
            placeholder="Текст уведомления"
            value={broadcastText}
            onChange={(e) => setBroadcastText(e.target.value)}
          />
          <button
            disabled={submitting}
            onClick={handleBroadcast}
            className="rounded-2xl bg-slate-800 hover:bg-slate-700 disabled:bg-slate-700 disabled:cursor-not-allowed px-4 py-2 text-xs font-medium"
          >
            Отправить всей школе
          </button>
        </section>
          <p className="text-[11px] text-slate-400">
            Эта новость сразу попадёт в общий фид школы.
          </p>
          <div className="space-y-2">
            <input
              className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs"
              placeholder="Заголовок новости"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
            />
            <textarea
              className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs min-h-[80px]"
              placeholder="Текст (опционально)"
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
            />
          </div>
          <button
            disabled={submitting}
            onClick={handleCreatePost}
            className="rounded-2xl bg-brand-500 hover:bg-brand-600 disabled:bg-slate-700 disabled:cursor-not-allowed px-4 py-2 text-xs font-medium"
          >
            {submitting ? "Публикация..." : "Опубликовать новость"}
          </button>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold">Предложенные новости</h2>
          {data.suggestions && data.suggestions.length > 0 ? (
            <div className="space-y-2 max-h-52 overflow-auto pr-1">
              {data.suggestions.map((s) => (
                <div
                  key={s.id}
                  className="border border-slate-800 rounded-xl px-3 py-2 text-xs space-y-1"
                >
                  <div className="font-semibold">{s.title}</div>
                  {s.author_name && (
                    <div className="text-slate-400">
                      от {s.author_name}
                    </div>
                  )}
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
          <h2 className="text-sm font-semibold">Пользователи школы</h2>
          {data.students && data.students.length > 0 ? (
            <div className="space-y-1 max-h-52 overflow-auto pr-1">
              {data.students.map((st) => (
                <div
                  key={st.id}
                  className="flex items-center justify-between border border-slate-800 rounded-xl px-3 py-2 text-[11px]"
                >
                  <div>
                    <div className="font-semibold">
                      {st.display_name || "Без имени"}
                    </div>
                    {st.is_banned && (
                      <div className="text-rose-400">Заблокирован</div>
                    )}
                  </div>
                  <button
                    disabled={submitting}
                    onClick={() => handleToggleBan(st.id, st.is_banned)}
                    className="rounded-lg border border-slate-600 px-3 py-1 hover:bg-slate-800"
                  >
                    {st.is_banned ? "Разбанить" : "Забанить"}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-slate-400">
              Пока нет других пользователей школы.
            </p>
          )}
        
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

</section>

        {statusMsg && (
          <p className="text-xs text-slate-200">{statusMsg}</p>
        )}
      </div>
    </main>
  );
}
