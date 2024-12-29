const { google } = require("googleapis");
const { oauth2Client } = require("../auth");

const loadProject = async (projectName) => {
    if (!projectName) {
        throw new Error("Project name is required.");
    }

    if (!oauth2Client.credentials?.access_token) {
        throw new Error("Unauthorized: Google OAuth2 client is not authenticated.");
    }

    const drive = google.drive({ version: "v3", auth: oauth2Client });

    console.log(`[loadProject] Searching for project folder: "${projectName}"`);
    const projectFolderResponse = await drive.files.list({
        q: `name='${projectName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: "files(id, name)",
    });

    if (!projectFolderResponse.data.files.length) {
        throw new Error(`Project folder "${projectName}" not found.`);
    }

    const projectFolderId = projectFolderResponse.data.files[0].id;

    console.log("[loadProject] Searching for content.txt in project folder...");
    const contentFileResponse = await drive.files.list({
        q: `'${projectFolderId}' in parents and name='content.txt' and mimeType='text/plain' and trashed=false`,
        fields: "files(id, name)",
    });

    if (!contentFileResponse.data.files.length) {
        console.log("[loadProject] content.txt not found. Creating default content.txt...");
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
    }

    const contentFileId = contentFileResponse.data.files[0].id;

    console.log("[loadProject] Downloading content.txt...");
    const contentResponse = await drive.files.get({
        fileId: contentFileId,
        alt: "media",
    });

    return contentResponse.data;
};

module.exports = { loadProject };
