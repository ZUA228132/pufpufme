"use client";

import { useEffect, useState } from "react";

type Post = {
  id: string;
  title: string;
  content: string | null;
};

export default function SchoolPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const res = await fetch("/api/school/feed");
      const data = await res.json();
      setPosts(data.posts ?? []);
      setLoading(false);
    };
    load();
  }, []);

  return (
    <main className="w-full max-w-xl">
      <div className="card p-6 space-y-4">
        <h1 className="text-xl font-semibold">Новости вашей школы</h1>
        {loading ? (
          <div className="text-sm text-slate-300">Загрузка...</div>
        ) : posts.length === 0 ? (
          <div className="text-sm text-slate-400">
            Пока нет опубликованных новостей. Как только админ школы их добавит, они появятся здесь.
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map((p) => (
              <article key={p.id} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-3">
                <h2 className="text-sm font-semibold">{p.title}</h2>
                {p.content && (
                  <p className="mt-1 text-xs text-slate-300 whitespace-pre-wrap">
                    {p.content}
                  </p>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
