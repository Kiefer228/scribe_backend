// Required modules
const { google } = require("googleapis");
const { oauth2Client } = require("../auth");

// Cache for project folder queries with periodic cleanup
const projectFolderCache = new Map();
const CACHE_CLEANUP_INTERVAL = 10 * 60 * 1000; // 10 minutes

const startCacheCleanup = () => {
    setInterval(() => {
        console.log("[Cache Cleanup] Running periodic cleanup for stale cache entries.");
        projectFolderCache.clear();
    }, CACHE_CLEANUP_INTERVAL);
};

startCacheCleanup();

const createHierarchy = async ({ projectName }) => {
    if (!projectName) {
        throw new Error("Project name is required.");
    }

    if (!oauth2Client.credentials?.access_token) {
        throw new Error("Unauthorized: Google OAuth2 client is not authenticated.");
    }

    const drive = google.drive({ version: "v3", auth: oauth2Client });

    console.log(`[createHierarchy] Checking for existing project folder: "${projectName}"`);

    if (projectFolderCache.has(projectName)) {
        console.log(`[createHierarchy] Cache hit for project folder: "${projectName}"`);
        return projectFolderCache.get(projectName);
    }

    const projectFolderResponse = await drive.files.list({
        q: `name='${projectName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: "files(id, name)",
    });

    if (projectFolderResponse.data.files.length) {
        const existingFolder = {
            message: `Project folder "${projectName}" already exists.`,
            folderId: projectFolderResponse.data.files[0].id,
        };
        projectFolderCache.set(projectName, existingFolder);
        console.warn(`[createHierarchy] Project folder "${projectName}" already exists.`);
        return existingFolder;
    }

    console.log("[createHierarchy] Creating new project folder...");
    const projectFolder = await drive.files.create({
        requestBody: {
            name: projectName,
            mimeType: "application/vnd.google-apps.folder",
        },
        fields: "id, name",
    });

    const projectFolderId = projectFolder.data.id;

    console.log(`[createHierarchy] Created project folder with ID: ${projectFolderId}`);

    console.log("[createHierarchy] Creating default content.txt in project folder...");

    const retryOperation = async (fn, retries = 3) => {
        let attempt = 0;
        while (attempt < retries) {
            try {
                return await fn();
            } catch (error) {
                attempt++;
                if (attempt >= retries) {
                    throw error;
                }
                console.warn(`[createHierarchy] Retry attempt ${attempt} for creating content.txt failed: ${error.message}`);
            }
        }
    };

    try {
        await retryOperation(() =>
            drive.files.create({
                requestBody: {
                    name: "content.txt",
                    mimeType: "text/plain",
                    parents: [projectFolderId],
                },
                media: {
                    mimeType: "text/plain",
                    body: "Welcome to your new project!",
                },
                fields: "id, name",
            })
        );
        console.log("[createHierarchy] Created default content.txt successfully.");
    } catch (error) {
        console.error(`[createHierarchy] Failed to create content.txt: ${error.message}`);
        throw new Error("Failed to create default content file.");
    }

    const newFolder = { projectFolderId, message: `Project "${projectName}" created successfully.` };
    projectFolderCache.set(projectName, newFolder);

    // Cache Invalidation: Ensure cache is updated when folder structure changes externally
    const invalidateCache = async () => {
        const latestResponse = await drive.files.list({
            q: `name='${projectName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
            fields: "files(id, name)",
        });
        if (!latestResponse.data.files.length) {
            console.log(`[createHierarchy] Cache invalidated for project folder: "${projectName}"`);
            projectFolderCache.delete(projectName);
        }
    };

    invalidateCache().catch(err => {
        console.error(`[createHierarchy] Error during cache invalidation for project folder "${projectName}": ${err.message}`);
    });

    return newFolder;
};

module.exports = { createHierarchy };
