const express = require('express');
const multer = require('multer');
const { BlobServiceClient } = require('@azure/storage-blob');
const { DefaultAzureCredential } = require('@azure/identity');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Azure Storage setup (hardcode or use env vars; in App Service, these can be set in Configuration)
const storageAccountName = 'stzerotrust'; // Replace with yours
const containerName = 'files';
const blobServiceClient = new BlobServiceClient(
  `https://${storageAccountName}.blob.core.windows.net`,
  new DefaultAzureCredential() // Managed Identity handles auth
);
const containerClient = blobServiceClient.getContainerClient(containerName);

// Multer for file handling
const upload = multer({ storage: multer.memoryStorage() });

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// API: Upload file
app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const blobName = `${Date.now()}-${req.file.originalname}`;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    await blockBlobClient.uploadData(req.file.buffer);
    res.json({ message: 'File uploaded successfully!', blobName });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// API: List files (now includes metadata like lastModified)
app.get('/files', async (req, res) => {
  try {
    let blobs = [];
    for await (const blob of containerClient.listBlobsFlat({ includeMetadata: true })) {
      blobs.push({
        name: blob.name,
        lastModified: blob.properties.lastModified.toISOString()
      });
    }
    res.json(blobs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to list files' });
  }
});

// API: Download file
app.get('/download/:blobName', async (req, res) => {
  try {
    const blockBlobClient = containerClient.getBlockBlobClient(req.params.blobName);
    const downloadResponse = await blockBlobClient.download(0);
    res.setHeader('Content-Disposition', `attachment; filename="${req.params.blobName}"`);
    downloadResponse.readableStreamBody.pipe(res);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Download failed' });
  }
});

// API: Delete file
app.delete('/delete/:blobName', async (req, res) => {
  try {
    const blockBlobClient = containerClient.getBlockBlobClient(req.params.blobName);
    await blockBlobClient.delete();
    res.json({ message: 'File deleted successfully!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Delete failed' });
  }
});

// Serve frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});