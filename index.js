require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const { google } = require("googleapis");
const fs = require("fs");
const path = require("path");

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = 'https://scribe-backend-qe3m.onrender.com/auth/callback'; // Update with your deployed backend URL

// Initialize OAuth2 Client
const oauth2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    REDIRECT_URI
);

const app = express();

// Enable CORS for local and production frontends
app.use(
    cors({
        origin: ["http://localhost:3000", "https://scribeaiassistant.netlify.app"], // Add your frontend origins
    })
);
app.use(bodyParser.json());

// Authentication: Initiate Google OAuth
app.get("/auth/google", (req, res) => {
    const authUrl = oauth2Client.generateAuthUrl({
        access_type: "offline",
        scope: ["https://www.googleapis.com/auth/drive.file"], // Google Drive API scope
    });
    res.redirect(authUrl);
});

// Authentication: Handle Google OAuth callback
app.get("/auth/callback", async (req, res) => {
    const code = req.query.code; // Authorization code from Google
    if (!code) {
        return res.status(400).send("Authorization code is missing.");
    }

    try {
        // Exchange authorization code for tokens
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);

        // Save tokens to a temporary file
        const tokenFilePath = path.join(__dirname, "token.json");
        fs.writeFileSync(tokenFilePath, JSON.stringify(tokens, null, 2));

        // Initialize Google Drive API
        const drive = google.drive({ version: "v3", auth: oauth2Client });

        // Upload the token file to Google Drive
        const fileMetadata = {
            name: "google_auth_token.json",
            mimeType: "application/json",
        };
        const media = {
            mimeType: "application/json",
            body: fs.createReadStream(tokenFilePath),
        };
        const response = await drive.files.create({
            resource: fileMetadata,
            media: media,
            fields: "id",
        });

        console.log("Token stored in Google Drive with file ID:", response.data.id);

        // Clean up the temporary file
        fs.unlinkSync(tokenFilePath);

        res.status(200).json({
            message: "Authentication successful! Token saved to your Google Drive.",
            fileId: response.data.id, // Return the file ID to the user if needed
        });
    } catch (error) {
        console.error("Error during authentication callback:", error);
        res.status(500).send("Authentication failed.");
    }
});

// Authentication: Check authentication status
app.get("/auth/status", (req, res) => {
    if (oauth2Client.credentials) {
        res.status(200).json({ authenticated: true });
    } else {
        res.status(401).json({ authenticated: false });
    }
});

// Example project management route
app.post("/projects/save", async (req, res) => {
    const { projectData } = req.body;
    try {
        // Replace this with your save logic
        const result = { id: 1, ...projectData };
        res.status(200).json({ message: "Project saved successfully!", result });
    } catch (error) {
        res.status(500).json({ message: "Error saving project", error });
    }
});

app.get("/projects/load/:id", async (req, res) => {
    const projectId = req.params.id;
    try {
        // Replace this with your load logic
        const project = { id: projectId, name: "Sample Project" };
        res.status(200).json({ project });
    } catch (error) {
        res.status(500).json({ message: "Error loading project", error });
    }
});

// Test route
app.get("/", (req, res) => {
    res.json({ message: "Backend is working!" });
});

// Start server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Backend server running on port ${PORT}`));
