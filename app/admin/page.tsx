"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTelegram } from "../../hooks/useTelegram";

type SchoolRequest = {
  id: string;
  city_name: string;
  school_name: string;
  address: string | null;
  status: string;
  requested_by_user_id: string;
  created_at: string;
};

type School = {
  id: string;
  name: string;
  address: string | null;
  city_id: string;
  city_name?: string | null;
  is_premium: boolean;
  students_count?: number;
  school_admin_id: string | null;
  admin_username?: string | null;
};

type AdminUser = {
  id: string;
  telegram_id: string;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  current_school_id: string | null;
  current_school_name?: string | null;
  class_name: string | null;
  is_global_admin: boolean;
  premium_until: string | null;
};

type OverviewResponse = {
  ok: boolean;
  error?: string;
  pending_requests: SchoolRequest[];
  schools: School[];
  users: AdminUser[];
};

export default function AdminPage() {
  const tg = useTelegram();
  const router = useRouter();

  const [data, setData] = useState<OverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [createCityName, setCreateCityName] = useState("");
  const [createSchoolName, setCreateSchoolName] = useState("");
  const [createAddress, setCreateAddress] = useState("");

  const loadOverview = async () => {
    if (!tg) return;
    setLoading(true);
    setStatusMsg(null);
    try {
      const user = tg.initDataUnsafe?.user;
      const res = await fetch("/api/admin/overview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telegramUser: user }),
      });
      const json = await res.json();
      if (!json.ok) {
        setStatusMsg(json.error || "Ошибка загрузки панели");
        setData(null);
      } else {
        setData(json);
      }
    } catch (e) {
      console.error("admin overview error", e);
      setStatusMsg("Ошибка загрузки панели администратора");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!tg) return;

    try {
      tg.BackButton.show();
      tg.BackButton.onClick(() => {
        tg.HapticFeedback?.impactOccurred("light");
        router.back();
      });
    } catch {
      // ignore
    }

    loadOverview();

    return () => {
      try {
        tg.BackButton?.hide();
      } catch {
        // ignore
      }
    };
  }, [tg, router]);

  const withHaptic = (type: "success" | "error" | "light" = "light") => {
    try {
      if (!tg) return;
      if (type === "success") tg.HapticFeedback?.notificationOccurred("success");
      else if (type === "error") tg.HapticFeedback?.notificationOccurred("error");
      else tg.HapticFeedback?.impactOccurred("light");
    } catch {
      // ignore
    }
  };

  const handleRequestDecision = async (requestId: string, decision: "approve" | "reject") => {
    if (!tg || submitting) return;
    const user = tg.initDataUnsafe?.user;
    if (!user) return;

    try {
      setSubmitting(true);
      setStatusMsg(null);
      withHaptic("light");

      const res = await fetch("/api/admin/request-decide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telegramUser: user, requestId, decision }),
      });
      const json = await res.json();
      if (!json.ok && json.error) {
        setStatusMsg(json.error || "Не удалось применить решение по заявке");
        withHaptic("error");
        return;
      }
      setStatusMsg("Решение по заявке сохранено");
      withHaptic("success");
      await loadOverview();
    } catch (e) {
      console.error("request-decision error", e);
      setStatusMsg("Ошибка обработки заявки");
      withHaptic("error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleSchoolPremium = async (school: School) => {
    if (!tg || submitting) return;
    const user = tg.initDataUnsafe?.user;
    if (!user) return;

    try {
      setSubmitting(true);
      setStatusMsg(null);
      withHaptic("light");

      const res = await fetch("/api/admin/set-school-premium", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telegramUser: user,
          schoolId: school.id,
          isPremium: !school.is_premium,
        }),
      });
      const json = await res.json();
      if (json.error) {
        setStatusMsg(json.error || "Не удалось изменить премиум школы");
        withHaptic("error");
        return;
      }
      setStatusMsg("Статус премиум школы обновлён");
      withHaptic("success");
      await loadOverview();
    } catch (e) {
      console.error("set-school-premium error", e);
      setStatusMsg("Ошибка при обновлении премиума школы");
      withHaptic("error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSchool = async (schoolId: string) => {
    if (!tg || submitting) return;
    const user = tg.initDataUnsafe?.user;
    if (!user) return;

    if (!confirm("Точно удалить школу? Будут удалены все новости и данные по ней.")) {
      return;
    }

    try {
      setSubmitting(true);
      setStatusMsg(null);
      withHaptic("light");

      const res = await fetch("/api/admin/delete-school", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telegramUser: user, schoolId }),
      });
      const json = await res.json();
      if (json.error) {
        setStatusMsg(json.error || "Не удалось удалить школу");
        withHaptic("error");
        return;
      }
      setStatusMsg("Школа удалена");
      withHaptic("success");
      await loadOverview();
    } catch (e) {
      console.error("delete-school error", e);
      setStatusMsg("Ошибка при удалении школы");
      withHaptic("error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleUserPremium = async (userRow: AdminUser) => {
    if (!tg || submitting) return;
    const user = tg.initDataUnsafe?.user;
    if (!user) return;

    const makePremium = !userRow.premium_until;

    try {
      setSubmitting(true);
      setStatusMsg(null);
      withHaptic("light");

      const res = await fetch("/api/admin/set-user-premium", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telegramUser: user,
          userId: userRow.id,
          makePremium,
        }),
      });
      const json = await res.json();
      if (json.error) {
        setStatusMsg(json.error || "Не удалось обновить премиум пользователя");
        withHaptic("error");
        return;
      }
      setStatusMsg("Премиум пользователя обновлён");
      withHaptic("success");
      await loadOverview();
    } catch (e) {
      console.error("set-user-premium error", e);
      setStatusMsg("Ошибка при обновлении премиума пользователя");
      withHaptic("error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateSchool = async () => {
    if (!tg || submitting) return;
    const user = tg.initDataUnsafe?.user;
    if (!user || !createCityName.trim() || !createSchoolName.trim()) return;

    try {
      setSubmitting(true);
      setStatusMsg(null);
      withHaptic("light");

      const res = await fetch("/api/admin/create-school", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telegramUser: user,
          cityName: createCityName.trim(),
          schoolName: createSchoolName.trim(),
          address: createAddress.trim() || null,
        }),
      });
      const json = await res.json();
      if (json.error) {
        setStatusMsg(json.error || "Не удалось создать школу");
        withHaptic("error");
        return;
      }
      setStatusMsg("Школа создана");
      setCreateCityName("");
      setCreateSchoolName("");
      setCreateAddress("");
      withHaptic("success");
      await loadOverview();
    } catch (e) {
      console.error("create-school error", e);
      setStatusMsg("Ошибка при создании школы");
      withHaptic("error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !data) {
    return (
      <main className="w-full max-w-xl">
        <div className="card p-6">
          <p className="text-sm text-slate-200">Загрузка панели администратора…</p>
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="w-full max-w-xl">
        <div className="card p-6 space-y-3">
          <p className="text-sm text-red-200">
            Не удалось загрузить панель администратора. Возможно, у вас нет прав глобального админа.
          </p>
          {statusMsg && <p className="text-xs text-slate-200">{statusMsg}</p>}
        </div>
      </main>
    );
  }

  const topUsers = data.users.slice(0, 50);

  return (
    <main className="w-full max-w-xl">
      <div className="card p-6 space-y-6">
        <header className="space-y-1">
          <h1 className="text-xl font-semibold">Глобальная админка PUFF</h1>
          <p className="text-xs text-slate-300">
            Управляй школами, пользователями и заявками. Все действия применяются сразу для бота @puffslbot.
          </p>
        </header>

        {/* Заявки на школы */}
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">Заявки на подключение школ</h2>
            <span className="badge-pill">
              Заявок: {data.pending_requests.length}
            </span>
          </div>
          {data.pending_requests.length === 0 ? (
            <p className="text-xs text-slate-400">Новых заявок нет.</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {data.pending_requests.map((req) => (
                <div
                  key={req.id}
                  className="rounded-2xl bg-slate-900/70 border border-slate-800 px-3 py-2 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold">
                        {req.school_name}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {req.city_name}
                        {req.address ? ` • ${req.address}` : ""}
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] uppercase tracking-wide">
                      {req.status}
                    </span>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => handleRequestDecision(req.id, "approve")}
                      className="flex-1 rounded-2xl bg-emerald-500/90 hover:bg-emerald-500 px-2 py-1 text-[11px] font-semibold disabled:opacity-60"
                    >
                      Подтвердить
                    </button>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => handleRequestDecision(req.id, "reject")}
                      className="flex-1 rounded-2xl bg-red-500/90 hover:bg-red-500 px-2 py-1 text-[11px] font-semibold disabled:opacity-60"
                    >
                      Отклонить
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Школы */}
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">Школы</h2>
            <span className="badge-pill">
              Всего: {data.schools.length}
            </span>
          </div>
          {data.schools.length === 0 ? (
            <p className="text-xs text-slate-400">Школ пока нет.</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {data.schools.map((s) => (
                <div
                  key={s.id}
                  className="rounded-2xl bg-slate-900/70 border border-slate-800 px-3 py-2 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold flex items-center gap-1">
                        {s.name}
                        {s.is_premium && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px]">
                            PREMIUM
                          </span>
                        )}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {s.city_name || "Город не задан"}
                        {s.address ? ` • ${s.address}` : ""}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Ученики: {s.students_count ?? 0}
                        {s.admin_username && ` • Админ: @${s.admin_username}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => handleToggleSchoolPremium(s)}
                      className="flex-1 rounded-2xl border border-amber-500/60 px-2 py-1 text-[11px]"
                    >
                      {s.is_premium ? "Снять премиум" : "Выдать премиум"}
                    </button>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => handleDeleteSchool(s.id)}
                      className="flex-1 rounded-2xl border border-red-500/80 px-2 py-1 text-[11px]"
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Пользователи */}
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">Пользователи</h2>
            <span className="badge-pill">
              Показаны первые {topUsers.length}
            </span>
          </div>
          {topUsers.length === 0 ? (
            <p className="text-xs text-slate-400">Пользователей пока нет.</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {topUsers.map((u) => (
                <div
                  key={u.id}
                  className="rounded-2xl bg-slate-900/70 border border-slate-800 px-3 py-2 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold">
                        {u.first_name || u.last_name
                          ? `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim()
                          : u.username
                          ? `@${u.username}`
                          : `ID ${u.telegram_id}`}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {u.username ? `@${u.username} • ` : ""}
                        {u.current_school_name || "Школа не выбрана"}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {u.class_name || "Класс не указан"}
                        {u.is_global_admin && " • Глобальный админ"}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {u.premium_until ? (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px]">
                          PREMIUM
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px]">
                          Обычный
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => handleToggleUserPremium(u)}
                      className="flex-1 rounded-2xl border border-amber-500/60 px-2 py-1 text-[11px]"
                    >
                      {u.premium_until ? "Снять премиум" : "Выдать премиум"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Быстро создать школу */}
        <section className="space-y-2">
          <h2 className="text-sm font-semibold">Быстро создать школу вручную</h2>
          <div className="space-y-2 rounded-2xl bg-slate-900/70 border border-slate-800 p-3 text-xs">
            <div className="space-y-1">
              <label className="text-[11px] text-slate-300">Город</label>
              <input
                value={createCityName}
                onChange={(e) => setCreateCityName(e.target.value)}
                className="w-full rounded-2xl bg-slate-950/50 border border-slate-700 px-3 py-2 text-xs outline-none"
                placeholder="Например: Киев"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] text-slate-300">Название школы</label>
              <input
                value={createSchoolName}
                onChange={(e) => setCreateSchoolName(e.target.value)}
                className="w-full rounded-2xl bg-slate-950/50 border border-slate-700 px-3 py-2 text-xs outline-none"
                placeholder="Например: Лицей №123"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] text-slate-300">Адрес (по желанию)</label>
              <input
                value={createAddress}
                onChange={(e) => setCreateAddress(e.target.value)}
                className="w-full rounded-2xl bg-slate-950/50 border border-slate-700 px-3 py-2 text-xs outline-none"
                placeholder="Улица, дом"
              />
            </div>
            <button
              type="button"
              disabled={
                submitting ||
                !createCityName.trim() ||
                !createSchoolName.trim()
              }
              onClick={handleCreateSchool}
              className="w-full rounded-2xl bg-brand-500 hover:bg-brand-600 px-3 py-2 text-xs font-semibold disabled:opacity-60 disabled:pointer-events-none"
            >
              Создать школу
            </button>
          </div>
        </section>

        {statusMsg && (
          <p className="text-xs text-slate-200">{statusMsg}</p>
        )}
      </div>
    </main>
  );
}
