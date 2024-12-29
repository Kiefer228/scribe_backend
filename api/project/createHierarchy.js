const { google } = require("googleapis");
const { oauth2Client } = require("../auth");

const createHierarchy = async (projectName) => {
    if (!projectName) {
        throw new Error("Project name is required.");
    }

    if (!oauth2Client.credentials?.access_token) {
        throw new Error("Unauthorized: Google OAuth2 client is not authenticated.");
    }

    const drive = google.drive({ version: "v3", auth: oauth2Client });

    console.log(`[createHierarchy] Checking for existing project folder: "${projectName}"`);
    const projectFolderResponse = await drive.files.list({
        q: `name='${projectName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: "files(id, name)",
    });

    if (projectFolderResponse.data.files.length) {
        throw new Error(`Project folder "${projectName}" already exists.`);
    }

    console.log("[createHierarchy] Creating new project folder...");
    const projectFolder = await drive.files.create({
        requestBody: {
            name: projectName,
            mimeType: "application/vnd.google-apps.folder",
        },
        fields: "id, name",
    });

    const projectFolderId = projectFolder.data.id;

    console.log(`[createHierarchy] Created project folder with ID: ${projectFolderId}`);

    console.log("[createHierarchy] Creating default content.txt in project folder...");
    await drive.files.create({
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

    console.log("[createHierarchy] Created default content.txt successfully.");

    return { projectFolderId, message: `Project "${projectName}" created successfully.` };
};

module.exports = { createHierarchy };
