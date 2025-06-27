import "dotenv/config";
import mongoose from "mongoose";

function connectDB ()
{
    mongoose.connect(process.env.MONGO_URL)
    .then(()=> console.log("Database connected"))
    .catch((err)=> console.log("Failed to connect to database ", err));
}

export default connectDB;