const { Stats } = require('fs');
const fs = require('fs/promises');
const path = require('path');

const baseDownloadUrl = "https://raw.githubusercontent.com/Kellojo/Mesh-Kit-Library/main/assets";

const ignoredAssets = [
    "icon.png",
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
        const files = await fs.readdir(this.directory);
        for (const file of files) {
            const asset = path.join(this.directory, file);
            const type = path.extname(asset);
            const name = path.basename(asset);

            if (ignoredAssets.includes(name)) continue;

            assets[type] = this.createDownloadUrl(path.basename(asset));
        }

        this.downloadables = assets;

    }


    async toJson() {
        return {
            name: this.getName(),
            previewUrl: this.createDownloadUrl('icon.png'),
            downloads: this.downloadables,
        };
    }

    getName() {
        return path.basename(this.directory);
    }

    createDownloadUrl(file) {
        return `${baseDownloadUrl}/${this.assetSubDirectory}/${this.getName()}/${file}`;
    }
}


(async () => {
    try {
        const meshes = await new AssetSerializer().serialize("./assets/meshes");

        const json = {
            "statistics": {
                "meshes": {
                    "count": meshes.length
                }
            },
            meshes: meshes
        };

        fs.writeFile('assets.json', JSON.stringify(json));
    } catch (e) {}    
    
})();
