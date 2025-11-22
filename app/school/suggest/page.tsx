"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTelegram } from "../../../hooks/useTelegram";

export default function SuggestPostPage() {
  const router = useRouter();
  const tg = useTelegram();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!tg) {
      setStatus("Откройте приложение внутри Telegram.");
      return;
    }
    if (!title.trim()) {
      setStatus("Введите заголовок новости.");
      return;
    }
    setLoading(true);
    setStatus(null);
    try {
      const user = tg.initDataUnsafe?.user;
      const res = await fetch("/api/school/suggest-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telegramUser: user,
          title,
          content,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Ошибка отправки предложения");
      }
      setStatus("Новость отправлена на модерацию админу школы.");
      setTitle("");
      setContent("");
      setTimeout(() => router.push("/school"), 800);
    } catch (e: any) {
      setStatus(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="w-full max-w-xl">
      <div className="card p-6 space-y-4">
        <h1 className="text-xl font-semibold">Предложить новость</h1>
        <div className="space-y-3">
          <label className="block text-sm">
            <span className="text-slate-300">Заголовок</span>
            <input
              className="mt-1 w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-sm"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Например: Турнир по футболу 9Б vs 9В"
            />
          </label>
          <label className="block text-sm">
            <span className="text-slate-300">Текст новости</span>
            <textarea
              className="mt-1 w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-sm min-h-[120px]"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Подробности, время, место..."
            />
          
          <label className="block text-sm">
            <span className="text-slate-300">Картинка (URL, опционально)</span>
            <input
              className="mt-1 w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-sm"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://..."
            />
          </label>
</label>
        </div>

        <button
          disabled={loading}
          onClick={handleSubmit}
          className="w-full rounded-2xl bg-brand-500 hover:bg-brand-600 disabled:bg-slate-700 disabled:cursor-not-allowed px-4 py-2 text-sm font-medium"
        >
          {loading ? "Отправка..." : "Отправить на модерацию"}
        </button>

        {status && <p className="text-xs text-slate-200">{status}</p>}
      </div>
    </main>
  );
}
