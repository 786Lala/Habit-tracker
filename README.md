# Habit Journal — Prototype (React + TypeScript + Tailwind)

## Quick start (local)
1. Create a `.env` file in the project root with:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

2. Install deps:
```
npm install
```
3. Run dev server:
```
npm run dev
```
4. Open `http://localhost:5173`

## Supabase setup (minimal)
1. Create a Supabase project at https://app.supabase.com
2. In Authentication -> Providers enable Google and add your project's redirect URL(s) (e.g., `http://localhost:5173` and your Vercel domain).
3. Copy the project URL and anon key into `.env` as `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

## Deploy (Vercel)
1. Push the repository to GitHub.
2. Import the repo in Vercel and set the framework to `Vite`.
3. Under Project Settings -> Environment Variables add the two variables from `.env`.
4. Deploy
