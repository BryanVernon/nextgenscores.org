import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import Subscriber from "../models/subscriber.js";
import nodemailer from "nodemailer";

// 1. Configure email transporter
const transporter = nodemailer.createTransport({
  host: "smtp.hostinger.com",
  port: 587,
  secure: false, // use STARTTLS
  auth: {
    user: process.env.SMTP_USER, // your email, e.g., bryan@nextgenscores.org
    pass: process.env.SMTP_PASS, // your email password or app password
  },
});

// 2. Main function to send email
async function sendEmails() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB connected!");

    // 3. Fetch all subscribers
    const subscribers = await Subscriber.find({});
    if (subscribers.length === 0) {
      console.log("No subscribers found.");
      process.exit(0);
    }

    // 4. Send email to each subscriber
    for (const sub of subscribers) {
      console.log(`Sending email to: ${sub.email}`);

      await transporter.sendMail({
        from: "NextGenScores <bryan@nextgenscores.org>",
        to: sub.email,
        subject: "Test Email",
        text: "This is a test email to all subscribers!",
      });
    }

    console.log("All emails sent successfully!");
    process.exit(0);
  } catch (err) {
    console.error("Error sending emails:", err);
    process.exit(1);
  }
}

// 5. Run the function
sendEmails();
