export interface OrderNotificationData {
  reference: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
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
  const rows: [string, string][] = [
    ['Reference', data.reference],
    ['Vehicle', data.carName],
    ['Price', data.carPrice],
    ['Colour', data.selectedColor ?? 'Not specified'],
    ['Customer', data.buyerName],
    ['Email', data.buyerEmail],
    ['Phone', data.buyerPhone],
    ['Submitted', data.submittedAt.toISOString()],
  ];

  const subject = `New order ${data.reference} — ${data.carName}`;

  const text = [
    'A new order has been submitted.',
    '',
    ...rows.map(([label, value]) => `${label}: ${value}`),
    '',
    `Manage it here: ${data.adminUrl}`,
  ].join('\n');

  const html = `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:24px;background:#f4f5f7;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#15171a">
    <table role="presentation" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;padding:28px">
      <tr><td>
        <h1 style="margin:0 0 4px;font-size:20px">New order received</h1>
        <p style="margin:0 0 20px;color:#5c6166;font-size:14px">Reference ${escapeHtml(data.reference)}</p>
        <table role="presentation" style="width:100%;border-collapse:collapse;font-size:14px">
          ${rows
            .map(
              ([label, value]) => `<tr>
            <td style="padding:8px 0;color:#5c6166;width:110px">${escapeHtml(label)}</td>
            <td style="padding:8px 0;font-weight:600">${escapeHtml(value)}</td>
          </tr>`,
            )
            .join('')}
        </table>
        <p style="margin:24px 0 0">
          <a href="${escapeHtml(data.adminUrl)}" style="display:inline-block;background:#15171a;color:#ffffff;text-decoration:none;padding:11px 20px;border-radius:8px;font-size:14px;font-weight:600">Open in admin</a>
        </p>
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
