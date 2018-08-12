import * as path from 'path';

export function getFilePath(...resourcePathParts: string[]): string {
    return resourcePathParts.reduce(
        (prev, current) => path.join(prev, current), 
        path.join(__dirname, 'resources'));
}