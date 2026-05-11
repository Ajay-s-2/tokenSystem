const dns = require("dns");
const mongoose  = require("mongoose");
const { logger } = require("../shared/utils/logger.util");

const configuredDnsServers =
  process.env.DNS_SERVERS === "system"
    ? []
    : (process.env.DNS_SERVERS || "8.8.8.8,8.8.4.4")
        .split(",")
        .map((server) => server.trim())
        .filter(Boolean);

if (configuredDnsServers.length) {
  dns.setServers(configuredDnsServers);
}


const connectDB = async () => {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error("MONGO_URI is not configured in .env");
  }

  mongoose.set("strictQuery", true);
  await mongoose.connect(uri, {
    family: 4, // Force IPv4
  });

  logger.info("MongoDB connected");
};

module.exports = connectDB;
