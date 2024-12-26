async function listProjects() {
    try {
        const { data } = await drive.files.list({
            q: "mimeType='application/vnd.google-apps.folder' and name='Scribe'",
            fields: "files(id, name)",
        });
        return data.files;
    } catch (error) {
        console.error("Error listing projects:", error);
        return { success: false, error };
    }
}

module.exports = { listProjects };
