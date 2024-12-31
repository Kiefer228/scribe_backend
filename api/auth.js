const { google } = require("googleapis");
const fs = require("fs").promises;
const path = require("path");
const crypto = require("crypto-browserify");

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URL;
const TOKEN_FILE_PATH = process.env.TOKEN_FILE_PATH || path.join(__dirname, "token.json");

if (!CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI) {
    console.error("[auth.js] Missing Google OAuth environment variables.");
    process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const validateEnvVariables = () => {
    const requiredEnv = ["CLIENT_ID", "CLIENT_SECRET", "REDIRECT_URL"];
    for (const variable of requiredEnv) {
        if (!process.env[variable]) {
            console.error(`[auth.js] Missing required environment variable: ${variable}`);
            process.exit(1);
        }
    }
};
validateEnvVariables();

// Encryption helper
const SECRET_KEY = process.env.SECRET_KEY || "default-secret-key";
if (!SECRET_KEY || SECRET_KEY.length < 16) {
    console.error("[auth.js] SECRET_KEY must be at least 16 characters long.");
    process.exit(1);
}

const encrypt = (data) => {
    const salt = crypto.randomBytes(16).toString("hex");
    const key = crypto.pbkdf2Sync(SECRET_KEY, salt, 1000, 32, "sha256");
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
    let encrypted = cipher.update(data, "utf8", "hex");
    encrypted += cipher.final("hex");
    return JSON.stringify({ salt, iv: iv.toString("hex"), encrypted });
};

const decrypt = (encryptedData) => {
    try {
        const { salt, iv, encrypted } = JSON.parse(encryptedData);
        const key = crypto.pbkdf2Sync(SECRET_KEY, salt, 1000, 32, "sha256");
        const decipher = crypto.createDecipheriv("aes-256-cbc", key, Buffer.from(iv, "hex"));
        let decrypted = decipher.update(encrypted, "hex", "utf8");
        decrypted += decipher.final("utf8");
        return decrypted;
    } catch (error) {
        console.error("[auth.js] Decryption failed:", error.message);
        throw new Error("Failed to decrypt data.");
    }
};

// Load tokens
const loadTokens = async () => {
    try {
        const data = await fs.readFile(TOKEN_FILE_PATH, "utf8");
        const decryptedData = decrypt(data);
        const tokens = JSON.parse(decryptedData);
        if (tokens.expiry_date && Date.now() > tokens.expiry_date) {
            console.warn("[auth.js] Stored tokens are expired.");
            return null;
        }
        oauth2Client.setCredentials(tokens);
        console.log("[auth.js] Tokens loaded successfully.");
        return tokens;
    } catch (error) {
        if (error.code === "ENOENT") {
            console.warn("[auth.js] No tokens found in storage.");
        } else {
            console.error("[auth.js] Error loading tokens:", error.message);
        }
        return null;
    }
};

// Save tokens
const saveTokens = async (tokens) => {
    try {
        const encryptedData = encrypt(JSON.stringify(tokens));
        await fs.writeFile(TOKEN_FILE_PATH, encryptedData);
        console.log("[auth.js] Tokens saved successfully.");
    } catch (error) {
        console.error("[auth.js] Error saving tokens:", error.message);
    }
};

// Remove tokens
const removeTokens = async () => {
    try {
        await fs.unlink(TOKEN_FILE_PATH);
        console.log("[auth.js] Tokens removed successfully.");
    } catch (error) {
        if (error.code === "ENOENT") {
            console.warn("[auth.js] No tokens to remove.");
        } else {
            console.error("[auth.js] Error removing tokens:", error.message);
        }
    }
};

// Validate and refresh tokens
const validateTokens = async () => {
    const tokens = await loadTokens();
    if (!tokens || !tokens.access_token) {
        console.warn("[auth.js] No valid access token found.");
        return false;
    }

    try {
        oauth2Client.setCredentials(tokens);
        await Promise.race([
            oauth2Client.getAccessToken(),
            new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout validating access token")), 5000)),
        ]);
        console.log("[auth.js] Access token validated.");
        return true;
    } catch (error) {
        console.warn("[auth.js] Access token expired or invalid, attempting refresh...");
        if (tokens.refresh_token) {
            try {
                const refreshedTokens = await oauth2Client.refreshAccessToken();
                const { expiry_date, access_token } = refreshedTokens.credentials;
                oauth2Client.setCredentials(refreshedTokens.credentials);
                await saveTokens(refreshedTokens.credentials);
                console.log(
                    `[auth.js] Access token refreshed successfully. Expiry: ${new Date(expiry_date).toISOString()}`
                );
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

// Other APIs remain unchanged
const isAuthenticated = async (req) => { /* existing logic */ };
const authenticateGoogle = (req, res) => { /* existing logic */ };
const handleAuthCallback = async (req, res) => { /* existing logic */ };
const logout = async (req, res) => { /* existing logic */ };

module.exports = {
    oauth2Client,
    authenticateGoogle,
    handleAuthCallback,
    isAuthenticated,
    logout,
};
