// @ts-ignore: Cannot find module '@nestjs/common' or its corresponding type declarations.
import { Injectable } from '@nestjs/common';
import { Transaction } from '../entities/transaction.entity';
import nodemailer from 'nodemailer';

@Injectable()
export class RegulatoryReportingService {
  generateCsvReport(transactions: Transaction[]): string {
    const header = 'TransactionHash,From,To,Value,Status,Type,FlaggedReasons\n';
    const rows = transactions.map(tx =>
      [
        tx.transactionHash,
        tx.fromAddress,
        tx.toAddress,
        tx.value,
        tx.status,
        tx.type,
        (tx.metadata?.flaggedReasons || []).join(';')
      ].join(',')
    );
    return header + rows.join('\n');
  }

  async sendReport(csv: string, recipient: string) {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: recipient,
      subject: 'Regulatory Report',
      text: 'See attached regulatory report.',
      attachments: [
        { filename: 'report.csv', content: csv },
      ],
    });
  }
} 