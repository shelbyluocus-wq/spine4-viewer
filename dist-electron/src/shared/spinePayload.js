import { readFile } from 'node:fs/promises';
import path from 'node:path';
export async function createSpinePlayerPayload(entry) {
    if (!entry.skelPath || !entry.atlasPath || !entry.pngPath) {
        throw new Error(`资源 ${entry.name} 不完整，无法创建播放器数据`);
    }
    const [skeletonBuffer, atlasBuffer, pngBuffer] = await Promise.all([
        readFile(entry.skelPath),
        readFile(entry.atlasPath),
        readFile(entry.pngPath),
    ]);
    const atlasText = atlasBuffer.toString('utf8');
    const pngKey = path.basename(entry.pngPath);
    const skeletonKey = path.basename(entry.skelPath);
    const atlasKey = path.basename(entry.atlasPath);
    const rawDataURIs = {
        [skeletonKey]: toDataUri(skeletonBuffer, 'application/octet-stream'),
        [atlasKey]: toDataUri(atlasBuffer, 'text/plain'),
        [pngKey]: toDataUri(pngBuffer, 'image/png'),
    };
    for (const pageName of extractAtlasPageNames(atlasText)) {
        rawDataURIs[pageName] = rawDataURIs[pngKey];
    }
    return {
        skeletonKey,
        atlasKey,
        rawDataURIs,
    };
}
function toDataUri(buffer, mimeType) {
    return `data:${mimeType};base64,${buffer.toString('base64')}`;
}
function extractAtlasPageNames(atlasText) {
    return atlasText
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0 && !line.includes(':') && /\.(png|jpg|jpeg|webp)$/i.test(line));
}
