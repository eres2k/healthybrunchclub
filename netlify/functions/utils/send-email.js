const sgMail = require('@sendgrid/mail');

module.exports = async function sendEmail(options) {
  if (!process.env.SENDGRID_API_KEY) {
    console.warn('SENDGRID_API_KEY nicht konfiguriert - E-Mail wird nicht gesendet');
    return { success: false, error: 'E-Mail-Service nicht konfiguriert' };
  }

  sgMail.setApiKey(process.env.SENDGRID_API_KEY);

  const msg = {
    to: options.to,
    from: options.from || process.env.SENDER_EMAIL || 'noreply@healthybrunchclub.at',
    subject: options.subject,
    text: options.text,
    html: options.html,
    attachments: options.attachments || [],
    replyTo: options.replyTo
  };

  try {
    await sgMail.send(msg);
    console.log('E-Mail erfolgreich gesendet an:', options.to);
    return { success: true };
  } catch (error) {
    console.error('SendGrid Fehler:', error);
    if (error.response) {
      console.error('SendGrid Response Error:', error.response.body);
    }
    throw error;
  }
};
