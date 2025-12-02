import nodemailer from "nodemailer";

let transporter = null;

/**
 * Get or create the nodemailer transporter
 * Creates transporter lazily to ensure env vars are loaded
 */
const getTransporter = () => {
  if (transporter) {
    return transporter;
  }

  // Validate required environment variables
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
    throw new Error(
      "SMTP configuration missing. Please set SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS in .env file"
    );
  }

  const port = Number(smtpPort);
  if (isNaN(port)) {
    throw new Error(`Invalid SMTP_PORT: ${smtpPort}. Must be a number.`);
  }

  // Create transporter with proper configuration
  transporter = nodemailer.createTransport({
    host: smtpHost,
    port: port,
    secure: port === 465, // true for 465, false for other ports
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
    tls: {
      rejectUnauthorized: false, // Allow self-signed certificates
    },
  });

  console.log(`📧 SMTP configured: ${smtpHost}:${port}`);
  
  // Verify connection (async, don't block)
  transporter.verify((err) => {
    if (err) {
      console.error("❌ SMTP Connection Error:", err.message);
    } else {
      console.log("✅ SMTP Ready - Connection verified");
    }
  });

  return transporter;
};

export default getTransporter;
