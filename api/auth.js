const { google } = require("googleapis");
const fs = require("fs");
const path = require("path");

// Environment Variables
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URL;

if (!CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI) {
    console.error("[auth.js] Missing Google OAuth environment variables.");
    process.exit(1); // Exit if critical variables are missing
}

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

// Token Storage Path
const TOKEN_FILE_PATH = path.join(__dirname, "token.json");

// Helper: Load tokens from storage
const loadTokens = () => {
    try {
        if (fs.existsSync(TOKEN_FILE_PATH)) {
            const tokens = JSON.parse(fs.readFileSync(TOKEN_FILE_PATH, "utf8"));
            oauth2Client.setCredentials(tokens);
            console.log("[auth.js] Tokens loaded successfully.");
            return tokens;
        }
        console.warn("[auth.js] No tokens found in storage.");
        return null;
    } catch (error) {
        console.error("[auth.js] Error loading tokens:", error.message);
        return null;
    }
};

// Helper: Save tokens to storage
const saveTokens = (tokens) => {
    try {
        fs.writeFileSync(TOKEN_FILE_PATH, JSON.stringify(tokens, null, 2));
        console.log("[auth.js] Tokens saved successfully.");
    } catch (error) {
        console.error("[auth.js] Error saving tokens:", error.message);
    }
};

// Helper: Remove tokens from storage
const removeTokens = () => {
    try {
        if (fs.existsSync(TOKEN_FILE_PATH)) {
            fs.unlinkSync(TOKEN_FILE_PATH);
            console.log("[auth.js] Tokens removed successfully.");
        } else {
            console.warn("[auth.js] No tokens to remove.");
        }
    } catch (error) {
        console.error("[auth.js] Error removing tokens:", error.message);
    }
};

// Validate and refresh tokens
const validateTokens = async () => {
    const tokens = loadTokens();
    if (!tokens || !tokens.access_token) {
        console.warn("[auth.js] No valid access token found.");
        return false;
    }

    try {
        oauth2Client.setCredentials(tokens);
        await oauth2Client.getAccessToken(); // Validate current access token
        console.log("[auth.js] Access token validated.");
        return true;
    } catch (error) {
        console.warn("[auth.js] Access token expired, attempting refresh...");
        if (tokens.refresh_token) {
            try {
                const refreshedTokens = await oauth2Client.refreshAccessToken();
                oauth2Client.setCredentials(refreshedTokens.credentials);
                saveTokens(refreshedTokens.credentials);
                console.log("[auth.js] Access token refreshed successfully.");
                return true;
            } catch (refreshError) {
                console.error("[auth.js] Error refreshing access token:", refreshError.message);
                return false;
            }
        } else {
            console.error("[auth.js] No refresh token available.");
            return false;
        }
    }
};

// API: Check authentication status
const isAuthenticated = async (req, res) => {
    try {
        const isValid = await validateTokens();
        if (isValid) {
            res.status(200).json({ authenticated: true });
        } else {
            res.status(401).json({ authenticated: false });
        }
    } catch (error) {
        console.error("[auth.js] Error checking authentication status:", error.message);
        res.status(500).json({ authenticated: false, error: "Internal Server Error" });
    }
};

// API: Initiate Google OAuth process
const authenticateGoogle = (req, res) => {
    try {
        const authUrl = oauth2Client.generateAuthUrl({
            access_type: "offline",
            scope: ["https://www.googleapis.com/auth/drive.file"],
            prompt: "consent", // Ensures refresh token is always provided
        });
        console.log("[auth.js] Redirecting to Google OAuth URL.");
        res.redirect(authUrl);
    } catch (error) {
        console.error("[auth.js] Error generating Google OAuth URL:", error.message);
        res.status(500).send("Failed to initiate Google OAuth.");
    }
};

// API: Handle Google OAuth callback
const handleAuthCallback = async (req, res) => {
    const code = req.query.code;
    if (!code) {
        console.error("[auth.js] Authorization code is missing.");
        return res.status(400).send("Authorization code is required.");
    }

    try {
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);
        saveTokens(tokens);
        console.log("[auth.js] Authentication successful.");
        res.redirect("https://scribeaiassistant.netlify.app/?auth=true");
    } catch (error) {
        console.error("[auth.js] Error during OAuth callback:", error.response?.data || error.message);
        res.status(500).send("Authentication failed.");
    }
};

// API: Logout and remove tokens
const logout = (req, res) => {
    try {
        removeTokens();
        console.log("[auth.js] User logged out successfully.");
        res.status(200).json({ message: "Successfully logged out." });
    } catch (error) {
        console.error("[auth.js] Error during logout:", error.message);
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
