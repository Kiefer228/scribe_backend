const { google } = require("googleapis");

let oauth2Client;

function authenticateGoogle() {
    if (!oauth2Client) {
        oauth2Client = new google.auth.OAuth2(
            process.env.CLIENT_ID,
            process.env.CLIENT_SECRET,
            process.env.REDIRECT_URI,
        );
    }
    const authUrl = oauth2Client.generateAuthUrl({
        access_type: "offline",
        scope: ["https://www.googleapis.com/auth/drive"],
    });
    return authUrl;
}

async function handleAuthCallback(code) {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    return tokens;
}

function isAuthenticated() {
    return oauth2Client && oauth2Client.credentials;
}

module.exports = { authenticateGoogle, handleAuthCallback, isAuthenticated };
