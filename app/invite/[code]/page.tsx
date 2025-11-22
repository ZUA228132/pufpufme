"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTelegram } from "../../../hooks/useTelegram";

type JoinedSchool = {
  id: string;
  name: string;
  logo_url?: string | null;
  banner_url?: string | null;
};

export default function InviteJoinPage({ params }: { params: { code: string } }) {
  const router = useRouter();
  const tg = useTelegram();
  const [status, setStatus] = useState<string>("Подключаем к школе...");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [school, setSchool] = useState<JoinedSchool | null>(null);

  useEffect(() => {
    if (!tg) return;

    const user = tg.initDataUnsafe?.user;
    if (!user) {
      setError("Не удалось получить данные из Telegram");
      setStatus("Ошибка инициализации Telegram WebApp");
      setLoading(false);
      return;
    }

    // Настраиваем Telegram UI
    try {
      tg.BackButton.show();
      tg.BackButton.onClick(() => {
        tg.HapticFeedback?.impactOccurred("light");
        router.back();
      });
    } catch {
      // ignore
    }

    const join = async () => {
      try {
        setLoading(true);
        setError(null);
        setStatus("Подключаем к школе...");

        const res = await fetch("/api/school/join-invite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            telegramUser: user,
            code: params.code,
          }),
        });

        const json = await res.json();

        if (!json.ok) {
          const msg = json.error || "Не удалось подключиться по инвайту";
          setError(msg);
          setStatus(msg);
          tg.HapticFeedback?.notificationOccurred("error");
          return;
        }

        const joinedSchool: JoinedSchool | null =
          json.school ?? (json.school_id
            ? { id: json.school_id, name: "Ваша школа", logo_url: null, banner_url: null }
            : null);

        setSchool(joinedSchool);
        setStatus("Вы успешно присоединились к школе!");
        tg.HapticFeedback?.notificationOccurred("success");
      } catch (e) {
        console.error("join invite error", e);
        setError("Произошла ошибка при подключении к школе");
        setStatus("Произошла ошибка при подключении к школе");
        tg.HapticFeedback?.notificationOccurred("error");
      } finally {
        setLoading(false);
      }
    };

    join();

    return () => {
      try {
        tg.BackButton?.hide();
      } catch {
        // ignore
      }
    };
  }, [tg, router, params.code]);

  const handleGoToSchool = () => {
    try {
      tg?.HapticFeedback?.impactOccurred("medium");
    } catch {
      // ignore
    }
    router.replace("/school");
  };

  return (
    <main className="w-full max-w-xl">
      <div className="card p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-purple-500/40 to-blue-500/40 flex items-center justify-center text-xl">
            🎓
          </div>
          <div>
            <h1 className="text-base font-semibold">Присоединение к школе</h1>
            <p className="text-[11px] text-slate-300">
              Инвайт: <span className="font-mono text-xs text-slate-100">{params.code}</span>
            </p>
          </div>
        </div>

        {school && (
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800 overflow-hidden">
            {school.banner_url && (
              <div className="h-20 w-full overflow-hidden">
                <img
                  src={school.banner_url}
                  alt={school.name}
                  className="h-full w-full object-cover"
                />
              </div>
            )}
            <div className="flex items-center gap-3 p-3">
              <div className="h-10 w-10 rounded-2xl bg-slate-800 flex items-center justify-center overflow-hidden">
                {school.logo_url ? (
                  <img
                    src={school.logo_url}
                    alt={school.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-lg">🏫</span>
                )}
              </div>
              <div>
                <p className="text-sm font-semibold line-clamp-2">
                  {school.name}
                </p>
                <p className="text-[11px] text-slate-400">
                  Теперь вы участник школьного сообщества PUFF
                </p>
              </div>
            </div>
          </div>
        )}

        <p className="text-sm text-slate-200">
          {status}
        </p>

        {error && (
          <p className="text-xs text-red-300">
            {error}
          </p>
        )}

        {!loading && !error && (
          <button
            onClick={handleGoToSchool}
            className="w-full rounded-2xl bg-brand-500 hover:bg-brand-600 px-4 py-2.5 text-sm font-semibold transition active:scale-[0.99]"
          >
            Перейти в ленту школы
          </button>
        )}
      </div>
    </main>
  );
}
