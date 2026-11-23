
require('dotenv').config();

const app = require('./app');
const mongoose = require('mongoose');

const NODE_ENV = process.env.NODE_ENV || 'development';
const PORT = process.env.PORT || 3080;

async function startServer() {
    try {
        if (!process.env.MONGOOSE_URI) {
            throw new Error('MONGOOSE_URI is not configured');
        }

        await mongoose.connect(process.env.MONGOOSE_URI);

        console.log('Connected to MongoDB');

        app.listen(PORT, process.env.HOST, () => {
            console.log(
                `BazaarBuzz running in ${NODE_ENV} mode`
            );
            console.log(`Server: http://${process.env.HOST}:${PORT}`);
        });

    } catch (error) {
        console.error('Failed to start BazaarBuzz:', error);
        process.exit(1);
    }
}

startServer();
