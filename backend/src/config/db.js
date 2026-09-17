const mongoose = require("mongoose");

const connectDB = async () => {
    try {
        const connection = await mongoose.connect(process.env.MONGODB_URI);

        console.log(`MongoDB connected: ${connection.connection.host}`);
    } catch (error) {
        console.error("MongoDB connection failed:");

        if (error.reason?.servers) {
            for (const [server, description] of error.reason.servers) {
                console.error(`\nSERVER: ${server}`);
                console.error(description.error);
            }
        } else {
            console.error(error);
        }

        process.exit(1);
    }

};

module.exports = connectDB;