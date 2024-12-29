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
const allowedOrigins = ["http://localhost:3000", "https://scribeaiassistant.netlify.app"];
app.use(
    cors({
        origin: (origin, callback) => {
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                callback(new Error("Not allowed by CORS"));
            }
        },
        methods: ["GET", "POST", "OPTIONS"], // Include OPTIONS for preflight requests
        allowedHeaders: ["Content-Type", "Authorization"],
        credentials: true, // Allow cookies and credentials
    })
);

// Handle Preflight Requests Globally
app.options("*", cors());

// Parse JSON request bodies
app.use(bodyParser.json());

// Routes
// Authentication Routes
app.get("/auth/google", authenticateGoogle);
app.get("/auth/callback", handleAuthCallback);
app.get("/auth/status", isAuthenticated);
app.post("/auth/logout", logout);

// Project Management Routes
app.post("/api/project/createHierarchy", async (req, res) => {
    const { projectName } = req.body;

    if (!projectName) {
        return res.status(400).json({ error: "Project name is required." });
    }

    try {
        await createHierarchy({ projectName });
        res.status(200).json({ message: `Hierarchy for "${projectName}" created successfully.` });
    } catch (error) {
        console.error("Error creating project hierarchy:", error);
        res.status(500).json({ error: "Failed to create project hierarchy." });
    }
});

app.get("/api/project/load", async (req, res) => {
    const { projectName } = req.query;

    if (!projectName) {
        console.error("[loadProject] Missing projectName query parameter.");
        return res.status(400).json({ error: "Project name is required." });
    }

    try {
        const content = await loadProject(projectName); // Pass projectName directly
        res.status(200).json({ content });
    } catch (error) {
        console.error("Error loading project:", error.message || error);
        res.status(500).json({ error: "Failed to load project." });
    }
});

app.post("/api/project/save", async (req, res) => {
    const { projectName, content } = req.body;

    if (!projectName || !content) {
        return res.status(400).json({ error: "Project name and content are required." });
    }

    try {
        await saveProject({ projectName, content });
        res.status(200).json({ message: `Project "${projectName}" saved successfully.` });
    } catch (error) {
        console.error("Error saving project:", error.message || error);
        res.status(500).json({ error: "Failed to save project." });
    }
});

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
    console.error("Unhandled server error:", err.message || err);
    res.status(500).json({ error: "Internal Server Error" });
});

// Start Server with Specified PORT
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
