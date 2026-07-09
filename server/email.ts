import { Resend } from "resend";
import nodemailer from "nodemailer";

export interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/**
 * Sends a real email using the configured provider in environment variables.
 * Checks providers in the preferred order:
 * 1. Resend SDK (Recommended)
 * 2. SendGrid API
 * 3. Custom SMTP
 * 4. Gmail SMTP
 */
export async function sendRealEmail(options: EmailOptions): Promise<void> {
  const { to, subject, text, html } = options;

  // 1. Resend SDK
  if (process.env.RESEND_API_KEY) {
    console.log("Email service: Initializing official Resend SDK...");
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const payload = {
        from: "InsightForge <onboarding@resend.dev>",
        to,
        subject,
        text,
        html: html || text,
      };

      console.log(`Sending email via Resend to ${to}...`);
      const { data, error } = await resend.emails.send(payload);

      if (error) {
        console.error("Resend delivery error:", error);
        throw new Error(`Resend SDK error: ${error.message}`);
      }

      console.log("Resend delivery status: Success");
      console.log("Resend Response ID:", data?.id);
      return;
    } catch (err: any) {
      console.error("Exception during Resend delivery:", err);
      throw err;
    }
  }

  // 2. SendGrid API
  if (process.env.SENDGRID_API_KEY) {
    console.log("Email service: Using SendGrid API...");
    try {
      const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.SENDGRID_API_KEY}`,
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: to }] }],
          from: { email: "no-reply@insightforge.ai", name: "InsightForge" },
          subject,
          content: [
            { type: html ? "text/html" : "text/plain", value: html || text }
          ],
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`SendGrid API failed with status ${res.status}: ${errText}`);
      }
      console.log("Email delivered successfully via SendGrid API.");
      return;
    } catch (err: any) {
      console.error("SendGrid delivery error:", err);
      throw err;
    }
  }

  // 3. Custom SMTP Server
  if (process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASS) {
    console.log("Email service: Using Custom SMTP...");
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT, 10),
        secure: parseInt(process.env.SMTP_PORT, 10) === 465,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      await transporter.sendMail({
        from: `"${process.env.SMTP_USER_NAME || "InsightForge"}" <${process.env.SMTP_USER}>`,
        to,
        subject,
        text,
        html: html || text,
      });
      console.log("Email delivered successfully via Custom SMTP.");
      return;
    } catch (err: any) {
      console.error("Custom SMTP delivery error:", err);
      throw err;
    }
  }

  // 4. Gmail SMTP
  if (process.env.GMAIL_USER && process.env.GMAIL_PASS) {
    console.log("Email service: Using Gmail SMTP...");
    try {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_PASS,
        },
      });

      await transporter.sendMail({
        from: `"${process.env.GMAIL_USER_NAME || "InsightForge"}" <${process.env.GMAIL_USER}>`,
        to,
        subject,
        text,
        html: html || text,
      });
      console.log("Email delivered successfully via Gmail SMTP.");
      return;
    } catch (err: any) {
      console.error("Gmail SMTP delivery error:", err);
      throw err;
    }
  }

  // If no credentials are found
  throw new Error(
    "No valid email provider credentials found in backend environment. " +
    "Please configure RESEND_API_KEY, SENDGRID_API_KEY, SMTP_HOST/SMTP_PASS, or GMAIL_USER/GMAIL_PASS in your environment."
  );
}
