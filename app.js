require("dotenv").config();
const express = require("express");
const cors = require("cors");
const routes = require("./routes");
const errorMiddleware = require("./middleware/error.middleware");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./swagger.json");

const app = express();

// Parse JSON bodies
app.use(express.json());

// Enable CORS for API clients
app.use(cors());



// API routes
app.use("/api", routes);

// Swagger docs
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get("/api/docs.json", (req, res) => res.json(swaggerSpec));

// 404 handler for unknown routes
app.use((req, res) => {
  return res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// Central error handler
app.use(errorMiddleware);

module.exports = app;
