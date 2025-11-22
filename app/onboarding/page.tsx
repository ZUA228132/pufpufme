"use client";

import { useEffect, useState } from "react";
import { useTelegram } from "../../hooks/useTelegram";
import { useRouter } from "next/navigation";

type City = { id: string; name: string };
type School = { id: string; name: string };

type Mode = "choose" | "request";

export default function OnboardingPage() {
  const tg = useTelegram();
  const router = useRouter();

  const [cities, setCities] = useState<City[]>([]);
  const [schools, setSchools] = useState<School[]>([]);

  const [selectedCityId, setSelectedCityId] = useState<string>("");
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>("");

  const [mode, setMode] = useState<Mode>("choose");

  const [cityNameInput, setCityNameInput] = useState<string>("");
  const [schoolNameInput, setSchoolNameInput] = useState<string>("");
  const [addressInput, setAddressInput] = useState<string>("");

  const [loading, setLoading] = useState<boolean>(false);
  const [status, setStatus] = useState<string | null>(null);

  // Загрузка городов
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/meta/cities");
        const json = await res.json();
        setCities(json.cities ?? []);
      } catch (e) {
        console.error("load cities error", e);
      }
    };
    load();
  }, []);

  // Telegram UI (BackButton + стили)
  useEffect(() => {
    if (!tg) return;

    try {
      tg.BackButton.show();
      tg.BackButton.onClick(() => {
        tg.HapticFeedback?.impactOccurred("light");
        router.back();
      });
    } catch {
      // ignore
    }

    return () => {
      try {
        tg.BackButton?.hide();
      } catch {
        // ignore
      }
    };
  }, [tg, router]);

  const loadSchoolsForCity = async (cityId: string) => {
    if (!cityId) {
      setSchools([]);
      setSelectedSchoolId("");
      return;
    }
    try {
      const res = await fetch(`/api/meta/schools?cityId=${encodeURIComponent(cityId)}`);
      const json = await res.json();
      setSchools(json.schools ?? []);
      setSelectedSchoolId("");
    } catch (e) {
      console.error("load schools error", e);
      setSchools([]);
    }
  };

  const handleCityChange = async (cityId: string) => {
    setSelectedCityId(cityId);
    setMode("choose");
    setStatus(null);

    const city = cities.find((c) => c.id === cityId);
    setCityNameInput(city?.name ?? "");

    await loadSchoolsForCity(cityId);
  };

  const handleRegister = async () => {
    if (!tg) return;
    const user = tg.initDataUnsafe?.user;
    if (!user || !selectedCityId || !selectedSchoolId) return;

    try {
      setLoading(true);
      setStatus(null);
      tg.HapticFeedback?.impactOccurred("light");

      const res = await fetch("/api/onboarding/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telegramUser: user,
          cityId: selectedCityId,
          schoolId: selectedSchoolId,
        }),
      });

      const json = await res.json();
      if (json.error) {
        setStatus(json.error || "Не удалось завершить регистрацию");
        tg.HapticFeedback?.notificationOccurred("error");
        return;
      }

      setStatus("Готово! Открываем вашу школу…");
      tg.HapticFeedback?.notificationOccurred("success");
      router.replace("/school");
    } catch (e) {
      console.error("register error", e);
      setStatus("Произошла ошибка при регистрации");
      tg?.HapticFeedback?.notificationOccurred("error");
    } finally {
      setLoading(false);
    }
  };

  const handleRequestSchool = async () => {
    if (!tg) return;
    const user = tg.initDataUnsafe?.user;
    if (!user || !cityNameInput || !schoolNameInput) return;

    try {
      setLoading(true);
      setStatus(null);
      tg.HapticFeedback?.impactOccurred("light");

      const res = await fetch("/api/onboarding/request-school", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telegramUser: user,
          cityName: cityNameInput,
          schoolName: schoolNameInput,
          address: addressInput || null,
        }),
      });

      const json = await res.json();
      if (json.error) {
        setStatus(json.error || "Не удалось отправить заявку");
        tg.HapticFeedback?.notificationOccurred("error");
        return;
      }

      setStatus(
        "Заявка отправлена! Как только админ подтвердит школу, вы сможете к ней подключиться."
      );
      tg.HapticFeedback?.notificationOccurred("success");
      setMode("choose");
    } catch (e) {
      console.error("request school error", e);
      setStatus("Произошла ошибка при отправке заявки");
      tg?.HapticFeedback?.notificationOccurred("error");
    } finally {
      setLoading(false);
    }
  };

  const selectedCity = cities.find((c) => c.id === selectedCityId);

  return (
    <main className="w-full max-w-xl">
      <div className="card p-6 space-y-5">
        <div>
          <h1 className="text-xl font-semibold">Выбор школы</h1>
          <p className="mt-1 text-xs text-slate-300">
            Сначала выбери город, затем школу. Если школы ещё нет — отправь заявку на добавление.
          </p>
        </div>

        {/* Шаг 1 — город */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-200">
            Город
          </label>
          <select
            value={selectedCityId}
            onChange={(e) => handleCityChange(e.target.value)}
            className="w-full rounded-2xl bg-slate-900/80 border border-slate-700 px-3 py-2 text-sm outline-none"
          >
            <option value="">Выбери город…</option>
            {cities.map((city) => (
              <option key={city.id} value={city.id}>
                {city.name}
              </option>
            ))}
          </select>
        </div>

        {/* Шаг 2 — школа, если город выбран */}
        {selectedCityId && mode === "choose" && (
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-200">
              Школа
            </label>
            {schools.length > 0 ? (
              <>
                <select
                  value={selectedSchoolId}
                  onChange={(e) => setSelectedSchoolId(e.target.value)}
                  className="w-full rounded-2xl bg-slate-900/80 border border-slate-700 px-3 py-2 text-sm outline-none"
                >
                  <option value="">Выбери школу…</option>
                  {schools.map((school) => (
                    <option key={school.id} value={school.id}>
                      {school.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="text-[11px] text-slate-400 underline underline-offset-2"
                  onClick={() => {
                    setMode("request");
                    setSchoolNameInput("");
                    setAddressInput("");
                    setStatus(null);
                    if (selectedCity) {
                      setCityNameInput(selectedCity.name);
                    }
                  }}
                >
                  Моей школы нет в списке
                </button>
              </>
            ) : (
              <div className="rounded-2xl bg-slate-900/80 border border-dashed border-slate-700 px-3 py-3 text-xs text-slate-300 space-y-2">
                <p>В этом городе ещё нет школ в PUFF.</p>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-[11px] text-brand-300 underline underline-offset-2"
                  onClick={() => {
                    setMode("request");
                    setSchoolNameInput("");
                    setAddressInput("");
                    setStatus(null);
                    if (selectedCity) {
                      setCityNameInput(selectedCity.name);
                    }
                  }}
                >
                  Отправить заявку на добавление школы
                </button>
              </div>
            )}
          </div>
        )}

        {/* Режим запроса новой школы */}
        {mode === "request" && (
          <div className="space-y-3 rounded-2xl bg-slate-900/70 border border-slate-700 p-3">
            <p className="text-xs font-semibold text-slate-200">
              Заявка на добавление школы
            </p>
            <div className="space-y-1">
              <label className="text-[11px] text-slate-300">
                Город
              </label>
              <input
                value={cityNameInput}
                onChange={(e) => setCityNameInput(e.target.value)}
                className="w-full rounded-2xl bg-slate-950/50 border border-slate-700 px-3 py-2 text-sm outline-none"
                placeholder="Например: Киев"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] text-slate-300">
                Название школы
              </label>
              <input
                value={schoolNameInput}
                onChange={(e) => setSchoolNameInput(e.target.value)}
                className="w-full rounded-2xl bg-slate-950/50 border border-slate-700 px-3 py-2 text-sm outline-none"
                placeholder="Например: Лицей №123"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] text-slate-300">
                Адрес (по желанию)
              </label>
              <input
                value={addressInput}
                onChange={(e) => setAddressInput(e.target.value)}
                className="w-full rounded-2xl bg-slate-950/50 border border-slate-700 px-3 py-2 text-sm outline-none"
                placeholder="Улица, дом"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={handleRequestSchool}
                disabled={loading || !cityNameInput || !schoolNameInput}
                className="flex-1 rounded-2xl bg-brand-500 hover:bg-brand-600 px-4 py-2 text-xs font-semibold disabled:opacity-60 disabled:pointer-events-none"
              >
                Отправить заявку
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("choose");
                  setStatus(null);
                }}
                className="rounded-2xl border border-slate-700 px-4 py-2 text-xs"
              >
                Вернуться к выбору школы
              </button>
            </div>
          </div>
        )}

        {/* Кнопка регистрации в обычном режиме */}
        {mode === "choose" && (
          <button
            type="button"
            onClick={handleRegister}
            disabled={
              loading ||
              !selectedCityId ||
              !selectedSchoolId
            }
            className="w-full rounded-2xl bg-brand-500 hover:bg-brand-600 px-4 py-2.5 text-sm font-semibold disabled:opacity-60 disabled:pointer-events-none"
          >
            Продолжить
          </button>
        )}

        {status && (
          <div className="mt-1 text-xs text-slate-200">
            {status}
          </div>
        )}
      </div>
    </main>
  );
}
