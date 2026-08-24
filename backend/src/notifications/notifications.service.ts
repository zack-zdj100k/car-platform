import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
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
export class NotificationsService implements OnModuleInit {
  private readonly logger = new Logger(NotificationsService.name);
  private transporter: Transporter | null = null;

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
      if (!this.transporter) {
        this.logger.log(`[console mail] to=${args.to} subject="${args.subject}"`);
      } else {
        await this.transporter.sendMail({
          from: this.mail.from,
          to: args.to,
          subject: args.subject,
          text: args.text,
          html: args.html,
        });
      }

      await this.prisma.emailLog.update({
        where: { id: log.id },
        data: { status: EmailStatus.SENT, sentAt: new Date(), attempts: { increment: 1 } },
      });
      return true;
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

  /** A settings override takes precedence over the environment default. */
  private async resolveAdminEmail(): Promise<string> {
    const setting = await this.prisma.setting.findUnique({ where: { key: 'orders.notificationEmail' } });
    const configured = typeof setting?.value === 'string' ? setting.value.trim() : '';
    return configured || this.mail.adminEmail;
  }
}
