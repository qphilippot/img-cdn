
const fs = require("fs");

// From process command
// const uri = new URL(process.argv[2].replace('./', 'https://127.0.0.1/'));
//
//
// const filePath = uri.pathname.replace('/', './');
// const options = uri.searchParams;

const { FileNotFoundException } = require('./Exceptions/FileException');
const path = require("path");
const bodyParser = require('body-parser');

const YAML = require('yaml');
const config = YAML.parse(fs.readFileSync(path.resolve(__dirname, './config/api.yaml'), 'utf-8'));
var express = require('express');
var app = express();

app.use('/', (req, res, next) => {
    if (req.url.includes('?')) {
        next();
    } else {
        express.static(__dirname + '/public')(req, res, next)
    }

});
// TODO add replacement var with parameter bag system + @ dynamic vars


async function  processImage(filePath, config, options) {

    const ImageProcessor = require('./src/ImageProcessor');
    if (typeof filePath === 'undefined') {
        throw new Error('Missing file path attribute');
    }

    if (!fs.existsSync(filePath)) {
        throw new FileNotFoundException(`Unable to find "${filePath}" file.`)
    }

    function getReverseApiConfig(api) {
        return Object.fromEntries(
            Object
                .entries(api)
                .reduce((acc, item) => {
                    // todo use traversable object api instead
                    if (typeof item[1] === 'object' && item[1]) {
                        console.log('->', item[1])
                        Object.keys(item[1]).forEach(key => {
                            acc.push([item[0] + '_' + key, item[1][key]])
                        })
                    } else {
                        acc.push(item);
                    }

                    return acc;
                }, [])
                .map(([key, value]) => [value, key])
        );
    }

    function mapApiParametersToImageManipulationDomain() {
// MAP API to IMAGE DOMAIN OPERATION
//     const api = config.api;
//
//     // console.log(Object
//     //     .entries(api)
//     //     .reduce((acc, item) => {
//     //         if (typeof item[1] === 'object' && item[1]) {
//     //             console.log('->',item[1])
//     //             Object.values(item[1]).forEach(value => {
//     //                 acc.push([ item[0], value ]);
//     //             })
//     //         } else {
//     //             acc.push(item);
//     //         }
//     //
//     //         return acc;
//     //     }, []));
//     // return;
//

        let domainConfig = {};
        const reversedApiConfig = getReverseApiConfig(config.api);
        const operations = Object.fromEntries(options.entries());
        console.log(operations);
        for (const operation in operations) {
            // TODO il faut que l'API resolver soit fait dans l'index de facon indépendante
            const recognizedOperation = reversedApiConfig[operation];
            const value = operations[operation];
            console.log(operation, recognizedOperation);
            switch (recognizedOperation) {
                case 'format':
                    domainConfig[recognizedOperation] = value;
                    break;
                default:
                    if (recognizedOperation.startsWith('resize_')) {
                        let action = recognizedOperation.replace('resize_', '');
                        console.log('action', action)
                        if (['width', 'height', 'fit'].includes(action)) {
                            if (!domainConfig['resize']) {
                                domainConfig['resize'] = {}
                            }
                            domainConfig['resize'][action] = parseInt(value);
                        }
                        if (['fit'].includes(action)) {
                            if (!domainConfig['resize']) {
                                domainConfig['resize'] = {}
                            }
                            domainConfig['resize'][action] = value;
                        }
                        break;
                    }
                    console.info(`Unknown "${recognizedOperation}" operation. Did you record it in api.yaml?`)
                    break;
            }


        }
        return domainConfig;
    }


    const pathPrefix = path.join(__dirname, path.sep, 'cache');

    const reversedApiConfig = Object.fromEntries(
        Object
            .entries(getReverseApiConfig(config.api))
            .map(([key, value]) => [value, key])
    );

    console.log(reversedApiConfig, options)
// DEFAULT
    let outputFile = path.resolve(filePath).replace(__dirname, pathPrefix)
        // remove './' relative path
        // .replace(/^\.\//, '')
        // replace old extension by the new one aka : '.jpg' by '.webp'
        .replace(/\.\w*$/, options.get(reversedApiConfig['format']))
// replace separator by '-' to avoid any issue with file system and nested dir
// .replace(/\//g, "-")

    if (config.files.output && config.files.output !== 'default') {
        const fileName = filePath.split('/').slice(-1);

        console.log('=>', fileName[0], fileName[0].split('.').slice(0, 1));
        outputFile =
            config.files.output
                .replace('$uri_path', filePath)
                .replace('$uri_request', options.toString)
                .replace('$uri_dir', pathPrefix)
                .replace('$uri_filename', fileName)
                .replace('$uri_file_no_ext', fileName[0].split('.').slice(0, 1))
                .replace('$resize_width', options.get(reversedApiConfig['resize_width']))
                .replace('$resize_height', options.get(reversedApiConfig['resize_height']))
                .replace('$format', options.get(reversedApiConfig['format']))
                .replace(/\//g, path.sep);

        if (!path.isAbsolute(outputFile)) {
            outputFile = path.resolve(pathPrefix, outputFile);
        }
    }

    // todo cleanup cron lastaccess ?
    if (fs.existsSync(outputFile)) {
        console.log(outputFile, 'already exists')
        return outputFile;
    } else {
        console.log(outputFile, 'not exists')
    }
// create nested dir recursively behind /cache
    const nestedDir = path.dirname(outputFile);

    try {
        await fs.promises.mkdir(nestedDir, {recursive: true})
        const processor = new ImageProcessor({
            inputPath: filePath,
            outputPath: outputFile,
            operations: mapApiParametersToImageManipulationDomain(),
            ...config
        });
        await processor.process();
        return outputFile;
    } catch (error) {
        console.error(error)
    }
}


// processImage(filePath, config, options);

app.get('*', async (req, res) => {
    const uri = new URL('http://server.com' + req.url);
    console.log('GET', uri);
    const filePath = './public' + uri.pathname;
    const options = uri.searchParams;

    try {
        // TODO do not use URLSearchParams as domain side
        res.sendFile(
            await processImage(filePath, config, options)
        )
    } catch (error) {
        if (error instanceof FileNotFoundException) {
            return res.status(404).send();
        } else {
            return res.status(500).send();
        }
    }

});

app.listen(3000, () => {
    console.log('server is ready');
})
