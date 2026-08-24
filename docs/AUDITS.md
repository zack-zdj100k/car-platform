# Audits

Phases 10, 11 and 12 of the development protocol. Every result below was
produced by running probes against the running application, not by inspection.

---

## Phase 10 — Security audit ✅

**42 automated probes against the live API, all passing.** The script exercises
real HTTP: headers, CORS, session handling, authorization, injection attempts,
error leakage, rate limiting and account enumeration.

| Area | Verified |
| ---- | -------- |
| Secure headers | API and frontend both send `x-content-type-options`, `x-frame-options`, `referrer-policy`, `permissions-policy`; HSTS on the API; `x-powered-by` removed from both |
| CORS | The configured origin is allowed with credentials; an unlisted origin is **not** echoed back |
| Session | Refresh token is `HttpOnly` and `SameSite`-constrained; the access token never enters a cookie; no password field in any response |
| Tokens | Access token is a signed, expiring JWT; a token with a tampered payload is rejected |
| Authorization | Five admin routes each refuse anonymous (401) and customer (403) callers |
| Input validation | Unknown properties rejected outright; SQL injection attempt handled safely with the catalogue intact; script payloads handled; oversized pagination rejected |
| Error handling | Structured bodies with no stack traces, no Prisma internals, no SQL |
| Rate limiting | Repeated failed logins are throttled — confirmed against the running server, not mocked |
| Enumeration | `forgot-password` responds identically for known and unknown addresses |

**Secrets**

- `.env` is untracked, and the real database password and JWT secrets appear in
  no tracked file (verified by searching the actual values across the repository)
- No secret-looking literals in application source
- Only `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_SITE_URL` are exposed to the
  browser; neither is sensitive

**Dependencies: 0 vulnerabilities**

The Prisma CLI pulled in `deepmerge-ts@7`, which carries a high-severity
stack-exhaustion advisory fixed in 8.x. Rather than leaving it documented, the
package is pinned forward with an npm `override`, and the CLI was re-verified
afterwards: `validate`, `generate`, `migrate status` and `db:seed` all work, and
all 145 backend tests still pass.

An earlier finding — six high-severity `nodemailer` advisories including SMTP
command injection — was fixed during Phase 2 by upgrading to 9.0.5.

**Configuration issue found and fixed**

`NODE_ENV` was set in `.env`. Sourcing that file and then running a production
build made Next resolve a development React runtime, and the build failed while
prerendering with a null `useContext`. `NODE_ENV` now comes from the runtime,
which is where it belongs, and the reason is documented in the env files.

---

## Phase 11 — Accessibility audit ✅

**18 automated checks, all passing**, using axe-core against the production
build with `wcag2a`, `wcag2aa`, `wcag21a` and `wcag21aa` rules.

| Check | Result |
| ----- | ------ |
| Home, cars listing, car detail, about, sign in, sign up | 0 violations each |
| Dark mode | 0 contrast violations |
| Arabic right-to-left layout | 0 violations |
| Skip link | First tab stop on every page |
| Car card | Reachable and openable by keyboard alone |
| Sign-in form | Completable without a mouse |
| Focus indicator | Visible on keyboard focus |
| Reduced motion | No video rendered; hero content fully visible |
| Responsive | No horizontal overflow at 375, 768 or 1440 px |
| Mobile navigation | Menu button replaces the desktop navigation |

**Violations found and fixed**

1. **Contrast below 4.5:1.** `--muted-foreground` at lightness 0.5 failed
   against white cards — affecting the brand label, trim, specification line and
   marketing copy on every car card. Darkened to 0.44.
2. **Invalid definition lists.** The statistics on the home and about pages
   nested `dt`/`dd` two `div` levels below `<dl>`; only one is permitted. The
   reveal wrapper now *is* that div.
3. **Invalid lists.** The about page's mission and values lists placed a `div`
   between `<ul>`/`<ol>` and their `<li>` elements, which is not allowed at all.
   The wrapper moved inside the `li`.
4. **Reduced motion left content invisible.** The entrance animation was only
   shortened to 0.01 ms, which still leaves a frame at `opacity: 0`. It is now
   removed outright under `prefers-reduced-motion`.

**Test-harness problems corrected along the way** — worth recording, because
each initially looked like an application defect:

- `waitForLoadState('networkidle')` never settles on the sign-in page, so the
  audit timed out rather than finding anything. The suite now waits for the
  `load` event, for fonts, and for a selector proving the content arrived.
- Two assertions were simply wrong: the tab order test ignored the
  "Forgot password?" link that sits between the fields, and the focus test used
  `element.focus()`, which deliberately does not match `:focus-visible`.

---

## Phase 12 — Performance audit

See [PERFORMANCE.md](PERFORMANCE.md).
