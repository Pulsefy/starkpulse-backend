import { Injectable } from '@nestjs/common';
import { Notification } from './entities/notification.entity';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter = nodemailer.createTransport({
    host: 'smtp.example.com', // e.g., smtp.ethereal.email for testing
    port: 587,
    secure: false, // true for port 465, false for others
    auth: {
      user: 'your_email@example.com',
      pass: 'your_password',
    },
  });

  async sendEmail(notification: Notification) {
    if (!notification.user?.email) {
      throw new Error('User email is missing');
    }

    const mailOptions = {
      from: '"StarkPulse" <no-reply@starkpulse.com>',
      to: notification.user.email,
      subject: 'You have a new notification',
      html: `<p>${notification.content}</p>`,
    };

    try {
      const result = await this.transporter.sendMail(mailOptions);
      console.log(`Email sent: ${result.messageId}`);
    } catch (err) {
      console.error(`Failed to send email: ${err.message}`);
      throw err;
    }
  }
}