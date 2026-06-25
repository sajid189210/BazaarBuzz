const success = (res, data = {}, message = 'Success', statusCode = 200) => {
    return res.status(statusCode).json({
        success: true,
        message,
        ...data
    });
};

const error = (res, message = 'Something went wrong', statusCode = 400, data = {}) => {
    return res.status(statusCode).json({
        success: false,
        message,
        ...data
    });
};

const serverError = (res, err) => {
    console.error(err);
    return res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: err.message
    });
};

module.exports = { success, error, serverError };
