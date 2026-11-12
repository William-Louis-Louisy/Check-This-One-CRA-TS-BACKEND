import sgMail from "@sendgrid/mail";
import nodemailer from "nodemailer";
import "dotenv/config";

const stagingSmtp = process.env.MAIL_TRANSPORT === "staging-smtp";
if (stagingSmtp && (
  process.env.NODE_ENV !== "staging" ||
  process.env.DB_NAME !== "cto01_staging" ||
  process.env.SMTP_HOST !== "srv-captain--cto-p0-mail" ||
  process.env.SMTP_PORT !== "1025"
)) {
  throw new Error("Staging SMTP requires the isolated staging database and mail capture service");
}

const capture = stagingSmtp ? nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: 1025,
  secure: false,
  ignoreTLS: true,
  connectionTimeout: 5000,
  greetingTimeout: 5000,
  socketTimeout: 10000,
}) : undefined;

if (!stagingSmtp) sgMail.setApiKey(process.env.SENDGRID_API_KEY as string);

export default {
  async send(message: { to: string; from: string; subject: string; text: string }) {
    if (capture) {
      if (!/^[^@\s]+@example\.test$/i.test(message.to)) {
        throw new Error("Staging SMTP only accepts synthetic example.test recipients");
      }
      return capture.sendMail(message);
    }
    return sgMail.send(message);
  },
};
