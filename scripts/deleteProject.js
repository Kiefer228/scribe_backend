async function deleteProject(projectName) {
    try {
        const folder = await findProjectFolder(projectName);
        await drive.files.delete({ fileId: folder.id });
        return { success: true };
    } catch (error) {
        console.error("Error deleting project:", error);
        return { success: false, error };
    }
}

module.exports = { deleteProject };
