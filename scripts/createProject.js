async function createProject(projectName) {
    try {
        const root = await findOrCreateRootFolder();
        const { data: projectFolder } = await drive.files.create({
            resource: {
                name: projectName,
                mimeType: 'application/vnd.google-apps.folder',
                parents: [root.id],
            },
            fields: 'id',
        });
        return { success: true, projectId: projectFolder.id };
    } catch (error) {
        console.error('Error creating project:', error);
        return { success: false, error };
    }
}

module.exports = { createProject };
