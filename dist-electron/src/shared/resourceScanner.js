import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
const SUPPORTED_MAJOR_MINOR = '4.2';
const SUPPORTED_EXTENSIONS = new Set(['.png', '.atlas', '.skel']);
const VERSION_PATTERN = /(\d+\.\d+\.\d+)/;
export async function detectSpineVersion(filePath) {
    const buffer = await readFile(filePath);
    const sample = buffer.subarray(0, 128).toString('latin1');
    const match = sample.match(VERSION_PATTERN);
    return match?.[1] ?? null;
}
export async function scanSpineRoot(rootPath) {
    const groupedEntries = new Map();
    const discoveredFiles = await listRelevantFiles(rootPath);
    for (const filePath of discoveredFiles) {
        const extension = path.extname(filePath).toLowerCase();
        const directory = path.dirname(filePath);
        const name = path.basename(filePath, extension);
        const key = `${directory}::${name}`;
        let entry = groupedEntries.get(key);
        if (!entry) {
            entry = {
                name,
                directory,
                pngPath: null,
                atlasPath: null,
                skelPath: null,
            };
            groupedEntries.set(key, entry);
        }
        if (extension === '.png') {
            entry.pngPath = filePath;
        }
        else if (extension === '.atlas') {
            entry.atlasPath = filePath;
        }
        else if (extension === '.skel') {
            entry.skelPath = filePath;
        }
    }
    const resolvedEntries = await Promise.all([...groupedEntries.values()].map(async (entry) => resolveEntry(entry)));
    return resolvedEntries.sort((left, right) => left.name.localeCompare(right.name));
}
async function resolveEntry(entry) {
    const missingParts = [
        entry.pngPath ? null : '.png',
        entry.atlasPath ? null : '.atlas',
        entry.skelPath ? null : '.skel',
    ].filter((part) => part !== null);
    if (missingParts.length > 0) {
        return {
            ...entry,
            detectedVersion: entry.skelPath ? await detectSpineVersion(entry.skelPath) : null,
            status: 'broken',
            statusMessage: `缺少 ${missingParts.join('、')} 文件`,
        };
    }
    const detectedVersion = await detectSpineVersion(entry.skelPath);
    if (!detectedVersion) {
        return {
            ...entry,
            detectedVersion: null,
            status: 'broken',
            statusMessage: '无法识别 Spine 版本',
        };
    }
    if (detectedVersion.startsWith(`${SUPPORTED_MAJOR_MINOR}.`)) {
        return {
            ...entry,
            detectedVersion,
            status: 'supported',
            statusMessage: `Spine ${detectedVersion} 可播放`,
        };
    }
    return {
        ...entry,
        detectedVersion,
        status: 'legacy',
        statusMessage: `旧版资源 ${detectedVersion}，请用旧查看器打开`,
    };
}
async function listRelevantFiles(rootPath) {
    const files = [];
    await walkDirectory(rootPath, files);
    return files;
}
async function walkDirectory(currentPath, files) {
    const entries = await readdir(currentPath, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);
        if (entry.isDirectory()) {
            await walkDirectory(fullPath, files);
            continue;
        }
        if (!entry.isFile()) {
            continue;
        }
        const extension = path.extname(entry.name).toLowerCase();
        if (SUPPORTED_EXTENSIONS.has(extension)) {
            files.push(fullPath);
        }
    }
}
