async function findOrCreateRootFolder() {
    const { data } = await drive.files.list({
        q: "name='Scribe' and mimeType='application/vnd.google-apps.folder'",
    });
    if (data.files.length > 0) return data.files[0];

    const { data: folder } = await drive.files.create({
        resource: {
            name: "Scribe",
            mimeType: "application/vnd.google-apps.folder",
        },
        fields: "id",
    });
    return folder;
}

async function findProjectFolder(projectName) {
    const root = await findOrCreateRootFolder();
    const { data } = await drive.files.list({
        q: `'${root.id}' in parents and name='${projectName}' and mimeType='application/vnd.google-apps.folder'`,
    });
    if (data.files.length === 0) throw new Error("Project not found.");
    return data.files[0];
}

async function findOrCreateProjectFolder(projectName) {
    try {
        return await findProjectFolder(projectName);
    } catch {
        const root = await findOrCreateRootFolder();
        const { data: folder } = await drive.files.create({
            resource: {
                name: projectName,
                mimeType: "application/vnd.google-apps.folder",
                parents: [root.id],
            },
            fields: "id",
        });
        return folder;
    }
}
