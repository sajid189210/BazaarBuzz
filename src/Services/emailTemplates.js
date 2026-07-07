const BRAND = {
  name: 'BazaarBuzz',
  primaryColor: '#E11D48',
  secondaryColor: '#F43F5E',
  backgroundColor: '#FDF2F8',
  textColor: '#1F2937',
  mutedColor: '#6B7280',
  borderColor: '#FECdd3',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  logoUrl: 'https://bazaarbuzz.com/uploads/favicon-32x32.png',
  websiteUrl: 'https://bazaarbuzz.com',
  supportEmail: 'support@bazaarbuzz.com'
};

function generateOTPEmail(otp, expiryMinutes = 1) {
  const otpDigits = String(otp).split('').join(' ');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <title>Your BazaarBuzz Verification Code</title>
</head>
<body style="margin: 0; padding: 0; background-color: ${BRAND.backgroundColor}; font-family: ${BRAND.fontFamily};">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <!-- Header -->
    <tr>
      <td style="text-align: center; padding: 20px 0;">
        <a href="${BRAND.websiteUrl}" style="text-decoration: none; color: ${BRAND.primaryColor};">
          <span style="font-size: 28px; font-weight: 800; letter-spacing: -0.5px;">Bazaar<span style="color: ${BRAND.secondaryColor};">Buzz</span></span>
        </a>
      </td>
    </tr>

    <!-- Main Card -->
    <tr>
      <td>
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: #FFFFFF; border-radius: 16px; box-shadow: 0 4px 24px rgba(225, 29, 72, 0.1); border: 1px solid ${BRAND.borderColor}; overflow: hidden;">
          
          <!-- Hero Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, ${BRAND.primaryColor} 0%, ${BRAND.secondaryColor} 100%); padding: 32px 24px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #FFFFFF; line-height: 1.3;">Email Verification</h1>
              <p style="margin: 8px 0 0; font-size: 15px; color: rgba(255,255,255,0.9);">Enter the code below to verify your email address</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 32px;">
              <p style="margin: 0 0 24px; font-size: 16px; color: ${BRAND.textColor}; line-height: 1.6;">Hi there,</p>
              
              <p style="margin: 0 0 24px; font-size: 16px; color: ${BRAND.textColor}; line-height: 1.6;">Thanks for signing up for <strong>BazaarBuzz</strong>! To complete your registration, please enter the verification code below:</p>

              <!-- OTP Code Display -->
              <div style="text-align: center; margin: 32px 0;">
                <div style="display: inline-flex; gap: 8px; justify-content: center; flex-wrap: wrap;">
                  ${String(otp).split('').map(digit => `
                    <span style="
                      display: inline-flex;
                      align-items: center;
                      justify-content: center;
                      width: 56px;
                      height: 56px;
                      background: ${BRAND.backgroundColor};
                      border: 2px solid ${BRAND.borderColor};
                      border-radius: 12px;
                      font-size: 28px;
                      font-weight: 700;
                      color: ${BRAND.primaryColor};
                      font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Mono', monospace;
                      letter-spacing: 2px;
                    ">${digit}</span>
                  `).join('')}
                </div>
              </div>

              <!-- Expiry Notice -->
              <div style="background: #FEF3C7; border: 1px solid #FDE68A; border-radius: 10px; padding: 16px; margin: 24px 0; text-align: center;">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" style="display: inline-block; vertical-align: middle; margin-right: 8px; color: #D97706;">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
                </svg>
                <span style="color: #92400E; font-size: 14px; font-weight: 500;">This code expires in <strong>${expiryMinutes} minute${expiryMinutes > 1 ? 's' : ''}</strong>.</span>
              </div>

              <p style="margin: 24px 0 0; font-size: 14px; color: ${BRAND.mutedColor}; line-height: 1.6;">If you didn't create an account with BazaarBuzz, you can safely ignore this email. Your account security is important to us.</p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding: 0 32px;">
              <hr style="border: none; border-top: 1px solid ${BRAND.borderColor}; margin: 0;">
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px;">
              <p style="margin: 0 0 12px; font-size: 13px; color: ${BRAND.mutedColor}; text-align: center;">Need help? Contact us at <a href="mailto:${BRAND.supportEmail}" style="color: ${BRAND.primaryColor}; text-decoration: none; font-weight: 500;">${BRAND.supportEmail}</a></p>
              <p style="margin: 0; font-size: 12px; color: ${BRAND.mutedColor}; text-align: center;">© ${new Date().getFullYear()} BazaarBuzz. All rights reserved.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>

    <!-- Footer Links -->
    <tr>
      <td style="padding: 20px; text-align: center;">
        <p style="margin: 0 0 8px; font-size: 12px; color: ${BRAND.mutedColor};">This email was sent to verify your BazaarBuzz account.</p>
        <p style="margin: 0; font-size: 11px; color: ${BRAND.mutedColor};">
          <a href="${BRAND.websiteUrl}/privacy" style="color: ${BRAND.mutedColor}; text-decoration: underline;">Privacy Policy</a> •
          <a href="${BRAND.websiteUrl}/terms" style="color: ${BRAND.mutedColor}; text-decoration: underline;">Terms of Service</a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;

  // Plain text fallback
  const text = `
${BRAND.name} - Email Verification

Hi there,

Thanks for signing up for ${BRAND.name}! To complete your registration, please enter the verification code below:

Your verification code: ${otpDigits}

This code expires in ${expiryMinutes} minute${expiryMinutes > 1 ? 's' : ''}.

If you didn't create an account with ${BRAND.name}, you can safely ignore this email.

Need help? Contact us at ${BRAND.supportEmail}

© ${new Date().getFullYear()} ${BRAND.name}. All rights reserved.
  `.trim();

  return { html, text };
}

/**
 * Generates a branded password reset email template
 * @param {string} otp - The 4-digit OTP code
 * @param {number} expiryMinutes - OTP expiry in minutes
 * @returns {{html: string, text: string}}
 */
function generatePasswordResetEmail(otp, expiryMinutes = 1) {
  const { html, text } = generateOTPEmail(otp, expiryMinutes);
  
  // Customize for password reset
  const customizedHtml = html
    .replace('Email Verification', 'Password Reset')
    .replace('Enter the code below to verify your email address', 'Enter the code below to reset your password')
    .replace('Thanks for signing up for <strong>BazaarBuzz</strong>! To complete your registration, please enter the verification code below:', 'You requested to reset your password. Please enter the verification code below to proceed:')
    .replace('If you didn\'t create an account with BazaarBuzz, you can safely ignore this email.', 'If you didn\'t request a password reset, you can safely ignore this email.');

  const customizedText = text
    .replace('Email Verification', 'Password Reset')
    .replace('Thanks for signing up for BazaarBuzz! To complete your registration, please enter the verification code below:', 'You requested to reset your password. Please enter the verification code below to proceed:')
    .replace('If you didn\'t create an account with BazaarBuzz, you can safely ignore this email.', 'If you didn\'t request a password reset, you can safely ignore this email.');

  return { html: customizedHtml, text: customizedText };
}

module.exports = {
  generateOTPEmail,
  generatePasswordResetEmail,
  BRAND
};