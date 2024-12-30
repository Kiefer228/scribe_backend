// Required modules
const { google } = require("googleapis");
const { oauth2Client } = require("../auth");

const saveProject = async ({ projectName, content }) => {
    if (!projectName || !content) {
        throw new Error("Project name and content are required.");
    }

    if (!oauth2Client.credentials?.access_token) {
        throw new Error("Unauthorized: Google OAuth2 client is not authenticated.");
    }

    const drive = google.drive({ version: "v3", auth: oauth2Client });

    console.log(`[saveProject] Searching for project folder: \"${projectName}\"`);
    const projectFolderResponse = await drive.files.list({
        q: `name='${projectName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: "files(id, name)",
    });

    if (!projectFolderResponse.data.files.length) {
        throw new Error(`Project folder \"${projectName}\" not found.`);
    }

    const projectFolderId = projectFolderResponse.data.files[0].id;

    console.log("[saveProject] Searching for content.txt in project folder...");
    const contentFileResponse = await drive.files.list({
        q: `'${projectFolderId}' in parents and name='content.txt' and mimeType='text/plain' and trashed=false`,
        fields: "files(id, name)",
    });

    if (!contentFileResponse.data.files.length) {
        console.log("[saveProject] content.txt not found. Creating a new one...");
        await drive.files.create({
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
        console.log("[saveProject] New content.txt created successfully.");
    } else {
        const contentFileId = contentFileResponse.data.files[0].id;

        console.log("[saveProject] Updating content.txt...");
        await drive.files.update({
            fileId: contentFileId,
            media: {
                mimeType: "text/plain",
                body: content,
            },
        });
        console.log("[saveProject] content.txt updated successfully.");
    }

    return { message: `Project \"${projectName}\" saved successfully.` };
};

module.exports = { saveProject };
