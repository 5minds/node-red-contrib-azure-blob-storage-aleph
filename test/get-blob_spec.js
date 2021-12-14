var helper = require("node-red-node-test-helper");
var getBlobNode = require("../azureblobstorage.js");
const sinon = require("sinon");
var azure = require('azure-storage');

helper.init(require.resolve('node-red'));

describe('get blob storage Node', function () {
    const sandbox = sinon.createSandbox();

    afterEach(function () {
        helper.unload();
    });
    sandbox.stub(azure, 'createBlobService').returns({});

    it('should be loaded', function (done) {
        var flow = [{ id: "n1", type: "Aleph Get Blob", name: "test name" }];

        helper.load(getBlobNode, flow, { n1: { accountname: "1", key: "1", container: "1" } }, function () {
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
        let flow = [{ id: "n1", type: "Aleph Get Blob", name: "test name", wires: [["n2"]] },
        { id: "n2", type: "helper" }];
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
        let flow = [{ id: "n1", type: "Aleph Get Blob", name: "test name", wires: [["n2"]] },
        { id: "n2", type: "helper" }];
        let testCredentials = { n1: { accountname: "1", key: "1", container: "1" } };

        helper.load(getBlobNode, flow, testCredentials, function () {
            let n1 = helper.getNode("n1");

            n1.receive({ payload: { destinationFile: "destino.txt"} });

            n1.on('call:error', call => {
                call.should.be.calledWithExactly('No BlobName defined');
                done();
            });

        });
    });
});