import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly configService: ConfigService) {}

  private get resendApiKey() {
    return this.configService.get<string>('resend.apiKey');
  }

  private get sender() {
    return this.configService.get<string>('resend.from') ?? 'no-reply@minhasvendas.app';
  }

  async sendEmailVerification(to: string, token: string) {
    const verifyUrl = `${this.configService.get<string>('app.webAppUrl')}/verify-email?token=${token}`;
    return this.dispatchEmail({
      to,
      subject: 'Confirme o seu e-mail',
      html: `<p>Olá!</p><p>Confirme seu e-mail clicando no link abaixo:</p><a href="${verifyUrl}">Verificar e-mail</a>`
    });
  }

  async sendPasswordReset(to: string, token: string) {
    const resetUrl = `${this.configService.get<string>('app.webAppUrl')}/reset-password?token=${token}`;
    return this.dispatchEmail({
      to,
      subject: 'Recuperação de senha',
      html: `<p>Você solicitou a redefinição de senha.</p><p>Acesse o link: <a href="${resetUrl}">Redefinir senha</a></p>`
    });
  }

  async dispatchEmail(payload: { to: string; subject: string; html: string }) {
    if (!this.resendApiKey) {
      this.logger.warn('Resend API key not configured. Skipping email send.');
      return;
    }

    try {
      await axios.post(
        'https://api.resend.com/emails',
        {
          from: this.sender,
          to: payload.to,
          subject: payload.subject,
          html: payload.html
        },
        {
          headers: {
            Authorization: `Bearer ${this.resendApiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
    } catch (error) {
      this.logger.error('Failed to send email', error instanceof Error ? error.stack : error);
    }
  }
}