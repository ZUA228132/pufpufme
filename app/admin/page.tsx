"use client";

import { useEffect, useState } from "react";
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
  city_name: string | null;
  school_admin_id: string | null;
};

type OverviewResponse = {
  ok: boolean;
  error?: string;
  pending_requests: SchoolRequest[];
  schools: School[];
};

export default function AdminPage() {
  const tg = useTelegram();
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [assignSchoolId, setAssignSchoolId] = useState("");
  const [assignUserId, setAssignUserId] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
      setData(json);
      if (!json.ok && json.error) {
        setStatusMsg(json.error);
      }
    } catch (e: any) {
      setStatusMsg(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tg) {
      loadOverview();
    }
  }, [tg]);

  const handleRequestDecision = async (id: string, decision: "approved" | "rejected") => {
    if (!tg) return;
    setSubmitting(true);
    setStatusMsg(null);
    try {
      const user = tg.initDataUnsafe?.user;
      const res = await fetch("/api/admin/request-decide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telegramUser: user,
          requestId: id,
          decision,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Ошибка обработки заявки");
      }
      setStatusMsg("Заявка обработана.");
      await loadOverview();
    } catch (e: any) {
      setStatusMsg(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssignAdmin = async () => {
    if (!tg) return;
    if (!assignSchoolId || !assignUserId) {
      setStatusMsg("Укажите school_id и user_id.");
      return;
    }
    setSubmitting(true);
    setStatusMsg(null);
    try {
      const user = tg.initDataUnsafe?.user;
      const res = await fetch("/api/admin/set-school-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telegramUser: user,
          schoolId: assignSchoolId,
          userId: assignUserId,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Ошибка назначения админа");
      }
      setStatusMsg("Админ школы обновлён.");
      setAssignSchoolId("");
      setAssignUserId("");
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
            Загрузка панели главного админа...
          </p>
        </div>
      </main>
    );
  }

  if (!data?.ok) {
    return (
      <main className="w-full max-w-xl">
        <div className="card p-6 space-y-2">
          <h1 className="text-xl font-semibold">Панель главного админа</h1>
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
        <h1 className="text-xl font-semibold">Панель главного админа</h1>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold">Заявки на новые школы</h2>
          {data.pending_requests.length === 0 ? (
            <p className="text-xs text-slate-400">Нет заявок в ожидании.</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-auto pr-1">
              {data.pending_requests.map((r) => (
                <div
                  key={r.id}
                  className="border border-slate-800 rounded-xl px-3 py-2 text-xs flex flex-col gap-1"
                >
                  <div className="font-semibold">
                    {r.city_name} — {r.school_name}
                  </div>
                  {r.address && (
                    <div className="text-slate-400">{r.address}</div>
                  )}
                  <div className="flex gap-2 mt-1">
                    <button
                      disabled={submitting}
                      onClick={() => handleRequestDecision(r.id, "approved")}
                      className="rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3 py-1 text-[11px]"
                    >
                      Одобрить и создать школу
                    </button>
                    <button
                      disabled={submitting}
                      onClick={() => handleRequestDecision(r.id, "rejected")}
                      className="rounded-lg bg-rose-600 hover:bg-rose-700 px-3 py-1 text-[11px]"
                    >
                      Отклонить
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold">Школы и ручное назначение админов</h2>
          <p className="text-[11px] text-slate-400">
            Здесь можно вручную назначить админа школы по его user_id (uuid из таблицы users).
          </p>
          <div className="flex flex-col gap-2">
            <input
              className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs"
              placeholder="school_id"
              value={assignSchoolId}
              onChange={(e) => setAssignSchoolId(e.target.value)}
            />
            <input
              className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs"
              placeholder="user_id (uuid из users)"
              value={assignUserId}
              onChange={(e) => setAssignUserId(e.target.value)}
            />
            <button
              disabled={submitting}
              onClick={handleAssignAdmin}
              className="rounded-2xl bg-brand-500 hover:bg-brand-600 disabled:bg-slate-700 disabled:cursor-not-allowed px-4 py-2 text-xs font-medium"
            >
              {submitting ? "Сохранение..." : "Назначить админа школы"}
            </button>
          </div>
          <div className="max-h-64 overflow-auto pr-1 mt-2 space-y-1">
            {data.schools.map((s) => (
              <div
                key={s.id}
                className="border border-slate-800 rounded-xl px-3 py-2 text-[11px]"
              >
                <div className="font-semibold">
                  {s.city_name ? `${s.city_name} — ` : ""}{s.name}
                </div>
                <div className="text-slate-400">
                  school_id: <span className="font-mono">{s.id}</span>
                </div>
                <div className="text-slate-400">
                  school_admin_id:{" "}
                  <span className="font-mono">
                    {s.school_admin_id || "— не назначен —"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {statusMsg && (
          <p className="text-xs text-slate-200">{statusMsg}</p>
        )}
      </div>
    </main>
  );
}
