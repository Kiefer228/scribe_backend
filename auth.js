const { google } = require("googleapis");
const fs = require("fs");
const path = require("path");

// Retrieve environment variables directly from Render
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URL; // Use Render's environment variable for the redirect URL

// Initialize OAuth2 Client
const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

// Generate Google OAuth URL
const authenticateGoogle = (req, res) => {
    const authUrl = oauth2Client.generateAuthUrl({
        access_type: "offline",
        scope: ["https://www.googleapis.com/auth/drive.file"], // Adjust the scope as per your app's needs
    });
    res.redirect(authUrl);
};

// Handle Google OAuth callback
const handleAuthCallback = async (req, res) => {
    const code = req.query.code;
    if (!code) {
        return res.status(400).send("Authorization code is missing.");
    }

    try {
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);

        // Save tokens to a temporary file (replace with a secure storage method in production)
        const tokenFilePath = path.join(__dirname, "token.json");
        fs.writeFileSync(tokenFilePath, JSON.stringify(tokens, null, 2));

        console.log("Tokens successfully received and saved.");
        res.status(200).json({ message: "Authenticated successfully!", tokens });
    } catch (error) {
        console.error("Error during authentication callback:", error);
        res.status(500).send("Authentication failed.");
    }
};

// Check if user is authenticated
const isAuthenticated = (req, res) => {
    if (oauth2Client.credentials && oauth2Client.credentials.access_token) {
        res.status(200).json({ authenticated: true });
    } else {
        res.status(401).json({ authenticated: false });
    }
};

module.exports = { authenticateGoogle, handleAuthCallback, isAuthenticated };
