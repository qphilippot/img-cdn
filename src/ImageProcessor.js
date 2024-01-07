const sharp = require("sharp");

class ImageProcessor {
    constructor(config) {
        this.config = config;
        this.handler = sharp(this.config.inputPath);
        this.handler.resize(150)
    }
    process() {
        return new Promise((resolve, reject) => {
            console.log(this.config)
            const operations = this.config.operations;
            // // According to requested "operations" retrieve the process to perform
            for (const operation in operations) {
                // TODO il faut que l'API resolver soit fait dans l'index de facon indépendante
                switch (operation) {
                    case 'format':
                        this.setFormat(operations[operation]);
                        break;
                    case 'resize':
                        this.handler.resize(operations[operation]);
                        break;
                    default:
                        console.info(`Unknown "${recognizedOperation}" operation. Did you record it in api.yaml?`)
                        break;
                }
            }
            console.log('output', this.config.outputPath)
            this.handler.toFile(this.config.outputPath, (err, info) => {
                if(err) {
                    console.error(err);
                    reject();
                }
                else {
                    console.log(info);
                    resolve();
                }

            });
        })

    }

    setFormat(format) {
        if (typeof this.handler[format] !== 'function') {
            console.log(`Unknown "${format}" format`);
            return;
        }

        this.handler[format]();
    }
}

module.exports = ImageProcessor;
