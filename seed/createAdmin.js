const mongoose = require('mongoose');
require('dotenv').config();
const Admin = require('../src/model/adminModel');
const bcrypt = require('bcryptjs');

const emailArg = process.argv[2];
const passwordArg = process.argv[3];

if (!emailArg || !passwordArg) {
    console.error('\x1b[31m%s\x1b[0m', 'Error: Please provide both an email and a password.');
    console.log('Usage: node createAdmin.js <email> <password>');
    process.exit(1);
}

async function createAdmin() {
    try {
        const dbUri = process.env.MONGOOSE_URI;
        await mongoose.connect(dbUri);
        console.log('Connected to  the database');

        const existingAdmin = await Admin.findOne({ email: emailArg });
        if (existingAdmin) {
            console.log(`\x1b[33m%s\x1b[0m`, `User with email ${emailArg} already exists.`);
            process.exit(0);
        }

        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(passwordArg, saltRounds);

        const adminUser = new Admin({
            email: emailArg,
            password: hashedPassword,
        });

        await adminUser.save();
        console.log('\x1b[32m%s\x1b[0m', `Successfully created admin: ${emailArg}`);

    } catch (error) {
        console.error('Error creating admin:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Database disconnected'); 
        process.exit(0);
    }
}

createAdmin();