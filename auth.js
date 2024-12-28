const { google } = require("googleapis");
const fs = require("fs");
const path = require("path");

// Retrieve environment variables directly from Render
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URL;

if (!CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI) {
    console.error("Missing Google OAuth environment variables.");
}

// Initialize OAuth2 Client
const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

// Helper: Load tokens from storage
const loadTokens = () => {
    try {
        const tokenFilePath = path.join(__dirname, "token.json");
        if (fs.existsSync(tokenFilePath)) {
            const tokens = JSON.parse(fs.readFileSync(tokenFilePath, "utf8"));
            oauth2Client.setCredentials(tokens);
            console.log("Tokens loaded from file.");
            return tokens;
        }
        console.log("No token file found.");
        return null;
    } catch (error) {
        console.error("Error loading tokens:", error);
        return null;
    }
};

// Helper: Save tokens to storage
const saveTokens = (tokens) => {
    try {
        const tokenFilePath = path.join(__dirname, "token.json");
        fs.writeFileSync(tokenFilePath, JSON.stringify(tokens, null, 2));
        console.log("Tokens saved to file:", tokenFilePath);
    } catch (error) {
        console.error("Error saving tokens:", error);
    }
};

// Generate Google OAuth URL
const authenticateGoogle = (req, res) => {
    try {
        // Check if a valid token already exists
        if (oauth2Client.credentials && oauth2Client.credentials.access_token) {
            console.log("User is already authenticated. Skipping OAuth flow.");
            return res.redirect("https://scribeaiassistant.netlify.app/?auth=true");
        }

        const authUrl = oauth2Client.generateAuthUrl({
            access_type: "offline", // Requests offline access for refresh tokens
            scope: ["https://www.googleapis.com/auth/drive.file"], // Adjust as needed
        });

        console.log("Redirecting to Google OAuth URL:", authUrl);
        res.redirect(authUrl);
    } catch (error) {
        console.error("Error generating Google OAuth URL:", error);
        res.status(500).send("Failed to initiate Google OAuth.");
    }
};

// Handle Google OAuth callback
const handleAuthCallback = async (req, res) => {
    try {
        console.log("Callback request query parameters:", req.query);

        const code = req.query.code;
        if (!code) {
            console.error("Authorization code is missing. Received query parameters:", req.query);
            return res.status(400).send("Authorization code is missing.");
        }

        // Exchange the authorization code for tokens
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);
        console.log("Tokens successfully received:", tokens);

        // Save tokens to persistent storage
        saveTokens(tokens);

        // Redirect back to your frontend with the access token and success indicator
        const frontendUrl = "https://scribeaiassistant.netlify.app/"; // Frontend's URL
        res.redirect(`${frontendUrl}?auth=true&accessToken=${tokens.access_token}`);
    } catch (error) {
        console.error("Error during OAuth callback processing:", error);
        res.status(500).send("Authentication failed.");
    }
};

// Refresh access token if needed
const refreshAccessToken = async () => {
    try {
        if (oauth2Client.credentials && oauth2Client.credentials.refresh_token) {
            console.log("Refreshing access token...");
            const { credentials } = await oauth2Client.refreshAccessToken();
            oauth2Client.setCredentials(credentials);
            saveTokens(credentials);
            console.log("Access token refreshed successfully.");
            return credentials.access_token;
        } else {
            console.error("No refresh token available. User needs to reauthenticate.");
            return null;
        }
    } catch (error) {
        console.error("Error refreshing access token:", error);
        return null;
    }
};

// Check if user is authenticated
const isAuthenticated = (req, res) => {
    try {
        const tokens = loadTokens();
        if (tokens && tokens.access_token) {
            console.log("User is authenticated.");
            res.status(200).json({ authenticated: true });
        } else {
            console.log("User is not authenticated.");
            res.status(401).json({ authenticated: false });
        }
    } catch (error) {
        console.error("Error checking authentication status:", error);
        res.status(500).send("Failed to check authentication status.");
    }
};

module.exports = { 
    oauth2Client, 
    authenticateGoogle, 
    handleAuthCallback, 
    isAuthenticated, 
    refreshAccessToken 
};
