# PDF Auto Print — Starter Project

This is a starter scaffold for a Bangladesh PDF upload → bKash payment → Windows USB printer workflow.

## Architecture
- Next.js app hosted on Vercel
- Supabase Postgres + private Storage bucket for PDFs
- bKash Tokenized Checkout API (classic v1.2.0-beta endpoint layout is configurable)
- Windows Print Agent polls the backend and prints paid jobs

**Not production-ready until you configure credentials, run sandbox tests, and add operational/security checks. Never expose bKash secrets in browser code.**

## Setup
1. Create a Supabase project.
2. In Supabase SQL Editor, run `supabase/schema.sql`.
3. Create a **private** Storage bucket named `pdf-orders`.
4. Copy `.env.example` to `.env.local` and fill in values.
5. Install Node.js 20+.
6. Run:
   ```bash
   npm install
   npm run dev
   ```
7. Deploy the project to Vercel and add the same environment variables there.
8. Use bKash sandbox first. Confirm your merchant account's API version/base URL and exact callback requirements with the official bKash developer portal.

## Important configuration
- `BKASH_BASE_URL`: sandbox or production base URL approved for your merchant account.
- `BKASH_USERNAME`, `BKASH_PASSWORD`, `BKASH_APP_KEY`, `BKASH_APP_SECRET`: server-only secrets.
- `SITE_URL`: public HTTPS URL of this site.
- `SUPABASE_SERVICE_ROLE_KEY`: server-only; never use in client code.
- `PRINT_AGENT_TOKEN`: long random secret shared with the Windows agent. Use a different token per agent in production.
- `PRICE_BW_PER_PAGE`, `PRICE_COLOR_PER_PAGE`: BDT price per printed page.

## First version limitations
- The sample uses the classic tokenized checkout v1.2.0-beta endpoint pattern. If your bKash account is on API v2, the authentication and request/response schemas may differ; adapt the bKash adapter only after checking your merchant docs.
- Page count is computed server-side using `pdf-lib`. Complex/invalid/encrypted PDFs may be rejected.
- Print agent uses Windows PowerShell + SumatraPDF command-line printing. Install SumatraPDF on the shop PC and set `SUMATRA_PDF`.
- Agent prints one job at a time and marks it completed after the print command returns. Physical printer errors/paper jams still need monitoring.
- This scaffold does not include an admin dashboard, refunds, invoices, OTP/customer accounts, or automatic deletion policy. Add these before public launch.

## Security checklist before launch
- Keep PDF bucket private and use short-lived signed URLs.
- Confirm payment server-side with Execute Payment and Query Payment; never trust browser return parameters alone.
- Validate amount, currency, paymentID, invoice number and successful status against the saved order.
- Add rate limits, upload size limits, CAPTCHA/abuse controls, retention/deletion policy, and admin authentication.
- Use idempotency/atomic DB updates so a payment or print job cannot be processed twice.
- Do not log credentials, tokens, PDF contents, or customer payment PIN/OTP.
