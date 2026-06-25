const response = require('../../Services/responseMapper');
const User = require('../../model/userModel');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const OTP = require('../../model/otpModel')
require('dotenv').config();


const transporter = nodemailer.createTransport({
    // host: 'smtp.gmail.com',
    // port: 587,
    // secure: true,
    service: process.env.EMAIL_SERVICE,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    tls: {
        rejectUnauthorized: false
    }
});

const getUser = async (email) => {
    return await User.findOne({ email });
}

//* ----------------[Request New OTP]------------------------
const requestOTP = async (req, res) => {
    const { email } = req.body;

    try {
        const user = await getUser(email);

        if (user) {
            return response.error(res, "Email already taken", 400);
        }

        const otpNumber = crypto.randomInt(1000, 9999);
        const expiry = Date.now() + 60 * 1000; //? Expiry set for 1 minute

        // stores otp number in session for future.
        req.session.otp = otpNumber;

        try {
            const newOTP = await OTP.create({
                otpNumber,
                expiry
            });

            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: email,
                subject: 'Password Reset OTP',
                text: `Your OTP is ${newOTP.otpNumber}. It is valid for 1 minute.`
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


//* ------------------[Verifies the OTP]---------------------------------------------------------
const verifyOTP = async (req, res) => {
    const { otpValue, otpId } = req.body;

    try {

        const otp = await OTP.findById(otpId);

        if (otpValue !== otp.otpNumber || Date.now() > otp.expiry) return response.error(res, "Invalid or expired otp", 400);

        //updates the isVerified:false to true.
        const verifiedOtp = await OTP.findByIdAndUpdate(otpId, { $set: { isVerified: true } }, { new: true });

        await OTP.findByIdAndDelete(otpId);

        response.success(res, {
            success: true,
            otp: verifiedOtp
        });

    } catch (err) {
        response.serverError(res, err);}
};

//* ---------------------[Handles OTP Expiry]-----------------------------------------
const handleOtpExpiry = async (req, res) => {

    try {

        if (!req.query.otpId) {
            return response.error(res, "Invalid OTP ID", 400);
        }

        const otp = await OTP.findByIdAndDelete(req.query.otpId);

        console.log(otp)

        if (!otp) {
            return response.error(res, "OTP not found", 404);
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
}