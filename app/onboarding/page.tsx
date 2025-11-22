"use client";

import { useEffect, useState } from "react";
import { useTelegram } from "../../hooks/useTelegram";
import { useRouter } from "next/navigation";

type City = { id: string; name: string };
type School = { id: string; name: string };

export default function OnboardingPage() {
  const tg = useTelegram();
  const router = useRouter();

  const [cities, setCities] = useState<City[]>([]);
  const [schools, setSchools] = useState<School[]>([]);

  const [cityId, setCityId] = useState<string>("");
  const [schoolId, setSchoolId] = useState<string>("");

  const [citySearch, setCitySearch] = useState("");
  const [schoolSearch, setSchoolSearch] = useState("");

  const [loading, setLoading] = useState(false);
  const [checkingUser, setCheckingUser] = useState(true);

  const [requestMode, setRequestMode] = useState(false);
  const [cityName, setCityName] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [address, setAddress] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  // Проверка статуса пользователя
  useEffect(() => {
    if (!tg) return;
    const checkUser = async () => {
      try {
        const user = tg.initDataUnsafe?.user;
        if (!user) {
          setCheckingUser(false);
          return;
        }

        const res = await fetch("/api/users/me", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ telegramUser: user }),
        });

        if (!res.ok) {
          setCheckingUser(false);
          return;
        }

        const data = await res.json();
        const u = data.user;

        if (u?.is_global_admin) {
          router.replace("/admin");
          return;
        }

        if (u?.current_school_id) {
          router.replace("/school");
          return;
        }

        setCheckingUser(false);
      } catch (e) {
        setCheckingUser(false);
      }
    };

    checkUser();
  }, [tg, router]);

  // Грузим города
  useEffect(() => {
    const load = async () => {
      const res = await fetch("/api/meta/cities");
      const data = await res.json();
      setCities(data.cities ?? []);
    };
    load();
  }, []);

  // Грузим школы
  useEffect(() => {
    const load = async () => {
      if (!cityId) {
        setSchools([]);
        return;
      }
      const res = await fetch(`/api/meta/schools?cityId=${cityId}`);
      const data = await res.json();
      setSchools(data.schools ?? []);
    };
    load();
  }, [cityId]);

  const handleSubmit = async () => {
    if (!tg) {
      setStatus("Откройте приложение внутри Telegram.");
      return;
    }
    setLoading(true);
    setStatus(null);
    try {
      const user = tg.initDataUnsafe?.user;
      const res = await fetch("/api/onboarding/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telegramUser: user,
          cityId,
          schoolId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка регистрации");
      router.replace("/school");
    } catch (e: any) {
      setStatus(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestSchool = async () => {
    if (!tg) {
      setStatus("Откройте приложение внутри Telegram.");
      return;
    }
    if (!cityName || !schoolName) {
      setStatus("Укажите город и школу.");
      return;
    }
    setLoading(true);
    setStatus(null);
    try {
      const user = tg.initDataUnsafe?.user;
      const res = await fetch("/api/onboarding/request-school", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telegramUser: user,
          cityName,
          schoolName,
          address,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка отправки заявки");
      setStatus("Заявка отправлена главному администратору. Вам придёт уведомление после одобрения.");
      setRequestMode(false);
    } catch (e: any) {
      setStatus(e.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredCities = cities.filter((c) =>
    c.name.toLowerCase().includes(citySearch.toLowerCase())
  );
  const filteredSchools = schools.filter((s) =>
    s.name.toLowerCase().includes(schoolSearch.toLowerCase())
  );

  if (checkingUser) {
    return (
      <main className="w-full max-w-xl">
        <div className="card p-6">
          <p className="text-sm text-slate-300">
            Проверяем ваш статус в системе...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="w-full max-w-xl">
      <div className="card p-6 space-y-4">
        <h1 className="text-xl font-semibold">Регистрация</h1>
        {!requestMode ? (
          <>
            <p className="text-sm text-slate-300">
              Выберите ваш город и школу. Если школы нет в списке — подайте заявку на подключение.
            </p>

            <div className="space-y-2">
              <label className="block text-sm">
                <span className="text-slate-300">Город</span>
                <input
                  className="mt-1 w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-sm"
                  placeholder="Начните вводить название города"
                  value={citySearch}
                  onChange={(e) => setCitySearch(e.target.value)}
                />
              </label>
              <select
                className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-sm"
                size={6}
                value={cityId}
                onChange={(e) => {
                  setCityId(e.target.value);
                  setSchoolId("");
                  setSchoolSearch("");
                }}
              >
                <option value="">— выберите город —</option>
                {filteredCities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm">
                <span className="text-slate-300">Школа</span>
                <input
                  className="mt-1 w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-sm"
                  placeholder="Начните вводить название школы"
                  value={schoolSearch}
                  onChange={(e) => setSchoolSearch(e.target.value)}
                  disabled={!cityId}
                />
              </label>
              <select
                className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-sm"
                size={6}
                value={schoolId}
                onChange={(e) => setSchoolId(e.target.value)}
                disabled={!cityId}
              >
                <option value="">— выберите школу —</option>
                {filteredSchools.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              disabled={!cityId || !schoolId || loading}
              onClick={handleSubmit}
              className="w-full mt-2 rounded-2xl bg-brand-500 hover:bg-brand-600 disabled:bg-slate-700 disabled:cursor-not-allowed px-4 py-2 text-sm font-medium"
            >
              {loading ? "Сохранение..." : "Продолжить"}
            </button>
            <button
              type="button"
              onClick={() => setRequestMode(true)}
              className="w-full text-xs text-slate-400 underline underline-offset-4 mt-2"
            >
              Моего города или школы нет в списке
            </button>
          </>
        ) : (
          <>
            <p className="text-sm text-slate-300">
              Заполните заявку на подключение новой школы. Главный админ проверит её и создаст профиль школы.
            </p>
            <div className="space-y-3">
              <label className="block text-sm">
                <span className="text-slate-300">Город</span>
                <input
                  className="mt-1 w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-sm"
                  value={cityName}
                  onChange={(e) => setCityName(e.target.value)}
                  placeholder="Например: Москва"
                />
              </label>
              <label className="block text-sm">
                <span className="text-slate-300">Школа</span>
                <input
                  className="mt-1 w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-sm"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  placeholder='Например: Школа №123 "Лицей"'
                />
              </label>
              <label className="block text-sm">
                <span className="text-slate-300">Адрес (опционально)</span>
                <input
                  className="mt-1 w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-sm"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Адрес школы"
                />
              </label>
            </div>
            <button
              disabled={loading}
              onClick={handleRequestSchool}
              className="w-full mt-2 rounded-2xl bg-brand-500 hover:bg-brand-600 disabled:bg-slate-700 disabled:cursor-not-allowed px-4 py-2 text-sm font-medium"
            >
              {loading ? "Отправка..." : "Отправить заявку"}
            </button>
            <button
              type="button"
              onClick={() => setRequestMode(false)}
              className="w-full text-xs text-slate-400 underline underline-offset-4 mt-2"
            >
              Вернуться к выбору школы
            </button>
          </>
        )}
        {status && (
          <div className="mt-3 text-xs text-slate-200">
            {status}
          </div>
        )}
      </div>
    </main>
  );
}
