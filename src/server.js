
require('dotenv').config();

const app = require('./app');
const mongoose = require('mongoose');

const NODE_ENV = process.env.NODE_ENV || 'development';
const PORT = process.env.PORT || 3080;

const isProduction = NODE_ENV === 'production';

// Development listens on all interfaces.
// Production listens only on localhost because Nginx is the reverse proxy.
const HOST = isProduction ? '127.0.0.1' : '0.0.0.0';

async function startServer() {
    try {
        if (!process.env.MONGOOSE_URI) {
            throw new Error('MONGOOSE_URI is not configured');
        }

        await mongoose.connect(process.env.MONGOOSE_URI);

        console.log('Connected to MongoDB');

        app.listen(PORT, HOST, () => {
            console.log(
                `BazaarBuzz running in ${NODE_ENV} mode`
            );
            console.log(`Server: http://${HOST}:${PORT}`);
        });

    } catch (error) {
        console.error('Failed to start BazaarBuzz:', error);
        process.exit(1);
    }
}

startServer();
