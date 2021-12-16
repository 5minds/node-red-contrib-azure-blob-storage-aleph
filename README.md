# node-red-contrib-azure-blob-storage-aleph
[![npm version](https://badge.fury.io/js/node-red-contrib-azure-blob-storage-aleph.svg)](https://badge.fury.io/js/node-red-contrib-azure-blob-storage-aleph)

node-red-contrib-azure-blob-storage-aleph is a <a href="http://nodered.org" target="_new">Node-RED</a> node that allows you to work with Azure Blob Storage. You can create and delete Containers and also blob files.
This projects comes from the discontinued repo 
<a href="https://github.com/Azure/node-red-contrib-azure" target="_new">Azure/node-red-contrib-azure</a>


It contains tww Node-RED cloud nodes: **Azure Save Blob Storage** and **Azure Get Bob Storage**

![](https://raw.githubusercontent.com/javis86/node-red-contrib-azure-blob-storage-aleph/main/images/flows-nodes.png)

#### Azure Blob Storage

Node-Red node to connect to Azure Blob Storage


Ex: 'msg.payload' -> filename that you need to upload. Ex: filename.txt

- Use `msg.payload` to send a file to save on Azure Blob Storage.

- This file must be in the same folder of Node-RED user directory - typically `~/.node-red`


## Installation

```
npm install -g node-red-contrib-azure-blob-storage-aleph
```

### Saving data into Azure Blob Storage

#### Input Data example

```json
{
	payload: "file_existing_in_node_red.json"
}
```

Specifying blobname (accepts folder declaration)
```json
{
	payload: "file_existing_in_node_red.json",
    blobName: "test/destination_blobname.json"
}
```

#### Ouput Data example
The node redirects input message

```json
{
	payload: "file_existing_in_node_red.json",
	status: "OK",
	_msgid: "bf03c891.604458"
}
```
Or with blobName
```json
{
	payload: "file_existing_in_node_red.json",
    blobName: "test/destination_blobname.json",
	status: "OK",
	_msgid: "bf03c891.604458"
}
```
On Error
```json
{
	payload: "file_existing_in_node_red.json",
    blobName: "test/destination_blobname.json",
	status: "Error",
    statusMessage: "Error: ENOENT: no such file or directory, stat 'file_existing_in_node_red.json'",
	_msgid: "bf03c891.604458"
}
```
#### Step by step guide

1. Open Node-RED, usually: <http://127.0.0.1:1880>

2. Go to Hamburger Menu -> Import -> Clipboard

    ![](https://raw.githubusercontent.com/javis86/node-red-contrib-azure-blob-storage-aleph/main/images/import-clip.png)

3. Paste the following code into the "Import nodes" dialog

    ![](https://raw.githubusercontent.com/javis86/node-red-contrib-azure-blob-storage-aleph/main/images/import-nodes.PNG)

    ```
[{"id":"a7579ad9.74add8","type":"tab","label":"Flow 2","disabled":false,"info":""},{"id":"ead7871a.8172c8","type":"inject","z":"a7579ad9.74add8","name":"Payload","props":[{"p":"payload.destinationFile","v":"DocumentTest.txt","vt":"str"},{"p":"payload.blobName","v":"some_file.txt","vt":"str"}],"repeat":"","crontab":"","once":false,"onceDelay":"","topic":"","x":160,"y":160,"wires":[["c58e50c2.93222"]]},{"id":"fdab4f1f.0cab","type":"debug","z":"a7579ad9.74add8","name":"Log","active":true,"console":"false","complete":"true","x":570,"y":100,"wires":[]},{"id":"f65e9c4e.e7afb","type":"debug","z":"a7579ad9.74add8","name":"Log","active":true,"console":"false","complete":"true","x":570,"y":160,"wires":[]},{"id":"afe4baa5.276bc8","type":"Aleph Save Blob","z":"a7579ad9.74add8","name":"Azure Save Blob Storage","x":370,"y":100,"wires":[["fdab4f1f.0cab"]]},{"id":"c58e50c2.93222","type":"Aleph Get Blob","z":"a7579ad9.74add8","name":"Azure Get Blob Storage","x":370,"y":160,"wires":[["f65e9c4e.e7afb"]]},{"id":"e5858fae.8e3d6","type":"inject","z":"a7579ad9.74add8","name":"Payload","props":[{"p":"payload"},{"p":"blobName","v":"some_file.txt","vt":"str"}],"repeat":"","crontab":"","once":false,"onceDelay":"","topic":"","payload":"./some_file_on_disk","payloadType":"str","x":160,"y":100,"wires":[["afe4baa5.276bc8"]]}]
    ```
4. Double-click the Save Payload node

    ![](https://raw.githubusercontent.com/javis86/node-red-contrib-azure-blob-storage-aleph/main/images/save-payload.PNG)

5. Enter your filename into the Payload field and click Done. Check "Inject once at start?" to send that file when you click Deploy.

    ![](https://raw.githubusercontent.com/javis86/node-red-contrib-azure-blob-storage-aleph/main/images/save-payload-node.PNG)

6. Double-click the Azure Save Blob Storage node, enter your Storage Account Name, Storage Account Key and your desired Container Name and Blob Name. Now click Done.

    If you leave the Storage Blob name blank, the text in the msg.payload will be used as your blob name. Eg. if your msg.payload is ```blob1.txt```, and the Storage Blob Name property is empty, the blob name will be assigned as ```blob1```

    ![](https://raw.githubusercontent.com/javis86/node-red-contrib-azure-blob-storage-aleph/main/images/save-blob-node-selected.png) 
    
    ![](https://raw.githubusercontent.com/javis86/node-red-contrib-azure-blob-storage-aleph/main/images/save-blob-node.PNG)

7. Click Deploy

    ![](https://raw.githubusercontent.com/javis86/node-red-contrib-azure-blob-storage-aleph/main/images/deploy.png)

8. Click the square button on the left side of the Save Payload node.
   
    ![](https://raw.githubusercontent.com/javis86/node-red-contrib-azure-blob-storage-aleph/main/images/save-payload.PNG)

9. Click on the debug tab to your right and you'll see the output confirming that your data was sent.

    ![](https://raw.githubusercontent.com/javis86/node-red-contrib-azure-blob-storage-aleph/main/images/save-blob-output.PNG)


### Getting data from Azure Blob Storage

#### Input Data example

```json
{
	destinationFile: "some_file.txt",    
    blobName: "test/some_file.txt"
}
```
#### Ouput Data example
The node redirects input message

```json
{	
    _msgid: "d8f907b0c9a5fdf1"
    payload: "blobs_downloaded/some_file.txt"
    blobName: "test/some_file.txt"
    status: "OK"
}
```
On Error
```json
{
	payload: "blobs_downloaded/some_file.txt"
    blobName: "test/some_file.txt"
	status: "Error"
    statusMessage: "StorageError: NotFound"
	_msgid: "bf03c891.604458"
}
```

1. Double-click the Get Payload node

    ![](https://raw.githubusercontent.com/javis86/node-red-contrib-azure-blob-storage-aleph/main/images/get-payload.PNG)

2. Enter your filename into the Payload field and click Done.

3. Double-click the Azure Save Blob Storage node, enter your Storage Account Name, Storage Account Key and your desired Container Name and Blob Name. Now click Done.

    ![](https://raw.githubusercontent.com/javis86/node-red-contrib-azure-blob-storage-aleph/main/images/get-blob-node-selected.png) 
    
    ![](https://raw.githubusercontent.com/javis86/node-red-contrib-azure-blob-storage-aleph/main/images/save-blob-node.PNG)

4. Click Deploy

    ![](https://raw.githubusercontent.com/javis86/node-red-contrib-azure-blob-storage-aleph/main/images/deploy.png)

5. Click the square button on the left side of the Get Payload node.
   
    ![](https://raw.githubusercontent.com/javis86/node-red-contrib-azure-blob-storage-aleph/main/images/get-payload.PNG)

6. Click on the debug tab to your right and you'll see the name of file that you just downloded to node-red local folder.

    ![](https://raw.githubusercontent.com/javis86/node-red-contrib-azure-blob-storage-aleph/main/images/get-blob-output.PNG)

### References
You can read more about Azure Storage [here](https://docs.microsoft.com/en-us/azure/storage/).