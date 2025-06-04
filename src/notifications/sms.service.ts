import { Injectable } from '@nestjs/common';
import Twilio from 'twilio';

@Injectable()
export class SmsService {
  private client: Twilio.Twilio;

  constructor() {
    // TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER
    const sid = process.env.TWILIO_ACCOUNT_SID || '';
    const token = process.env.TWILIO_AUTH_TOKEN || '';
    this.client = Twilio(sid, token);
  }

  /**
   * Send a single SMS. Returns the Twilio Message SID.
   */
  async sendSms(opts: { to: string; body: string }): Promise<string> {
    const message = await this.client.messages.create({
      to: opts.to,
      from: process.env.TWILIO_FROM_NUMBER || '',
      body: opts.body,
    });
    return message.sid;
  }
}
