const MSG = require('../../constants/messages');
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
            return response.error(res, MSG.OTP_EMAIL_TAKEN, 400);
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
                    return response.error(res, MSG.OTP_FAILED(err.message), 500);
                }

                console.info('Email sent successfully:', info.response);

                response.success(res, {
                    success: true,
                    message: MSG.OTP_SENT,
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
            return response.error(res, MSG.OTP_NOT_FOUND, 404);
        }

        const otpNumber = Number(otp.otpNumber);
        const enteredOtp = Number(otpValue);
        const expiryTime = new Date(otp.expiry).getTime();

        if (enteredOtp !== otpNumber || Date.now() > expiryTime) {
            return response.error(res, MSG.OTP_INVALID_EXPIRED, 400);
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
            return response.error(res, MSG.OTP_INVALID_ID, 400);
        }

        const otp = await OTP.findByIdAndDelete(req.query.otpId);

        if (!otp) {
            return response.error(res, MSG.OTP_NOT_FOUND, 404);
        }

        response.success(res, {
            success: true,
            message: MSG.OTP_EXPIRED,
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
