# TG School Hub (MVP)

Это минимальный каркас Telegram WebApp для школьного сообщества с Supabase и деплоем на Vercel.

## Быстрый старт

1. Создай проект в **Supabase**
2. В консоли SQL выполните файл `supabase/schema.sql`
3. Скопируй `.env.example` в `.env.local` и заполни:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (только на сервере, не шарить)

4. Локально:

```bash
npm install
npm run dev
```

5. На Vercel:
   - Импортируй репозиторий
   - В разделе Settings → Environment Variables добавь те же переменные.
   - Deploy.

## Что уже есть

- Подключение Telegram WebApp SDK
- Стартовый экран с отображением TG-пользователя
- Онбординг:
  - выбор города и школы
  - заявка на подключение новой школы
- Базовый фид новостей школы (`/school`) с данными из таблицы `posts`
- API-роуты:
  - `GET /api/meta/cities`
  - `GET /api/meta/schools?cityId=...`
  - `POST /api/onboarding/register`
  - `POST /api/onboarding/request-school`
  - `GET /api/school/feed`

Дальше ты можешь расширять схему БД под голосования за админа, премиум, чаты, жалобы и т.д.
