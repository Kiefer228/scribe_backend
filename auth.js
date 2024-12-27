const { google } = require("googleapis");
const fs = require("fs");
const path = require("path");

// Retrieve environment variables directly from Render
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URL; // Ensure this matches the URI registered in Google Cloud Console

if (!CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI) {
    console.error("Missing Google OAuth environment variables.");
}

// Initialize OAuth2 Client
const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

// Generate Google OAuth URL
const authenticateGoogle = (req, res) => {
    try {
        const authUrl = oauth2Client.generateAuthUrl({
            access_type: "offline", // Requests offline access (required for refresh tokens)
            scope: ["https://www.googleapis.com/auth/drive.file"], // Adjust the scope as per your app's needs
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

        // Save tokens to a temporary file (replace with secure storage in production)
        const tokenFilePath = path.join(__dirname, "token.json");
        fs.writeFileSync(tokenFilePath, JSON.stringify(tokens, null, 2));
        console.log("Tokens saved to file:", tokenFilePath);

        // Redirect back to your frontend with the access token and success indicator
        const frontendUrl = "https://scribeaiassistant.netlify.app/"; // Frontend's URL
        res.redirect(`${frontendUrl}?auth=true&accessToken=${tokens.access_token}`);
    } catch (error) {
        console.error("Error during OAuth callback processing:", error);
        res.status(500).send("Authentication failed.");
    }
};

// Check if user is authenticated
const isAuthenticated = (req, res) => {
    try {
        if (oauth2Client.credentials && oauth2Client.credentials.access_token) {
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

module.exports = { oauth2Client, authenticateGoogle, handleAuthCallback, isAuthenticated };
