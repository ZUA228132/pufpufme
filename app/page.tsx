"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const [user, setUser] = useState<TgUser | null>(null);

  // Подтягиваем Telegram-пользователя (для аватарки/инициалов)
  useEffect(() => {
    if (!tg) return;
    const u = tg.initDataUnsafe?.user as TgUser | undefined;
    if (u) setUser(u);
  }, [tg]);

  // Если пользователь уже в школе или он главный админ — сразу ведём в нужный раздел
  useEffect(() => {
    const check = async () => {
      if (!tg) return;
      try {
        const u = tg.initDataUnsafe?.user;
        if (!u) return;
        const res = await fetch("/api/users/me", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ telegramUser: u }),
        });
        if (!res.ok) return;
        const data = await res.json();
        const me = data.user;
        if (me?.is_global_admin) {
          router.replace("/admin");
          return;
        }
        if (me?.current_school_id) {
          router.replace("/school");
          return;
        }
      } catch (e) {
        // молча игнорируем, просто показываем лендинг
      }
    };
    check();
  }, [tg, router]);

  const initials =
    user?.first_name?.[0] ||
    user?.last_name?.[0] ||
    user?.username?.[0] ||
    "👤";

  return (
    <main className="w-full">
      <div className="card p-6 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="badge-pill text-slate-200/80">
              <span className="text-[10px]">new</span>
              <span>puff school hub</span>
            </div>
            <h1 className="mt-3 text-3xl font-bold tracking-tight">PUFF</h1>
            <p className="mt-1 text-sm text-slate-300">
              Молодёжное школьное сообщество прямо в Telegram.
            </p>
          </div>
          <div className="relative">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-purple-500/80 via-fuchsia-400/80 to-emerald-400/80 flex items-center justify-center text-xl font-semibold shadow-soft overflow-hidden">
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
