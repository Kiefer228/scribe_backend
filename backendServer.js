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
        origin: "http://localhost:3000", // Frontend origin for local development
    })
);
app.use(bodyParser.json());

// Authentication routes
app.get("/auth/google", authenticateGoogle); // Initiate Google OAuth
app.get("/auth/callback", handleAuthCallback); // Handle Google OAuth callback
app.get("/auth/status", isAuthenticated); // Check authentication status

// Project management routes
app.post("/projects/save", async (req, res) => {
    const { projectData } = req.body;
    try {
        const result = await saveProject(projectData);
        res.status(200).json({ message: "Project saved successfully!", result });
    } catch (error) {
        res.status(500).json({ message: "Error saving project", error });
    }
});

app.get("/projects/load/:id", async (req, res) => {
    const projectId = req.params.id;
    try {
        const project = await loadProject(projectId);
        res.status(200).json({ project });
    } catch (error) {
        res.status(500).json({ message: "Error loading project", error });
    }
});

// Start server
const PORT = process.env.PORT || 4000; // Ensure no conflict with frontend dev server
app.listen(PORT, () => console.log(`Backend server running on port ${PORT}`));
