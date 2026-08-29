import { Injectable, Logger, OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailStatus } from '@prisma/client';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { PrismaService } from '../prisma/prisma.service';
import type { Configuration } from '../config/configuration';
import {
  renderAdminOrderNotification,
  renderCustomerOrderConfirmation,
  renderPasswordReset,
  type OrderNotificationData,
} from './templates/order-notification';

interface SendArgs {
  to: string;
  subject: string;
  text: string;
  html: string;
  template: string;
  orderId?: string;
}

/**
 * Email delivery (spec §26, §69).
 *
 * Two rules drive the design:
 *   1. A delivery failure must never corrupt or roll back the order that
 *      triggered it. Sending happens after the order is committed, and every
 *      failure is recorded in `email_logs` instead of thrown to the caller.
 *   2. Credentials come only from environment variables and are never logged.
 *
 * The provider is configurable: `console` records and logs without sending,
 * which is the development default.
 */
@Injectable()
export class NotificationsService implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(NotificationsService.name);
  private transporter: Transporter | null = null;

  /*
   * Sends still in flight.
   *
   * An order used to wait for Gmail before it was confirmed: the customer sat
   * in front of a spinner for three and a half seconds while two messages were
   * handed to a mail server, which is no business of theirs. The order is
   * committed before any of it starts and a delivery failure was never allowed
   * to affect it, so there was nothing in that wait for them.
   *
   * What the wait did buy was the guarantee that a message had left before the
   * process could. That is kept, in the only place it belongs: `flush()`
   * settles everything outstanding, and shutdown calls it.
   */
  private readonly pending = new Set<Promise<unknown>>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<Configuration, true>,
  ) {}

  private get mail() {
    return this.config.get('mail', { infer: true });
  }

  onModuleInit(): void {
    if (this.mail.provider !== 'smtp') {
      this.logger.log('Mail provider is "console" — emails are logged and recorded, not sent.');
      return;
    }

    if (!this.mail.host || !this.mail.user) {
      this.logger.warn('MAIL_PROVIDER is "smtp" but host or credentials are missing; falling back to logging.');
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: this.mail.host,
      port: this.mail.port,
      secure: this.mail.secure,
      auth: { user: this.mail.user, pass: this.mail.password },
    });

    this.logger.log(`SMTP transport configured for ${this.mail.host}:${this.mail.port}`);
  }

  /** Never throws. Returns whether delivery succeeded. */
  private async send(args: SendArgs): Promise<boolean> {
    const log = await this.prisma.emailLog.create({
      data: {
        to: args.to,
        subject: args.subject,
        template: args.template,
        status: EmailStatus.QUEUED,
        orderId: args.orderId ?? null,
      },
    });

    try {
      const delivered = this.transporter !== null && this.transporter !== undefined;

      if (!delivered) {
        this.logger.log(`[console mail] to=${args.to} subject="${args.subject}"`);
      } else {
        await this.transporter!.sendMail({
          from: this.mail.from,
          to: args.to,
          subject: args.subject,
          text: args.text,
          html: args.html,
        });
      }

      /*
       * Only a real delivery is recorded as SENT.
       *
       * Without a provider configured this used to write SENT anyway, so the
       * log claimed every order notification had gone out when none had left
       * the machine — the most misleading thing a log can do. `sentAt` stays
       * empty for the same reason.
       */
      await this.prisma.emailLog.update({
        where: { id: log.id },
        data: {
          status: delivered ? EmailStatus.SENT : EmailStatus.LOGGED,
          sentAt: delivered ? new Date() : null,
          attempts: { increment: 1 },
        },
      });
      return delivered;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      // Logged, recorded, and swallowed — the order must survive a mail outage.
      this.logger.error(`Email delivery failed (template=${args.template}): ${message}`);
      await this.prisma.emailLog.update({
        where: { id: log.id },
        data: { status: EmailStatus.FAILED, error: message.slice(0, 1000), attempts: { increment: 1 } },
      });
      return false;
    }
  }

  /** Runs a send in the background, tracked until it settles. */
  private track(work: Promise<unknown>): void {
    const tracked = work
      .catch((error) => {
        /*
         * `send` records and swallows its own failures, so this catches only
         * something unforeseen — and it has to catch it, because an unhandled
         * rejection with no caller left to receive it would take the process
         * down and every other request with it.
         */
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(`Background notification failed: ${message}`);
      })
      .finally(() => {
        this.pending.delete(tracked);
      });

    this.pending.add(tracked);
  }

  /**
   * Both order emails, queued rather than awaited.
   *
   * Returns the moment the work is scheduled, so the customer's confirmation
   * appears at once. Anything needing certainty that delivery finished — the
   * tests, and shutdown — calls `flush()`.
   */
  dispatchOrderEmails(data: OrderNotificationData, orderId: string): void {
    this.track(
      Promise.allSettled([
        this.sendOrderNotification(data, orderId),
        this.sendOrderConfirmation(data, orderId),
      ]),
    );
  }

  /** Waits for every queued notification to settle, bounded by a deadline. */
  async flush(timeoutMs = 10_000): Promise<void> {
    const deadline = Date.now() + timeoutMs;

    while (this.pending.size > 0 && Date.now() < deadline) {
      let timer: NodeJS.Timeout | undefined;
      const expiry = new Promise<void>((resolve) => {
        timer = setTimeout(resolve, Math.max(0, deadline - Date.now()));
      });

      // Whichever comes first: the outstanding sends, or the deadline. The
      // timer is cleared either way, so a test never waits on it.
      await Promise.race([Promise.all([...this.pending]), expiry]);
      if (timer) clearTimeout(timer);
    }

    if (this.pending.size > 0) {
      this.logger.warn(`${this.pending.size} notification(s) unfinished after ${timeoutMs}ms`);
    }
  }

  /**
   * Stopping the server does not abandon a message half-sent.
   *
   * Requires `enableShutdownHooks()` in main.ts, which is why it is there.
   */
  async onApplicationShutdown(): Promise<void> {
    if (this.pending.size > 0) {
      this.logger.log(`Finishing ${this.pending.size} notification(s) before shutdown`);
    }
    await this.flush(5_000);
  }

  /** Spec §26 — administrator notification for a new order. */
  async sendOrderNotification(data: OrderNotificationData, orderId: string): Promise<void> {
    const adminEmail = await this.resolveAdminEmail();
    const rendered = renderAdminOrderNotification(data);
    await this.send({ ...rendered, to: adminEmail, template: 'admin-order-notification', orderId });
  }

  /** Courtesy confirmation to the customer (system graph: "→ Customer"). */
  async sendOrderConfirmation(data: OrderNotificationData, orderId: string): Promise<void> {
    const rendered = renderCustomerOrderConfirmation(data);
    await this.send({ ...rendered, to: data.buyerEmail, template: 'customer-order-confirmation', orderId });
  }

  async sendPasswordReset(args: { to: string; fullName: string; resetUrl: string }): Promise<void> {
    const rendered = renderPasswordReset({ fullName: args.fullName, resetUrl: args.resetUrl });
    await this.send({ ...rendered, to: args.to, template: 'password-reset' });
  }

  /**
   * Whether a notification would actually be delivered, and to whom.
   *
   * Worth exposing: with no provider configured the platform renders every
   * notification and files it away, which from the outside is indistinguishable
   * from working. An administrator waiting for an order alert deserves to be
   * told plainly that delivery is switched off.
   */
  async deliveryStatus(): Promise<{ provider: string; delivers: boolean; recipient: string }> {
    return {
      provider: this.mail.provider,
      delivers: Boolean(this.transporter),
      recipient: await this.resolveAdminEmail(),
    };
  }

  /** A settings override takes precedence over the environment default. */
  private async resolveAdminEmail(): Promise<string> {
    const setting = await this.prisma.setting.findUnique({ where: { key: 'orders.notificationEmail' } });
    const configured = typeof setting?.value === 'string' ? setting.value.trim() : '';
    return configured || this.mail.adminEmail;
  }
}
