require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");

const {
    authenticateGoogle,
    handleAuthCallback,
    isAuthenticated,
} = require("./googleAuth"); // Your auth script
const { createStorage } = require("./createStorage"); // Storage setup
const { saveProject } = require("./saveProject");
const { loadProject } = require("./loadProject");
const { listProjects } = require("./listProjects");
const { deleteProject } = require("./deleteProject");
const { createProject } = require("./createProject");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(cors({ origin: process.env.FRONTEND_URL || "*" })); // Replace with your frontend URL for production

// Authenticate with Google
app.get("/auth", (req, res) => {
    if (isAuthenticated()) {
        res.status(200).send("Already authenticated.");
    } else {
        const authUrl = authenticateGoogle();
        res.redirect(authUrl);
    }
});

app.get("/auth/callback", async (req, res) => {
    try {
        const code = req.query.code;
        await handleAuthCallback(code);
        res.status(200).send("Authentication successful!");
    } catch (error) {
        console.error("Auth callback error:", error);
        res.status(500).send({ error: "Authentication failed." });
    }
});

// Create Storage
app.post("/storage/create", async (req, res) => {
    if (!isAuthenticated())
        return res.status(401).send({ error: "Not authenticated." });
    try {
        const result = await createStorage();
        res.status(200).json(result);
    } catch (error) {
        console.error("Error creating storage:", error);
        res.status(500).send({ error: "Error creating storage." });
    }
});

// Create a New Project
app.post("/projects", async (req, res) => {
    if (!isAuthenticated())
        return res.status(401).send({ error: "Not authenticated." });
    const { projectName } = req.body;
    try {
        const result = await createProject(projectName);
        res.status(200).json(result);
    } catch (error) {
        console.error("Error creating project:", error);
        res.status(500).send({ error: "Error creating project." });
    }
});

// Save Project
app.post("/projects/save", async (req, res) => {
    if (!isAuthenticated())
        return res.status(401).send({ error: "Not authenticated." });
    const { projectName, fileContent } = req.body;
    try {
        const result = await saveProject(projectName, fileContent);
        res.status(200).json(result);
    } catch (error) {
        console.error("Error saving project:", error);
        res.status(500).send({ error: "Error saving project." });
    }
});

// Load Project
app.get("/projects/load/:projectName", async (req, res) => {
    if (!isAuthenticated())
        return res.status(401).send({ error: "Not authenticated." });
    const projectName = req.params.projectName;
    try {
        const result = await loadProject(projectName);
        res.status(200).send(result);
    } catch (error) {
        console.error("Error loading project:", error);
        res.status(500).send({ error: "Error loading project." });
    }
});

// List All Projects
app.get("/projects", async (req, res) => {
    if (!isAuthenticated())
        return res.status(401).send({ error: "Not authenticated." });
    try {
        const result = await listProjects();
        res.status(200).json(result);
    } catch (error) {
        console.error("Error listing projects:", error);
        res.status(500).send({ error: "Error listing projects." });
    }
});

// Delete Project
app.delete("/projects/:projectName", async (req, res) => {
    if (!isAuthenticated())
        return res.status(401).send({ error: "Not authenticated." });
    const projectName = req.params.projectName;
    try {
        const result = await deleteProject(projectName);
        res.status(200).json(result);
    } catch (error) {
        console.error("Error deleting project:", error);
        res.status(500).send({ error: "Error deleting project." });
    }
});

// Error Handler Middleware
app.use((err, req, res, next) => {
    console.error("Unhandled error:", err.stack);
    res.status(500).send({ error: "An unexpected error occurred." });
});

// Start Server
app.listen(PORT, () => {
    console.log(`Scribe backend server is running on http://localhost:${PORT}`);
});
