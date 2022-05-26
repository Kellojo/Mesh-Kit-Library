import fs from 'fs/promises';
import path from 'path';
import gitDateExtractor from 'git-date-extractor';

const baseDownloadUrl = "https://raw.githubusercontent.com/Kellojo/Mesh-Kit-Library/main/assets";

const ignoredAssets = [
    "icon.png",
    "*.blend1",
];


class AssetSerializer {

    async serialize(dir) {
        const assets = [];
        const files = await fs.readdir(dir);

        for (const file of files) {
            const p = path.join(dir, file);

            const info = await this.serializeAsset(p, path.basename(dir));
            assets.push(info);
        }

        
        return assets;
    }

    async serializeAsset(p, subDir) {
        const asset = new Asset(p, subDir);
        await asset.initialize();
        return await asset.toJson();
    }

}

class Asset {

    constructor(directory, assetSubDirectory) {
        this.directory = directory;
        this.assetSubDirectory = assetSubDirectory;
    }

    async initialize() {
        const stat = await fs.stat(this.directory);
        if (!stat.isDirectory()) console.error(`Asset ${this.directory} is not a directory but should be one. Please fix it!`);

        const assets = {};
        const timestamps = {
            modified: new Date(0),
            created: new Date(0),
        };
        const files = await fs.readdir(this.directory);
        
        const operations = files.map(async file => {
            const asset = path.join(this.directory, file);
            const type = path.extname(asset);
            const name = path.basename(asset);

            if (ignoredAssets.includes(name)) return;

            assets[type] = this.createDownloadUrl(path.basename(asset));

            
            // extract timestamps
            const tmpTimestamps = await gitDateExtractor.getStamps({
                files: asset,
            });

            const key = Object.keys(tmpTimestamps)[0];
            tmpTimestamps.created = new Date(tmpTimestamps[key].created * 1000);
            tmpTimestamps.modified = new Date(tmpTimestamps[key].modified * 1000);

            if (tmpTimestamps.created > timestamps.created) timestamps.created = tmpTimestamps.created;
            if (tmpTimestamps.modified > timestamps.modified) timestamps.modified = tmpTimestamps.modified;

        });

        await Promise.all(operations);

        console.log(timestamps);

        this.downloadables = assets;
        this.createdAt = timestamps.created.toISOString();
        this.lastModifiedAt = timestamps.modified.toISOString();

    }


    async toJson() {
        return {
            name: this.getName(),
            previewUrl: this.createDownloadUrl('icon.png'),
            downloads: this.downloadables,
            createdAt: this.createdAt,
            lastModifiedAt: this.lastModifiedAt,
        };
    }

    getName() {
        return path.basename(this.directory);
    }

    createDownloadUrl(file) {
        return `${baseDownloadUrl}/${this.assetSubDirectory}/${this.getName()}/${file}`;
    }
}


const meshes = await new AssetSerializer().serialize("./assets/meshes");

const json = {
    "statistics": {
        "meshes": {
            "count": meshes.length
        }
    },
    meshes: meshes
};

await fs.writeFile('assets.json', JSON.stringify(json, null, 4));
console.log("Finished writing file");

