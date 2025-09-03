document.addEventListener('DOMContentLoaded', () => {
  const fileInput = document.getElementById('fileInput');
  const dropZone = document.getElementById('dropZone');
  const uploadButton = document.getElementById('uploadButton');
  const progress = document.getElementById('progress');
  const uploadStatus = document.getElementById('uploadStatus');
  const fileList = document.getElementById('fileList');
  const toast = document.getElementById('toast');
  const darkModeToggle = document.getElementById('darkModeToggle');

  // Dark mode toggle
  darkModeToggle.addEventListener('change', () => {
    document.body.classList.toggle('dark');
  });

  // Drag-and-drop
  dropZone.addEventListener('click', () => fileInput.click());
  dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('border-blue-500'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('border-blue-500'));
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('border-blue-500');
    fileInput.files = e.dataTransfer.files;
    uploadFile();
  });

  fileInput.addEventListener('change', uploadFile);
  uploadButton.addEventListener('click', uploadFile);

  // Load files
  loadFiles();

  async function uploadFile() {
    const file = fileInput.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    progress.classList.remove('hidden');
    progress.value = 0;
    uploadStatus.textContent = 'Uploading...';

    try {
      const response = await fetch('/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      showToast(data.message || data.error, response.ok ? 'success' : 'error');
      loadFiles();
    } catch (error) {
      showToast('Error uploading file', 'error');
    } finally {
      progress.classList.add('hidden');
      fileInput.value = ''; // Reset input
    }
  }

  async function loadFiles() {
    try {
      const response = await fetch('/files');
      const files = await response.json();
      fileList.innerHTML = '';
      files.forEach(file => {
        const div = document.createElement('div');
        div.className = 'file-card bg-white p-6 rounded-lg shadow-md dark:bg-gray-800';
        div.innerHTML = `
          <div class="flex justify-between items-start">
            <div>
              <h3 class="font-medium text-lg mb-1">${file.name}</h3>
              <p class="text-sm text-gray-500 dark:text-gray-400">Uploaded: ${new Date(file.lastModified).toLocaleDateString()}</p>
            </div>
            <div class="flex space-x-2">
              <a href="/download/${file.name}" class="text-blue-500 hover:text-blue-700"><i class="fas fa-download"></i></a>
              <button onclick="deleteFile('${file.name}')" class="text-red-500 hover:text-red-700"><i class="fas fa-trash"></i></button>
            </div>
          </div>
        `;
        fileList.appendChild(div);
      });
    } catch (error) {
      showToast('Error loading files', 'error');
    }
  }

  window.deleteFile = async (blobName) => {
    if (!confirm(`Are you sure you want to delete ${blobName}?`)) return;
    try {
      const response = await fetch(`/delete/${blobName}`, { method: 'DELETE' });
      const data = await response.json();
      showToast(data.message || data.error, response.ok ? 'success' : 'error');
      loadFiles();
    } catch (error) {
      showToast('Error deleting file', 'error');
    }
  };

  function showToast(message, type) {
    toast.textContent = message;
    toast.classList.remove('hidden', 'success', 'error');
    toast.classList.add(type);
    setTimeout(() => toast.classList.add('hidden'), 3000);
  }
});