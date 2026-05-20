# SecureGate — Reflection & Engineering Analysis

**Name:** [Your Full Name]  
**Cohort:** Design to MVP Bootcamp  
**Live URL:** [Your Vercel Deployment Link]  
**GitHub Repo:** [Your GitHub Repo URL]

---

## Part 1 — What I Built

SecureGate is a standalone, production-ready authentication system built with Next.js 14, TypeScript, Prisma, PostgreSQL, NextAuth, and Resend. I implemented a full auth flow including sign up with email verification, login with rate-limited brute-force protection, a forgot/reset password flow with expiring tokens, a protected dashboard accessible only to verified users, and clean logout with session destruction. Every layer — from password hashing to error messaging — was built with security as the primary concern.

---

## Part 2 — What Surprised Me

[Write the one thing that was harder than expected and what you learned from it. Be specific — reference an actual moment during the build.]

---

## Part 3 — Engineering Laws Quiz

---

### Q1 — Murphy's Law
> *Anything that can go wrong will go wrong.*

**Code reference:** `src/app/api/auth/login/route.ts` and `src/lib/rate-limit.ts`

**My Answer:**
Two specific places where Murphy's Law forced me to add protection:

1. **Rate limiting on login** — `src/lib/rate-limit.ts:9-13` and `src/app/api/auth/login/route.ts:14-21`. The login endpoint checks `loginLimiter.limit(ip)` before even querying the database. If the IP has exceeded 5 attempts in 10 minutes, the request is blocked with a 429 status. I added this because Murphy's Law guarantees that if there's no rate limiter, an attacker will find the endpoint and brute-force passwords at full speed.

2. **Token expiry on email verification** — `src/app/api/auth/signup/route.ts:63`. Verification tokens are created with `expires: new Date(Date.now() + 15 * 60 * 1000)` — they die after 15 minutes. Murphy's Law says that if a token never expires, it will eventually be intercepted (stale email link, leaked URL in server logs, or shared device) and used by someone it wasn't meant for.

**What goes wrong if ignored:**
1. Without rate limiting: An attacker fires thousands of login attempts per minute against known emails, cracking weak passwords in hours via dictionary or brute-force attacks. No lockout, no throttle — the only limit is network bandwidth.
2. Without token expiry: A verification or reset token sitting in an email inbox forever becomes a standing backdoor. If that email is compromised, the attacker can verify a new account or reset a password at any future date with no time constraint.

---

### Q2 — Law of Leaky Abstractions
> *All non-trivial abstractions, to some degree, are leaky.*

**Code reference:** `src/lib/auth.ts:50-60` (NextAuth JWT and session callbacks)

**My Answer:**
I'll pick **NextAuth**. It promises a clean session object that "just works" — you call `getServerSession(authOptions)` and get back typed user data. But NextAuth's default types don't know about custom fields like `emailVerified`. I had to break through the abstraction:

1. **JWT callback** (`src/lib/auth.ts:53`): To pass `emailVerified` into the token, I had to cast `user` to `as unknown as Record<string, unknown>` and access `emailVerified` as a loose property. NextAuth's `User` type doesn't include custom fields, so the only way to forward them is to punch a hole through the type system.
2. **Session callback** (`src/lib/auth.ts:59-60`): Same workaround — cast `session.user` to grab `emailVerified` off the token. What looks like a seamless data flow is actually a manual pipeline: JWT → callback extracts it → session callback re-extracts it.
3. **Middleware** (`src/middleware.ts:5`): I had to use `getToken` from `next-auth/jwt` instead of `getServerSession` because middleware runs in the edge runtime where Prisma (the session adapter) isn't available. The friendly session abstraction only works in Node.js — the moment you move to the edge, you hit the underlying JWT directly.

**What goes wrong if ignored:**
If I trusted NextAuth's types blindly, `session.user.emailVerified` would always be `undefined` — the field would vanish silently. And if I used `getServerSession` in middleware (which the docs encourage for page components), it would crash at runtime because Prisma can't connect in the edge runtime. The abstraction only works within its intended environment, and it doesn't tell you that upfront.

