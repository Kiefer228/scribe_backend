require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");

const {
    authenticateGoogle,
    handleAuthCallback,
    isAuthenticated,
} = require("./googleAuth"); // Authentication script
const { createStorage } = require("./createStorage"); // Storage setup
const { saveProject } = require("./saveProject");
const { loadProject } = require("./loadProject");

const app = express();
app.use(
    cors({
        origin: "*", // Allow all origins for testing. Restrict in production.
        methods: ["GET", "POST"], // Allow necessary methods
        allowedHeaders: ["Content-Type"], // Restrict headers if needed
    })
);
app.use(bodyParser.json());

// Define API routes
const router = express.Router();

// Google Authentication
router.get("/auth", async (req, res) => {
    try {
        const authUrl = authenticateGoogle();
        res.json({ authUrl });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get("/auth/callback", async (req, res) => {
    try {
        const tokens = await handleAuthCallback(req.query.code);
        res.json({ tokens });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Google Drive Setup
router.post("/setup", async (req, res) => {
    try {
        const result = await createStorage();
        res.json({ result });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Save Project
router.post("/project/save", async (req, res) => {
    try {
        const { projectName, fileContent } = req.body;
        const result = await saveProject(projectName, fileContent);
        res.json({ result });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Load Project
router.get("/project/load", async (req, res) => {
    try {
        const { projectName } = req.query;
        const result = await loadProject(projectName);
        res.json({ result });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Use the router
app.use("/api", router);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
