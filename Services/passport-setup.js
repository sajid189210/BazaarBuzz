const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth2');
require('dotenv').config();

passport.use(
    new GoogleStrategy({
        //options for the google strategy
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }), () => {
        //passport callback function.
    }
);