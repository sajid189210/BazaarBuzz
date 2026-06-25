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
            return res.status(400).json({
                success: false,
                message: 'Email already taken'
            });
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
                    return res.status(500).json({
                        success: false,
                        message: `Failed to send OTP: ${err.message}`,
                        errorDetails: err
                    });
                }

                console.info('Email sent successfully:', info.response);

                res.status(200).json({
                    success: true,
                    message: 'OTP sent to your email',
                    otpId: newOTP._id
                });

            });

        } catch (err) {
            console.error('Error creating OTP:', err);
            return res.status(500).json({
                success: false,
                message: 'Failed to create OTP',
                errorDetails: err.message
            });
        }

    } catch (err) {
        console.error(`Error caught in requestOTP: ${err}`);
        res.status(500).json({
            error: "Internal server error",
            message: err.message,
            stack: err.stack,
        });
    }
};


//* ------------------[Verifies the OTP]---------------------------------------------------------
const verifyOTP = async (req, res) => {
    const { otpValue, otpId } = req.body;

    try {

        const otp = await OTP.findById(otpId);

        if (otpValue !== otp.otpNumber || Date.now() > otp.expiry) return res.status(400).json({
            success: false,
            message: 'Invalid or expired otp'
        });

        //updates the isVerified:false to true.
        const verifiedOtp = await OTP.findByIdAndUpdate(otpId, { $set: { isVerified: true } }, { new: true });

        await OTP.findByIdAndDelete(otpId);

        res.status(200).json({
            success: true,
            otp: verifiedOtp
        });

    } catch (err) {
        console.error(`Error caught verifyOTP in the otpVerification controller${err}`);
        res.status(500).json({
            error: "Internal server error",
            message: err.message,
            stack: err.stack,
        });
    }
};

//* ---------------------[Handles OTP Expiry]-----------------------------------------
const handleOtpExpiry = async (req, res) => {

    try {

        if (!req.query.otpId) {
            return res.status(400).json({
                success: false,
                message: 'Invalid OTP ID'
            });
        }

        const otp = await OTP.findByIdAndDelete(req.query.otpId);

        console.log(otp)

        if (!otp) {
            return res.status(404).json({
                success: false,
                message: 'OTP not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'OTP has been expired',
        });

    } catch (err) {
        console.error(`Error handling OTP expiry: ${err}`);
        res.status(500).json({
            error: "Internal server error",
            message: err.message || 'An error occurred while processing your request.',
            stack: err.stack
        });
    }
};


module.exports = {
    requestOTP,
    verifyOTP,
    handleOtpExpiry,
}