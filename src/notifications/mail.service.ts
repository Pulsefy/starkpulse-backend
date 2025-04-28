import { Injectable } from '@nestjs/common';
import { Notification } from './entities/notification.entity';
import * as nodemailer from 'nodemailer';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class MailService {
  private transporter = nodemailer.createTransport({
    host: 'smtp.example.com',
    port: 587,
    secure: false,
    auth: {
      user: 'your_email@example.com',
      pass: 'your_password',
    },
  });

  async sendEmail(notification: Notification) {
    if (!notification.user?.email) {
      throw new Error('User email is missing');
    }

    // Load the plain text email template
    const templatePath = path.join(__dirname, 'email-template.txt');
    let template = fs.readFileSync(templatePath, 'utf8');

    // Replace the placeholders with dynamic content
    template = template.replace('{{user_name}}', notification.user.name || 'User')
                       .replace('{{content}}', notification.content);

    const mailOptions = {
      from: '"StarkPulse" <no-reply@starkpulse.com>',
      to: notification.user.email,
      subject: 'You have a new notification',
      text: template,  // Send the email as plain text
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
