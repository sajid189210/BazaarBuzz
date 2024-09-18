const session = require('express-session');
const dotenv = require('dotenv').config();
const flash = require('connect-flash');
const nocache = require('nocache');
const express = require('express');
const path = require('path');
const app = express();

//mounting the nocache middleware for disabling caching of HTTP responses.
app.use(nocache());

//setting the session.
app.use(session({
    secret: process.env.SECRET_KEY,
    resave: false,
    saveUninitialized: false
}));

//to store messages temporarily in the session.
app.use(flash());

//*requiring admin router
const adminRouter = require('./routes/adminRouter');

//*requiring user router
const userRouter = require('./routes/userRouter');

//*requiring auth router
const authRouter = require('./routes/authRouter')

//setting the directory for a view template.
app.set('views', path.join(__dirname, 'views'));

//setting EJS as the view template.
app.set('view engine', 'ejs');

//serve static files from the public directory.
app.use(express.static(path.join(__dirname, 'public')));

//middleware to parse JSON and url-encoded data.
app.use(express.urlencoded({ extended: true }));

app.use(express.json());

//*admin router
app.use('/admin', adminRouter);

//*User Router
app.use('/user', userRouter);

//*Auth Router
app.use('/auth', authRouter);

module.exports = app;