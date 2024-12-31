// Required modules
const { google } = require("googleapis");
const { oauth2Client } = require("../auth");

// Cache for project folder queries
const projectFolderCache = new Map();

const refreshAccessToken = async () => {
    let attempt = 0;
    const maxRetries = 3;
    while (attempt < maxRetries) {
        try {
            const tokenResponse = await oauth2Client.refreshAccessToken();
            oauth2Client.setCredentials(tokenResponse.credentials);
            console.log("[refreshAccessToken] Access token refreshed successfully.");
            return;
        } catch (error) {
            attempt++;
            console.warn(`[refreshAccessToken] Attempt ${attempt} failed: ${error.message}`);
            if (attempt >= maxRetries) {
                console.error("[refreshAccessToken] Failed to refresh access token after multiple attempts.");
                throw new Error("Failed to refresh access token");
            }
        }
    }
};

const validateProjectName = (projectName) => {
    const invalidCharacters = /[^a-zA-Z0-9-_.\s]/; // Allow periods and underscores in addition to existing rules
    const reservedNames = ["con", "nul", "prn", "aux", "com1", "lpt1"];

    if (
        !projectName ||
        projectName.length > 255 ||
        invalidCharacters.test(projectName) ||
        reservedNames.includes(projectName.toLowerCase())
    ) {
        throw new Error(
            "Invalid project name. Ensure it contains only alphanumeric characters, spaces, dashes, underscores, periods, and is less than 255 characters. Avoid reserved system names."
        );
    }
};

const saveProject = async ({ projectName, content }) => {
    validateProjectName(projectName);

    if (!content) {
        throw new Error("Content is required.");
    }

    try {
        await refreshAccessToken();
    } catch (error) {
        console.warn("[saveProject] Token refresh failed. Proceeding with existing token if valid...");
    }

    const drive = google.drive({ version: "v3", auth: oauth2Client });

    console.log(`[saveProject] Searching for project folder: "${projectName}"`);
    if (projectFolderCache.has(projectName)) {
        console.log(`[saveProject] Cache hit for project folder: "${projectName}"`);
    }

    const projectFolderResponse = projectFolderCache.has(projectName)
        ? { data: { files: [{ id: projectFolderCache.get(projectName) }] } }
        : await drive.files.list({
              q: `name='${projectName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
              fields: "files(id, name)",
          });

    if (!projectFolderResponse.data.files.length) {
        throw new Error(`Project folder "${projectName}" not found.`);
    }

    const projectFolderId = projectFolderResponse.data.files[0].id;
    projectFolderCache.set(projectName, projectFolderId);

    console.log("[saveProject] Searching for content.txt in project folder...");
    const contentFileResponse = await drive.files.list({
        q: `'${projectFolderId}' in parents and name='content.txt' and mimeType='text/plain' and trashed=false`,
        fields: "files(id, name)",
    });

    if (!contentFileResponse.data.files.length) {
        console.log("[saveProject] content.txt not found. Creating a new one...");
        try {
            const createdFile = await drive.files.create({
                requestBody: {
                    name: "content.txt",
                    mimeType: "text/plain",
                    parents: [projectFolderId],
                },
                media: {
                    mimeType: "text/plain",
                    body: content,
                },
                fields: "id, name",
            });
            console.log(`[saveProject] New content.txt created successfully with ID: ${createdFile.data.id}`);
        } catch (error) {
            console.error(`[saveProject] Failed to create content.txt: ${error.message}`);
            throw new Error("Failed to create content.txt");
        }
    } else {
        const contentFileId = contentFileResponse.data.files[0].id;

        console.log("[saveProject] Updating content.txt...");
        try {
            const updatedFile = await drive.files.update({
                fileId: contentFileId,
                media: {
                    mimeType: "text/plain",
                    body: content,
                },
                fields: "id, modifiedTime",
            });
            console.log(`[saveProject] content.txt updated successfully. File ID: ${updatedFile.data.id}, Modified Time: ${updatedFile.data.modifiedTime}`);
        } catch (error) {
            console.error(`[saveProject] Failed to update content.txt: ${error.message}`);
            throw new Error("Failed to update content.txt");
        }
    }

    return { message: `Project "${projectName}" saved successfully.` };
};

module.exports = { saveProject };
