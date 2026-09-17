# AfiDu

This repo consists of 2 applications

`./src/` (Internal locally hosted full-stack Django app)

`./e-learning/` (Vercel hosted Next.js 16 e-learning app)

The Django app uses uv as the python package manager and both apps uses pnpm as the js package manager.

Both apps shares the same PostgreSQL database hosted on Neon, but they do not talk to each other, they are independent applications.
