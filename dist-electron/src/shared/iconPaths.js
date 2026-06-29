import path from 'node:path';
export function getWindowIconPath(context) {
    if (context.isPackaged) {
        return path.join(context.resourcesPath, 'icon.ico');
    }
    return path.resolve(context.appPath, 'build-resources', 'icon.ico');
}
