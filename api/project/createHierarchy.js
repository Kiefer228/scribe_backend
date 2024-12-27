const createHierarchy = async (req, res) => {
    const { projectName } = req.body;
    if (!projectName) {
        console.error("Project name is missing.");
        return res.status(400).send("Project name is required.");
    }

    try {
        console.log(`Received request to create project: ${projectName}`);
        const drive = google.drive({ version: "v3", auth: oauth2Client });

        console.log("Checking for root folder...");
        let rootFolderId;
        const existingRoot = await drive.files.list({
            q: "name='Scribe' and mimeType='application/vnd.google-apps.folder'",
            fields: "files(id, name)",
        });

        if (existingRoot.data.files.length > 0) {
            rootFolderId = existingRoot.data.files[0].id;
        } else {
            console.log("Creating root folder...");
            const rootFolder = await drive.files.create({
                resource: {
                    name: "Scribe",
                    mimeType: "application/vnd.google-apps.folder",
                },
                fields: "id",
            });
            rootFolderId = rootFolder.data.id;
        }

        console.log("Creating project folder...");
        const projectFolder = await drive.files.create({
            resource: {
                name: projectName,
                mimeType: "application/vnd.google-apps.folder",
                parents: [rootFolderId],
            },
            fields: "id",
        });

        console.log("Creating subfolders...");
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

        console.log("Hierarchy created successfully.");
        res.status(200).send({ message: `Hierarchy for "${projectName}" created successfully.` });
    } catch (error) {
        console.error("Error creating folder hierarchy:", error.response?.data || error.message || error);
        res.status(500).send("Failed to create hierarchy.");
    }
};
