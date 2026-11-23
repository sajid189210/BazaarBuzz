const express = require('express');
const compression = require('compression');
const nocache = require('nocache');
const session = require('express-session');
const passport = require('passport');
require('./Services/passport-setup');
const response = require('./Services/responseMapper');
const flash = require('connect-flash');
const path = require('path');
const app = express();
const morgan = require('morgan');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const expressLayouts = require('express-ejs-layouts');
const MongoStore = require('connect-mongo').MongoStore || require('connect-mongo');


//* Middleware Setup
app.use(compression());
app.use(nocache());
app.use(cors());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
 

// Trust the first proxy (Nginx / Render / AWS ALB)
app.set('trust proxy', 1);

app.use(session({
    name: 'bazaarbuzz.sid',
    secret: process.env.SECRET_KEY,
    resave: false,
    saveUninitialized: false,

    store: MongoStore.create({
        mongoUrl: process.env.MONGOOSE_URI,
        collectionName: 'sessions',
        ttl: 14 * 24 * 60 * 60
    }),

    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 14 * 24 * 60 * 60 * 1000
    }
}));

app.use(flash());


//* Parsing Middleware 
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

//* Passport initialization
app.use(passport.initialize());
app.use(passport.session());

app.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10000,
    standardHeaders: true,
    legacyHeaders: false,
    statusCode: 429,
    message: {
        success: false,
        message: "Too many requests. Please try again later."
    }
}));


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
    res.locals.supportEmail = process.env.SUPPORT_EMAIL || 'support@bazaarbuzz.com';
    next();
});


//* Static files
app.use(express.static(path.join(__dirname, '..', 'public'), {
    maxAge: '1y',
    immutable: true
}));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads'), {
    maxAge: '7d'
}));


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