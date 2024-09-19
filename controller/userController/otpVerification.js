const User = require('../../model/userModel');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
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
    if (email) return await User.findOne({ email });
    else throw new Error("User not found");
}

const generateOTP = (user) => {
    const otp = crypto.randomInt(1000, 9999);
    user.otp = otp;
    user.otpExpires = Date.now() + 1 *60 * 1000;
    return otp;
};

const requestOTP = async (req, res) => {
    const { email } = req.body;

    try {

        const user = await getUser(email)

        if (!user) return res.status(400).json({
            success: false,
            message: 'User not found'
        });

        const otp = generateOTP(user);

        try {
            await user.save();
        } catch (err) {
            throw new Error('Failed to store otp details in db.', err);
        }

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Password reset OTP',
            text: `Your OTP is ${otp}. It is valid for 1 minutes.`
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

            // console.log('Email sent successfully:', info.response);
            res.status(200).json({
                success: true,
                message: 'OTP sent to your email'
            });
        });

    } catch (err) {
        console.error(`Error caught forgotPassword in the otpVerification controller${err}`);
        res.status(500).json({
            error: "Internal server error",
            message: err.message,
            stack: err.stack,
        });
    }
};


const verifyOTP = async (req, res) => {
    const { email, otpValue } = req.body;

    try {

        const user = await getUser(email);

        if (!user || user.otp !== otpValue || Date.now() > user.otpExpires) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired otp'
            });
        }

        req.session.user = { _id: user._id, email: user.email };

        res.status(200).json({ success: true });

    } catch (err) {
        console.error(`Error caught verifyOTP in the otpVerification controller${err}`);
        res.status(500).json({
            error: "Internal server error",
            message: err.message,
            stack: err.stack,
        });
    }
};

const handleOtpExpiry = async (req, res) => {
    const { email } = req.body;
    try {

        const user = await getUser(email);

        await User.updateOne(
            { email },
            { $set: { otp: null, otpExpires: null } }
        );

    } catch (err) {
        console.error(`Error caught verifyOTP in the handleOtpExpiry controller${err}`);
        res.status(500).json({
            error: "Internal server error",
            message: err.message,
            stack: err.stack,
        });
    }
};

module.exports = {
    requestOTP,
    verifyOTP,
    handleOtpExpiry,
}