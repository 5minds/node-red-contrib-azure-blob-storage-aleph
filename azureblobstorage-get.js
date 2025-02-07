/*jshint esversion: 6 */
module.exports = function (RED) {
    const fs = require('fs');
    const os = require('os');
    const path = require('path');
    const azure = require('@azure/storage-blob');

    const statusEnum = {
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

    function azureStorageGetBlob(config) {
        const node = this;
        RED.nodes.createNode(node, config);

        const tempDir = path.join(os.tmpdir(), 'aleph-get-blob-');
        const tempDirectory = fs.mkdtempSync(tempDir);
        node.log(`Temp directory: ${tempDirectory}`);

        const clientAccountName = node.credentials?.accountname;
        const clientAccountKey = node.credentials?.key;
        const azureStorageBlobContainerName = node.credentials?.container;

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
                this.error(`Error while trying to save blob: ${error.toString()}`, msg);
            }
        });
    }

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
};
