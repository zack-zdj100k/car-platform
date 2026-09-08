export interface OrderNotificationData {
  reference: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  message?: string | null;
  carName: string;
  carPrice: string;
  selectedColor: string | null;
  adminUrl: string;
  submittedAt: Date;
}

/** Escapes user-supplied values before they enter an HTML email body. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function renderAdminOrderNotification(data: OrderNotificationData): {
  subject: string;
  text: string;
  html: string;
} {
  const cleanPhone = data.buyerPhone.replace(/[^0-9]/g, '');
  const rows: [string, string][] = [
    ['Référence', data.reference],
    ['Véhicule', data.carName],
    ['Prix', data.carPrice],
    ['Couleur', data.selectedColor ?? 'Non spécifiée'],
    ['Client', data.buyerName],
    ['Téléphone / Mobile', data.buyerPhone],
    ['Email', data.buyerEmail],
    ...(data.message ? [['Message du client', data.message] as [string, string]] : []),
    ['Date', data.submittedAt.toLocaleString('fr-FR', { timeZone: 'Africa/Algiers' })],
  ];

  const subject = `Nouvelle demande ${data.reference} — ${data.carName} — Tél: ${data.buyerPhone}`;

  const text = [
    'NOUVELLE DEMANDE DE RENDEZ-VOUS / COMMANDE',
    '========================================',
    `Téléphone client: ${data.buyerPhone}`,
    `Nom du client: ${data.buyerName}`,
    `Véhicule: ${data.carName}`,
    `Référence: ${data.reference}`,
    '',
    ...rows.map(([label, value]) => `${label}: ${value}`),
    '',
    `Gérer dans l'administration: ${data.adminUrl}`,
  ].join('\n');

  const html = `<!doctype html>
<html lang="fr">
  <body style="margin:0;padding:24px;background:#f4f5f7;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#15171a">
    <table role="presentation" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;padding:28px;box-shadow:0 2px 8px rgba(0,0,0,0.06)">
      <tr><td>
        <div style="border-bottom:2px solid #6366f1;padding-bottom:16px;margin-bottom:20px">
          <span style="font-size:12px;font-weight:700;color:#6366f1;text-transform:uppercase;letter-spacing:1px">ZODIC CAR — Notification</span>
          <h1 style="margin:6px 0 2px;font-size:22px;color:#111827">Nouvelle demande de rendez-vous</h1>
          <p style="margin:0;color:#6b7280;font-size:14px">Référence : <strong>${escapeHtml(data.reference)}</strong></p>
        </div>

        <!-- PROMINENT MOBILE NUMBER BOX -->
        <div style="background:#f0fdf4;border:2px solid #86efac;border-radius:10px;padding:18px;margin:20px 0;text-align:center">
          <span style="font-size:12px;font-weight:700;color:#15803d;text-transform:uppercase;letter-spacing:1px;display:block">
            NUMÉRO DE TÉLÉPHONE DU CLIENT
          </span>
          <a href="tel:${escapeHtml(data.buyerPhone)}" style="font-size:26px;font-weight:800;color:#166534;text-decoration:none;display:inline-block;margin:6px 0">
            📞 ${escapeHtml(data.buyerPhone)}
          </a>
          <div style="margin-top:10px;display:flex;justify-content:center;gap:10px">
            <a href="tel:${escapeHtml(data.buyerPhone)}" style="display:inline-block;background:#16a34a;color:#ffffff;text-decoration:none;padding:8px 18px;border-radius:6px;font-size:13px;font-weight:600;margin:0 4px">
              Appeler directement
            </a>
            ${
              cleanPhone
                ? `<a href="https://wa.me/${cleanPhone}" style="display:inline-block;background:#25D366;color:#ffffff;text-decoration:none;padding:8px 18px;border-radius:6px;font-size:13px;font-weight:600;margin:0 4px">
              Ouvrir WhatsApp
            </a>`
                : ''
            }
          </div>
        </div>

        <!-- ORDER DETAILS TABLE -->
        <table role="presentation" style="width:100%;border-collapse:collapse;font-size:14px;margin-top:16px">
          ${rows
            .map(
              ([label, value]) => `<tr>
            <td style="padding:10px 0;color:#6b7280;width:150px;border-bottom:1px solid #f3f4f6">${escapeHtml(label)}</td>
            <td style="padding:10px 0;font-weight:600;color:#111827;border-bottom:1px solid #f3f4f6">${escapeHtml(value)}</td>
          </tr>`,
            )
            .join('')}
        </table>

        <!-- ADMIN LINK -->
        <div style="margin:28px 0 0;text-align:center">
          <a href="${escapeHtml(data.adminUrl)}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600">
            Voir la commande dans l'administration &rarr;
          </a>
        </div>
      </td></tr>
    </table>
  </body>
</html>`;

  return { subject, text, html };
}

export function renderCustomerOrderConfirmation(data: OrderNotificationData): {
  subject: string;
  text: string;
  html: string;
} {
  const subject = `We received your request — ${data.reference}`;

  const text = [
    `Hello ${data.buyerName},`,
    '',
    `Thank you for your interest in the ${data.carName}.`,
    `Your request has been received under reference ${data.reference}, and a member of our team will contact you shortly.`,
    '',
    data.selectedColor ? `Selected colour: ${data.selectedColor}` : '',
    '',
    'This is a request for information, not a purchase or payment.',
  ]
    .filter(Boolean)
    .join('\n');

  const html = `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:24px;background:#f4f5f7;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#15171a">
    <table role="presentation" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;padding:28px">
      <tr><td>
        <h1 style="margin:0 0 12px;font-size:20px">Thank you, ${escapeHtml(data.buyerName)}</h1>
        <p style="margin:0 0 12px;font-size:15px;line-height:1.6">
          We have received your request for the <strong>${escapeHtml(data.carName)}</strong>.
        </p>
        <p style="margin:0 0 12px;font-size:15px;line-height:1.6">
          Your reference is <strong>${escapeHtml(data.reference)}</strong>. A member of our team will be in touch shortly.
        </p>
        ${data.selectedColor ? `<p style="margin:0 0 12px;font-size:15px">Selected colour: <strong>${escapeHtml(data.selectedColor)}</strong></p>` : ''}
        <p style="margin:20px 0 0;font-size:13px;color:#5c6166">
          This is a request for information — no purchase or payment has been made.
        </p>
      </td></tr>
    </table>
  </body>
</html>`;

  return { subject, text, html };
}

export function renderPasswordReset(data: { fullName: string; resetUrl: string }): {
  subject: string;
  text: string;
  html: string;
} {
  const subject = 'Reset your password';

  const text = [
    `Hello ${data.fullName},`,
    '',
    'Use the link below to set a new password. It expires in one hour and can be used once.',
    '',
    data.resetUrl,
    '',
    'If you did not request this, you can safely ignore this email.',
  ].join('\n');

  const html = `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:24px;background:#f4f5f7;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#15171a">
    <table role="presentation" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;padding:28px">
      <tr><td>
        <h1 style="margin:0 0 12px;font-size:20px">Reset your password</h1>
        <p style="margin:0 0 16px;font-size:15px;line-height:1.6">Hello ${escapeHtml(data.fullName)}, use the button below to set a new password. The link expires in one hour and can be used once.</p>
        <p style="margin:0 0 20px">
          <a href="${escapeHtml(data.resetUrl)}" style="display:inline-block;background:#15171a;color:#ffffff;text-decoration:none;padding:11px 20px;border-radius:8px;font-size:14px;font-weight:600">Set a new password</a>
        </p>
        <p style="margin:0;font-size:13px;color:#5c6166">If you did not request this, you can safely ignore this email.</p>
      </td></tr>
    </table>
  </body>
</html>`;

  return { subject, text, html };
}
