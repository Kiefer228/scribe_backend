// Required modules
const { google } = require("googleapis");
const { oauth2Client } = require("../auth");

// Cache for project folder queries
const projectFolderCache = new Map();

const refreshAccessToken = async () => {
    try {
        const tokenResponse = await oauth2Client.refreshAccessToken();
        oauth2Client.setCredentials(tokenResponse.credentials);
        console.log("[refreshAccessToken] Access token refreshed successfully.");
    } catch (error) {
        console.error("[refreshAccessToken] Failed to refresh access token:", error.message);
        throw new Error("Failed to refresh access token");
    }
};

const validateProjectName = (projectName) => {
    const invalidCharacters = /[^a-zA-Z0-9-_\s]/;
    if (!projectName || projectName.length > 255 || invalidCharacters.test(projectName)) {
        throw new Error("Invalid project name. Ensure it contains only alphanumeric characters, spaces, dashes, or underscores, and is less than 255 characters.");
    }
};

const loadProject = async (projectName) => {
    validateProjectName(projectName);

    if (!oauth2Client.credentials?.access_token) {
        console.warn("[loadProject] Access token missing or expired. Attempting to refresh...");
        await refreshAccessToken();
    }

    const drive = google.drive({ version: "v3", auth: oauth2Client });

    console.log(`[loadProject] Searching for project folder: "${projectName}"`);

    if (projectFolderCache.has(projectName)) {
        console.log(`[loadProject] Cache hit for project folder: "${projectName}"`);
        return projectFolderCache.get(projectName);
    }

    const projectFolderResponse = await drive.files.list({
        q: `name='${projectName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: "files(id, name)",
    });

    if (!projectFolderResponse.data.files.length) {
        throw new Error(`Project folder "${projectName}" not found.`);
    }

    const projectFolderId = projectFolderResponse.data.files[0].id;
    projectFolderCache.set(projectName, projectFolderId);

    console.log("[loadProject] Searching for content.txt in project folder...");
    const contentFileResponse = await drive.files.list({
        q: `'${projectFolderId}' in parents and name='content.txt' and mimeType='text/plain' and trashed=false`,
        fields: "files(id, name)",
    });

    if (contentFileResponse.data.files.length > 1) {
        console.warn(`[loadProject] Multiple content.txt files found in project folder: "${projectFolderId}"`);
        throw new Error("Multiple content.txt files found. Please resolve duplication.");
    }

    if (!contentFileResponse.data.files.length) {
        console.log("[loadProject] content.txt not found. Creating default content.txt...");

        try {
            const contentFile = await drive.files.create({
                requestBody: {
                    name: "content.txt",
                    mimeType: "text/plain",
                    parents: [projectFolderId],
                },
                media: {
                    mimeType: "text/plain",
                    body: "Welcome to your new project!",
                },
                fields: "id, name",
            });

            console.log(`[loadProject] Created default content.txt with ID: ${contentFile.data.id}`);
            return "Welcome to your new project!";
        } catch (error) {
            console.error(`[loadProject] Failed to create default content.txt: ${error.message}`);
            throw new Error("Failed to create default content.txt");
        }
    }

    const contentFileId = contentFileResponse.data.files[0].id;

    console.log("[loadProject] Downloading content.txt...");
    const retryOperation = async (fn, retries = 3) => {
        let attempt = 0;
        while (attempt < retries) {
            try {
                return await fn();
            } catch (error) {
                attempt++;
                if (attempt >= retries) {
                    throw error;
                }
                console.warn(`[loadProject] Retry attempt ${attempt} for downloading content.txt failed: ${error.message}`);
            }
        }
    };

    try {
        const contentResponse = await retryOperation(() =>
            drive.files.get({
                fileId: contentFileId,
                alt: "media",
            })
        );
        return contentResponse.data;
    } catch (error) {
        console.error(`[loadProject] Failed to download content.txt after retries: ${error.message}`);
        throw new Error("Failed to download content.txt");
    }
};

module.exports = { loadProject };
