"use client";

import { useEffect, useState } from "react";
import { useTelegram } from "../../../hooks/useTelegram";

type Candidate = {
  id: string;
  display_name: string | null;
  class_name: string | null;
  photo_url: string | null;
  votes_count: number;
};

type Election = {
  id: string;
  status: "active" | "finished";
  starts_at: string;
  ends_at: string;
  winner_candidate_id: string | null;
};

type ElectionResponse = {
  ok: boolean;
  message?: string;
  school_has_admin: boolean;
  election: Election | null;
  candidates: Candidate[];
  my_vote_candidate_id: string | null;
};

export default function ElectionPage() {
  const tg = useTelegram();
  const [data, setData] = useState<ElectionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState("");
  const [className, setClassName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const loadStatus = async () => {
    if (!tg) return;
    setLoading(true);
    setStatusMsg(null);
    try {
      const user = tg.initDataUnsafe?.user;
      const res = await fetch("/api/election/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telegramUser: user }),
      });
      const json = await res.json();
      setData(json);
    } catch (e: any) {
      setStatusMsg(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tg) {
      loadStatus();
    }
  }, [tg]);

  const handlePropose = async () => {
    if (!tg) return;
    if (!displayName) {
      setStatusMsg("Укажите имя для карточки кандидата.");
      return;
    }
    setSubmitting(true);
    setStatusMsg(null);
    try {
      const user = tg.initDataUnsafe?.user;
      const res = await fetch("/api/election/propose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telegramUser: user,
          displayName,
          className,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Ошибка подачи кандидатуры");
      }
      setDisplayName("");
      setClassName("");
      setStatusMsg("Кандидат добавлен. Если кандидатов будет 6 или больше, стартует голосование.");
      await loadStatus();
    } catch (e: any) {
      setStatusMsg(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleVote = async (candidateId: string) => {
    if (!tg || !data?.election || data.election.status !== "active") return;
    setSubmitting(true);
    setStatusMsg(null);
    try {
      const user = tg.initDataUnsafe?.user;
      const res = await fetch("/api/election/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telegramUser: user,
          candidateId,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Ошибка голосования");
      }
      setStatusMsg("Голос учтён.");
      await loadStatus();
    } catch (e: any) {
      setStatusMsg(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const renderBody = () => {
    if (!data) {
      return <p className="text-sm text-slate-300">Нет данных по выбору админа школы.</p>;
    }

    if (data.school_has_admin && !data.election) {
      return (
        <p className="text-sm text-slate-300">
          У школы уже есть админ. При необходимости новые выборы можно будет запустить позже.
        </p>
      );
    }

    const election = data.election;

    if (!election) {
      return (
        <div className="space-y-4">
          <p className="text-sm text-slate-300">
            У вашей школы пока нет активного голосования за админа. Можно подать кандидатуру.
          </p>
          <div className="space-y-2">
            <label className="block text-sm">
              <span className="text-slate-300">Имя / как показывать в списке</span>
              <input
                className="mt-1 w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-sm"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Например: Иван Иванов, 9Б"
              />
            </label>
            <label className="block text-sm">
              <span className="text-slate-300">Класс (опционально)</span>
              <input
                className="mt-1 w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-sm"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                placeholder="Например: 9Б"
              />
            </label>
          </div>
          <button
            disabled={submitting}
            onClick={handlePropose}
            className="w-full rounded-2xl bg-brand-500 hover:bg-brand-600 disabled:bg-slate-700 disabled:cursor-not-allowed px-4 py-2 text-sm font-medium"
          >
            {submitting ? "Отправка..." : "Подать свою кандидатуру"}
          </button>
          <div>
            <h2 className="text-sm font-semibold mb-1">Список кандидатов</h2>
            {data.candidates.length === 0 ? (
              <p className="text-xs text-slate-400">Пока нет ни одного кандидата.</p>
            ) : (
              <ul className="space-y-2">
                {data.candidates.map((c) => (
                  <li
                    key={c.id}
                    className="flex justify-between items-center text-xs border border-slate-800 rounded-xl px-3 py-2"
                  >
                    <div>
                      <div className="font-medium">
                        {c.display_name || "Без имени"}
                      </div>
                      {c.class_name && (
                        <div className="text-slate-400">{c.class_name}</div>
                      )}
                    </div>
                    <div className="text-slate-400">
                      Голосов: {c.votes_count}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-[11px] text-slate-500">
              Как только будет 6 или больше кандидатов, автоматически стартует голосование на 24 часа.
            </p>
          </div>
        </div>
      );
    }

    const now = new Date();
    const endsAt = new Date(election.ends_at);
    const msLeft = endsAt.getTime() - now.getTime();
    const alreadyVoted = data.my_vote_candidate_id !== null;

    const formatLeft = () => {
      if (msLeft <= 0) return "Голосование завершено, идёт подведение итогов...";
      const totalSeconds = Math.floor(msLeft / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      return `Осталось ~${hours} ч ${minutes} мин`;
    };

    if (election.status === "active") {
      return (
        <div className="space-y-4">
          <div className="text-sm text-slate-300">
            Идёт голосование за админа школы. {formatLeft()}
          </div>
          <div className="space-y-2">
            {data.candidates.map((c) => {
              const isMine = data.my_vote_candidate_id === c.id;
              return (
                <div
                  key={c.id}
                  className={`flex items-center justify-between border rounded-xl px-3 py-2 text-xs ${
                    isMine ? "border-brand-500 bg-slate-900/80" : "border-slate-800"
                  }`}
                >
                  <div>
                    <div className="font-semibold">{c.display_name || "Без имени"}</div>
                    {c.class_name && (
                      <div className="text-slate-400">{c.class_name}</div>
                    )}
                    <div className="text-slate-400 mt-1">
                      Голосов: {c.votes_count}
                    </div>
                    {isMine && (
                      <div className="text-[11px] text-emerald-400">
                        Ваш голос за этого кандидата
                      </div>
                    )}
                  </div>
                  <button
                    disabled={submitting || alreadyVoted}
                    onClick={() => handleVote(c.id)}
                    className="ml-2 rounded-xl border border-brand-500 px-3 py-1 text-[11px] hover:bg-brand-500 hover:text-white disabled:bg-slate-800 disabled:border-slate-700 disabled:text-slate-500"
                  >
                    {alreadyVoted ? "Вы уже проголосовали" : "Проголосовать"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    // finished
    const winnerId = election.winner_candidate_id;
    return (
      <div className="space-y-4">
        <div className="text-sm text-slate-300">
          Голосование завершено. Ниже результаты.
        </div>
        <div className="space-y-2">
          {data.candidates.map((c) => {
            const isWinner = c.id === winnerId;
            return (
              <div
                key={c.id}
                className={`flex items-center justify-between border rounded-xl px-3 py-2 text-xs ${
                  isWinner ? "border-emerald-500 bg-emerald-500/10" : "border-slate-800"
                }`}
              >
                <div>
                  <div className="font-semibold">
                    {c.display_name || "Без имени"}
                    {isWinner && (
                      <span className="ml-2 text-[11px] text-emerald-400">
                        Победитель голосования
                      </span>
                    )}
                  </div>
                  {c.class_name && (
                    <div className="text-slate-400">{c.class_name}</div>
                  )}
                  <div className="text-slate-400 mt-1">
                    Голосов: {c.votes_count}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-[11px] text-slate-500">
          Победитель автоматически назначен админом школы.
        </p>
      </div>
    );
  };

  return (
    <main className="w-full max-w-xl">
      <div className="card p-6 space-y-4">
        <h1 className="text-xl font-semibold">Голосование за админа школы</h1>
        {loading ? (
          <p className="text-sm text-slate-300">Загрузка...</p>
        ) : (
          renderBody()
        )}
        {statusMsg && (
          <div className="text-xs text-slate-200 mt-2">{statusMsg}</div>
        )}
      </div>
    </main>
  );
}
