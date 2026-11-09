require('dotenv').config();
const nodemailer = require('nodemailer');

// Email is optional: if mail settings are missing, we just skip sending
const isConfigured =
  process.env.MAIL_HOST && process.env.MAIL_USER && process.env.MAIL_PASS;

const transporter = isConfigured
  ? nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: Number(process.env.MAIL_PORT) || 2525,
      secure: false, // STARTTLS is used on port 2525 / 587
      auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000
    })
  : null;

// Sends a booking confirmation. Never throws: a failed email must not break a booking.
async function sendBookingEmail({ to, name, startTime, interviewerName }) {
  if (!transporter) {
    console.log('Email skipped: mail settings are not configured');
    return false;
  }

  const when = new Date(startTime).toLocaleString('en-IN', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata'
  });

  try {
    await transporter.sendMail({
      from: `"AI Interview Platform" <${process.env.MAIL_FROM}>`,
      to,
      subject: 'Your interview is booked',
      text:
        `Hi ${name},\n\n` +
        `Your interview is confirmed.\n` +
        `Interviewer: ${interviewerName || 'To be assigned'}\n` +
        `Time: ${when} (IST)\n\n` +
        `Log in to your dashboard to join the room at the scheduled time.\n\n` +
        `Good luck!\nAI Interview Platform`,
      html:
        `<div style="font-family:Arial,sans-serif;max-width:480px">` +
        `<h2 style="margin:0 0 12px">Interview booked ✅</h2>` +
        `<p>Hi ${name},</p>` +
        `<p>Your interview is confirmed.</p>` +
        `<p><b>Interviewer:</b> ${interviewerName || 'To be assigned'}<br>` +
        `<b>Time:</b> ${when} (IST)</p>` +
        `<p>Log in to your dashboard to join the room at the scheduled time.</p>` +
        `<p>Good luck!</p></div>`
    });
    console.log('Booking email sent to ' + to);
    return true;
  } catch (err) {
    console.error('Booking email failed:', err.message);
    return false;
  }
}

module.exports = { sendBookingEmail };