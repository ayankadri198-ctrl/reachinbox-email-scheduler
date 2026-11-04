import nodemailer, { Transporter } from 'nodemailer';
import { env } from '../config/env.js';
import { Logger } from '../utils/logger.js';

const logger = new Logger('SmtpService');

export interface SendMailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export interface SendMailResult {
  messageId: string;
  previewUrl: string | null;
}

class SmtpService {
  private transporter: Transporter | null = null;
  private isInitialized = false;

  private async initializeTransporter(): Promise<void> {
    if (this.isInitialized && this.transporter) return;

    // Check if valid credentials are provided in env
    if (env.SMTP_USER && env.SMTP_PASS && env.SMTP_USER.trim() !== '') {
      logger.info(`Using configured SMTP credentials for ${env.SMTP_USER}`);
      this.transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_PORT === 465,
        auth: {
          user: env.SMTP_USER,
          pass: env.SMTP_PASS,
        },
      });
    } else {
      // Automatically create an Ethereal test account if none provided
      logger.info('No explicit SMTP credentials provided. Creating ephemeral Ethereal test account...');
      try {
        const testAccount = await nodemailer.createTestAccount();
        logger.success(`Ethereal test account created: ${testAccount.user}`);
        logger.info(`SMTP Server: ${testAccount.smtp.host}:${testAccount.smtp.port}`);

        this.transporter = nodemailer.createTransport({
          host: testAccount.smtp.host,
          port: testAccount.smtp.port,
          secure: testAccount.smtp.secure,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass,
          },
        });
      } catch (err) {
        logger.error('Failed to create Ethereal test account', err);
        throw err;
      }
    }

    try {
      await this.transporter.verify();
      this.isInitialized = true;
      logger.success('SMTP transporter verified and ready to send messages');
    } catch (verifyErr) {
      logger.warn('SMTP transporter verification failed (will retry upon sending):', verifyErr);
      this.isInitialized = true;
    }
  }

  public async sendMail(options: SendMailOptions): Promise<SendMailResult> {
    await this.initializeTransporter();

    if (!this.transporter) {
      throw new Error('SMTP transporter is not initialized');
    }

    const mailOptions = {
      from: env.SMTP_FROM,
      to: options.to,
      subject: options.subject,
      text: options.text || options.html?.replace(/<[^>]+>/g, '') || '',
      html: options.html || `<div style="font-family: sans-serif; line-height: 1.5;">${options.text?.replace(/\n/g, '<br/>')}</div>`,
    };

    logger.info(`Sending email to ${options.to} with subject "${options.subject}"...`);

    const info = await this.transporter.sendMail(mailOptions);
    const previewUrl = nodemailer.getTestMessageUrl(info) || null;

    logger.success(`Email sent successfully! MessageId: ${info.messageId}`);
    if (previewUrl) {
      logger.info(`🔗 Ethereal Preview URL: ${previewUrl}`);
    }

    return {
      messageId: info.messageId,
      previewUrl: previewUrl ? String(previewUrl) : null,
    };
  }
}

export const smtpService = new SmtpService();

