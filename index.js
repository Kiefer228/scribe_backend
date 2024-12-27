const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { authenticateGoogle, handleAuthCallback, isAuthenticated } = require("./auth");

const app = express();

// Middleware
app.use(cors({
    origin: ["http://localhost:3000", "https://scribeaiassistant.netlify.app"], // Update with your frontend origins
}));
app.use(bodyParser.json());

// Routes
app.get("/auth/google", authenticateGoogle);
app.get("/auth/callback", handleAuthCallback);
app.get("/auth/status", isAuthenticated);

// Test route
app.get("/", (req, res) => {
    res.json({ message: "Backend is working!" });
});

// Start server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
