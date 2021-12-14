

/*jshint esversion: 6 */
module.exports = function (RED) {    
    var fs = require('fs');
    var path = require('path');
    var clientBlobService = null;
    var nodeConfig = null;
    var Client = require('azure-storage');

    var statusEnum = {
        disconnected: { color: "red", text: "Disconnected" },
        sending: { color: "yellow", text: "Sending" },
        sent: { color: "green", text: "Sent message" },
        error: { color: "grey", text: "Error" },
        receiving: { color: "yellow", text: "Receiving" },
        received: { color: "green", text: "Received message" },
        operational: { color: "blue", text: "Operational" }
    };

    var setStatus = (node, status) => {
        node.status({ fill: status.color, shape: "dot", text: status.text });
    };

    var setErrorStatus = (node, status, message) => {
        node.status({ fill: status.color, shape: "dot", text: message });
    };

    var disconnectFrom = (node) => {
        if (clientBlobService) {
            node.log('Disconnecting from Azure');
            clientBlobService.removeAllListeners();
            clientBlobService = null;
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

    var uploadBlob = (node, file, blobService, containerName, blobName, callback) => {
        blobService.createBlockBlobFromLocalFile(containerName, blobName, file, function (error) {
            if (error) {
                node.log(error);
                setErrorStatus(node, statusEnum.error, file);
                callback(error);
            }

            node.log("Blob " + blobName + " uploaded to " + containerName + " container");
            callback();
        });
    };

    function ensureDirectoryExistence(filePath) {
        var dirname = path.dirname(filePath);
        if (fs.existsSync(dirname)) {            
            return true;
        }
        ensureDirectoryExistence(dirname);
        fs.mkdirSync(dirname);
    }

    // Main function called by Node-RED    
    function AzureBlobStorage(config) {
        // Store node for further use        
        nodeConfig = config;
        var node = this;

        // Create the Node-RED node
        RED.nodes.createNode(this, config);
        let clientAccountName = this.credentials.accountname;
        let clientAccountKey = this.credentials.key;
        let clientContainerName = this.credentials.container;

        var blobService = Client.createBlobService(clientAccountName, clientAccountKey);
        setStatus(node, statusEnum.operational);

        this.on('input', function (msg) {
            let clientBlobName;

            if (!this.credentials.blob) {
                if (!msg.blobName) {
                    var nameObject = path.parse(msg.payload);
                    clientBlobName = nameObject.base;
                }
                else {
                    clientBlobName = msg.blobName;
                }
            }
            else {
                clientBlobName = this.credentials.blob;
            }

            setStatus(node, statusEnum.sending);
            createContainer(node, clientContainerName, blobService, function () {
                uploadBlob(node, msg.payload, blobService, clientContainerName, clientBlobName, (error) => {
                    if (error) {
                        setStatus(node, statusEnum.error);
                        node.error('Error while trying to save blob:' + error.toString());
                        return;
                    }
                    msg.status = "OK";

                    node.send(msg);
                    setStatus(node, statusEnum.sent);
                });
            });
        });

        this.on('close', function () {
            disconnectFrom(this);
        });
    }

    function AzureBlobStorageDownload(config) {
        // Store node for further use
        var node = this;
        nodeConfig = config;
        //const tempDirectory = "./blobs_downloded";
        
        //ensureDirectoryExistence(tempDirectory);
       
        // Create the Node-RED node
        RED.nodes.createNode(node, config);
        let clientAccountName = node.credentials.accountname;
        let clientAccountKey = node.credentials.key;
        let clientContainerName = node.credentials.container;
        let clientBlobName;

        var blobservice = Client.createBlobService(clientAccountName, clientAccountKey);
        setStatus(node, statusEnum.operational);
        var destinationFile;

        this.on('input', function (msg) {
            setStatus(node, statusEnum.receiving);

            if (msg.payload) {
                if (!msg.payload.destinationFile) {
                    node.error('No destinationFile parameter');
                    return;
                }
                destinationFile =  msg.payload.destinationFile;
                //destinationFile = path.join(tempDirectory, msg.payload.destinationFile);
                
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

            downloadBlob(node, blobservice, clientContainerName, clientBlobName, destinationFile, (error) => {
                if (error) {
                    setStatus(node, statusEnum.error);
                    node.error('Error while trying to save blob:' + error.toString());
                    return;
                }

                let newMsg = {};
                newMsg.payload = destinationFile;
                newMsg.blobName = clientBlobName;
                newMsg.status = "OK";

                node.send(newMsg);
                setStatus(node, statusEnum.received);
            });
        });

        this.on('close', function () {
            node.log("close event");
            disconnectFrom(this);
        });
    }

    function downloadBlob(node, blobservice, containerName, blobName, fileName, callback) {
        blobservice.getBlobToLocalFile(containerName, blobName, fileName, function (error2) {
            if (error2) {
                node.log(error2);
                setErrorStatus(node, statusEnum.error, fileName);
                callback(error2);
            }

            node.log("Blob " + blobName + " downloaded");
            callback();
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
