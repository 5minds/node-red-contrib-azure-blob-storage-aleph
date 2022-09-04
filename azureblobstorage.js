/*jshint esversion: 6 */
module.exports = function (RED) {
    var fs = require('fs');
    var path = require('path');
    var azure = require('@azure/storage-blob');

    var statusEnum = {
        disconnected: { color: "grey", text: "Disconnected" },
        sending: { color: "yellow", text: "Sending" },
        blobSaved: { color: "green", text: "Blob Saved" },
        blobDownloaded: { color: "green", text: "Blob downloaded" },
        error: { color: "red", text: "Error" },
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

    function ensureDirectoryExistence(filePath) {
        !fs.existsSync(filePath) && fs.mkdirSync(filePath, { recursive: true });
    }

    function azureStorageSaveBlob(config) {
        var node = this;

        RED.nodes.createNode(this, config);
        let clientAccountName = this.credentials.accountname;
        let clientAccountKey = this.credentials.key;
        let azureStorageBlobContainerName = this.credentials.container;

        const azureStorageBlobConnectionString = `DefaultEndpointsProtocol=https;AccountName=${clientAccountName};AccountKey=${clientAccountKey};EndpointSuffix=core.windows.net`;
        setStatus(node, statusEnum.operational);

        this.on('input', async (msg, send, done) => {
            try {
                setStatus(node, statusEnum.sending);
                let clientBlobName = parseBlobName(this.credentials, msg);

                const containerClient = new azure.ContainerClient(azureStorageBlobConnectionString, azureStorageBlobContainerName);
                await containerClient.createIfNotExists();
                const blockBlobClient = containerClient.getBlockBlobClient(clientBlobName);
                await blockBlobClient.uploadFile(msg.payload);

                msg.payload.blobName = clientBlobName;
                msg.status = "OK";
                send(msg);
                setStatus(node, statusEnum.blobSaved);
                done();
            } catch (error) {
                setStatus(node, statusEnum.error);
                done(`Error while trying to save blob: : ${error.toString()}`);
                this.error(`Error while trying to save blob: ${error.toString()}`);
            }
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

    function azureStorageGetBlob(config) {
        var node = this;
        const tempDirectory = "./blobs_downloaded";

        ensureDirectoryExistence(tempDirectory);

        RED.nodes.createNode(node, config);
        let clientAccountName = node.credentials.accountname;
        let clientAccountKey = node.credentials.key;
        let azureStorageBlobContainerName = node.credentials.container;

        const azureStorageBlobConnectionString = `DefaultEndpointsProtocol=https;AccountName=${clientAccountName};AccountKey=${clientAccountKey};EndpointSuffix=core.windows.net`;
        setStatus(node, statusEnum.operational);

        this.on('input', async (msg, send, done) => {
            setStatus(node, statusEnum.receiving);
            let destinationFile;
            let clientBlobName;
            try {
                if (msg.payload) {
                    if (!msg.payload.destinationFile) {
                        done('No destinationFile parameter');
                        return;
                    }
                    destinationFile = path.join(tempDirectory, msg.payload.destinationFile);
                    clientBlobName = msg.payload.blobName || node.credentials.blob;

                    if (!clientBlobName) {
                        done('No BlobName defined');
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

                msg.payload.blobName = clientBlobName;
                msg.status = "OK";
                send(msg);
                setStatus(node, statusEnum.blobDownloaded);
                done();
            } catch (error) {
                setStatus(node, statusEnum.error);
                done(`Error while trying to save blob: ${error.toString()}`);
                this.error(`Error while trying to save blob: ${error.toString()}`);
            }
        });
    }

    RED.nodes.registerType("Aleph Save Blob", azureStorageSaveBlob, {
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

    RED.nodes.registerType("Aleph Get Blob", azureStorageGetBlob, {
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
