import nodemailer from 'nodemailer';

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM || SMTP_USER;
const SMTP_FROM_NAME = process.env.SMTP_FROM_NAME || 'Evereco Energy HR';

export const APP_URL = (process.env.APP_URL || 'http://localhost:5173').replace(/\/+$/, '');

let transporter = null;
let emailServiceReady = false;

/*
 * Initialize the email service. Returns true if SMTP is configured and working,
 * false if not configured or connection failed.
 */
export async function initializeEmailService() {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.log('⚠️  Email Service: SMTP not configured (emails will be logged to console)');
    emailServiceReady = false;
    return false;
  }

  try {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });

    // Verify connection
    await transporter.verify();
    emailServiceReady = true;
    console.log(`✅ Email Service Ready`);
    console.log(`   From: ${SMTP_FROM}`);
    console.log(`   SMTP: ${SMTP_HOST}:${SMTP_PORT}`);
    return true;
  } catch (error) {
    console.error('❌ Email Service initialization failed:', error.message);
    emailServiceReady = false;
    return false;
  }
}

/*
 * Internal send function. If SMTP is not configured, logs to console instead.
 */
async function send({ to, subject, text, html }) {
  if (!transporter) {
    // Fallback to console logging for development
    console.log(
      `\n📧 [email not sent — SMTP not configured]\n   To: ${to}\n   Subject: ${subject}\n${text
        .split('\n')
        .map((l) => `   ${l}`)
        .join('\n')}\n`
    );
    return { delivered: false };
  }

  try {
    await transporter.sendMail({
      from: `${SMTP_FROM_NAME} <${SMTP_FROM}>`,
      to,
      subject,
      text,
      html,
    });
    console.log(`✉️  Email sent to: ${to}`);
    console.log(`    Subject: ${subject}`);
    console.log(`    Status: Success`);
    return { delivered: true };
  } catch (error) {
    console.error(`❌ Email delivery failed to ${to}:`, error.message);
    return { delivered: false, error: error.message };
  }
}

export function sendPasswordResetEmail({ to, token }) {
  const resetLink = `${APP_URL}/reset-password/${token}`;
  return send({
    to,
    subject: 'Reset Your Password',
    text: `Click here to reset: ${resetLink}

Link expires in 1 hour.

If you didn't request this, ignore this email.
`,
    html: `<p>Click the link below to reset your password:</p>
<p><a href="${resetLink}">${resetLink}</a></p>
<p>Link expires in 1 hour.</p>
<p>If you didn't request this, ignore this email.</p>`,
  });
}

export function sendCredentialsEmail({ to, name, tempPassword }) {
  const loginUrl = `${APP_URL}/login`;
  return send({
    to,
    subject: 'Your Evereco HR Login Credentials',
    text: `Hello ${name},

Your account has been created.

Email: ${to}
Temporary Password: ${tempPassword}

Change your password on first login.

Login: ${loginUrl}
`,
    html: `<p>Hello ${name},</p>
<p>Your account has been created.</p>
<ul>
  <li><strong>Email:</strong> ${to}</li>
  <li><strong>Temporary Password:</strong> ${tempPassword}</li>
</ul>
<p>You must change your password on first login.</p>
<p><a href="${loginUrl}">Login to Evereco HR</a></p>`,
  });
}

export function sendAbsenceDecisionEmail({ to, name, absenceType, startDate, endDate, decision, rejectionReason = '' }) {
  const statusText = decision === 'Approved' ? '✓ Approved' : '✗ Rejected';
  const statusColor = decision === 'Approved' ? '#27AE60' : '#E74C3C';

  return send({
    to,
    subject: `Absence Request ${decision}: ${absenceType}`,
    text: `Hello ${name},

Your ${absenceType} absence request has been ${decision.toLowerCase()}.

Dates: ${startDate} to ${endDate}
Status: ${statusText}
${rejectionReason ? `Reason: ${rejectionReason}` : ''}

For details, please log into your account.
`,
    html: `<p>Hello ${name},</p>
<p>Your <strong>${absenceType}</strong> absence request has been <span style="color: ${statusColor}; font-weight: bold;">${decision}</span>.</p>
<ul>
  <li><strong>Start Date:</strong> ${startDate}</li>
  <li><strong>End Date:</strong> ${endDate}</li>
  <li><strong>Status:</strong> <span style="color: ${statusColor};">${statusText}</span></li>
  ${rejectionReason ? `<li><strong>Reason:</strong> ${rejectionReason}</li>` : ''}
</ul>
<p>For more details, please log into your account.</p>`,
  });
}

export function isEmailServiceReady() {
  return emailServiceReady;
}