---

### Q3 — YAGNI
> *You Aren't Gonna Need It.*

**Code reference:** `src/lib/auth.ts:10-11` (only `CredentialsProvider` is configured — no OAuth providers)

**My Answer:**
Social login (Google, GitHub, etc.) is not in SecureGate right now. The boundary sits at `src/lib/auth.ts:10-11` — only `CredentialsProvider` is listed in the `providers` array. Adding social login would require:

- Registering OAuth apps with each provider, managing client IDs and secrets
- Handling account linking (what if a user signs up with email then later uses Google? Do they get two accounts?)
- Additional UI to show OAuth buttons on the auth page
- Testing callback URLs across development and production
- A more complex session strategy if mixing JWT with database sessions

None of this adds value for the current task (email/password auth MVP). Social login would be added correctly later by importing provider modules (e.g. `import GoogleProvider from "next-auth/providers/google"`), adding them to the `providers` array, implementing account linking via the `signIn` callback to merge by email, and adding the UI buttons on the client side.

**What goes wrong if ignored:**
Building social login now would blow the timeline — days spent on OAuth setup, redirect debugging, and account-linking edge cases that are irrelevant to the core auth flow. The codebase would accumulate dead config, untested provider code paths, and UI elements that distract from the primary credentials flow. YAGNI keeps the scope tight: only what the task demands, nothing more.

---

### Q4 — Kerckhoffs's Principle (Password Hashing)
> *Security must not rely on the secrecy of the algorithm.*

**Code reference:** `src/lib/password.ts:29-31`

**My Answer:**
A **salt** is a random value appended to a password before hashing, ensuring identical passwords produce different hashes. Bcrypt generates a unique 16-byte salt automatically per call and embeds it in the output hash string — you can see this in `src/lib/password.ts:30` where `bcrypt.hash(password, 12)` returns a hash like `$2a$12$...` where `$2a` is the algorithm, `12` is the cost factor, and the next 22 characters are the Base64-encoded salt. The salt is random per call, so even if two users have the same password, their hashes differ.

**SHA-256 would be catastrophic** because it's a general-purpose hash designed for speed — modern GPUs compute billions of SHA-256 hashes per second. SHA-256 also has no built-in salt mechanism; you'd have to manage salts manually (storing them separately, concatenating correctly), which is error-prone. Bcrypt is deliberately slow (the cost factor `12` means `2^12 = 4096` iterations), making each hash take ~250ms. An attacker with your database of SHA-256 hashes cracks passwords at billions-per-second; with bcrypt rounds 12, they get ~4 attempts per second.

**What goes wrong if ignored:**
Rainbow tables are precomputed hash chains for every possible password — if you hash with plain SHA-256 (no salt), an attacker simply looks up each hash in the table and reads the plaintext instantly. With salting but still using fast hashes (SHA-256 + salt), an attacker runs a dictionary attack at billions of guesses per second on consumer GPUs — every weak password in the database falls in minutes. Bcrypt's slowness and automatic salting make each guess expensive, turning a 5-minute break into years.

---

### Q5 — Security by Design (Forgot Password Email Enumeration)
> *Be conservative in what you send.*

**Code reference:** `src/app/api/auth/forgot-password/route.ts:40-44` and `:60-62`

**My Answer:**
The forgot-password endpoint returns the exact same message whether the email exists or not: `"If that email is registered, a reset link has been sent."` Compare lines 40-44 (user not found) and 60-62 (user found, email sent) — identical response. If I returned different responses (e.g. "Email sent" vs "Email not found"), an attacker could systematically probe the endpoint with a list of emails and learn which ones are registered. This is called **email enumeration** — discovering valid user accounts by observing differences in error messages, response timing, or status codes.

Email enumeration matters because it's the first step in targeted attacks. Once an attacker knows an email is registered, they can:
- Send targeted phishing emails pretending to be the service
- Attempt credential stuffing (injecting that email + common passwords against the login endpoint)
- Sell the confirmed email to spammers

