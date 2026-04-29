# TRUSTOS | Conscience Middleware

## Overview
An AI fairness and bias detection web application that uses Google's Gemini AI to explain algorithmic fairness to beginners. Users can upload data, analyze it for disparate impact, receive AI-generated explanations of bias, and simulate mitigation strategies.

## Tech Stack
- **Frontend**: React 19, Tailwind CSS 4, Lucide React, Motion (Framer Motion), Recharts
- **Backend**: Node.js + Express, Google Generative AI (Gemini 2.0 Flash)
- **Build**: Vite 6, TypeScript, tsx
- **Package Manager**: npm

## Architecture
- `server.ts` — Express server that handles API routes and serves the React frontend via Vite middleware in dev mode, and static files from `dist/` in production
- `src/` — React SPA frontend
- `index.html` — Entry point for Vite

## API Routes
- `POST /api/analyze` — Calculate fairness metrics (disparate impact, demographic parity)
- `POST /api/explain` — Generate AI explanation via Gemini API
- `POST /api/mitigate` — Simulate bias mitigation strategies

## Running
- **Development**: `npm run dev` (runs on port 5000)
- **Production**: `npm run build && npm run start`

## Configuration
- Requires `GEMINI_API_KEY` environment variable for AI explanations
- Server binds to `0.0.0.0:5000` for Replit proxy compatibility
- Vite configured with `allowedHosts: true` for Replit iframe preview

## Deployment
- Target: autoscale
- Build: `npm run build`
- Run: `npm run start`
