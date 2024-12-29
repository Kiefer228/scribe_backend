const { google } = require("googleapis");
const { oauth2Client } = require("../auth");

const createHierarchy = async (req, res) => {
    const { projectName } = req.query;

    if (!projectName) {
        console.error("Project name is missing.");
        return res.status(400).send("Project name is required.");
    }

    try {
        if (!oauth2Client.credentials?.access_token) {
            console.error("Google OAuth2 client is not authenticated.");
            return res.status(401).send("Unauthorized. Please authenticate first.");
        }

        const drive = google.drive({ version: "v3", auth: oauth2Client });

        console.log("Checking for root folder...");
        let rootFolderId;
        const existingRoot = await drive.files.list({
            q: "name='Scribe' and mimeType='application/vnd.google-apps.folder'",
            fields: "files(id, name)",
        });

        if (existingRoot.data.files.length > 0) {
            rootFolderId = existingRoot.data.files[0].id;
            console.log("Root folder found:", rootFolderId);
        } else {
            console.log("Creating root folder...");
            const rootFolder = await drive.files.create({
                requestBody: {
                    name: "Scribe",
                    mimeType: "application/vnd.google-apps.folder",
                },
                fields: "id",
            });
            rootFolderId = rootFolder.data.id;
            console.log("Root folder created:", rootFolderId);
        }

        console.log("Creating project folder...");
        const projectFolder = await drive.files.create({
            requestBody: {
                name: projectName,
                mimeType: "application/vnd.google-apps.folder",
                parents: [rootFolderId],
            },
            fields: "id",
        });
        console.log("Project folder created:", projectFolder.data.id);

        let contentFolderId;
        const subfolders = ["Content", "Backups", "Context", "Metadata"];
        for (const subfolder of subfolders) {
            const subfolderResponse = await drive.files.create({
                requestBody: {
                    name: subfolder,
                    mimeType: "application/vnd.google-apps.folder",
                    parents: [projectFolder.data.id],
                },
                fields: "id",
            });
            console.log(`Subfolder "${subfolder}" created:`, subfolderResponse.data.id);

            if (subfolder === "Content") {
                contentFolderId = subfolderResponse.data.id;
            }
        }

        if (contentFolderId) {
            console.log("Creating content.txt in Content folder...");
            await drive.files.create({
                requestBody: {
                    name: "content.txt",
                    mimeType: "text/plain",
                    parents: [contentFolderId],
                },
                media: {
                    mimeType: "text/plain",
                    body: "This is the initial content of content.txt",
                },
            });
        }

        res.status(200).send({ message: `Hierarchy for "${projectName}" created successfully.` });
    } catch (error) {
        console.error("Error creating folder hierarchy:", error.response?.data || error.message);
        res.status(500).send("Failed to create hierarchy.");
    }
};

module.exports = { createHierarchy };
