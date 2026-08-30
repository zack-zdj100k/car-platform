# Order notifications — switching delivery on

Every order already produces a notification addressed to you, with the
customer's name, email address and phone number in it. It is rendered, recorded
in the email log, and then — right now — thrown away, because no mail provider
is configured. `MAIL_PROVIDER` is `console`, which writes the message to the
server log instead of sending it.

Nothing needs building. Two settings and a password decide whether these
messages leave the machine.

## What the message contains

```
Subject: New order ORD-2026-SD6XRW — Wuling Bingo 2024

A new order has been submitted.

Reference: ORD-2026-SD6XRW
Vehicle:   Wuling Bingo 2024
Price:     DA 320,000
Colour:    Mint Green
Customer:  Amina Belkacem
Email:     amina@example.com
Phone:     +213555112233
Submitted: 2026-08-28T00:24:29.000Z

Manage it here: http://localhost:3100/admin/orders
```

The customer separately receives a short confirmation of their own.

## Where it is sent

Administration › Settings › orders › `orders.notificationEmail`. It is already
set to **zacktrader100000@gmail.com**. Change it there whenever you like — no
deploy, no restart.

If that setting is empty the `MAIL_ADMIN_EMAIL` variable is used instead.

## Turning delivery on with Gmail

Google does not accept your ordinary password from an application. You need an
**app password**, which is a 16-character code generated for this site alone and
revocable without touching your account password.

1. Your Google account needs 2-Step Verification switched on — app passwords do
   not exist without it: <https://myaccount.google.com/security>
2. Create the app password: <https://myaccount.google.com/apppasswords>
   Name it `Car Platform`. Google shows 16 characters in four groups; the spaces
   are for reading only, and can be typed or dropped.
3. Put it in `car-platform/.env`:

   ```dotenv
   MAIL_PROVIDER="smtp"
   MAIL_HOST="smtp.gmail.com"
   MAIL_PORT=587
   MAIL_SECURE="false"
   MAIL_USER="zacktrader100000@gmail.com"
   MAIL_PASSWORD="the 16-character app password"
   MAIL_FROM="Car Platform <zacktrader100000@gmail.com>"
   ```

   Port 587 with `MAIL_SECURE="false"` is correct for Gmail: the connection
   starts in the clear and upgrades to TLS immediately (STARTTLS). Port 465 with
   `MAIL_SECURE="true"` also works. `MAIL_FROM` has to be the same address as
   `MAIL_USER`, or Gmail rejects the message.

4. Restart the API:

   ```bash
   cd "car-platform/backend" && npm run build && node dist/main.js
   ```

   It logs `SMTP transport configured for smtp.gmail.com:587` on the way up.

The `.env` file is not committed, and the app password never reaches the
browser. Treat it as a password: anyone holding it can send mail as you. It can
be revoked from the same Google page at any time.

## Checking it worked

Administration › Settings shows the state at the top of the page:

- **"Order notifications are being written to the log but not sent"** — delivery
  is off, and the message names the recipient they *would* go to.
- **"Order notifications are being sent to … over smtp"** — delivery is on.

Place a test order and watch for the email. Every attempt is recorded in the
`email_logs` table with an honest status:

- `SENT` — handed to the mail server.
- `LOGGED` — rendered and recorded, nothing sent, because no provider is
  configured.
- `FAILED` — the provider refused it; the reason is stored alongside.

A failed or undeliverable notification never blocks an order. The customer's
request is saved first and the mail is attempted afterwards, so an outage at
Google cannot cost you a sale.

## The customer does not wait for the email

Sending happens in the background. The order is saved, the customer is told so
immediately, and the two messages are handed to Gmail after the answer has
already gone out.

This was measured, because it used to matter: an order took **3,386 ms** while
the response waited for the mail server. The same order now returns in **25 ms**,
and the emails arrive a second or two later. A slow — or completely unreachable
— mail server costs the customer nothing.

Nothing is dropped on the way out, either. Stopping the server waits for any
message still in flight before it exits, and every attempt is in `email_logs`
whatever happens.

## Another provider

Any SMTP service works — the settings are the same four lines. For a domain of
your own, a transactional service (Resend, Postmark, Brevo, Mailgun) is more
reliable than Gmail for automated mail and will not rate-limit you the way a
personal mailbox does.
