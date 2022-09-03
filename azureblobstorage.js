

/*jshint esversion: 6 */
module.exports = function (RED) {
    var fs = require('fs');
    var path = require('path');
    var azure = require('@azure/storage-blob');

    var statusEnum = {
        disconnected: { color: "red", text: "Disconnected" },
        sending: { color: "yellow", text: "Sending" },
        blobSaved: { color: "green", text: "Sent message" },
        blobDownloaded: { color: "green", text: "Blob downloaded" },
        error: { color: "grey", text: "Error" },
        receiving: { color: "yellow", text: "Receiving" },
        received: { color: "green", text: "Received message" },
        operational: { color: "blue", text: "Operational" }
    };

    const setStatus = (node, status) => {
        node.status({ fill: status.color, shape: "dot", text: status.text });
    };

    var setErrorStatus = (node, status, message) => {
        node.status({ fill: status.color, shape: "dot", text: message });
    };

    var disconnectFrom = (node, blobService) => {
        if (blobService) {
            node.log('Disconnecting from Azure');
            blobService.removeAllListeners();
            blobService = null;
            setStatus(node, statusEnum.disconnected);
        }
    };

    var createContainer = (node, containerName, blobservice, callback) => {
        // Create the container
        blobservice.createContainerIfNotExists(containerName, function (error) {
            if (error) {
                node.log(error);
                setStatus(node, statusEnum.error);
                return;
            }

            callback();
        });
    };

    function ensureDirectoryExistence(filePath) {
        !fs.existsSync(filePath) && fs.mkdirSync(filePath, { recursive: true });
    }

    function AzureBlobStorage(config) {
        var node = this;

        RED.nodes.createNode(this, config);
        let clientAccountName = this.credentials.accountname;
        let clientAccountKey = this.credentials.key;
        let azureStorageBlobContainerName = this.credentials.container;

        const azureStorageBlobConnectionString = `DefaultEndpointsProtocol=https;AccountName=${clientAccountName};AccountKey=${clientAccountKey};EndpointSuffix=core.windows.net`;
        setStatus(node, statusEnum.operational);

        this.on('input', async function (msg) {
            try {
                setStatus(node, statusEnum.sending);
                let clientBlobName = parseBlobName(this.credentials, msg);

                const containerClient = new azure.ContainerClient(azureStorageBlobConnectionString, azureStorageBlobContainerName);
                const blockBlobClient = containerClient.getBlockBlobClient(clientBlobName);
                await blockBlobClient.uploadFile(msg.payload);

                msg.status = "OK";
                node.send(msg);
                setStatus(node, statusEnum.blobSaved);
            } catch (error) {
                setStatus(node, statusEnum.error);
                node.error('Error while trying to save blob:' + error.toString());

                msg.statusMessage = error.toString();
                msg.status = "Error";
                node.send(msg);
            }
        });

        this.on('close', function () {
            disconnectFrom(node, blobService);
        });

        const parseBlobName = (credentials, msg) => {
            let clientBlobName;
            if (!credentials.blob) {
                if (!msg.blobName) {
                    let nameObject = path.parse(msg.payload);
                    clientBlobName = nameObject.base;
                }
                else {
                    clientBlobName = msg.blobName;
                }
            }
            else {
                clientBlobName = credentials.blob;
            }
            return clientBlobName;
        }
    }

    function AzureBlobStorageDownload(config) {
        var node = this;
        const tempDirectory = "./blobs_downloaded";

        ensureDirectoryExistence(tempDirectory);

        RED.nodes.createNode(node, config);
        let clientAccountName = node.credentials.accountname;
        let clientAccountKey = node.credentials.key;
        let azureStorageBlobContainerName = node.credentials.container;        

        const azureStorageBlobConnectionString = `DefaultEndpointsProtocol=https;AccountName=${clientAccountName};AccountKey=${clientAccountKey};EndpointSuffix=core.windows.net`;
        setStatus(node, statusEnum.operational);

        this.on('input', async (msg) => {
            setStatus(node, statusEnum.receiving);
            let destinationFile;
            let clientBlobName;
            try {
                if (msg.payload) {
                    if (!msg.payload.destinationFile) {
                        node.error('No destinationFile parameter');
                        return;
                    }
                    destinationFile = path.join(tempDirectory, msg.payload.destinationFile);
                    clientBlobName = msg.payload.blobName ? msg.payload.blobName : node.credentials.blob;

                    if (!clientBlobName) {
                        node.error('No BlobName defined');
                        return;
                    }
                }
                else {
                    clientBlobName = node.credentials.blob;
                    const fileName = clientBlobName.replace('.txt', '.downloaded.txt');
                    destinationFile = path.join(tempDirectory, fileName);
                }

                const containerClient = new azure.ContainerClient(azureStorageBlobConnectionString, azureStorageBlobContainerName);
                const blockBlobClient = containerClient.getBlockBlobClient(clientBlobName);
                await blockBlobClient.downloadToFile(destinationFile);

                msg.status = "OK";
                node.send(msg);
                setStatus(node, statusEnum.received);
            } catch (error) {
                setStatus(node, statusEnum.error);
                node.error(`Error while trying to save blob: ${error.toString()}`);
                msg.status = "Error";
                msg.statusMessage = error.toString();
                node.send(msg);
            }
        });

        this.on('close', function () {
            disconnectFrom(node, blobService);
        });
    }

    // Registration of the node into Node-RED
    RED.nodes.registerType("Aleph Save Blob", AzureBlobStorage, {
        credentials: {
            accountname: { type: "text" },
            key: { type: "text" },
            container: { type: "text" },
            blob: { type: "text" },
        },
        defaults: {
            name: { value: "Save in Blob Storage" },
        }
    });

    // Registration of the node into Node-RED to download
    RED.nodes.registerType("Aleph Get Blob", AzureBlobStorageDownload, {
        credentials: {
            accountname: { type: "text" },
            key: { type: "text" },
            container: { type: "text" },
            blob: { type: "text" },
        },
        defaults: {
            name: { value: "Get Blob Storage" },
        }
    });


    // Helper function to print results in the console
    function printResultFor(op) {
        return function printResult(err, res) {
            if (err) node.error(op + ' error: ' + err.toString());
            if (res) node.log(op + ' status: ' + res.constructor.name);
        };
    }
};
