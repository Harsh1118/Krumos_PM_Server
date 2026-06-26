import { Process, Processor } from '@nestjs/bull';
import type { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { EmailService } from './email.service';

@Processor('email_queue')
export class EmailProcessor {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(private readonly emailService: EmailService) {}

  @Process('send_invite')
  async handleSendInvite(
    job: Job<{
      to: string;
      workspaceName: string;
      invitedByName: string;
      inviteLink: string;
    }>,
  ) {
    this.logger.log(
      `Processing email job ${job.id} in background for ${job.data.to}`,
    );
    await this.emailService.sendInvitationEmailDirect(
      job.data.to,
      job.data.workspaceName,
      job.data.invitedByName,
      job.data.inviteLink,
    );
  }
}
