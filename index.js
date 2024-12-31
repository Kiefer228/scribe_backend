// Required modules
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const rateLimit = require("express-rate-limit");
const NodeCache = require("node-cache");
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

// Initialize cache
const authCache = new NodeCache({ stdTTL: 300 }); // Cache entries for 5 minutes

// Middleware: Define allowed origins for CORS dynamically
const allowedOrigins = (process.env.ALLOWED_ORIGINS?.split(",") || [
    "http://localhost:3000",
    "https://scribeaiassistant.netlify.app",
]).filter(origin => /^[a-zA-Z0-9:\/\.\-]+$/.test(origin)); // Validate origin structure

app.use(
    cors({
        origin: (origin, callback) => {
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                console.error(`[CORS] Blocked origin: ${origin}`);
                callback(new Error("Not allowed by CORS"));
            }
        },
        methods: ["GET", "POST", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
        credentials: true,
    })
);

// Middleware: Handle preflight requests
app.options("*", cors());

// Middleware: Parse JSON request bodies
app.use(bodyParser.json());

// Rate Limiter: Protect authentication routes
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.RATE_LIMIT_MAX || 100, // Configurable max requests
    message: { error: "Too many requests from this IP, please try again later." },
});

// Middleware: Ensure user authentication for sensitive routes
const ensureAuthenticated = async (req, res, next) => {
    const cacheKey = req.ip;
    const cachedAuth = authCache.get(cacheKey);

    if (cachedAuth) {
        console.log(`[ensureAuthenticated] Cache hit for IP: ${req.ip}`);
        if (cachedAuth.authenticated) {
            return next();
        } else {
            return res.status(401).json({ error: "Unauthorized access. Please authenticate first." });
        }
    }

    try {
        const authStatus = await isAuthenticated(req);
        authCache.set(cacheKey, authStatus); // Cache the authentication result
        if (authStatus?.authenticated) {
            next();
        } else {
            console.warn(`[ensureAuthenticated] Unauthorized access attempt from IP: ${req.ip}`);
            res.status(401).json({ error: "Unauthorized access. Please authenticate first." });
        }
    } catch (error) {
        console.error(`[ensureAuthenticated] Error during authentication check from IP: ${req.ip}`, error.message || error);
        res.status(500).json({ error: "Internal Server Error during authentication check." });
    }
};

// Routes: Authentication
app.get("/auth/google", authLimiter, authenticateGoogle);
app.get("/auth/callback", authLimiter, handleAuthCallback);
app.get("/auth/status", authLimiter, async (req, res) => {
    try {
        const status = await isAuthenticated(req);
        console.log(`[auth/status] Status check for IP: ${req.ip} - Authenticated: ${status?.authenticated}`);
        res.status(200).json(status);
    } catch (error) {
        console.error("[/auth/status] Error for IP:", req.ip, error.message || error);
        res.status(500).json({ error: "Failed to check authentication status." });
    }
});
app.post("/auth/logout", authLimiter, async (req, res) => {
    try {
        await logout(req, res);
    } catch (error) {
        console.error("[/auth/logout] Error:", error.message || error);
        res.status(500).json({ error: "Failed to log out." });
    }
});

// Routes: Project Management
app.post("/api/project/createHierarchy", ensureAuthenticated, async (req, res) => {
    const { projectName } = req.body;

    if (!projectName) {
        console.error("[/api/project/createHierarchy] Missing project name.");
        return res.status(400).json({ error: "Project name is required." });
    }

    try {
        await createHierarchy({ projectName });
        res.status(200).json({ message: `Hierarchy for "${projectName}" created successfully.` });
    } catch (error) {
        console.error("[/api/project/createHierarchy] Error:", error.message || error);
        res.status(500).json({ error: "Failed to create project hierarchy." });
    }
});

app.get("/api/project/load", ensureAuthenticated, async (req, res) => {
    const { projectName } = req.query;

    if (!projectName) {
        console.error("[/api/project/load] Missing project name.");
        return res.status(400).json({ error: "Project name is required." });
    }

    try {
        const content = await loadProject(projectName);
        res.status(200).json({ content });
    } catch (error) {
        console.error("[/api/project/load] Error:", error.message || error);
        res.status(500).json({ error: "Failed to load project." });
    }
});

app.post("/api/project/save", ensureAuthenticated, async (req, res) => {
    const { projectName, content } = req.body;

    if (!projectName || !content) {
        console.error("[/api/project/save] Missing projectName or content.");
        return res.status(400).json({ error: "Project name and content are required." });
    }

    try {
        await saveProject({ projectName, content });
        res.status(200).json({ message: `Project "${projectName}" saved successfully.` });
    } catch (error) {
        console.error("[/api/project/save] Error:", error.message || error);
        res.status(500).json({ error: "Failed to save project." });
    }
});

// Health Check Route
app.get("/", (req, res) => {
    res.json({ message: "Backend is working!" });
});

// Catch-all Route for Undefined Routes
app.use((req, res) => {
    console.warn(`[404] Route not found: ${req.method} ${req.originalUrl}, Headers: ${JSON.stringify(req.headers)}`);
    res.status(404).json({ error: "Route not found" });
});

// Global Error Handling Middleware
app.use((err, req, res, next) => {
    const errorType = err.name || "UnknownError";
    const errorDetails = {
        type: errorType,
        message: err.message || "No error message provided",
        stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    };
    console.error(`[Global Error Handler]`, errorDetails);
    res.status(500).json({ error: `Internal Server Error: ${errorType}` });
});

// Start Server with Specified PORT
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
