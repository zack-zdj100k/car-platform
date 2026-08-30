# Google sign-in — turning it on

Everything on our side is built and tested. The button says *"Google sign-in is
not configured yet"* for one reason only: Google has not issued credentials for
this application yet, and only the owner of the Google account can ask for them.

Verified with throwaway credentials in place: `GET /api/auth/providers` reports
`{"google":true}`, and `GET /api/auth/google` returns a `302` to
`accounts.google.com` carrying the right `client_id`, `redirect_uri` and scopes.
Nothing else needs writing — the two values below are the whole job.

## 1. Create the credentials (about five minutes, once)

1. Open <https://console.cloud.google.com/> and sign in with the Google account
   that should own this.
2. Create a project — name it anything, `car-platform` is fine.
3. In the sidebar: **APIs & Services → OAuth consent screen**.
   - User type: **External**.
   - App name: `Car Platform`. Support email: your address.
   - Scopes: leave the defaults. `email` and `profile` are all we ask for.
   - While the app is in **Testing**, only accounts you list under *Test users*
     can sign in. Add your own address there, or press **Publish app** when you
     want it open to everyone.
4. In the sidebar: **APIs & Services → Credentials → Create credentials → OAuth
   client ID**.
   - Application type: **Web application**.
   - **Authorised redirect URIs** — this must match exactly, character for
     character, or Google refuses with `redirect_uri_mismatch`:

     ```
     http://localhost:4000/api/auth/google/callback
     ```

   - Authorised JavaScript origins are not needed; we never call Google from the
     browser.
5. Google shows a **Client ID** and a **Client secret**. Keep the page open.

## 2. Paste them in

In `car-platform/.env`:

```dotenv
GOOGLE_CLIENT_ID="…paste the client ID…"
GOOGLE_CLIENT_SECRET="…paste the client secret…"
GOOGLE_CALLBACK_URL="http://localhost:4000/api/auth/google/callback"
```

The callback line is already correct — leave it alone. The secret belongs in
`.env` and nowhere else: `.env` is not committed, and the value must never reach
the browser or a `NEXT_PUBLIC_*` variable.

Restart the API so it reads them:

```bash
cd "car-platform/backend" && npm run build && node dist/main.js
```

## 3. Check the port you browse on

After Google sends the visitor back, the API redirects them to
`NEXT_PUBLIC_SITE_URL`. It is currently:

```dotenv
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
```

If you browse the production preview on **:3100**, change it to
`http://localhost:3100`, or you will be bounced to the dev server after signing
in. Google itself does not care about this value — only the callback URI in
step 1 has to match.

## 4. What should happen

- The sign-in page stops showing the notice and the **Continue with Google**
  button becomes active.
- Clicking it goes to Google's account chooser, then straight back to
  `/dashboard` — or `/admin/dashboard` if the account is an administrator.
- A first-time address creates a customer account with no password, verified,
  and the Google photograph as the avatar.
- An address that already has a password account is **linked** to that account
  rather than duplicated, because Google has verified the same address.
- If Google abandons the flow, the visitor comes back to `/login?error=google`
  and is told the sign-in did not complete.

## In production

Add the live callback to the same OAuth client and update the variable:

```
https://your-domain/api/auth/google/callback
```

Google requires HTTPS for anything that is not `localhost`. Keep both URIs
listed so local development keeps working.
