"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTelegram } from "../hooks/useTelegram";

type TgUser = {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
  photo_url?: string;
};

export default function HomePage() {
  const tg = useTelegram();
  const [user, setUser] = useState<TgUser | null>(null);

  useEffect(() => {
    if (!tg) return;
    const u = tg.initDataUnsafe?.user as TgUser | undefined;
    if (u) setUser(u);
  }, [tg]);

  const initials =
    user?.first_name?.[0] ||
    user?.last_name?.[0] ||
    user?.username?.[0] ||
    "👤";

  const displayName =
    user?.first_name && user?.last_name
      ? `${user.first_name} ${user.last_name}`
      : user?.first_name ??
        user?.username ??
        "Без имени";

  return (
    <main className="w-full max-w-md">
      <div className="card p-6 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="badge-pill text-slate-200/80">
              <span className="text-[10px]">new</span>
              <span>puff hub by WUSVA</span>
            </div>
            <h1 className="mt-3 text-3xl font-bold tracking-tight">
              PUFF
            </h1>
            <p className="mt-1 text-sm text-slate-300">
              Лучшее школьное сообщество прямо в Telegram.
            </p>
            <p className="mt-2 text-xs text-slate-400">
              Ты: <span className="font-medium text-slate-100">{displayName}</span>
            </p>
          </div>
          <div className="relative">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-brand-500 to-fuchsia-500 flex items-center justify-center text-xl font-semibold shadow-soft overflow-hidden">
              {user?.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.photo_url}
                  alt="avatar"
                  className="h-full w-full rounded-2xl object-cover"
                />
              ) : (
                <span>{initials}</span>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-xs text-slate-300">
            Регистрация занимает меньше минуты: выбираешь город и школу — и ты в потоке.
          </p>
          <Link
            href="/onboarding"
            className="inline-flex w-full items-center justify-center rounded-2xl bg-brand-500 hover:bg-brand-600 px-4 py-2.5 text-sm font-semibold transition"
          >
            Войти в PUFF
          </Link>
        </div>
      </div>
    </main>
  );
}