**What goes wrong if ignored:**
An attacker brute-forces the forgot-password endpoint with a leaked email list from a data breach. Every "Email not found" response filters out unregistered addresses; every "Email sent" reveals a confirmed account. The attacker now has a clean hit-list of valid users for phishing campaigns ("Your SecureGate account has been compromised, click here to reset"), credential stuffing against the login endpoint, or social engineering attacks. The same endpoint that's meant to help users becomes a reconnaissance tool.

---

### Q6 — The Boy Scout Rule
> *Leave the code better than you found it.*

**Code reference:** `src/lib/password.ts:29-38` (extracted `hashPassword` and `comparePassword` helpers)

**My Answer:**
I extracted password hashing into a dedicated `src/lib/password.ts` module with `hashPassword()` and `comparePassword()` functions. Originally, bcrypt hashing (`bcrypt.hash(password, 12)`) was written inline wherever a password needed storing — directly in the signup route, and the comparison was repeated in both the login route and the NextAuth authorize callback. I pulled both into a single module, named them consistently, and added clear documentation explaining why bcrypt with 12 salt rounds is used and why SHA-256 would be dangerous. This was not part of the spec — it was a cleanup I chose to make.

**What goes wrong if ignored:**
Scattered inline bcrypt calls mean that changing the salt rounds (e.g. from 12 to 14 as hardware improves) requires hunting down every `bcrypt.hash()` call across multiple files — miss one and some passwords use weak rounds while others use strong ones. The inconsistency is invisible to tests but creates a security gap. Over time, every developer who touches auth adds their own slightly different bcrypt call pattern, and the codebase degrades into a patchwork of similar-but-not-identical hashing logic that nobody wants to refactor.

---

### Q7 — Gall's Law
> *A complex system that works evolved from a simple system that worked.*

**Code reference:** Phase progression: `prisma/schema.prisma` (Phase 1) → `src/lib/password.ts` (Phase 2) → `src/lib/auth.ts` (Phase 3) → `src/lib/mail.ts` + email templates (Phase 4) → `src/middleware.ts` (Phase 5)

**My Answer:**
SecureGate was built in distinct working phases, each one a complete (if minimal) system:

1. **Phase 1 — Database & Prisma**: Schema defined, migrations run, `prisma.user.create()` works from a route handler.
2. **Phase 2 — Signup with hashing**: `POST /api/auth/signup` accepts a form, hashes the password with bcrypt, writes to DB. Slow, no session, but it *works*.
3. **Phase 3 — Login & JWT session**: Added credentials provider, NextAuth handler, login route. Users could sign in and get a cookie. Working auth.
4. **Phase 4 — Email verification**: Added `VerificationToken` model, `sendVerificationEmail`, verify endpoint. Working verified auth.
5. **Phase 5 — Middleware & dashboard protection**: Added `middleware.ts` to gate `/dashboard/*`, server-side session check in the page. Full secure flow.

If I had tried to build email verification (Phase 4) before the Prisma schema was running (Phase 1), I'd be debugging database connection issues, Prisma client generation errors, and table relation problems all at once — with no way to isolate whether the bug was in the DB, the email renderer, or the token logic.

**What goes wrong if ignored:**
Building everything at once means the debugging surface area is the entire codebase. A 500 error could be a bad migration, a missing env var, a Prisma adapter mismatch, a broken email template, or a JWT misconfiguration. There's no stable foundation to test against — you're guessing which layer caused the failure. Cascading failures multiply: if the DB schema has a bug, all features that depend on it (signup, login, verification, reset) fail simultaneously with no clear root cause.

---

### Q8 — Law of Leaky Abstractions (ORM Specific)
> *Applied to Prisma and PostgreSQL specifically.*

