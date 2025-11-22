"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTelegram } from "../../../hooks/useTelegram";

export default function InviteJoinPage({ params }: { params: { code: string } }) {
  const router = useRouter();
  const tg = useTelegram();
  const [status, setStatus] = useState("Подключаем к школе...");

  useEffect(() => {
    const run = async () => {
      if (!tg) return;
      try {
        const user = tg.initDataUnsafe?.user;
        const res = await fetch("/api/school/join-invite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ telegramUser: user, code: params.code }),
        });
        const json = await res.json();
        if (!res.ok || !json.ok) {
          throw new Error(json.error || "Не удалось подключиться");
        }
        setStatus("Готово, открываем школу…");
        router.replace("/school");
      } catch (e: any) {
        setStatus(e.message || "Ошибка подключения по ссылке");
      }
    };
    run();
  }, [tg, router, params.code]);

  return (
    <main className="w-full max-w-xl">
      <div className="card p-6">
        <p className="text-sm text-slate-200">{status}</p>
      </div>
    </main>
  );
}
