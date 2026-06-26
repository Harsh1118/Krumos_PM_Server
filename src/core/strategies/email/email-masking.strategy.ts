import { Injectable } from '@nestjs/common';

export interface EmailMaskingStrategy {
  mask(email: string): string;
}

@Injectable()
export class DefaultEmailMaskingStrategy implements EmailMaskingStrategy {
  mask(email: string): string {
    if (!email || !email.includes('@')) {
      return email;
    }
    const [localPart, domain] = email.split('@');
    if (localPart.length > 2) {
      return `${localPart[0]}${'*'.repeat(localPart.length - 2)}${localPart[localPart.length - 1]}@${domain}`;
    }
    return `*@${domain}`;
  }
}

@Injectable()
export class FullEmailMaskingStrategy implements EmailMaskingStrategy {
  mask(email: string): string {
    if (!email || !email.includes('@')) {
      return email;
    }
    const [, domain] = email.split('@');
    return `***@${domain}`;
  }
}