**Code reference:** `prisma/schema.prisma:19-22` (relation fields on User that don't exist as columns)

**My Answer:**
In `prisma/schema.prisma:19-22`, the `User` model has four relation fields: `accounts Account[]`, `passwordResetTokens PasswordResetToken[]`, `sessions Session[]`, and `verificationTokens VerificationToken[]`. When you write `prisma.user.findUnique({ include: { accounts: true } })`, it looks like you're accessing a property of the `User` table. But in PostgreSQL, there is **no `accounts` column** on the `user` table — these are virtual relations. What actually happens is Prisma generates a JOIN query against the `Account` table using the foreign key `Account.userId → User.id`.

Another leak: the `VerificationToken` model (`:51-58`) has no `@id` field. It uses `@@unique([identifier, token])` as a composite identifier. In the Prisma schema, this looks like a model with no primary key — but at the PostgreSQL level, this creates a composite primary key on `(identifier, token)`. Prisma hides the distinction between a primary key and a unique constraint; they're both just `@@unique` in schema land.

**What goes wrong if ignored:**
If you assume Prisma schema === database structure, you might try to query `SELECT accounts FROM user` in raw SQL and be confused when the column doesn't exist. You might also assume `VerificationToken` has a single `id` column (as most models do) and write raw SQL queries that miss the composite key structure, causing silent duplicate inserts or failed lookups. The abstraction hides real database mechanics — foreign keys, JOINs, composite keys, index structures — and trusting it blindly leads to broken raw queries and incorrect performance assumptions.

---

### Q9 — Zawinski's Law & Single Responsibility
> *Every program attempts to expand until it can read mail.*

**Code reference:** `src/lib/rate-limit.ts` and `src/lib/auth.ts`

**My Answer:**
Rate limiting is not built into Next.js or NextAuth because it's not their job. Next.js is a framework for rendering UI — it should not care about sliding-window counters or Redis state. NextAuth is for session management — it should not concern itself with IP-based throttling. That's why rate limiting lives in its own file (`src/lib/rate-limit.ts`) backed by Upstash, a dedicated service. Each piece has a single responsibility: `auth.ts` handles sessions, `rate-limit.ts` handles throttling, `mail.ts` handles email, `password.ts` handles hashing.

Zawinski's Law warns that if you let auth also manage rate limits, and rate limits also manage email sending, and email sending also manage user lookups, you end up with a monolith where nothing can be changed without breaking everything. I kept SecureGate focused by strictly separating concerns — each file in `src/lib/` does exactly one thing and one thing only.

**What goes wrong if ignored:**
The middleware becomes a dumping ground: session checks, rate limiting, logging, redirect logic, feature flags, and analytics — all tangled in one file. Changing the rate limit window requires editing auth logic; changing auth breaks rate limiting. Tests become integration nightmares (you can't test throttling without setting up a full auth flow). No piece can be swapped independently — switching from Upstash to Redis directly means untangling rate limit calls from deep inside auth routes. The system ossifies because every change touches too many concerns at once.

---

### Q10 — Principle of Least Surprise (Error Messages)
> *Software should behave in the way users expect.*

**Code reference:** `src/app/(auth)/auth/page.tsx:273-277` (login error handling)

**My Answer:**
When credentials are wrong, the error message is: **`"Invalid email or password."`** (line 276). I chose this exact wording because:

- It's the **universal standard** — Google, GitHub, and virtually every auth system use this exact phrasing. Users expect it.
- It does **not** distinguish between "email not found" and "wrong password." Saying "Wrong password" confirms the email exists; saying "User not found" confirms it doesn't. Both leak information for email enumeration.
- A surprising error like "Authentication failure" or "Credentials rejected" would confuse users — they'd wonder what went wrong or if the system is broken. "Invalid email or password" immediately tells them: one of those two things is incorrect, check both and try again.

I also handle the EMAIL_NOT_VERIFIED case separately (line 273-274) with `"Please verify your email before logging in."` — this is necessary because a user who hasn't verified their email would be stuck guessing why they can't log in. It's the least surprising message for that specific, actionable state.

**What goes wrong if ignored:**
Two failures occur. **Security**: If the message says "User not found" for unregistered emails and "Wrong password" for registered ones, an attacker can scrape the login endpoint against a leaked email list to build a confirmed hit-list of active accounts for phishing or credential stuffing. **UX**: Vague or technical error messages like "Error code 401" or "Authentication failed" panic non-technical users — they don't know what to do next and may abandon the service or contact support for what should be a simple retry.

---

### Q11 — Murphy's Law + Defensive Programming (Session / Dashboard Protection)
> *Assume the worst-case user.*

**Code reference:** `src/middleware.ts` and `src/app/dashboard/page.tsx`

**My Answer:**
The exact code path:

1. **Middleware layer** (`src/middleware.ts:5-8`): Every request to `/dashboard/*` runs through `getToken()` which reads the `next-auth.session-token` cookie, decrypts the JWT using `NEXTAUTH_SECRET`, and returns the token payload. If no valid token exists, `getToken` returns `null` and the middleware immediately redirects to `/auth` (`src/middleware.ts:10-12`).

2. **If middleware passes**, the dashboard page runs `getServerSession(authOptions)` server-side (`src/app/dashboard/page.tsx:8`). If that returns `null` (defence in depth — e.g. if the token was valid but the session was revoked), it calls `redirect("/")`.

3. **If a user deletes their cookie in DevTools**: The next request hits the middleware, `getToken` finds no cookie, returns `null`, and the user is redirected to `/auth` before any page component renders. There is no client-only check — the redirect happens at the edge before React even loads.

**What goes wrong if ignored:**
If middleware were missing or only enforced client-side (e.g. checking `useSession` in a `useEffect`), a user who deletes their cookie would still see a flash of the dashboard (or worse, the full page) before the client redirect fires. An attacker could also disable JavaScript entirely and bypass client-only guards, gaining full access to the protected page content and any API calls it makes.

---

### Q12 — Kerckhoffs's Principle + Technical Debt (Leaked Secret)
> *Security debt has compounding interest.*

**Code reference:** `.gitignore:8-9` (env files excluded), `src/lib/auth.ts:68` (`secret: process.env.NEXTAUTH_SECRET`)

**My Answer:**
**What happens if NEXTAUTH_SECRET is committed to GitHub:**

1. The secret is used at `src/lib/auth.ts:68` and `src/middleware.ts:7` to sign and encrypt JWTs. Once public, an attacker can:
   - **Decrypt existing session tokens**: Read the `next-auth.session-token` cookie from any user, decrypt it with the known secret, and extract the JWT payload (user ID, email, expiry).
   - **Forge arbitrary JWTs**: Create a token with `{ sub: "any-user-id", email: "admin@example.com", emailVerified: true }`, sign it with the leaked secret, set it as a cookie, and gain full access to that user's dashboard — no password needed.
   - **Impersonate any user indefinitely**: The forged token respects the 30-day `maxAge` at `login/route.ts:66`, so once created, the attacker has access for up to 30 days.

2. **Rotating the secret**:
   - Generate a new secret: `openssl rand -base64 32`
   - Update `.env.local` with the new value
   - Redeploy (Vercel, Railway, etc.)
   - All existing JWTs signed with the old secret become invalid immediately — every user is logged out and must re-authenticate. This is brutal but necessary.

3. **Confirming the secret is purged from git history**:
   - `git log --all --oneline -- .env.local` (if that's the file that contained it)
   - `git log --all -S "NEXTAUTH_SECRET"` (search for the string in any commit)
   - If found, use `git filter-repo` or `git filter-branch` to rewrite history and remove the file/string from every commit
   - Force-push the cleaned history: `git push origin --force --all`
   - Notify any collaborators to rebase their local branches on the rewritten history
   - GitHub secret scanning may catch it — check `https://github.com/org/repo/settings/secrets/alert`

**What goes wrong if ignored:**
An attacker monitors public GitHub repos for leaked secrets. They find the commit, extract `NEXTAUTH_SECRET`, and forge a JWT for every user ID they can guess or find in your frontend source. They access the dashboard, and because JWTs don't touch the database on read (the middleware just decrypts the token), there's no login event, no failed attempt, no log entry — the attack is invisible. Users see nothing unusual. The damage (data access, account takeover, downstream attacks on connected services) continues silently until the secret is rotated and every session is invalidated. The debt compounds: the longer the secret stays exposed, the more tokens were forged, the more data was exfiltrated.

---

### Q13 — Conway's Law
> *Systems mirror the communication structure of the people who build them.*

**Code reference:** The `src/` folder structure

**My Answer:**
The folder structure reflects how I think about the system as a solo developer:

- **`src/app/api/auth/`** groups all auth API routes (login, signup, forgot-password, reset-password, verify-email, [...nextauth]) in one place. I think of auth as a single mental module — when I need to change anything about authentication, I know exactly which directory to open.
- **`src/lib/`** holds shared utilities (`auth.ts`, `db.ts`, `mail.ts`, `password.ts`, `rate-limit.ts`). Each file is named after its single responsibility. I don't think in terms of "backend vs frontend" (a team of 5 would split into separate API and UI folders with different owners) — I think in terms of "what does this thing do?"
- **`src/app/(auth)/`** for auth pages and **`src/components/`** for reusable React components — a clear separation between "pages" (routes) and "UI pieces" (components that could appear anywhere).
- **`emails/`** lives at the root, not in `src/`, because React Email templates have their own build pipeline (`react-email`). It's not a Next.js page or component — it's a separate concern, so it gets a separate top-level directory.
- **`middleware.ts`** is at `src/`, not inside `app/`, because it runs at the edge, outside the React component tree. Its physical placement mirrors its architectural boundary.

A team of five would structure this differently: one person owns API routes, another owns UI pages, a third owns the database schema, a fourth owns email, a fifth owns middleware. The folders would reflect those team boundaries (e.g. `api/`, `ui/`, `db/`, `email-service/`). As a solo dev, I organize by concept — everything auth is together because one person maintains all of it.

**What goes wrong if ignored:**
Without intentional structure, files end up wherever they were created: a password reset helper in `src/app/api/auth/reset/helpers/passwordStuff.ts`, a rate limiter duplicated across three route files, an email function in `src/lib/emails/helpers/send.ts`, the Prisma client re-instantiated in four different files. Future you can't find anything, duplicate logic proliferates (one route uses bcrypt directly, another imports from `password.ts`), and every new feature requires reading the entire codebase to figure out where it should go. The codebase becomes a maze that slows everyone down.

---

### Q14 — Technical Debt
> *Everything that slows you down later because of a shortcut taken now.*

**Code reference:** `src/app/api/auth/verify-email/route.ts:6,9,18-20,49-50`

**My Answer:**
The verify-email route has **leftover debug `console.log` statements** that were added during development and never removed. They log the request token, the database lookup result, the token expiry, the current time, and the error on failure. These were essential when building and testing the verification flow, but they serve no purpose in production.

This is technical debt because:
- **Log noise**: Every email verification pollutes log output with 5+ lines of diagnostic info. In production, this buries real errors (like database connection failures or 500s) in a sea of routine logs.
- **Information leak**: The logs print the raw verification token (`console.log('Token:', token)`). In production logging systems (Vercel, Datadog, CloudWatch), anyone with log access can see valid verification tokens.
- **Performance**: Each `console.log` is a synchronous I/O call. At scale (thousands of verifications per minute), this adds unnecessary latency.

**Current implementation (the debt):**
```typescript
export async function POST(req: Request) {
  try {
    console.log('=== VERIFY EMAIL ROUTE HIT ===');

    const { token } = await req.json();
    console.log('Token:', token);

    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }

    const verification = await prisma.verificationToken.findUnique({
      where: { token },
    });
    console.log('Token found:', verification ? 'YES' : 'NO');
    console.log('Token expires:', verification?.expires);
    console.log('Now:', new Date());
    // ... rest of route
  } catch (error) {
    console.error('=== VERIFY EMAIL ERROR ===')
    console.error(error)
    // ...
  }
}
```

**Refactored version:**
```typescript
export async function POST(req: Request) {
  try {
    const { token } = await req.json();

    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }

    const verification = await prisma.verificationToken.findUnique({
      where: { token },
    });

    if (!verification) {
      return NextResponse.json(
        { error: "invalid", message: "Invalid verification link." },
        { status: 400 }
      );
    }

    if (verification.expires < new Date()) {
      await prisma.verificationToken.delete({ where: { token } });
      return NextResponse.json(
        { error: "expired", message: "This verification link has expired." },
        { status: 400 }
      );
    }

    await prisma.user.update({
      where: { email: verification.identifier },
      data: { emailVerified: new Date() },
    });

    await prisma.verificationToken.delete({ where: { token } });

    return NextResponse.json(
      { message: "Email verified successfully. You can now log in." },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
```

**What goes wrong if ignored:**
As the app grows, every verification request adds 5 log lines to the production output. When debugging a real issue (e.g. a spike in 400 errors), you have to sift through thousands of "Token found: YES" and "Now: Wed May 20 2026" lines to find actual error events. The verification tokens printed to logs become a security exposure — any team member with log access can extract valid tokens and verify arbitrary email addresses. Removing `console.log` from a single file is trivial; removing it from 20 files after it's been copy-pasted into every new route is a painful cleanup that nobody prioritizes.

---

### Q15 — Synthesis: All Principles Applied to Payments
> *Which ones become more critical when money is involved?*

**Code reference:** [Reference the SecureGate features that become even more critical in a payment context]

**My Answer:**
[Walk through how you would add Flutterwave payment integration to SecureGate. For each engineering principle from this task, explain whether it still applies and whether it becomes more or less critical. Think about: idempotency on payment routes, what happens if a webhook fires twice, what rate limiting means for a checkout endpoint, what a leaked NEXTAUTH_SECRET means when it gates a paid dashboard, and what technical debt in auth means when money is on the line.]

**What goes wrong if ignored:**
[The specific financial, legal, and trust consequences of ignoring each principle in a payment context.]

---

## Part 4 — One Thing I Would Refactor

[Describe your identified technical debt in plain English. Explain why you left it. Then paste the refactored version with a brief explanation of why the new version is better.]
1. Use prisma.verificationToken.deleteMany() instead of delete(). deleteMany doesn't throw an error when zero rows match — it just quietly does nothing. So if the token is already gone, no crash.

2. Before doing anything, look up the token. If it exists and isn't expired, verify the user and delete it. If it doesn't exist, check if the user is already verified — if yes, return a success message saying "already verified." If the token is expired, return a clear "request a new link" message.
On the client side, add a useRef guard in the verify page so the API call only happens once per page mount, even with React Strict Mode running it twice.


## Part 5 — How This Changes How I Build
[Write honestly about what you now know about authentication, security, and engineering principles that you did not know before this task. What will you do differently in your next project? What surprised you most about building auth the right way?]
Going forward, I will not trust that an API call worked just because no error was thrown. I learned this the hard way when Resend was returning a 403 inside my try/catch, but my signup route was still returning 201 success. The email never sent and my user couldn't log in. Now I will always check the actual response status, not just whether the code ran without crashing.
I will also be more careful about endpoints being called more than once. Before this build I didn't know that React Strict Mode runs useEffect twice in dev, which caused my verify-email route to crash on the second call with a P2025 error. Even though the verification actually worked, the user saw a failure screen. Going forward, I will design every endpoint to be safe when called twice with the same input.
On external APIs, I learned to read the free tier limits before building on a service. I started with Resend because the brief recommended it, but their free tier blocks sending to anyone outside the account email. I had to migrate to Nodemailer with Gmail SMTP mid-build, which cost time. Next time, I will check what a service can and cannot do before writing any code against it. For production, I would also move away from personal Gmail as the SMTP sender and use a verified custom domain to avoid deliverability issues.