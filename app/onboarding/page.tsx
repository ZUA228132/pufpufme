"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTelegram } from "../../hooks/useTelegram";

type TgUser = {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
  photo_url?: string;
};

export default function OnboardingPage() {
  const tg = useTelegram();
  const router = useRouter();

  const [city, setCity] = useState("");
  const [school, setSchool] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [tgUser, setTgUser] = useState<TgUser | null>(null);

  useEffect(() => {
    if (!tg) return;
    const u = tg.initDataUnsafe?.user as TgUser | undefined;
    if (u) setTgUser(u);
  }, [tg]);

  const handleSubmit = async () => {
    if (!tg) return;
    const cityName = city.trim();
    const schoolName = school.trim();

    if (!cityName || !schoolName) {
      setStatusMsg("Заполни город и школу.");
      return;
    }

    setSubmitting(true);
    setStatusMsg(null);

    try {
      const user = tg.initDataUnsafe?.user;
      const res = await fetch("/api/onboarding/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telegramUser: user,
          cityName,
          schoolName,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Ошибка регистрации");
      }

      // после успешной регистрации — в экран школы
      router.push("/school");
    } catch (e: any) {
      // Если Supabase на тех-работах — просто покажем текст ошибки
      setStatusMsg(e.message || "Ошибка подключения. Попробуй позже.");
    } finally {
      setSubmitting(false);
    }
  };

  const displayName =
    tgUser?.first_name && tgUser?.last_name
      ? `${tgUser.first_name} ${tgUser.last_name}`
      : tgUser?.first_name ??
        tgUser?.username ??
        "Без имени";

  return (
    <main className="w-full max-w-md">
      <div className="card p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-brand-500 to-fuchsia-500 flex items-center justify-center text-sm font-semibold overflow-hidden">
            {tgUser?.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={tgUser.photo_url}
                alt="avatar"
                className="h-full w-full object-cover"
              />
            ) : (
              <span>
                {tgUser?.first_name?.[0] ??
                  tgUser?.username?.[0] ??
                  "👤"}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-400">Регистрация в PUFF</p>
            <p className="text-sm font-medium truncate">{displayName}</p>
          </div>
        </div>

        <div className="space-y-3">
          <label className="block text-sm">
            <span className="text-slate-300">Город</span>
            <input
              className="mt-1 w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-sm"
              placeholder="Например: Москва"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
          </label>

          <label className="block text-sm">
            <span className="text-slate-300">Школа / номер / название</span>
            <input
              className="mt-1 w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-sm"
              placeholder="Например: Школа №57"
              value={school}
              onChange={(e) => setSchool(e.target.value)}
            />
          </label>
        </div>

        <button
          disabled={submitting}
          onClick={handleSubmit}
          className="w-full rounded-2xl bg-brand-500 hover:bg-brand-600 disabled:bg-slate-700 disabled:cursor-not-allowed px-4 py-2.5 text-sm font-semibold"
        >
          {submitting ? "Сохраняю..." : "Продолжить"}
        </button>

        {statusMsg && (
          <p className="text-xs text-slate-200">{statusMsg}</p>
        )}
      </div>
    </main>
  );
}
