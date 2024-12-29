const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const {
    authenticateGoogle,
    handleAuthCallback,
    isAuthenticated,
    logout,
} = require("./api/auth");
const { createHierarchy } = require("./api/project/createHierarchy");
const { loadProject } = require("./api/project/loadProject");
const { saveProject } = require("./api/project/saveProject");

const app = express();

// Middleware
app.use(
    cors({
        origin: ["http://localhost:3000", "https://scribeaiassistant.netlify.app"],
        methods: ["GET", "POST", "PUT", "DELETE"],
        allowedHeaders: ["Content-Type", "Authorization"],
        credentials: true,
    })
);
app.use(bodyParser.json());

// Routes
// Authentication Routes
app.get("/auth/google", authenticateGoogle);
app.get("/auth/callback", handleAuthCallback);
app.get("/auth/status", isAuthenticated);
app.post("/auth/logout", logout);

// Project Management Routes
app.post("/api/project/createHierarchy", createHierarchy);
app.post("/api/project/load", loadProject);
app.post("/api/project/save", saveProject);

// Health Check Route
app.get("/", (req, res) => {
    res.json({ message: "Backend is working!" });
});

// Handle Undefined Routes
app.use((req, res) => {
    res.status(404).json({ error: "Route not found" });
});

// Global Error Handling Middleware
app.use((err, req, res, next) => {
    console.error("Unhandled server error:", err);
    res.status(500).json({ error: "Internal Server Error" });
});

// Start Server with Specified PORT
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
