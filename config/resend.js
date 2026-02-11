import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config();

const resend = process.env.RESEND_API_KEY
    ? new Resend(process.env.RESEND_API_KEY)
    : { emails: { send: () => { console.warn("Resend API key missing. Email not sent."); return { error: "Missing API key" }; } } };


export default resend;
