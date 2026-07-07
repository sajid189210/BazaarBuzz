const response = require('../../Services/responseMapper');
const User = require('../../model/userModel');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const OTP = require('../../model/otpModel');
const { generateOTPEmail } = require('../../Services/emailTemplates');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '465', 10),
    secure: true,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    tls: {
        rejectUnauthorized: process.env.NODE_ENV === 'production',
        minVersion: 'TLSv1.2',
    },
    logger: false,
});

const getUser = async (email) => {
    return await User.findOne({ email });
};

const requestOTP = async (req, res) => {
    const { email } = req.body;

    try {
        const user = await getUser(email);

        if (user) {
            return response.error(res, 'Email already taken', 400);
        }

        const otpNumber = crypto.randomInt(1000, 9999);
        const expiry = Date.now() + 60 * 1000;

        req.session.otp = otpNumber;

        try {
            const newOTP = await OTP.create({
                otpNumber,
                expiry
            });

            const { html, text } = generateOTPEmail(newOTP.otpNumber, 1);

            const mailOptions = {
                from: `"BazaarBuzz" <${process.env.EMAIL_USER}>`,
                to: email,
                subject: 'Your BazaarBuzz Verification Code',
                text,
                html
            };

            transporter.sendMail(mailOptions, (err, info) => {
                if (err) {
                    console.error(`Error sending email: ${err}`);
                    return response.error(res, `Failed to send OTP: ${err.message}`, 500);
                }

                console.info('Email sent successfully:', info.response);

                response.success(res, {
                    success: true,
                    message: 'OTP sent to your email',
                    otpId: newOTP._id
                });
            });
        } catch (err) {
            response.serverError(res, err);
        }
    } catch (err) {
        response.serverError(res, err);
    }
};

const verifyOTP = async (req, res) => {
    const { otpValue, otpId } = req.body;

    try {
        const otp = await OTP.findById(otpId);

        if (!otp) {
            return response.error(res, 'OTP not found', 404);
        }

        const otpNumber = Number(otp.otpNumber);
        const enteredOtp = Number(otpValue);
        const expiryTime = new Date(otp.expiry).getTime();

        console.log('OTP Debug:', { otpNumber, enteredOtp, expiryTime, now: Date.now(), expired: Date.now() > expiryTime });

        if (enteredOtp !== otpNumber || Date.now() > expiryTime) {
            return response.error(res, 'Invalid or expired otp', 400);
        }

        const verifiedOtp = await OTP.findByIdAndUpdate(otpId, { $set: { isVerified: true } }, { new: true });

        await OTP.findByIdAndDelete(otpId);

        response.success(res, {
            success: true,
            otp: verifiedOtp
        });
    } catch (err) {
        response.serverError(res, err);
    }
};

const handleOtpExpiry = async (req, res) => {
    try {
        if (!req.query.otpId) {
            return response.error(res, 'Invalid OTP ID', 400);
        }

        const otp = await OTP.findByIdAndDelete(req.query.otpId);

        console.log(otp);

        if (!otp) {
            return response.error(res, 'OTP not found', 404);
        }

        response.success(res, {
            success: true,
            message: 'OTP has been expired',
        });
    } catch (err) {
        response.serverError(res, err);
    }
};

module.exports = {
    requestOTP,
    verifyOTP,
    handleOtpExpiry,
};
