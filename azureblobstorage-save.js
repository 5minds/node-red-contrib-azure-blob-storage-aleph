/*jshint esversion: 6 */
module.exports = function (RED) {
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

    function azureStorageSaveBlob(config) {
        const node = this;
        RED.nodes.createNode(this, config);

        const clientAccountName = RED.util.evaluateNodeProperty(config.accountname, config.accountname_type, node);
        const clientAccountKey = RED.util.evaluateNodeProperty(config.key, config.key_type, node);
        const azureStorageBlobContainerName = RED.util.evaluateNodeProperty(config.container, config.container_type, node);

        const azureStorageBlobConnectionString = `DefaultEndpointsProtocol=https;AccountName=${clientAccountName};AccountKey=${clientAccountKey};EndpointSuffix=core.windows.net`;
        setStatus(node, statusEnum.operational);

        this.on('input', async (msg, send, done) => {
            try {
                setStatus(node, statusEnum.sending);

                const clientBlobName = parseBlobName(config, msg);

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

        const parseBlobName = (config, msg) => {
            let clientBlobName;

            const configBlobName = RED.util.evaluateNodeProperty(config.blob, config.blob_type, node);

            if (!configBlobName) {

                if (!msg.blobName) {
                    const nameObject = path.parse(msg.payload);
                    clientBlobName = nameObject.base;
                }
                else {
                    clientBlobName = msg.blobName;
                }
            }
            else {
                clientBlobName = configBlobName;
            }

            return clientBlobName;
        }
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
};
