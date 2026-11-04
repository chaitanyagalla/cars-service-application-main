# Admin email/password authentication

The only login is `/admin/login`. The business assigns each administrator an email and password. There is no public registration endpoint, Google sign-in, customer account page or customer rating submission endpoint. Public visitors can browse and submit booking enquiries without signing in.

## Create the credentials you choose

For the first admin, run:

```bash
npm run admin:create
```

Enter your chosen email, name and password in your terminal. The password and confirmation are hidden. Use at least 12 characters and no more than 72 UTF-8 bytes, because bcrypt truncates input beyond 72 bytes. This command creates an `ADMIN` account with a bcrypt hash; the plaintext password is never stored.

If an active admin already exists, sign in with that account and use **Admin > Staff Users** to assign additional admins their credentials or reset a password. Password resets sign that account out on every device. Existing email/password accounts continue working; users must sign in again because the old opaque cookies are not JWTs.

Only the `ADMIN` role exists. Every active admin can manage cars, locations, FAQs, testimonials, enquiries, settings, staff accounts, uploads and the audit trail. An admin cannot delete or disable their own account through the staff management API.

## Environment

Keep the existing database variables and set:

```dotenv
ADMIN_JWT_SECRET="64-random-hexadecimal-characters"
RATE_LIMIT_SECRET="a-separate-random-secret-at-least-32-characters"
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
```

A random `ADMIN_JWT_SECRET` was added to the existing local `.env` without printing it. To generate a separate production key, run:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Put that value in your hosting platform's secret configuration. Use `https://YOUR-DOMAIN` for `NEXT_PUBLIC_SITE_URL` in production. The configured origin is also used for CSRF validation behind a proxy, so it must exactly match the public website origin. Restart the app after environment changes. Never commit secrets or put the JWT key in a `NEXT_PUBLIC_` variable. Rotating the signing key invalidates every existing admin JWT.

## How login works

1. `AdminLogin` submits `{ email, password }` to `POST /api/auth/login`. The browser does not choose a role.
2. The route checks the request origin, accepts JSON only, limits the actual request bytes and throttles attempts by IP fingerprint and email fingerprint. It trims/lowercases the email and validates the input.
3. Prisma looks up `AdminUser`. `verifyPassword()` uses bcrypt to compare the supplied password to `passwordHash`. Missing users get an equivalent bcrypt check and the same error as an incorrect password. Inactive accounts and accounts without role `ADMIN` are rejected.
4. `createAdminToken()` signs a JWT using HS256 and the private signing key. It contains `sub` (admin ID), `role`, a random `jti`, issuer, audience, issue time and a one-hour expiry. It contains no password or email.
5. In a database transaction, login locks and rechecks the account, creates a `Session` containing only the token's SHA-256 hash and expiry, and records a login audit entry. The lock prevents a concurrent password reset or deactivation from leaving behind a valid new session.
6. The server sends the JWT only in an HttpOnly, SameSite=Strict cookie. It is Secure in production and uses the `__Host-universal_admin_session` name, with path `/` and no Domain attribute. Local development uses `universal_admin_session`. The JSON response contains only `{ ok: true }`.

The JWT is not stored in browser localStorage. Client JavaScript cannot read the HttpOnly cookie; the browser sends it with admin requests.

## How access control works

`currentAdmin()` first verifies the JWT's signature, pinned HS256 algorithm, token type, issuer, audience, required claims, role and expiry. It then reads the matching database session and current account.

Access is granted only when the JWT subject matches the session's user ID, the session is unexpired, the account is active, and its current database role is also `ADMIN`. Changing a token's payload or submitting a role in a request cannot grant access.

`requireAdmin()` uses this check to protect server-rendered admin pages. All admin API families call `currentAdmin()` before accessing private resources, including CRUD, staff users, audit data, image uploads and CSV export. Hiding navigation links is not the permission check.

The database session is intentional: signed JWTs alone cannot provide immediate logout revocation. `POST /api/auth/logout` deletes the session and expires the cookie. A password reset, email change or account deactivation revokes that account's sessions. Password updates and revocation happen in one transaction and use the same account lock as login.

## Files changed

