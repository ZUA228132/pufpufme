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
    if (tg) {
      setUser(tg.initDataUnsafe?.user ?? null);
    }
  }, [tg]);

  return (
    <main className="w-full max-w-xl">
      <div className="card p-6 space-y-4">
        <h1 className="text-2xl font-semibold text-white">
          TG School Hub
        </h1>
        <p className="text-sm text-slate-300">
          Школьное сообщество для вашего города. Новости, голосования за админа школы,
          чаты классов и многое другое.
        </p>

        {user ? (
          <div className="flex items-center gap-3 mt-2">
            {user.photo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.photo_url}
                alt="avatar"
                className="w-10 h-10 rounded-full border border-slate-700"
              />
            )}
            <div>
              <div className="font-medium">
                {user.first_name} {user.last_name}
              </div>
              {user.username && (
                <div className="text-xs text-slate-400">@{user.username}</div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-sm text-amber-300">
            Откройте это приложение внутри Telegram как WebApp, чтобы продолжить.
          </div>
        )}

        <div className="pt-4 flex flex-col gap-3">
          <Link
            href="/onboarding"
            className="inline-flex items-center justify-center rounded-2xl bg-brand-500 hover:bg-brand-600 transition px-4 py-2 text-sm font-medium"
          >
            Продолжить регистрацию
          </Link>
          <p className="text-[11px] text-slate-500">
            При первом входе мы запросим только город и школу. Имя и аватар берём из вашего Telegram.
          </p>
        </div>
      </div>
    </main>
  );
}
