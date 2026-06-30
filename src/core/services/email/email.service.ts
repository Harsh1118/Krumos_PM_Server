import { Injectable, Logger } from '@nestjs/common';
import { EnvConfig } from '../../config/env-config.service';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { BrevoClient } from '@getbrevo/brevo';

@Injectable()
export class EmailService {
  private readonly brevoClient: BrevoClient | null = null;
  private readonly logger = new Logger(EmailService.name);

  constructor(
    private readonly envConfig: EnvConfig,
    @InjectQueue('email_queue') private readonly emailQueue: Queue,
  ) {
    const apiKey = this.envConfig.emailConfig.apiKey;

    if (apiKey) {
      this.brevoClient = new BrevoClient({ apiKey });
      this.logger.log('Brevo Email service configured successfully');
    } else {
      this.logger.warn(
        'BREVO_API_KEY missing. Email service will run in console-fallback mode',
      );
    }
  }

  async sendInvitationEmail(
    to: string,
    workspaceName: string,
    invitedByName: string,
    inviteLink: string,
  ): Promise<void> {
    this.logger.log(`Enqueueing invitation email for ${to} to Redis`);

    let enqueued = false;
    const isRedisReady =
      this.emailQueue &&
      (this.emailQueue as any).client &&
      (this.emailQueue as any).client.status === 'ready';

    if (isRedisReady) {
      try {
        await Promise.race([
          this.emailQueue.add('send_invite', {
            to,
            workspaceName,
            invitedByName,
            inviteLink,
          }),
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error('Queue timeout (Redis offline)')),
              2000,
            ),
          ),
        ]);
        enqueued = true;
        this.logger.log(
          `Successfully enqueued invitation email for ${to} to Redis`,
        );
      } catch (err: any) {
        this.logger.warn(
          `Failed to enqueue invitation email to Redis: ${err.message}. Falling back to direct send.`,
        );
      }
    } else {
      const status = (this.emailQueue as any)?.client?.status || 'unknown';
      this.logger.warn(
        `Redis is not ready (status: ${status}). Falling back to direct send.`,
      );
    }

    if (!enqueued) {
      this.logger.log(`Sending invitation email to ${to} directly...`);
      await this.sendInvitationEmailDirect(
        to,
        workspaceName,
        invitedByName,
        inviteLink,
      );
    }
  }

  async sendInvitationEmailDirect(
    to: string,
    workspaceName: string,
    invitedByName: string,
    inviteLink: string,
  ): Promise<void> {
    const { fromEmail, fromName } = this.envConfig.emailConfig;

    const subject = `You've been invited to join ${workspaceName} on Krumos`;

    const html = `
      <div>
        <h2>Join ${workspaceName} on Krumos</h2>

        <p>
          ${invitedByName} invited you to join this workspace.
        </p>

        <a href="${inviteLink}">
          Accept Invitation
        </a>

        <p>
          This invitation expires in 72 hours.
        </p>
      </div>
    `;

    if (this.brevoClient) {
      try {
        const result =
          await this.brevoClient.transactionalEmails.sendTransacEmail({
            subject,
            htmlContent: html,
            sender: { name: fromName, email: fromEmail },
            to: [{ email: to }],
          });
        this.logger.log(
          `Invitation email successfully sent via Brevo to ${to}. ID: ${result.messageId || JSON.stringify(result)}`,
        );
      } catch (err) {
        const error = err as Error;
        this.logger.error(
          `Failed to send invitation email via Brevo to ${to}:`,
          error.stack || error.message,
        );
        this.logFallback(to, workspaceName, inviteLink);
      }
    } else {
      this.logFallback(to, workspaceName, inviteLink);
    }
  }

  private logFallback(to: string, workspaceName: string, inviteLink: string) {
    this.logger.log('\n==================================================');
    this.logger.log(`[MOCK EMAIL SENT] To: ${to}`);
    this.logger.log(`[MOCK EMAIL SENT] Workspace: ${workspaceName}`);
    this.logger.log(`[MOCK EMAIL SENT] Link: ${inviteLink}`);
    this.logger.log('==================================================\n');
  }
}
