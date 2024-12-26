async function loadProject(projectName) {
    try {
        const folder = await findProjectFolder(projectName);
        const { data } = await drive.files.list({
            q: `'${folder.id}' in parents`,
            orderBy: 'createdTime desc',
            pageSize: 1,
        });

        if (data.files.length === 0) throw new Error('No files found in project.');

        const fileId = data.files[0].id;
        const file = await drive.files.get({ fileId, alt: 'media' });
        return file.data;
    } catch (error) {
        console.error('Error loading project:', error);
        return { success: false, error };
    }
}

module.exports = { loadProject };
