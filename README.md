# SecureGate

A focused, production-ready authentication system built with Next.js 14, TypeScript, Prisma, PostgreSQL, NextAuth, and Resend.

> Built as part of the Dev & Design — Design to MVP Bootcamp Live Assessment.

---

## What is SecureGate?

SecureGate is a standalone authentication app. It is not a full product. It has one job: to demonstrate a correct, secure, and production-grade identity and access management system.

---

## Features

- Sign Up with full form validation and password strength indicator
- Email verification flow via Resend
- Login with NextAuth session handling and secure error messaging
- Protected Dashboard — accessible only to verified, authenticated users
- Forgot Password flow with expiring reset tokens (1 hour)
- Rate limiting on login and forgot-password endpoints
- Clean logout with session destruction
- Password hashing with bcrypt (salt rounds: 12)
- HTTP security headers configured in next.config.js

---

## Tech Stack

| Layer | Tool |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Database | PostgreSQL via Prisma ORM |
| Auth | NextAuth.js (Auth.js) |
| Password | bcryptjs |
| Email | Resend + React Email |
| Validation | Zod |
| Rate Limiting | Upstash Redis |
| Deployment | Vercel |
| Repo | GitHub |

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/securegate.git
cd securegate
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Create a `.env.local` file in the root of the project. **Never commit this file.**

```env
DATABASE_URL=
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000
RESEND_API_KEY=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

### 4. Set up the database

```bash
npx prisma migrate dev --name init
```

### 5. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Project Structure

```
securegate/
├── prisma/
│   └── schema.prisma          # Database models
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── auth/          # NextAuth + custom API routes
│   │   ├── (auth)/
│   │   │   ├── login/         # Login page
│   │   │   ├── signup/        # Sign up page
│   │   │   ├── verify-email/  # Email verification route
│   │   │   ├── forgot-password/
│   │   │   └── reset-password/
│   │   └── dashboard/         # Protected dashboard
│   ├── components/            # Reusable UI components
│   ├── lib/
│   │   ├── auth.ts            # NextAuth config
│   │   ├── db.ts              # Prisma client
│   │   ├── mail.ts            # Resend email helpers
│   │   └── rate-limit.ts      # Rate limiting middleware
│   └── middleware.ts          # Route protection middleware
├── emails/                    # React Email templates
├── .env.local                 # Local env vars (never commit)
├── .gitignore
├── next.config.js
├── README.md
└── REFLECTION.md
```

---

## Security Measures

- Passwords hashed with bcrypt (12 salt rounds)
- Verification and reset tokens expire (15 min / 1 hour respectively)
- Rate limiting: max 5 login attempts per IP per 10 minutes
- Error messages do not reveal whether an email exists
- No stack traces exposed to the client
- HTTP headers: X-Frame-Options, X-Content-Type-Options, Referrer-Policy
- All secrets stored in environment variables — never hardcoded

---

## Deployment

This app is deployed on Vercel. All environment variables are configured in the Vercel dashboard, not in the codebase.

**Live URL:** [https://your-vercel-url.vercel.app](https://your-vercel-url.vercel.app)

---

## Submission

- **GitHub Repo:** https://github.com/YOUR_USERNAME/securegate
- **Live URL:** https://your-vercel-url.vercel.app
- **Reflection:** See REFLECTION.md
