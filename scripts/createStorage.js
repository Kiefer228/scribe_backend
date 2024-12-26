const drive = google.drive({ version: "v3", auth: oauth2Client });

async function createStorage() {
    const folderNames = ["Scribe", "Backups", "Context", "Metadata"];

    let rootFolder;
    try {
        const { data } = await drive.files.create({
            resource: {
                name: folderNames[0],
                mimeType: "application/vnd.google-apps.folder",
            },
            fields: "id",
        });
        rootFolder = data.id;

        for (const folder of folderNames.slice(1)) {
            await drive.files.create({
                resource: {
                    name: folder,
                    mimeType: "application/vnd.google-apps.folder",
                    parents: [rootFolder],
                },
            });
        }

        return { success: true, folderId: rootFolder };
    } catch (error) {
        console.error("Error creating storage:", error);
        return { success: false, error };
    }
}

module.exports = { createStorage };
