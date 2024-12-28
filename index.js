const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const {
    authenticateGoogle,
    handleAuthCallback,
    isAuthenticated,
    logout, // Import logout function
} = require("./auth");
const createHierarchy = require("./api/project/createHierarchy"); // Import createHierarchy route
const { loadProject } = require("./api/project/loadProject"); // Import loadProject route
const { saveProject } = require("./api/project/saveProject"); // Import saveProject route

const app = express();

// Middleware
app.use(
    cors({
        origin: ["http://localhost:3000", "https://scribeaiassistant.netlify.app"], // Frontend origins
        methods: ["GET", "POST", "PUT", "DELETE"], // Allowed methods
        allowedHeaders: ["Content-Type", "Authorization"], // Allowed headers
        credentials: true, // Allow cookies/credentials
    })
);
app.use(bodyParser.json());

// Routes
// Authentication Routes
app.get("/auth/google", authenticateGoogle); // Google OAuth initiation
app.get("/auth/callback", handleAuthCallback); // Google OAuth callback
app.get("/auth/status", isAuthenticated); // Check authentication status
app.post("/auth/logout", logout); // Logout route

// Project Management Routes
app.post("/api/project/createHierarchy", createHierarchy); // Hierarchy creation
app.post("/api/project/load", loadProject); // Load project route
app.post("/api/project/save", saveProject); // Save project route

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

// Start Server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
