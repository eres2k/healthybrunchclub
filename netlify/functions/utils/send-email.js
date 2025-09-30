const sgMail = require('@sendgrid/mail');

module.exports = async function sendEmail({ to, subject, html }) {
  // Use SendGrid if API key is available
  if (process.env.SENDGRID_API_KEY) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    
    const msg = {
      to,
      from: process.env.SENDER_EMAIL || 'noreply@healthybrunchclub.at',
      subject,
      html
    };
    
    try {
      await sgMail.send(msg);
      return { success: true };
    } catch (error) {
      console.error('SendGrid error:', error);
      throw error;
    }
  } else {
    // Fallback: Log email (for development)
    console.log('Email would be sent:', { to, subject });
    return { success: true, development: true };
  }
};
