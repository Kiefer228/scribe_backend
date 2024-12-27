const { google } = require("googleapis");

const createHierarchy = async (req, res) => {
    const { projectName } = req.body;
    if (!projectName) {
        return res.status(400).send("Project name is required.");
    }

    try {
        const drive = google.drive({ version: "v3", auth: oauth2Client });

        // Create the root folder
        const rootFolder = await drive.files.create({
            resource: {
                name: "Scribe",
                mimeType: "application/vnd.google-apps.folder",
            },
            fields: "id",
        });

        // Create the project folder
        const projectFolder = await drive.files.create({
            resource: {
                name: projectName,
                mimeType: "application/vnd.google-apps.folder",
                parents: [rootFolder.data.id],
            },
            fields: "id",
        });

        // Create subfolders
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

        res.status(200).send({ message: "Hierarchy created successfully." });
    } catch (error) {
        console.error("Error creating folder hierarchy:", error);
        res.status(500).send("Failed to create hierarchy.");
    }
};

module.exports = { createHierarchy };
