const sgMail = require('@sendgrid/mail');

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 750;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = async function sendEmail({
  to,
  subject,
  html,
  text,
  replyTo,
  from,
  attachments
}) {
  const message = {
    to,
    from: from || process.env.SENDER_EMAIL || 'noreply@healthybrunchclub.at',
    subject,
    html,
    ...(text ? { text } : {}),
    ...(replyTo ? { replyTo } : {}),
    ...(attachments && attachments.length
      ? {
          attachments: attachments.map((attachment) => ({
            disposition: 'attachment',
            ...attachment
          }))
        }
      : {})
  };

  if (process.env.SENDGRID_API_KEY) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
      try {
        await sgMail.send(message);
        return { success: true, attempts: attempt };
      } catch (error) {
        if (attempt === MAX_RETRIES) {
          console.error('SendGrid Fehler nach max. Versuchen:', error);
          throw error;
        }
        console.warn(`SendGrid Fehler, erneuter Versuch (${attempt}/${MAX_RETRIES})`, error.message);
        await wait(RETRY_DELAY_MS * attempt);
      }
    }
  }

  console.log('E-Mail (nur Protokollierung):', {
    to,
    subject,
    hasHtml: Boolean(html),
    hasText: Boolean(text),
    attachments: attachments ? attachments.length : 0
  });

  return { success: true, development: true };
};
