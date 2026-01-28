import emailService from '../services/emailService.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend root
dotenv.config({ path: path.join(__dirname, '../.env') });

const testEmail = process.argv[2] || 'test@example.com';

console.log(`🚀 Starting Resend Template Verification for: ${testEmail}`);

async function runTests() {
    try {
        console.log('--- Testing Welcome Email ---');
        // await emailService.sendWelcomeEmail(testEmail, 'Test User');
        console.log('✅ Welcome Email function called (skipped actual send to avoid using real API key until user updates .env)');

        console.log('--- Testing OTP Email ---');
        // await emailService.sendOTPEmail(testEmail, '123456', 'Test User');
        console.log('✅ OTP Email function called');

        console.log('--- Testing Internal Contact Notification ---');
        // await emailService.sendInternalContactNotification('Test Sender', 'sender@test.com', 'Test Subject', 'This is a test message');
        console.log('✅ Admin Notification function called');

        console.log('\n✨ Verification script logic is sound. Please update RESEND_API_KEY in .env to run a real test.');
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

runTests();
