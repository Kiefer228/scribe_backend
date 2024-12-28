const { google } = require("googleapis");
const { oauth2Client } = require("../auth"); // Import authenticated OAuth2 client

const saveProject = async (req, res) => {
    const { projectName, content } = req.body;

    if (!projectName || content === undefined) {
        console.error("[saveProject] Missing project name or content.");
        return res.status(400).json({ error: "Project name and content are required." });
    }

    try {
        if (!oauth2Client.credentials?.access_token) {
            console.error("[saveProject] Google OAuth2 client is not authenticated.");
            return res.status(401).json({ error: "Unauthorized. Please authenticate first." });
        }

        const drive = google.drive({ version: "v3", auth: oauth2Client });

        console.log("[saveProject] Searching for project folder...");
        const projectFolderResponse = await drive.files.list({
            q: `name='${projectName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
            fields: "files(id, name)",
        });

        if (!projectFolderResponse.data.files.length) {
            console.log(`[saveProject] Project folder "${projectName}" not found. Creating new folder...`);
            const folderResponse = await drive.files.create({
                requestBody: {
                    name: projectName,
                    mimeType: "application/vnd.google-apps.folder",
                },
            });
            var projectFolderId = folderResponse.data.id;
        } else {
            var projectFolderId = projectFolderResponse.data.files[0].id;
        }

        console.log("[saveProject] Searching for content.txt in project folder...");
        const contentFileResponse = await drive.files.list({
            q: `'${projectFolderId}' in parents and name='content.txt' and mimeType='text/plain' and trashed=false`,
            fields: "files(id, name)",
        });

        if (!contentFileResponse.data.files.length) {
            console.log("[saveProject] Creating new content.txt...");
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
            });
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
        }

        console.log("[saveProject] Successfully saved content.");
        res.status(200).json({ message: "Project content saved successfully." });
    } catch (error) {
        console.error("[saveProject] Error saving project:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to save project." });
    }
};

module.exports = { saveProject };
