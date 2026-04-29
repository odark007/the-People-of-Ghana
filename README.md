# People of Ghana — Phase 1 Setup

## Stack
- **Frontend**: Next.js 14 (App Router) + Tailwind CSS
- **Backend**: Next.js Route Handlers (serverless)
- **Database**: Supabase (PostgreSQL + Row Level Security)
- **Auth**: Supabase Auth — phone OTP (SMS via Twilio, configured in Supabase dashboard)
- **Hosting**: Netlify (frontend + serverless functions)
- **Images**: Supabase Storage (with server-side EXIF stripping via Sharp)

---

## Phase 1 Checklist

### 1. Supabase Setup
1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Go to **Authentication → Providers → Phone** — enable it
3. Add your Twilio credentials (Account SID, Auth Token, Phone Number) in the Supabase phone provider settings
4. Set OTP expiry to 600 seconds and max resend rate to 5/hour
5. Run the migration:
   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   supabase db push
   ```
6. Seed governance data:
   ```bash
   psql $DATABASE_URL < supabase/seed/001_governance.sql
   ```
7. Generate TypeScript types:
   ```bash
   npm run db:generate-types
   ```

### 2. Netlify Setup
1. Connect your GitHub repo to Netlify
2. Go to **Site → Environment variables** and add all variables from `.env.example`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_JWT_SECRET`
   - `JWT_SECRET` (generate: `openssl rand -base64 32`)
   - `NEXT_PUBLIC_APP_URL`
3. Install the Netlify Next.js plugin:
   ```bash
   npm install -D @netlify/plugin-nextjs
   ```

### 3. Local Development
```bash
# Clone and install
npm install

# Copy env template
cp .env.example .env.local
# Fill in your Supabase values

# Run dev server
npm run dev
```

---

## Anonymization Architecture

| Level | Display | GPS Precision | Who sees it |
|-------|---------|---------------|-------------|
| L1 — Full Anonymous | "Anonymous Citizen" | ~100m (3dp) | Everyone |
| L2 — Pseudonym | "RedEagle_42" | ~100m (3dp) | Everyone |
| L3 — Display Name | "Kwame Asante" | ~100m (3dp) | Everyone |

**What is NEVER stored:**
- Plain phone numbers (Supabase Auth owns this in `auth.users`)
- Exact GPS coordinates (rounded before DB insert)
- Image EXIF data (stripped server-side via Sharp before Supabase Storage upload)

**Key principle:** Phone numbers live exclusively in `auth.users` (Supabase-managed, service-role only). Our `public.users` table never contains phone data. The link between the two tables is the shared UUID primary key.

---

## Auth Flow

```
1. User enters Ghana phone number
2. POST /api/auth/send-otp
   → supabase.auth.signInWithOtp({ phone })
   → Supabase sends SMS (via Twilio configured in dashboard)

3. User enters 6-digit OTP
4. POST /api/auth/verify-otp
   → supabase.auth.verifyOtp({ phone, token, type: 'sms' })
   → Supabase sets session cookies (access_token + refresh_token)
   → Our syncUserProfile() creates public.users row if new

5. If needs_consent: true → redirect /consent
6. POST /api/auth/consent
   → Saves anonymity_level choice
   → Unlocks full platform access
```

---

## Project Structure

```
src/
├── app/
│   ├── (auth)/          # Login, consent — no nav chrome
│   │   ├── login/
│   │   └── consent/
│   ├── (app)/           # Authenticated app — with TopBar + BottomNav
│   │   ├── dashboard/
│   │   ├── directory/   # Phase 2
│   │   ├── reports/     # Phase 2
│   │   ├── feed/        # Phase 3
│   │   └── profile/
│   └── api/
│       ├── auth/        # send-otp, verify-otp, consent, callback, signout
│       ├── governance/  # regions, constituencies, districts, electoral-areas
│       ├── officials/   # Phase 2
│       └── reports/     # Phase 2
├── components/
│   ├── ui/              # Shared: Button, Input, Badge, Skeleton…
│   ├── layout/          # TopBar, BottomNav
│   ├── auth/            # LoginForm
│   └── anonymization/   # ConsentForm, AnonymityBadge
├── lib/
│   ├── supabase/        # Browser, server, admin clients
│   ├── auth/            # Session helpers, syncUserProfile
│   ├── anonymization/   # GPS rounding, pseudonym gen, EXIF strip
│   └── validation/      # Zod schemas
├── hooks/
│   └── useAuth.ts
├── types/
│   └── index.ts         # All domain types
└── middleware.ts         # Auth guard, consent gate, role check
```

---

## Phase 2 Preview (Weeks 4–6)
- Governance directory with full hierarchy browser
- Official profile pages
- Report submission with GPS + photo upload (EXIF stripped)
- Admin moderation panel
