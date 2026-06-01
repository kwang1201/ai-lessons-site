# AI Lessons & Learns — Promega Korea

Single-page web app for Promega Korea / PBK colleagues to share their AI usage
stories in three questions, with a slideshow Present mode for live sessions.

**Live:** _set after Vercel deploy_

## Stack

- **Frontend:** plain HTML + JS (no build step)
- **Hosting:** Vercel (auto-deploys from this repo)
- **Backend:** Supabase Postgres (project shared with PBK20 events DB)

## Features

- Bilingual (KO/EN) — top-right toggle
- Submit a card (Team / Title / Name + three lessons)
- Cards view with edit/delete (your own card by name match, or admin via PIN)
- Anonymous board for questions and reflections
- Admin mode (PIN: `promega2026`) — reorder, edit, delete cards and notes
- **Present mode** — fullscreen card-by-card slideshow for the live session

## Configuration

Supabase URL + anon key are inlined in `index.html`. The anon key is safe to
expose because RLS policies enforce access. To rotate, edit the two constants
near the top of the `<script>` block.

## Deploy

Push to `main` — Vercel auto-deploys in ~30s.
