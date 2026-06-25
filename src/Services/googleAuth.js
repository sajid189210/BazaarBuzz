// const passport = require('passport');
// const GoogleStrategy = require( 'passport-google-oauth2' ).Strategy;

// passport.use(new GoogleStrategy({
//     clientID:     GOOGLE_CLIENT_ID,
//     clientSecret: GOOGLE_CLIENT_SECRET,
//     callbackURL: "http://localhost:3080/user/homepage",
//     passReqToCallback   : true
//   },
//   function(request, accessToken, refreshToken, profile, done) {
//     User.findOrCreate({ googleId: profile.id }, function (err, user) {
//       return done(err, user);
//     });
//   }
// ));


//auth login
const authLogin = (req, res) => {
    res.send("Logging in");
}

//auth logout
const authLogout = (req, res) => {
    res.send("Logging out");
}

//auth with google
const authWithGoogle = (req, res) => {
    res.send("Logging in with google");
}

module.exports = {
    authLogin,
    authLogout,
    authWithGoogle
}