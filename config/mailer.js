import nodemailer from "nodemailer";

/**
 * Configure a reusable Nodemailer transporter.
 * Values default to sensible development-friendly presets but should be
 * overridden via environment variables in production.
 */
const mailUser = process.env.SMTP_USER 
const mailPass = process.env.SMTP_PASS

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST || process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.MAIL_PORT || process.env.SMTP_PORT || 587),
  secure: process.env.MAIL_SECURE === "true" || Number(process.env.MAIL_PORT || process.env.SMTP_PORT) === 465,
  auth:
    mailUser && mailPass
      ? {
          user: mailUser,
          pass: mailPass,
        }
      : undefined,
});

// Log connection issues early to aid debugging.
if (process.env.NODE_ENV !== "test") {
  transporter
    .verify()
    .then(() => {
      console.log("📧 Mailer ready");
    })
    .catch((err) => {
      console.error("❌ Mailer configuration error:", err.message);
    });
}

export default transporter;
