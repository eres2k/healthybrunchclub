const sgMail = require('@sendgrid/mail');

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

  // Use SendGrid if API key is available
  if (process.env.SENDGRID_API_KEY) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    try {
      await sgMail.send(message);
      return { success: true };
    } catch (error) {
      console.error('SendGrid error:', error);
      throw error;
    }
  }

  // Fallback: Log email (for development)
  console.log('Email would be sent:', {
    to,
    subject,
    hasHtml: Boolean(html),
    hasText: Boolean(text),
    attachments: attachments ? attachments.length : 0
  });

  return { success: true, development: true };
};
