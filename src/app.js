const express = require('express');
const nocache = require('nocache');
const session = require('express-session');
const passport = require('passport');
const passportSetUp = require('./Services/passport-setup');
const response = require('./Services/responseMapper');
const flash = require('connect-flash');
const path = require('path');
const app = express();
const dotenv = require('dotenv').config();
const morgan = require('morgan');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const expressLayouts = require('express-ejs-layouts');


//* Middleware Setup
app.use(nocache());
// app.use(helmet());
app.use(cors());
app.use(morgan('dev'));

app.use(session({
    secret: process.env.SECRET_KEY,
    resave: false,
    saveUninitialized: false
}));

app.use(flash());


//* Parsing Middleware 
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    statusCode: 429,
    message: {
        success: false,
        message: "Too many requests. Please try again later."
    }
}));


//* Passport initialization
app.use(passport.initialize());
app.use(passport.session());


//* View setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

//* Express EJS Layouts
app.use(expressLayouts);
app.set('layout', 'layout'); // Default layout for all views

const { PAYMENT_SOURCE_COD, PAYMENT_SOURCE_RAZORPAY, PAYMENT_SOURCE_WALLET } = require('./constants/paymentSources');

//* Initialize shared locals for all templates
app.use((req, res, next) => {
    res.locals.blocks = {};
    res.locals.categories = [];
    res.locals.searchBox = false;
    res.locals.user = null;
    res.locals.hideUI = false;
    res.locals.bodyClass = 'antialiased';
    res.locals.PAYMENT_SOURCE_COD = PAYMENT_SOURCE_COD;
    res.locals.PAYMENT_SOURCE_RAZORPAY = PAYMENT_SOURCE_RAZORPAY;
    res.locals.PAYMENT_SOURCE_WALLET = PAYMENT_SOURCE_WALLET;
    next();
});


//* Static files
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));


//* Route Setup
const adminRouter = require('./routes/adminRouter');
const userRouter = require('./routes/userRouter');
const authRouter = require('./routes/authRouter');


app.use('/admin', adminRouter);
app.use('/user', userRouter);
app.use('/auth', authRouter);
app.use('/', userRouter);


//* Error handling middleware.
app.use((err, req, res, next) => {
    console.error(err.stack);
    response.serverError(res, err);
});


app.get('*', (req, res) => {
    res.status(404).render('partials/404Page', { layout: false, title: '404 - Page Not Found' });
});


module.exports = app;