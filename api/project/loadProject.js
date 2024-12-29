const { google } = require("googleapis");
const { oauth2Client } = require("../auth");

const loadProject = async (req, res) => {
    const { projectName } = req.body;

    if (!projectName) {
        console.error("[loadProject] Project name is missing.");
        return res.status(400).json({ error: "Project name is required." });
    }

    try {
        if (!oauth2Client.credentials?.access_token) {
            console.error("[loadProject] Google OAuth2 client is not authenticated.");
            return res.status(401).json({ error: "Unauthorized. Please authenticate first." });
        }

        const drive = google.drive({ version: "v3", auth: oauth2Client });

        console.log("[loadProject] Searching for project folder...");
        const projectFolderResponse = await drive.files.list({
            q: `name='${projectName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
            fields: "files(id, name)",
        });

        if (!projectFolderResponse.data.files.length) {
            console.error(`[loadProject] Project folder "${projectName}" not found.`);
            return res.status(404).json({ error: "Project not found." });
        }

        const projectFolderId = projectFolderResponse.data.files[0].id;

        console.log("[loadProject] Searching for content.txt in project folder...");
        const contentFileResponse = await drive.files.list({
            q: `'${projectFolderId}' in parents and name='content.txt' and mimeType='text/plain' and trashed=false`,
            fields: "files(id, name)",
        });

        if (!contentFileResponse.data.files.length) {
            console.error("[loadProject] content.txt not found in project folder.");
            return res.status(404).json({ error: "Project content not found." });
        }

        const contentFileId = contentFileResponse.data.files[0].id;

        console.log("[loadProject] Downloading content.txt...");
        const contentResponse = await drive.files.get({
            fileId: contentFileId,
            alt: "media",
        });

        res.status(200).json({ content: contentResponse.data });
    } catch (error) {
        console.error("[loadProject] Error loading project:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to load project." });
    }
};

module.exports = { loadProject };
