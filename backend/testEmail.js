/*
 * Test email service connectivity and send a test email to the admin.
 * Run with: node testEmail.js
 */
import dotenv from 'dotenv';
import { initializeEmailService, sendPasswordResetEmail, sendCredentialsEmail, APP_URL } from './src/utils/mailer.js';

dotenv.config();

async function testEmailService() {
  console.log('🧪 Testing Evereco HR Email Service\n');

  // Check environment
  console.log('📋 Configuration:');
  console.log(`   SMTP_HOST: ${process.env.SMTP_HOST}`);
  console.log(`   SMTP_PORT: ${process.env.SMTP_PORT}`);
  console.log(`   SMTP_USER: ${process.env.SMTP_USER}`);
  console.log(`   SMTP_FROM: ${process.env.SMTP_FROM}`);
  console.log(`   SMTP_FROM_NAME: ${process.env.SMTP_FROM_NAME}`);
  console.log(`   APP_URL: ${APP_URL}\n`);

  // Initialize email service
  console.log('🔧 Initializing email service...\n');
  const ready = await initializeEmailService();

  if (!ready) {
    console.log('❌ Email service is not ready or not configured.');
    process.exit(1);
  }

  // Send test email
  console.log('\n📧 Sending test email...\n');

  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@evereco.com';
    const resetToken = 'test_token_' + Date.now();

    const result = await sendPasswordResetEmail({
      to: adminEmail,
      token: resetToken,
    });

    if (result.delivered) {
      console.log(`\n✅ Test email sent successfully to ${adminEmail}!`);
      console.log(`   Check the inbox for the password reset email.`);
      console.log(`\n✨ Email service is working correctly!\n`);
      process.exit(0);
    } else {
      console.log(`\n❌ Email delivery failed.`);
      if (result.error) console.log(`   Error: ${result.error}`);
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    process.exit(1);
  }
}

testEmailService();
