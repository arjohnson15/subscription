const nodemailer = require('nodemailer');

// Email Configuration
const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: 'johnsonflixemail@gmail.com',  // Use your correct email address
    pass: 'ammrxksmskyaepwm',            // Use your correct app password (no spaces)
  },
});

// Send Email Function
async function sendEmail(to, subject, html, bcc = []) {
  try {
    await transporter.sendMail({
      from: 'johnsonflixemail@gmail.com',
      to,
      bcc: bcc.length ? bcc.join(', ') : undefined,  // Add BCC recipients if available
      subject,
      html,  // Use HTML instead of plain text
    });
    console.log('Email sent successfully');
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}

module.exports = sendEmail;
