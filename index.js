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

// Middleware: Define allowed origins for CORS
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
        methods: ["GET", "POST", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
        credentials: true, // Allow cookies and credentials
    })
);

// Middleware: Handle preflight requests
app.options("*", cors());

// Middleware: Parse JSON request bodies
app.use(bodyParser.json());

// Middleware: Ensure user authentication for sensitive routes
const ensureAuthenticated = async (req, res, next) => {
    try {
        const authStatus = await isAuthenticated(req, res);
        if (authStatus && authStatus.authenticated) {
            next();
        } else {
            console.warn("[index.js] Unauthorized access attempt.");
            res.status(401).json({ error: "Unauthorized access. Please authenticate first." });
        }
    } catch (error) {
        console.error("[index.js] Error in ensureAuthenticated middleware:", error.message || error);
        res.status(500).json({ error: "Internal Server Error during authentication check." });
    }
};

// Routes: Authentication
app.get("/auth/google", authenticateGoogle);
app.get("/auth/callback", handleAuthCallback);
app.get("/auth/status", async (req, res) => {
    try {
        const status = await isAuthenticated(req, res);
        res.status(200).json(status);
    } catch (error) {
        console.error("[index.js] Error checking authentication status:", error.message);
        res.status(500).json({ error: "Failed to check authentication status." });
    }
});
app.post("/auth/logout", logout);

// Routes: Project Management
app.post("/api/project/createHierarchy", ensureAuthenticated, async (req, res) => {
    const { projectName } = req.body;

    if (!projectName) {
        console.error("[index.js] Missing project name in createHierarchy request.");
        return res.status(400).json({ error: "Project name is required." });
    }

    try {
        await createHierarchy({ projectName });
        res.status(200).json({ message: `Hierarchy for "${projectName}" created successfully.` });
    } catch (error) {
        console.error("[index.js] Error creating project hierarchy:", error.message || error);
        res.status(500).json({ error: "Failed to create project hierarchy." });
    }
});

app.get("/api/project/load", ensureAuthenticated, async (req, res) => {
    const { projectName } = req.query;

    if (!projectName) {
        console.error("[index.js] Missing projectName query parameter in load request.");
        return res.status(400).json({ error: "Project name is required." });
    }

    try {
        const content = await loadProject(projectName);
        res.status(200).json({ content });
    } catch (error) {
        console.error("[index.js] Error loading project:", error.message || error);
        res.status(500).json({ error: "Failed to load project." });
    }
});

app.post("/api/project/save", ensureAuthenticated, async (req, res) => {
    const { projectName, content } = req.body;

    if (!projectName || !content) {
        console.error("[index.js] Missing projectName or content in save request.");
        return res.status(400).json({ error: "Project name and content are required." });
    }

    try {
        await saveProject({ projectName, content });
        res.status(200).json({ message: `Project "${projectName}" saved successfully.` });
    } catch (error) {
        console.error("[index.js] Error saving project:", error.message || error);
        res.status(500).json({ error: "Failed to save project." });
    }
});

// Health Check Route
app.get("/", (req, res) => {
    res.json({ message: "Backend is working!" });
});

// Catch-all Route for Undefined Routes
app.use((req, res) => {
    res.status(404).json({ error: "Route not found" });
});

// Global Error Handling Middleware
app.use((err, req, res, next) => {
    console.error("[index.js] Unhandled server error:", err.message || err);
    res.status(500).json({ error: "Internal Server Error" });
});

// Start Server with Specified PORT
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
