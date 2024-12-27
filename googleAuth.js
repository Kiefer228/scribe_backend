const { google } = require("googleapis");
require("dotenv").config();

const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
);

// Scopes for accessing Google Drive
const SCOPES = ["https://www.googleapis.com/auth/drive.file"];

// Generate an authentication URL
function authenticateGoogle() {
    return oauth2Client.generateAuthUrl({
        access_type: "offline", // To get refresh tokens
        scope: SCOPES,
    });
}

// Handle Google OAuth callback
async function handleAuthCallback(code) {
    try {
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);
        return tokens;
    } catch (err) {
        console.error("Error while exchanging code for tokens:", err);
        throw new Error("Authentication failed.");
    }
}

// Middleware to verify if user is authenticated
function isAuthenticated(req, res, next) {
    if (!oauth2Client.credentials) {
        return res.status(401).json({ error: "User not authenticated" });
    }
    next();
}

module.exports = {
    authenticateGoogle,
    handleAuthCallback,
    isAuthenticated,
};
