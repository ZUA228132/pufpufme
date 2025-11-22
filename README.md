# TG School Hub v2 (MVP)

Готовый каркас Telegram WebApp для школьного сообщества на Next.js 14 + Supabase.

## 1. Supabase

1. Создай проект в Supabase.
2. В SQL Editor вставь и выполни `supabase/schema.sql`.
3. В Project Settings → API скопируй:
   - `Project URL`
   - `anon public key`
   - `service_role key`

## 2. Переменные окружения

Создай `.env.local` на основе `.env.example`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## 3. Локальный запуск

```bash
npm install
npm run dev
```

## 4. Деплой на Vercel

1. Залей код в репозиторий (GitHub/GitLab).
2. Импортируй в Vercel.
3. В Settings → Environment Variables добавь:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Запусти деплой.

## 5. Что уже реализовано

- Подключение Telegram WebApp SDK.
- Главная страница с отображением Telegram-пользователя.
- Онбординг:
  - выбор города и школы из Supabase (`cities`, `schools`);
  - заявка на подключение новой школы (`school_requests`).
- Базовый фид новостей школы `/school`:
  - читает опубликованные посты (`posts` со status = 'published').
- API-роуты:
  - `GET /api/meta/cities`
  - `GET /api/meta/schools?cityId=...`
  - `POST /api/onboarding/register`
  - `POST /api/onboarding/request-school`
  - `GET /api/school/feed`

Дальше можно расширять:
- добавлять голосования за админа;
- премиум-подписку;
- чаты и сообщения;
- жалобы, баны и панель глобального админа.
