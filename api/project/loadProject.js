const { google } = require("googleapis");
const { oauth2Client } = require("../auth");

const loadProject = async (projectName = null) => {
    if (!oauth2Client.credentials?.access_token) {
        throw new Error("Unauthorized. Google OAuth2 client is not authenticated.");
    }

    const drive = google.drive({ version: "v3", auth: oauth2Client });

    let projectFolderId;
    if (projectName) {
        console.log(`[loadProject] Searching for project folder named: "${projectName}"...`);
        const projectFolderResponse = await drive.files.list({
            q: `name='${projectName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
            fields: "files(id, name)",
        });

        if (projectFolderResponse.data.files.length) {
            projectFolderId = projectFolderResponse.data.files[0].id;
        } else {
            console.warn(`[loadProject] Project folder "${projectName}" not found.`);
            throw new Error(`Project folder "${projectName}" not found.`);
        }
    } else {
        console.log("[loadProject] No specific project name provided. Searching for any project folder...");
        const folderResponse = await drive.files.list({
            q: "mimeType='application/vnd.google-apps.folder' and trashed=false",
            fields: "files(id, name)",
            pageSize: 1, // Load the first available project
        });

        if (!folderResponse.data.files.length) {
            console.warn("[loadProject] No project folders found.");
            throw new Error("No projects found. Please create a new project.");
        }

        const projectFolder = folderResponse.data.files[0];
        projectName = projectFolder.name;
        projectFolderId = projectFolder.id;
        console.log(`[loadProject] Found project folder: "${projectName}"`);
    }

    console.log(`[loadProject] Searching for content.txt in the project folder "${projectName}"...`);
    const contentFileResponse = await drive.files.list({
        q: `'${projectFolderId}' in parents and name='content.txt' and mimeType='text/plain' and trashed=false`,
        fields: "files(id, name)",
    });

    if (!contentFileResponse.data.files.length) {
        console.warn(`[loadProject] content.txt not found in project folder: "${projectName}".`);
        throw new Error(`content.txt not found in project folder "${projectName}".`);
    }

    const contentFileId = contentFileResponse.data.files[0].id;

    console.log(`[loadProject] Downloading content.txt from project folder: "${projectName}"...`);
    const contentResponse = await drive.files.get({
        fileId: contentFileId,
        alt: "media",
    });

    return contentResponse.data;
};

module.exports = { loadProject };
