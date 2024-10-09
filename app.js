const express = require('express');
const nocache = require('nocache');
const session = require('express-session');
const passport = require('passport');
const passportSetUp = require('./Services/passport-setup');
const flash = require('connect-flash');
const path = require('path');
const app = express();
const dotenv = require('dotenv').config();
const morgan = require('morgan');
const helmet = require('helmet');
const cors = require('cors');

//* Middleware Setup
app.use(nocache());
// app.use(helmet());
// app.use(cors());
// app.use(morgan('dev'));

app.use(session({
    secret: process.env.SECRET_KEY,
    resave: false,
    saveUninitialized: false
}));

app.use(flash());


//* Parsing Middleware 
app.use(express.urlencoded({ extended: true }));
app.use(express.json());


//* Passport initialization
app.use(passport.initialize());
app.use(passport.session());


//* View setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');


//* Static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


//* Route Setup
const adminRouter = require('./routes/adminRouter');
const userRouter = require('./routes/userRouter');
const authRouter = require('./routes/authRouter');


app.use('/admin', adminRouter);
app.use('/user', userRouter);
app.use('/auth', authRouter);

//* Error handling middleware.
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        Error: err.message,
        message: 'Something went wrong!',
        stack: err.stack
    });
});



module.exports = app;