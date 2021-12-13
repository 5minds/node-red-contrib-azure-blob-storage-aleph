var helper = require("node-red-node-test-helper");
var getBlobNode = require("../azureblobstorage.js");
var should = require("should");

helper.init(require.resolve('node-red'));

describe('get blob storage Node', function () {

    afterEach(function () {
        helper.unload();
    });

    it('should be loaded', function (done) {
        var flow = [{ id: "n1", type: "Aleph Get Blob", name: "test name" }];
                
        helper.load(getBlobNode, flow, function () {
            var n1 = helper.getNode("n1");
            try {
                n1.should.have.property('name', 'test name');
                done();
            } catch (err) {
                done(err);
            }
        });
    });

    // it('should make payload lower case', function (done) {
    //     var flow = [{ id: "n1", type: "lower-case", name: "test name", wires: [["n2"]] },
    //     { id: "n2", type: "helper" }];
    //     helper.load(lowerNode, flow, function () {
    //         var n2 = helper.getNode("n2");
    //         var n1 = helper.getNode("n1");
    //         n2.on("input", function (msg) {
    //             msg.should.have.property('payload', 'uppercase');
    //             done();
    //         });
    //         n1.receive({ payload: "UpperCase" });
    //     });
    // });
});