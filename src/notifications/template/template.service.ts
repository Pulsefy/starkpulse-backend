import { Injectable, Logger } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';
import * as Handlebars from 'handlebars';

@Injectable()
export class TemplateService {
  private readonly logger = new Logger(TemplateService.name);
  private cache: Record<string, Handlebars.TemplateDelegate> = {};

  /**
   * Load & compile a template by channel and name.
   */
  getTemplate(
    channel: 'email' | 'sms' | 'push',
    templateName: string,
  ): Handlebars.TemplateDelegate {
    const key = `${channel}/${templateName}`;
    if (this.cache[key]) {
      return this.cache[key];
    }

    const filePath = join(
      process.cwd(),
      'src',
      'notifications',
      'template',
      channel,
      `${templateName}.hbs`,
    );
    let source: string;
    try {
      source = readFileSync(filePath, 'utf8');
    } catch (err) {
      this.logger.error(`Template not found: ${filePath}`);
      throw err;
    }
    const compiled = Handlebars.compile(source);
    this.cache[key] = compiled;
    return compiled;
  }

  /**
   * Render a template with the given context.
   */
  render(
    channel: 'email' | 'sms' | 'push',
    templateName: string,
    context: Record<string, any>,
  ): string {
    const tpl = this.getTemplate(channel, templateName);
    return tpl(context);
  }
}
