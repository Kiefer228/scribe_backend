const { google } = require("googleapis");
const fs = require("fs");
const path = require("path");

// Retrieve environment variables
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URL;
const SCOPES = process.env.GOOGLE_OAUTH_SCOPES || ["https://www.googleapis.com/auth/drive.file"];

if (!CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI) {
    throw new Error("[auth.js] Missing required Google OAuth environment variables.");
}

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

// Helper: Load tokens from storage
const loadTokens = () => {
    try {
        const tokenFilePath = path.join(__dirname, "token.json");
        if (fs.existsSync(tokenFilePath)) {
            const tokens = JSON.parse(fs.readFileSync(tokenFilePath, "utf8"));
            oauth2Client.setCredentials(tokens);
            return tokens;
        }
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
    } catch (error) {
        console.error("Error saving tokens:", error);
    }
};

// Helper: Remove tokens from storage
const removeTokens = () => {
    try {
        const tokenFilePath = path.join(__dirname, "token.json");
        if (fs.existsSync(tokenFilePath)) {
            fs.unlinkSync(tokenFilePath); // Delete the token file
            console.log("[Logout] Tokens removed successfully.");
        }
    } catch (error) {
        console.error("[Logout] Error removing tokens:", error);
    }
};

// Validate tokens and refresh if necessary
const validateTokens = async () => {
    try {
        const tokens = loadTokens();
        if (!tokens || !tokens.access_token) {
            console.log("[validateTokens] No valid tokens found. Re-authentication required.");
            return false;
        }

        oauth2Client.setCredentials(tokens);

        // Test the access token
        try {
            await oauth2Client.getAccessToken();
            return true;
        } catch {
            console.log("[validateTokens] Access token expired. Attempting to refresh...");
            if (tokens.refresh_token) {
                const refreshedTokens = await oauth2Client.refreshAccessToken();
                oauth2Client.setCredentials(refreshedTokens.credentials);
                saveTokens(refreshedTokens.credentials);
                return true;
            } else {
                console.log("[validateTokens] No refresh token available. Re-authentication required.");
                removeTokens(); // Clear any invalid tokens
                return false;
            }
        }
    } catch (error) {
        console.error("[validateTokens] Error validating tokens:", error);
        return false;
    }
};

// Check if user is authenticated
const isAuthenticated = async (req, res) => {
    const isValid = await validateTokens();
    res.status(isValid ? 200 : 401).json({ authenticated: isValid });
};

// Generate Google OAuth URL
const authenticateGoogle = (req, res) => {
    try {
        const authUrl = oauth2Client.generateAuthUrl({
            access_type: "offline",
            scope: SCOPES,
        });
        res.redirect(authUrl);
    } catch (error) {
        console.error("Error generating Google OAuth URL:", error);
        res.status(500).send("Failed to initiate Google OAuth.");
    }
};

// Handle Google OAuth callback
const handleAuthCallback = async (req, res) => {
    try {
        const code = req.query.code;
        if (!code) {
            return res.status(400).send("Authorization code is missing.");
        }
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);
        saveTokens(tokens);
        res.redirect("https://scribeaiassistant.netlify.app/?auth=true");
    } catch (error) {
        console.error("Error during OAuth callback:", error);
        res.status(500).send("Authentication failed.");
    }
};

// Logout and remove tokens
const logout = (req, res) => {
    try {
        removeTokens();
        oauth2Client.setCredentials(null); // Clear credentials in memory
        console.log("[Logout] User logged out successfully.");
        res.status(200).json({ message: "Successfully logged out." });
    } catch (error) {
        console.error("[Logout] Error during logout:", error);
        res.status(500).json({ message: "Failed to log out. Please try again." });
    }
};

module.exports = {
    oauth2Client,
    authenticateGoogle,
    handleAuthCallback,
    isAuthenticated,
    logout,
};
