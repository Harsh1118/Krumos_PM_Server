import { BrevoClient } from '@getbrevo/brevo';
import * as fs from 'fs';
import * as path from 'path';

// Load env variables
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const delimiterIndex = trimmed.indexOf('=');
      if (delimiterIndex !== -1) {
        const key = trimmed.substring(0, delimiterIndex).trim();
        let val = trimmed.substring(delimiterIndex + 1).trim();
        if (val.startsWith('"') && val.endsWith('"')) {
          val = val.slice(1, -1);
        } else if (val.startsWith("'") && val.endsWith("'")) {
          val = val.slice(1, -1);
        }
        process.env[key] = val;
      }
    }
  });
}

async function testEmail() {
  const apiKey = process.env.BREVO_API_KEY;
  const fromEmail = process.env.BREVO_FROM_EMAIL || 'harshdubey1118@gmail.com';
  const fromName = process.env.BREVO_FROM_NAME || 'Krumos';

  if (!apiKey) {
    console.error('Error: BREVO_API_KEY is not set in environment or .env file');
    process.exit(1);
  }

  console.log(`Using BREVO_API_KEY: ${apiKey.substring(0, 7)}...`);
  console.log(`Sender: ${fromName} <${fromEmail}>`);

  const apiInstance = new BrevoClient({ apiKey });

  const to = 'harshdubey1118@gmail.com';
  const subject = 'Test Email from Krumos PM (via Brevo)';
  const html = `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e1e1e1; border-radius: 8px; background-color: #F2EFE9; color: #1B1713;">
    <h2 style="color: #F44E14; margin-bottom: 20px;">Krumos PM - Brevo Verification</h2>
    <p style="font-size: 16px; line-height: 1.6;">Hello,</p>
    <p style="font-size: 16px; line-height: 1.6;">This is a test email to verify that your Brevo transactional email service integration is working correctly with Krumos PM.</p>
    <div style="margin: 30px 0; text-align: center;">
      <span style="background-color: #1B1713; color: #F2EFE9; padding: 12px 24px; border-radius: 4px; font-weight: bold; font-family: monospace; font-size: 14px; letter-spacing: 0.18em; text-transform: uppercase;">Connection Successful!</span>
    </div>
    <p style="font-size: 14px; color: #8B847A;">Sent via Brevo Transactional Email.</p>
  </div>`;

  try {
    console.log(`Sending test email to ${to}...`);
    const result = await apiInstance.transactionalEmails.sendTransacEmail({
      subject,
      htmlContent: html,
      sender: { name: fromName, email: fromEmail },
      to: [{ email: to }],
    });
    console.log('Email sent successfully!');
    console.log('Response body:', result);
  } catch (err) {
    console.error('Failed to send email:', err);
    process.exit(1);
  }
}

testEmail();
