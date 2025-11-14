import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

async function sendTestEmail() {
  try {
    const transporter = nodemailer.createTransport({
    host: "smtp.hostinger.com",
    port: 587,
    secure: false, // upgrade later with STARTTLS
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

    const info = await transporter.sendMail({
      from: "Bryan <bryan@nextgenscores.org>",
      to: "bryan.vernon77@gmail.com",
      subject: "Test Email",
      text: "This is a test email from Hostinger SMTP.",
    });

    console.log("Email sent:", info.response);
  } catch (err) {
    console.error("Error sending email:", err);
  }
}

sendTestEmail();
