const GoogleStrategy = require('passport-google-oauth2').Strategy;
const passport = require('passport');
const User = require('../model/userModel');

require('dotenv').config();

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3080/auth/google/callback',
    passReqToCallback: true
},
    async (request, accessToken, refreshToken, profile, done) => {
        try {
            // Check for existing user
            let user = await User.findOne({ googleId: profile.id });

            if (user) {
                return done(null, user);
            }

            // Create new user
            const newUser = new User({
                googleId: profile.id,
                username: profile.displayName,
                email: (profile.emails && profile.emails.length > 0) ? profile.emails[0].value : ''
            });

            await newUser.save();
            return done(null, newUser);
        } catch (error) {
            console.error("Error during Google authentication:", error);
            return done(error, null);
        }
    }
));

passport.serializeUser((user, done) => {
    done(null, user.id); // Store only user ID in session
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (error) {
        done(error, null);
    }
});
