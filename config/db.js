const dns = require("dns");
// FIX: Force reliable DNS for SRV lookups
dns.setServers(["8.8.8.8", "8.8.4.4"]);
const mongoose  = require("mongoose");


const connectDB = async () => {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error("MONGO_URI is not configured in .env");
  }

  mongoose.set("strictQuery", true);
  await mongoose.connect(uri, {
    family: 4, // Force IPv4
  });

  console.log("MongoDB connected");
};

module.exports = connectDB;
