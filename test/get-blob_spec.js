var helper = require("node-red-node-test-helper");
var getBlobNode = require("../azureblobstorage.js");
const sinon = require("sinon");
var azure = require('azure-storage');

helper.init(require.resolve('node-red'));

describe('get blob storage Node', function () {
    let stubBlobService = sinon.createStubInstance(azure.BlobService);
    sinon.stub(azure, 'createBlobService').returns(stubBlobService);
    stubBlobService.getBlobToLocalFile.callsArgWith(3, undefined);

    afterEach(function () {
        helper.unload();
    });

    it('Node should be loaded', function (done) {
        var flow = [{ id: "n1", type: "Aleph Get Blob", name: "test name" }];
        let testCredentials = { n1: { accountname: "1", key: "1", container: "1" } };

        helper.load(getBlobNode, flow, testCredentials, function () {
            var n1 = helper.getNode("n1");
            try {
                n1.should.have.property('name', 'test name');
                done();
            } catch (err) {
                done(err);
            }
        });
    });


    it('Error with no destinationfile input property', function (done) {
        let flow = [{ id: "n1", type: "Aleph Get Blob", name: "test name" }];
        let testCredentials = { n1: { accountname: "1", key: "1", container: "1" } };

        helper.load(getBlobNode, flow, testCredentials, function () {
            let n1 = helper.getNode("n1");

            n1.receive({ payload: {} });

            n1.on('call:error', call => {
                call.should.be.calledWithExactly('No destinationFile parameter');
                done();
            });

        });
    });

    it('Error with no blobName input property', function (done) {
        let flow = [{ id: "n1", type: "Aleph Get Blob", name: "test name" }];
        let testCredentials = { n1: { accountname: "1", key: "1", container: "1" } };

        helper.load(getBlobNode, flow, testCredentials, function () {
            let n1 = helper.getNode("n1");

            n1.receive({ payload: { destinationFile: "destino.txt" } });

            n1.on('call:error', call => {
                call.should.be.calledWithExactly('No BlobName defined');
                done();
            });
        });
    });

    it('Save Blob correct output', function (done) {
        let flow = [{ id: "n1", type: "Aleph Get Blob", name: "test name", wires: [["n2"]] },
        { id: "n2", type: "helper" }];
        let testCredentials = { n1: { accountname: "1", key: "1", container: "1" } };

        helper.load(getBlobNode, flow, testCredentials, function () {
            let n1 = helper.getNode("n1");
            let n2 = helper.getNode("n2");

            n1.receive({ payload: { destinationFile: "destino.txt", blobName: "pepe" } });

            n2.on("input", function (msg) {
                try {
                    msg.should.have.property('payload', 'blobs_downloaded/destino.txt');
                    msg.should.have.property('blobName', 'pepe');
                    msg.should.have.property('status', 'OK');
                    done();
                } catch (err) {
                    done(err);
                }
            });

        });
    });

    it('Should throws error when Azure blob storage fails', function (done) {
        let flow = [{ id: "n1", type: "Aleph Get Blob", name: "test name"}];
        let testCredentials = { n1: { accountname: "1", key: "1", container: "1" } };

        const azureError = "Bad Request 400";
        stubBlobService.getBlobToLocalFile.callsArgWith(3, azureError);

        helper.load(getBlobNode, flow, testCredentials, function () {
            let n1 = helper.getNode("n1");
            
            n1.receive({ payload: { destinationFile: "destino.txt", blobName: "blobdir/fileToSave.txt" } });
            
            n1.on('call:error', call => {
                call.should.be.calledWithExactly(`Error while trying to save blob: ${azureError}`);
                done();
            });
            
        });
    });
    
    // Not Working test
    // it('Node should be unloaded', function (done) {
    //     var flow = [{ id: "n1", type: "Aleph Get Blob", name: "test name" }];
    //     let testCredentials = { n1: { accountname: "1", key: "1", container: "1" } };

    //     let n1;
    //     helper.load(getBlobNode, flow, testCredentials, function () {
    //         n1 = helper.getNode("n1");
    //         n1.closeCallback = n1._closeCallbacks[0];

    //         sinon.spy(n1, "closeCallback");
    //         helper.unload();
    //         n1.closeCallback.should.be.called();
    //         n1.closeCallback.restore();
    //         done();
    //     });       
        
    // });
});