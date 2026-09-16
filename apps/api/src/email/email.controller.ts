import { Controller, Get } from '@nestjs/common';
import { EmailService } from './email.service';

/**
 * Mail transport status (§0.2). Read-only and deliberately thin: it exists so
 * an operator can tell "the provider is not configured" from "the provider is
 * configured and mail is failing", which are the same symptom in the UI
 * otherwise. It exposes no recipient data and no credentials.
 */
@Controller('email')
export class EmailController {
  constructor(private readonly email: EmailService) {}

  @Get('status')
  status() {
    return {
      transport: this.email.transportName,
      deliverable: this.email.isDeliverable(),
    };
  }
}
