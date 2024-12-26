async function saveProject(projectName, fileContent) {
    const fileName = "main.txt";
    try {
        const folder = await findOrCreateProjectFolder(projectName);

        // Upload new file
        const { data: uploadedFile } = await drive.files.create({
            resource: { name: fileName, parents: [folder.id] },
            media: { mimeType: "text/plain", body: fileContent },
            fields: "id",
        });

        // Manage backups
        await manageBackups(folder.id);
        return { success: true, fileId: uploadedFile.id };
    } catch (error) {
        console.error("Error saving project:", error);
        return { success: false, error };
    }
}

async function manageBackups(folderId) {
    const files = await drive.files.list({
        q: `'${folderId}' in parents`,
        orderBy: "createdTime desc",
    });
    const backups = files.data.files;

    if (backups.length > 9) {
        await drive.files.delete({ fileId: backups[backups.length - 1].id });
    }
}

module.exports = { saveProject };
