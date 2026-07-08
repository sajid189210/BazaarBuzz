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

    // Mongoose validation errors
    if (err.name === 'ValidationError') {
        const errors = {};

        Object.keys(err.errors).forEach((field) => {
            errors[field] = err.errors[field].message;
        });

        return res.status(400).json({
            success: false,
            message: 'Please correct the highlighted fields.',
            errors
        });
    }

    // Duplicate key error
    if (err.code === 11000) {
        const field = Object.keys(err.keyPattern)[0];

        return res.status(409).json({
            success: false,
            message: `${field} already exists. Please choose another one.`
        });
    }

    // Cast errors (invalid ObjectId, etc.)
    if (err.name === 'CastError') {
        return res.status(400).json({
            success: false,
            message: `Invalid ${err.path}.`
        });
    }

    // Default
    return res.status(500).json({
        success: false,
        message: 'Something went wrong. Please try again later.'
    });
};

module.exports = { success, error, serverError };
