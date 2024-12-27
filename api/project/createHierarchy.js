const { google } = require("googleapis");
const oauth2Client = require("../../auth").oauth2Client; // Ensure oauth2Client is exported from auth.js

const createHierarchy = async (req, res) => {
    const { projectName } = req.body;
    if (!projectName) {
        return res.status(400).send("Project name is required.");
    }

    try {
        const drive = google.drive({ version: "v3", auth: oauth2Client });

        // Ensure the root folder "Scribe" exists
        let rootFolderId;
        const existingRoot = await drive.files.list({
            q: "name='Scribe' and mimeType='application/vnd.google-apps.folder'",
            fields: "files(id, name)",
        });

        if (existingRoot.data.files.length > 0) {
            rootFolderId = existingRoot.data.files[0].id;
        } else {
            const rootFolder = await drive.files.create({
                resource: {
                    name: "Scribe",
                    mimeType: "application/vnd.google-apps.folder",
                },
                fields: "id",
            });
            rootFolderId = rootFolder.data.id;
        }

        // Create the project folder
        const projectFolder = await drive.files.create({
            resource: {
                name: projectName,
                mimeType: "application/vnd.google-apps.folder",
                parents: [rootFolderId],
            },
            fields: "id",
        });

        // Create subfolders inside the project folder
        const subfolders = ["Content", "Backups", "Context", "Metadata"];
        for (const subfolder of subfolders) {
            await drive.files.create({
                resource: {
                    name: subfolder,
                    mimeType: "application/vnd.google-apps.folder",
                    parents: [projectFolder.data.id],
                },
                fields: "id",
            });
        }

        res.status(200).send({
            message: `Hierarchy for project "${projectName}" created successfully.`,
        });
    } catch (error) {
        console.error("Error creating folder hierarchy:", error);
        res.status(500).send("Failed to create hierarchy.");
    }
};

module.exports = { createHierarchy };