| File                                                            | Purpose                                                                                                                |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `src/lib/admin-jwt.ts` (new)                                    | Creates/verifies one-hour JWTs with strict claims and algorithm checks.                                                |
| `src/lib/passwords.ts` (new)                                    | Central bcrypt hashing/comparison and password length rules.                                                           |
| `src/lib/security.ts`                                           | Enforces JWT + database + ADMIN checks; defines cookie, CSRF, rate-limit and bounded JSON helpers.                     |
| `src/app/api/auth/login/route.ts`                               | Validates owner-assigned credentials, creates a session/JWT cookie and records login.                                  |
| `src/app/api/auth/logout/route.ts`                              | Revokes the session and clears the cookie.                                                                             |
| `src/app/api/admin/[resource]/route.ts`                         | Hashes passwords when admins create staff accounts; bounds JSON input.                                                 |
| `src/app/api/admin/[resource]/[id]/route.ts`                    | Hashes resets and atomically revokes sessions after credential/account changes.                                        |
| `src/lib/validation.ts`                                         | Validates admin-only roles and bcrypt-compatible password lengths.                                                     |
| `scripts/create-admin.ts`                                       | Creates the first admin using the email/password you choose.                                                           |
| `scripts/terminal-password.ts` (new)                            | Reads a password privately from an interactive terminal.                                                               |
| `src/components/admin-login.tsx`                                | Prevents repeated submit requests and explains assigned credentials.                                                   |
| `src/components/logout-button.tsx`                              | Handles sign-out errors and only leaves the page after successful revocation.                                          |
| `next.config.ts`                                                | Security headers, private/no-store responses, HTTPS HSTS.                                                              |
| `.env`, `.env.example`                                          | JWT signing configuration; Google OAuth variables removed.                                                             |
| `src/components/customer-layout.tsx`, `site-shell.tsx`          | Removes customer session reads and login/account links.                                                                |
| `src/components/booking-form.tsx`, car detail page, booking API | Restores public enquiry submission without account ownership.                                                          |
| `tests/admin-jwt.test.ts`, `tests/admin-auth.test.ts`           | Tests real JWT cryptography, password hashes, RBAC, revocation, throttling, CSRF, cookie settings and guest enquiries. |

## Removed code

- `src/app/login/page.tsx` and `src/app/account/bookings/page.tsx`.
- Google OAuth start/callback and customer logout routes under `src/app/api/customer/auth/`.
- `src/app/api/customer/ratings/route.ts` and the customer rating form.
- Customer logout UI and `customer-auth.ts`, `google-auth.ts`, `customer-policy.ts`.
- The `google-auth-library` dependency, Google credentials in environment files, account/rating CSS and outdated customer auth tests.

Existing customer, booking and rating records were preserved. Historical Prisma models and applied migrations remain for database compatibility; no destructive schema rollback is required. Old customer cookies have no endpoint that accepts them. Previously submitted rating averages can still be displayed as read-only history; new customer ratings cannot be submitted. Admin-managed testimonials remain available.

## Additional protections

- bcrypt cost 12, hidden terminal password input and no plaintext credentials in database records.
- One-hour JWT lifetime, strong private key, signature/claim validation and immediate session revocation.
- Same-origin checks and cross-site browser request rejection on writes; SameSite=Strict admin cookies.
- IP/account login throttles backed by atomic PostgreSQL operations across server instances. Production proxies must overwrite client IP headers with trusted values.
- Byte limits on streamed JSON, server-side Zod validation and allowlisted resource operations.
- Generic login errors and sanitized authentication failure logs.
- Anti-framing, no-sniff and referrer headers; HSTS when configured for production HTTPS; private/no-store admin responses.

These controls follow the [OWASP session guidance](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet) and use [jose's signature and claims verification](https://github.com/panva/jose/tree/main/docs).

## Verification

```bash
npm test
npm run typecheck
npm run build
```

Tests use real JWT signatures and bcrypt hashes with mocked database access; migration tests use an isolated in-memory PostgreSQL engine. They do not create accounts or bookings in Neon. Manual check: open `/admin/login`, sign in with your assigned credentials, manage an admin feature, sign out and confirm private routes require login again. Public car enquiry forms should remain usable without an account.

The dependency audit reports three linked high-severity findings in the existing Prisma CLI/config dependency chain (`deepmerge-ts`, `@prisma/config`, `prisma`). npm proposes a Prisma 7 major upgrade. That separate ORM migration has not been forced into this authentication change. The JWT library itself has no reported finding in this audit.
