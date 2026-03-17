/**
 * Admin Dashboard - Sidebar Toggle Logic
 */
$(document).ready(function () {

  // Handle My Drive toggle manually if needed, or enhance Bootstrap's collapse
  // This ensures that when a user clicks the caret or the link, it toggles correctly

  // Rotate caret icon on collapse/expand
  // Rotate caret icon on collapse/expand


  // Fix Modal Backdrop Issue: Move modal to body
  if ($('#newFolderModal').length) {
    $('#newFolderModal').appendTo('body');
  }
  if ($('#shareModal').length) {
    $('#shareModal').appendTo('body');
  }
  if ($('#renameFileModal').length) {
    $('#renameFileModal').appendTo('body');
  }
  if ($('#renameFolderModal').length) {
    $('#renameFolderModal').appendTo('body');
  }



  // Ensure "My Drive" arrow is down by default (since it's open)
  // Check if myDriveSubmenu is visible
  if ($('#myDriveSubmenu').hasClass('show')) {
    $('[data-target="#myDriveSubmenu"] .caret-icon').css('transform', 'rotate(0deg)');
  } else {
    $('[data-target="#myDriveSubmenu"] .caret-icon').css('transform', 'rotate(-90deg)');
  }

  // Handle nested folder toggles specifically
  // Use event delegation for dynamically added elements
  $(document).on('click', '[data-toggle="collapse"]', function (e) {
    e.preventDefault();
    e.stopPropagation(); // Prevent navigating if it's a link (though it's a span now)

    let target = $(this).attr('data-target');
    if (!target) {
      target = $(this).attr('href');
    }

    if (target) {
      $(target).collapse('toggle');
    }
  });

  // Folder Expansion State Persistence
  // Consolidated Folder Expansion & Caret Logic
  // Using document delegation to ensure we catch all collapses, but filtering for folders
  $(document).on('show.bs.collapse hide.bs.collapse', '.collapse', function (e) {
    e.stopPropagation();

    // 1. Rotate Caret (applies to all collapsible items with a caret-icon parent)
    const isExpandedCaret = e.type.includes('show'); // Renamed to avoid conflict
    const rotation = isExpandedCaret ? 'rotate(0deg)' : 'rotate(-90deg)';
    $(this).parent().find('.caret-icon').first().css('transform', rotation);

    // 2. Session Persistence (via REST API)
    const folderIdRaw = $(this).attr('id'); // e.g., "folder-123"

    if (folderIdRaw?.startsWith('folder-')) {
      const folderId = folderIdRaw.replaceAll('folder-', '');
      // Check for "show" in event type (handles both 'show' and 'show.bs.collapse')
      const isExpanded = e.type.includes('show');

      // Call API
      console.log('[AdminJS] Toggling folder state via API:', folderId, isExpanded);
      $.post('/api/folder/state/toggle', {
        folderId: folderId,
        expanded: isExpanded
      }).fail(function () {
        console.warn('[AdminJS] Failed to save folder expansion state');
      });
    }
  });

  // --- Sidebar Redesign Logic ---
  const secondarySidebar = document.getElementById('secondary-sidebar');
  const btnMyDrive = document.getElementById('btn-my-drive');
  const mobileToggle = document.getElementById('mobile-sidebar-toggle');

  // Sync btn-my-drive active state with sidebar on load
  if (btnMyDrive && secondarySidebar && !secondarySidebar.classList.contains('collapsed')) {
    btnMyDrive.classList.add('active');
  }

  // My Drive: navigate on first click; toggle sidebar if already on my-drive view
  if (btnMyDrive && secondarySidebar) {
    btnMyDrive.addEventListener('click', function (e) {
      var toolbar = document.querySelector('[data-view]');
      var currentView = toolbar ? toolbar.getAttribute('data-view') : null;

      if (currentView === 'my-drive') {
        // Already on My Drive — just toggle the sidebar
        e.preventDefault();
        e.stopPropagation();
        secondarySidebar.classList.toggle('collapsed');
        if (secondarySidebar.classList.contains('collapsed')) {
          btnMyDrive.classList.remove('active');
        } else {
          btnMyDrive.classList.add('active');
        }
      }
      // Otherwise let the <a> href navigate (opens root folder + tree=1)
    });
  }

  // Mobile Toggle
  if (mobileToggle && secondarySidebar) {
    mobileToggle.addEventListener('click', function (e) {
      e.preventDefault();
      secondarySidebar.classList.toggle('mobile-open');
    });

    // Close mobile sidebar when clicking outside
    document.addEventListener('click', function (e) {
      if (secondarySidebar.classList.contains('mobile-open') &&
        !secondarySidebar.contains(e.target) &&
        !mobileToggle.contains(e.target)) {
        secondarySidebar.classList.remove('mobile-open');
      }
    });
  }

  // Grid View Dropdown Logic
  // Since the card is clickable, we need to stop propagation when clicking the dropdown toggle.
  // User requested "hover" to show menu, so we just stop propagation here to prevent card navigation
  // if they happen to click the button. CSS handles the visibility.
  $(document).on('click', '.folder-card [data-toggle="dropdown"], .file-card [data-toggle="dropdown"]', function (e) {
    e.stopPropagation();
    e.preventDefault();
    // $(this).dropdown('toggle'); // CSS handles hover now
  });

  // "New" Button Dropdown - Manual Toggle to ensure visibility
  // Using event delegation to safe-guard against dynamic rendering
  $(document).on('click', '#newDropdown', function (e) {
    e.preventDefault();
    e.stopPropagation(); // Prevent bubbling

    const container = $(this).closest('.new-dropdown-container');
    const menu = container.find('.dropdown-menu');

    // Toggle state
    if (container.hasClass('show')) {
      container.removeClass('show');
      menu.removeClass('show');
    } else {
      // Close other open dropdowns if any
      $('.dropdown-menu.show').removeClass('show');
      $('.dropdown.show').removeClass('show');

      container.addClass('show');
      menu.addClass('show');
    }
  });

  // Close New Dropdown when clicking outside
  $(document).on('click', function (e) {
    if (!$(e.target).closest('.new-dropdown-container').length) {
      $('.new-dropdown-container').removeClass('show');
      $('.new-dropdown-container .dropdown-menu').removeClass('show');
    }
  });


  // Focus and select text in New Folder Modal
  $(document).on('shown.bs.modal', '#newFolderModal', function () {
    const input = $('#newFolderName');
    input.focus();
    input.select();
  });

  // Explicitly trigger modal on click (fallback for data-toggle issues)
  $(document).on('click', '#btnNewFolder', function (e) {
    e.preventDefault();
    $('#newFolderModal').modal('show');
  });

  // Explicitly handle Cancel/Close button in New Folder Modal
  $(document).on('click', '#newFolderModal [data-dismiss="modal"]', function (e) {
    e.preventDefault();
    $('#newFolderModal').modal('hide');
  });

  // Explicitly handle Cancel/Close button in Delete Confirmation Modal
  $(document).on('click', '#deleteConfirmationModal [data-dismiss="modal"]', function (e) {
    e.preventDefault();
    $('#deleteConfirmationModal').modal('hide');
  });

  // Explicitly handle Cancel/Close button in Rename Folder Modal
  $(document).on('click', '#renameFolderModal [data-dismiss="modal"]', function (e) {
    e.preventDefault();
    $('#renameFolderModal').modal('hide');
  });

  // Explicitly handle Cancel/Close button in Rename File Modal
  $(document).on('click', '#renameFileModal [data-dismiss="modal"]', function (e) {
    e.preventDefault();
    $('#renameFileModal').modal('hide');
  });

  // Also prevent clicks inside the dropdown menu from triggering the card click (navigation)
  $(document).on('click', '.folder-card .dropdown-menu, .file-card .dropdown-menu', function (e) {
    e.stopPropagation();
  });

  // Delete Confirmation Modal Logic
  globalThis.openDeleteModal = function (deleteUrl) {
    $('#deleteTargetUrl').val(deleteUrl);
    $('#deleteConfirmInput').val('');
    $('#confirmDeleteBtn').prop('disabled', true);
    $('#deleteConfirmationModal').modal('show');
  };

  $('#deleteConfirmInput').on('input', function () {
    if ($(this).val().toLowerCase() === 'delete') {
      $('#confirmDeleteBtn').prop('disabled', false);
    } else {
      $('#confirmDeleteBtn').prop('disabled', true);
    }
  });

  $('#confirmDeleteBtn').click(function () {
    const deleteUrl = $('#deleteTargetUrl').val();
    if (deleteUrl) {
      globalThis.location.href = deleteUrl;
    }
  });

  // Rename Folder Modal Logic
  globalThis.openRenameModal = function (folderId, currentName) {
    $('#renameFolderId').val(folderId);
    $('#renameFolderName').val(currentName);
    $('#renameFolderModal').modal('show');
  };

  $('#renameFolderModal').on('shown.bs.modal', function () {
    $('#renameFolderName').focus().select();
  });

  $('#btnRenameFolderConfirm').click(async function () {
    const folderId = $('#renameFolderId').val();
    const name = $('#renameFolderName').val();
    const btn = $(this);

    if (!name) {
      alert('Please enter a folder name');
      return;
    }

    const originalText = btn.text();
    btn.text('Saving...').prop('disabled', true);

    try {
      const response = await fetch('/api/folder/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ folder_id: folderId, name: name })
      });

      const result = await response.json();

      if (result.success) {
        globalThis.location.reload();
      } else {
        alert('Error: ' + result.message);
        btn.text(originalText).prop('disabled', false);
      }
    } catch (error) {
      console.error('Rename Error:', error);
      alert('Failed to rename folder');
      btn.text(originalText).prop('disabled', false);
    }
  });

  // Rename File Modal Logic
  let renameFileExt = '';

  globalThis.openRenameFileModal = function (fileId, currentName, originalFilename) {
    let dotIdx = currentName.lastIndexOf('.');
    let baseName, ext;
    if (dotIdx > 0) {
      baseName = currentName.substring(0, dotIdx);
      ext = currentName.substring(dotIdx);
    } else {
      // Title has no extension — recover from original_filename
      const origDotIdx = originalFilename ? originalFilename.lastIndexOf('.') : -1;
      ext = origDotIdx > 0 ? originalFilename.substring(origDotIdx) : '';
      baseName = currentName;
    }
    renameFileExt = ext;
    $('#renameFileId').val(fileId);
    $('#renameFileName').val(baseName);
    $('#renameFileExt').text(ext);
    $('#renameFileExt').toggle(ext !== '');
    $('#renameFileModal').modal('show');
  };

  $('#renameFileModal').on('shown.bs.modal', function () {
    $('#renameFileName').focus().select();
  });

  $('#btnRenameFileConfirm').click(async function () {
    const fileId = $('#renameFileId').val();
    const name = $('#renameFileName').val().trim() + renameFileExt;
    const btn = $(this);

    if (!name) {
      alert('Please enter a file name');
      return;
    }

    const originalText = btn.text();
    btn.text('Saving...').prop('disabled', true);

    try {
      const response = await fetch('/api/file/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ file_id: fileId, name: name })
      });

      const result = await response.json();

      if (result.success) {
        globalThis.location.reload();
      } else {
        alert('Error: ' + result.message);
        btn.text(originalText).prop('disabled', false);
      }
    } catch (error) {
      console.error('Rename Error:', error);
      alert('Failed to rename file');
      btn.text(originalText).prop('disabled', false);
    }
  });

});

// =========================================
// Multi-File Upload with Progress Tracking
// =========================================

const UPLOAD_MAX_FILES = 10;
const UPLOAD_MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const UPLOAD_CONCURRENCY = 3;

/**
 * Format bytes into human-readable string.
 * @param {number} bytes
 * @returns {string}
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1) + ' ' + units[i];
}

/**
 * UploadPanel - Manages the bottom-right floating upload progress panel.
 * Google Drive style: fixed bottom-right, collapsible header, per-file rows.
 */
const UploadPanel = {
  _panelEl: null,
  _bodyEl: null,
  _headerTextEl: null,
  _isMinimized: false,
  _fileEntries: {},
  _completedCount: 0,
  _totalCount: 0,
  _failedCount: 0,

  _ensurePanel: function () {
    if (this._panelEl) return;

    const panel = document.createElement('div');
    panel.id = 'uploadProgressPanel';
    panel.className = 'upload-panel';
    panel.innerHTML =
      '<div class="upload-panel-header" id="uploadPanelHeader">' +
        '<span class="upload-panel-header-text" id="uploadPanelHeaderText">Uploading...</span>' +
        '<div class="upload-panel-header-actions">' +
          '<button class="upload-panel-btn" id="uploadPanelToggle" title="Minimize">' +
            '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>' +
          '</button>' +
          '<button class="upload-panel-btn" id="uploadPanelClose" title="Close" style="display:none;">' +
            '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>' +
          '</button>' +
        '</div>' +
      '</div>' +
      '<div class="upload-panel-body" id="uploadPanelBody"></div>';
    document.body.appendChild(panel);

    this._panelEl = panel;
    this._bodyEl = panel.querySelector('#uploadPanelBody');
    this._headerTextEl = panel.querySelector('#uploadPanelHeaderText');

    // Toggle minimize/expand
    panel.querySelector('#uploadPanelToggle').addEventListener('click', () => {
      this._isMinimized = !this._isMinimized;
      this._bodyEl.style.display = this._isMinimized ? 'none' : 'block';
      const svg = panel.querySelector('#uploadPanelToggle svg polyline');
      svg.setAttribute('points', this._isMinimized ? '6 15 12 9 18 15' : '6 9 12 15 18 9');
    });

    // Close button
    panel.querySelector('#uploadPanelClose').addEventListener('click', () => {
      this.reset();
    });
  },

  startBatch: function (totalCount) {
    this._ensurePanel();
    this._completedCount = 0;
    this._failedCount = 0;
    this._totalCount = totalCount;
    this._fileEntries = {};
    this._bodyEl.innerHTML = '';
    this._panelEl.style.display = 'flex';
    this._bodyEl.style.display = 'block';
    this._isMinimized = false;
    this._panelEl.querySelector('#uploadPanelClose').style.display = 'none';
    const svg = this._panelEl.querySelector('#uploadPanelToggle svg polyline');
    svg.setAttribute('points', '6 9 12 15 18 9');
    this._updateHeaderText();
  },

  addFile: function (id, filename, size) {
    this._ensurePanel();

    const row = document.createElement('div');
    row.className = 'upload-file-row';
    row.id = 'upload-row-' + id;
    row.innerHTML =
      '<div class="upload-file-info">' +
        '<span class="upload-file-name" title="' + filename + '">' + this._truncate(filename, 35) + '</span>' +
        '<span class="upload-file-size">' + formatFileSize(size) + '</span>' +
      '</div>' +
      '<div class="upload-file-progress-wrap">' +
        '<div class="upload-file-progress-bar" id="upload-bar-' + id + '"></div>' +
      '</div>' +
      '<div class="upload-file-status" id="upload-status-' + id + '">' +
        '<span class="upload-status-text">Waiting...</span>' +
      '</div>';
    this._bodyEl.appendChild(row);
    this._fileEntries[id] = { row: row, filename: filename, size: size, status: 'waiting' };
  },

  updateProgress: function (id, percent) {
    const bar = document.getElementById('upload-bar-' + id);
    const status = document.getElementById('upload-status-' + id);
    if (bar) {
      bar.style.width = Math.min(percent, 100) + '%';
    }
    if (status && this._fileEntries[id]) {
      this._fileEntries[id].status = 'uploading';
      status.innerHTML = '<span class="upload-status-text upload-status-uploading">' + Math.round(percent) + '%</span>';
    }
  },

  markSuccess: function (id) {
    const bar = document.getElementById('upload-bar-' + id);
    const status = document.getElementById('upload-status-' + id);
    const row = document.getElementById('upload-row-' + id);
    if (bar) {
      bar.style.width = '100%';
      bar.classList.add('upload-bar-success');
    }
    if (status) {
      status.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1e8e3e" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>';
    }
    if (row) {
      row.classList.add('upload-row-done');
    }
    if (this._fileEntries[id]) {
      this._fileEntries[id].status = 'success';
    }
    this._completedCount++;
    this._updateHeaderText();
    this._checkAllDone();
  },

  markFailed: function (id, errorMsg) {
    const bar = document.getElementById('upload-bar-' + id);
    const status = document.getElementById('upload-status-' + id);
    const row = document.getElementById('upload-row-' + id);
    if (bar) {
      bar.classList.add('upload-bar-failed');
    }
    if (status) {
      status.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d93025" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
      status.title = errorMsg || 'Upload failed';
    }
    if (row) {
      row.classList.add('upload-row-failed');
    }
    if (this._fileEntries[id]) {
      this._fileEntries[id].status = 'failed';
    }
    this._failedCount++;
    this._completedCount++;
    this._updateHeaderText();
    this._checkAllDone();
  },

  _updateHeaderText: function () {
    if (!this._headerTextEl) return;
    if (this._completedCount < this._totalCount) {
      const uploading = this._totalCount - this._completedCount;
      this._headerTextEl.textContent = 'Uploading ' + uploading + ' item' + (uploading > 1 ? 's' : '') + '...';
    } else if (this._failedCount === 0) {
      this._headerTextEl.textContent = this._totalCount + ' upload' + (this._totalCount > 1 ? 's' : '') + ' complete';
    } else {
      const succeeded = this._totalCount - this._failedCount;
      this._headerTextEl.textContent = succeeded + ' complete, ' + this._failedCount + ' failed';
    }
  },

  _checkAllDone: function () {
    if (this._completedCount >= this._totalCount) {
      this._panelEl.querySelector('#uploadPanelClose').style.display = 'inline-flex';
      // Auto-reload after 1.5s if at least one succeeded
      if (this._failedCount < this._totalCount) {
        setTimeout(function () {
          globalThis.location.reload();
        }, 1500);
      }
    }
  },

  reset: function () {
    if (this._panelEl) {
      this._panelEl.style.display = 'none';
      this._bodyEl.innerHTML = '';
      this._fileEntries = {};
      this._completedCount = 0;
      this._failedCount = 0;
      this._totalCount = 0;
    }
  },

  _truncate: function (str, max) {
    if (str.length <= max) return str;
    const ext = str.includes('.') ? str.substring(str.lastIndexOf('.')) : '';
    const nameWithoutExt = str.substring(0, str.length - ext.length);
    return nameWithoutExt.substring(0, max - ext.length - 3) + '...' + ext;
  }
};

/**
 * Upload a single file via XHR with progress tracking.
 * @param {File} file
 * @param {string} folderId
 * @param {string} uploadId
 * @returns {Promise<object>}
 */
function uploadSingleFile(file, folderId, uploadId) {
  return new Promise(function (resolve, reject) {
    const uploadUrl = '/api/file/upload?folder_id=' + encodeURIComponent(folderId)
      + '&filename=' + encodeURIComponent(file.name)
      + '&content_type=' + encodeURIComponent(file.type || 'application/octet-stream')
      + '&size=' + file.size;

    const xhr = new XMLHttpRequest();
    xhr.open('POST', uploadUrl, true);
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');

    xhr.upload.addEventListener('progress', function (e) {
      if (e.lengthComputable) {
        const percent = (e.loaded / e.total) * 100;
        UploadPanel.updateProgress(uploadId, percent);
      }
    });

    xhr.addEventListener('load', function () {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch {
          reject(new Error('Invalid server response'));
        }
      } else {
        let errorMsg = 'Upload failed (HTTP ' + xhr.status + ')';
        try {
          const errResult = JSON.parse(xhr.responseText);
          errorMsg = errResult.message || errorMsg;
        } catch { /* Intentionally ignored - response body may not be valid JSON; use default error message */ }
        reject(new Error(errorMsg));
      }
    });

    xhr.addEventListener('error', function () {
      reject(new Error('Network error during upload'));
    });

    xhr.addEventListener('abort', function () {
      reject(new Error('Upload aborted'));
    });

    xhr.send(file);
  });
}

/**
 * Run tasks in parallel with a concurrency limit.
 * @param {Array<Function>} tasks
 * @param {number} concurrency
 * @returns {Promise<void>}
 */
function runWithConcurrency(tasks, concurrency) {
  return new Promise(function (resolve) {
    let index = 0;
    let active = 0;
    let completed = 0;
    const total = tasks.length;

    function next() {
      while (active < concurrency && index < total) {
        const taskIndex = index++;
        active++;
        tasks[taskIndex]().finally(function () {
          active--;
          completed++;
          if (completed === total) {
            resolve();
          } else {
            next();
          }
        });
      }
    }

    if (total === 0) {
      resolve();
    } else {
      next();
    }
  });
}

// Warn if user tries to leave during upload
function beforeUnloadHandler(e) {
  e.preventDefault();
  e.returnValue = 'Files are still uploading. Are you sure you want to leave?';
  return e.returnValue;
}

/**
 * Handle multi-file upload from the file input.
 * @param {HTMLInputElement} input
 */
globalThis.handleMultiFileUpload = function (input) {
  if (!input.files || input.files.length === 0) return;

  const files = Array.from(input.files);

  // Validate: max file count
  if (files.length > UPLOAD_MAX_FILES) {
    alert('You can upload a maximum of ' + UPLOAD_MAX_FILES + ' files at once. You selected ' + files.length + '.');
    input.value = '';
    return;
  }

  // Validate: max file size per file
  const oversizedFiles = files.filter(function (f) { return f.size > UPLOAD_MAX_SIZE_BYTES; });
  if (oversizedFiles.length > 0) {
    const names = oversizedFiles.map(function (f) { return f.name + ' (' + formatFileSize(f.size) + ')'; }).join('\n');
    alert('The following files exceed the ' + formatFileSize(UPLOAD_MAX_SIZE_BYTES) + ' limit:\n\n' + names);
    input.value = '';
    return;
  }

  // Validate: no empty files
  const emptyFiles = files.filter(function (f) { return f.size === 0; });
  if (emptyFiles.length > 0) {
    const emptyNames = emptyFiles.map(function (f) { return f.name; }).join(', ');
    alert('Empty files cannot be uploaded: ' + emptyNames);
    input.value = '';
    return;
  }

  // Resolve folder ID
  const urlParams = new URLSearchParams(globalThis.location.search);
  const folderId = urlParams.get('id') || 'a1000000-0000-0000-0000-000000000001';

  // Initialize the upload panel
  UploadPanel.startBatch(files.length);

  globalThis.addEventListener('beforeunload', beforeUnloadHandler);

  // Track IDs of successfully uploaded files (for thumbnail polling after reload)
  const uploadedFileIds = [];

  // Create upload tasks
  const tasks = files.map(function (file, index) {
    const uploadId = 'upload-' + Date.now() + '-' + index;

    UploadPanel.addFile(uploadId, file.name, file.size);

    return function () {
      return uploadSingleFile(file, folderId, uploadId)
        .then(function (result) {
          console.log('[Upload] Success:', file.name, result);
          UploadPanel.markSuccess(uploadId);
          if (result?.data?.file_id) {
            uploadedFileIds.push(result.data.file_id);
          }
        })
        .catch(function (error) {
          console.error('[Upload] Failed:', file.name, error);
          UploadPanel.markFailed(uploadId, error.message);
        });
    };
  });

  // Execute with concurrency limit
  runWithConcurrency(tasks, UPLOAD_CONCURRENCY).then(function () {
    globalThis.removeEventListener('beforeunload', beforeUnloadHandler);
    if (uploadedFileIds.length > 0) {
      try { sessionStorage.setItem('pendingThumbnails', JSON.stringify(uploadedFileIds)); } catch { /* Intentionally ignored - sessionStorage may be full or disabled; thumbnails will generate on next page load */ }
    }
    // Reload so new file cards appear, then polling will inject thumbnails when ready
    setTimeout(function () { globalThis.location.reload(); }, 1500);
  });

  // Reset input so the same files can be re-selected
  input.value = '';
};

// Backward compatibility alias
globalThis.handleFileUpload = globalThis.handleMultiFileUpload;

/**
 * Copy Public Link
 * Publishes the file if needed and copies the link.
 */
/**
 * Show a toast notification
 */
globalThis.showToast = function (message, type = 'success') {
  // Remove any existing toast
  $('.app-toast').remove();

  const bgColor = type === 'error' ? '#dc3545' : '#323232';
  const toast = $(`
    <div class="app-toast" style="
      position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
      background: ${bgColor}; color: #fff; padding: 10px 24px;
      border-radius: 8px; font-size: 14px; z-index: 10000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2); display: flex; align-items: center; gap: 8px;
      animation: toastSlideUp 0.3s ease;
    ">
      ${type === 'success' ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4caf50" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>' : ''}
      <span>${message}</span>
    </div>
  `);

  $('body').append(toast);
  setTimeout(() => toast.fadeOut(300, () => toast.remove()), 3000);
};

/**
 * Copy public link (creates if needed, always copies to clipboard)
 */
globalThis.copyPublicLink = async function (element, fileId) {
  const btn = $(element);
  const originalHtml = btn.html();

  if (btn.prop('disabled')) return;
  btn.prop('disabled', true);

  // Show spinner
  const icon = btn.find('svg');
  icon.replaceWith('<span class="spinner-border spinner-border-sm mr-2" role="status" aria-hidden="true"></span>');

  try {
    const response = await fetch('/api/file/link/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ file_id: fileId })
    });
    const result = await response.json();

    if (result.success && result.data?.link) {
      // Copy to clipboard
      try {
        await navigator.clipboard.writeText(result.data.link);
      } catch (err) {
        console.warn('Clipboard API failed, trying fallback', err);
        fallbackCopyTextToClipboard(result.data.link);
      }

      // Restore icon as blue globe
      const blueGlobeIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#007bff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="2" y1="12" x2="22" y2="12"></line>
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
      </svg>`;
      btn.find('.spinner-border').replaceWith(blueGlobeIcon);

      // If file was private, dynamically add "Disable public link" item
      const dropdownMenu = btn.closest('.dropdown-menu');
      if (dropdownMenu.length && !dropdownMenu.find('.disable-public-link-item').length) {
        const disableItem = `<a class="dropdown-item disable-public-link-item" href="#"
           onclick="disablePublicLink(this, '${fileId}'); return false;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
          </svg>
          &nbsp;<span class="action-label">Disable public link</span>
        </a>`;
        btn.after(disableItem);
      }

      // Update grid card header icon to blue globe
      const gridCard = btn.closest('.file-grid-card, .folder-grid-card');
      if (gridCard.length) {
        const headerIcon = gridCard.find('.grid-card-icon');
        headerIcon.html(`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#007bff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="2" y1="12" x2="22" y2="12"></line>
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
        </svg>`);
      }

      showToast('Link copied to clipboard');
    } else {
      throw new Error(result.message || 'Failed to generate link');
    }
  } catch (error) {
    console.error('Copy Public Link Error:', error);
    btn.html(originalHtml);
    showToast('Failed to copy link: ' + error.message, 'error');
  } finally {
    btn.prop('disabled', false);
  }
};

/**
 * Disable public link (separate destructive action)
 */
globalThis.disablePublicLink = async function (element, fileId) {
  const btn = $(element);
  const dropdownMenu = btn.closest('.dropdown-menu');
  const gridCard = btn.closest('.file-grid-card, .folder-grid-card');

  if (btn.prop('disabled')) return;
  btn.prop('disabled', true);

  // Show spinner
  const icon = btn.find('svg');
  icon.replaceWith('<span class="spinner-border spinner-border-sm mr-2" role="status" aria-hidden="true"></span>');

  try {
    const response = await fetch('/api/file/link/toggle-public', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ file_id: fileId, state: 'off' })
    });
    const result = await response.json();

    if (result.success) {
      // Remove the "Disable" menu item
      btn.remove();

      // Update "Copy public link" icon back to gray
      const copyBtn = dropdownMenu.find('.copy-public-link-item');
      if (copyBtn.length) {
        copyBtn.find('svg').attr('stroke', 'currentColor');
      }

      // Update grid card header icon back to default
      if (gridCard.length) {
        const headerIcon = gridCard.find('.grid-card-icon svg');
        if (headerIcon.length) {
          headerIcon.attr('stroke', 'currentColor');
        }
      }

      showToast('Public link disabled');
    } else {
      throw new Error(result.message || 'Unknown error');
    }
  } catch (e) {
    console.error('Disable Link Error:', e);
    // Restore icon
    btn.find('.spinner-border').replaceWith(`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2">
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
    </svg>`);
    btn.prop('disabled', false);
    showToast('Error disabling link', 'error');
  }
};

/**
 * Toggle public link (list layout quick-action button)
 */
globalThis.togglePublicLink = async function (element, fileId) {
  const btn = $(element);
  if (btn.prop('disabled')) return;
  btn.prop('disabled', true);

  const isPublic = btn.attr('data-visibility') === 'public';
  const icon = btn.find('svg');
  icon.replaceWith('<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>');

  try {
    if (isPublic) {
      await _disablePublicLink(btn, fileId);
    } else {
      await _enablePublicLink(btn, fileId);
    }
  } catch (error) {
    console.error('Toggle Public Link Error:', error);
    btn.find('.spinner-border').replaceWith(`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${isPublic ? '#007bff' : 'currentColor'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="2" y1="12" x2="22" y2="12"></line>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
    </svg>`);
    showToast('Error: ' + error.message, 'error');
  } finally {
    btn.prop('disabled', false);
  }
};

async function _disablePublicLink(btn, fileId) {
  const response = await fetch('/api/file/link/toggle-public', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ file_id: fileId, state: 'off' })
  });
  const result = await response.json();
  if (!result.success) throw new Error(result.message || 'Failed to disable link');

  btn.attr('data-visibility', 'private');
  btn.attr('title', 'Enable Public Link');
  btn.find('.spinner-border').replaceWith(`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="2" y1="12" x2="22" y2="12"></line>
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
  </svg>`);

  const row = btn.closest('tr');
  if (row.length) {
    row.find('.access-cell').html('-').addClass('text-muted');
  }

  showToast('Public link disabled');
}

async function _enablePublicLink(btn, fileId) {
  const response = await fetch('/api/file/link/publish', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ file_id: fileId })
  });
  const result = await response.json();
  if (!result.success || !result.data?.link) throw new Error(result.message || 'Failed to generate link');

  try {
    await navigator.clipboard.writeText(result.data.link);
  } catch {
    fallbackCopyTextToClipboard(result.data.link);
  }

  btn.attr('data-visibility', 'public');
  btn.attr('title', 'Public Link Active');
  btn.find('.spinner-border').replaceWith(`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#007bff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="2" y1="12" x2="22" y2="12"></line>
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
  </svg>`);

  const row = btn.closest('tr');
  if (row.length) {
    row.find('.access-cell').removeClass('text-muted').html(`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#007bff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" title="Public">
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="2" y1="12" x2="22" y2="12"></line>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
    </svg>`);
  }

  showToast('Link copied to clipboard');
}

function fallbackCopyTextToClipboard(text) {
  const textArea = document.createElement("textarea");
  textArea.value = text;

  // Avoid scrolling to bottom
  textArea.style.top = "0";
  textArea.style.left = "0";
  textArea.style.position = "fixed";

  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  try {
    // Deprecated: execCommand('copy') is used as a fallback for browsers without Clipboard API support
    const successful = document.execCommand('copy'); // NOSONAR — deliberate fallback for browsers without Clipboard API
    if (!successful) throw new Error('Copy command failed');
  } catch (err) {
    console.warn('Fallback: execCommand failed, using prompt', err);
    globalThis.prompt("Copy to clipboard: Ctrl+C, Enter", text);
  }

  textArea.remove();
}

function fallbackCopyLink(text, btn, originalText) {
  // Force prompt for manual copy
  prompt('Link:', text);

  // Reset button state
  btn.prop('disabled', false);
  btn.html(originalText);
}


/**
 * Advanced List Interactions
 */
document.addEventListener('DOMContentLoaded', function () {

  // 1. Row Selection (Checkbox Logic)
  // Use event delegation on document body to catch elements if listContainer isn't immediate (though it should be)

  document.body.addEventListener('click', function (e) {
    // Check if click was on a checkbox
    if (e.target.closest('.custom-checkbox') || e.target.closest('.checkbox-cell')) {
      // e.stopPropagation(); // Don't stop propagation here, let it bubble but handle logic
      // Actually, we want to stop the row click event (which navigates)
      e.stopPropagation();

      const row = e.target.closest('tr');
      if (row) {
        row.classList.toggle('selected');
      }
    }
  });

  // 2. Density Toggle Logic
  // Check for saved preference
  const savedDensity = localStorage.getItem('driveDensity') || 'comfortable';
  applyDensity(savedDensity);

  // Expose toggle function globally if needed, or bind to a button
  globalThis.toggleDensity = function () {
    const current = document.body.classList.contains('density-compact') ? 'compact' : 'comfortable';
    const newDensity = current === 'comfortable' ? 'compact' : 'comfortable';
    applyDensity(newDensity);
  };

  function applyDensity(density) {
    if (density === 'compact') {
      document.body.classList.add('density-compact');
      document.body.classList.remove('density-comfortable');
    } else {
      document.body.classList.add('density-comfortable');
      document.body.classList.remove('density-compact');
    }
    localStorage.setItem('driveDensity', density);
  }
  // --- Share Feature Logic ---

  const shareModal = $('#shareModal');
  const shareEmailInput = $('#shareEmailInput');
  const shareRoleSelect = $('#shareRoleSelect');
  const shareAccessList = $('#shareAccessList');
  const btnShareAdd = $('#btnShareAdd');
  const generalAccessSelect = $('#generalAccessSelect');
  const generalAccessIcon = $('#generalAccessIcon');
  const generalAccessDesc = $('#generalAccessDesc');
  const publicLinkRoleSelect = $('#publicLinkRoleSelect');
  const publicLinkInfoBanner = $('#publicLinkInfoBanner');
  const publicLinkInfoText = $('#publicLinkInfoText');
  const btnCopyLink = $('#btnCopyLink');

  // --- Autocomplete Logic ---
  const autocompleteList = $('<div class="autocomplete-dropdown" style="display:none;"></div>');
  $('.share-input-box').css('position', 'relative').append(autocompleteList);

  let searchTimeout = null;

  function buildAutocompleteItem(u) {
    const item = $(`
      <div class="autocomplete-item" data-email="${u.email}">
        <div class="autocomplete-avatar">${u.name.charAt(0).toUpperCase()}</div>
        <div class="autocomplete-info">
          <span class="autocomplete-name">${u.name}</span>
          <span class="autocomplete-email">${u.email}</span>
        </div>
      </div>
    `);

    item.on('click', async function () {
      autocompleteList.hide();
      shareEmailInput.val('').attr('placeholder', 'Adding...').prop('disabled', true);

      try {
        const response = await fetch('/api/file/share', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ file_id: currentShareFileId, email: u.email, role: 'viewer' })
        });
        const result = await response.json();
        if (result.success) {
          await fetchPermissions(currentShareFileId);
        } else {
          alert(result.error || result.message || 'Failed to share');
        }
      } catch (e) {
        console.error(e);
        alert('Error sharing file');
      } finally {
        shareEmailInput.attr('placeholder', 'Add people, groups, spaces, and calendar events').prop('disabled', false);
      }
    });

    return item;
  }

  shareEmailInput.on('keyup', function (e) {
    // Ignore navigation keys
    if (e.which === 13 || e.which === 27 || e.which === 38 || e.which === 40) return;

    const term = $(this).val().trim();
    if (term.length < 2) {
      autocompleteList.hide();
      return;
    }

    if (searchTimeout) clearTimeout(searchTimeout);
    searchTimeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/user/search?q=${encodeURIComponent(term)}`);
        const json = await res.json();
        const users = Array.isArray(json) ? json : (json.data || []);

        autocompleteList.empty();

        if (users.length > 0) {
          users.forEach(u => {
            autocompleteList.append(buildAutocompleteItem(u));
          });
          autocompleteList.show();
        } else {
          autocompleteList.hide();
        }
      } catch (err) {
        console.error(err);
      }
    }, 300);
  });

  // Hide on blur (delayed to allow click) or click outside
  $(document).on('click', function (e) {
    if (!$(e.target).closest('.share-input-box').length) {
      autocompleteList.hide();
    }
  });

  let currentShareFileId = null;
  let currentPublicLinkToken = null;

  // Clear previous bindings to avoid duplicates if re-initialized
  shareModal.off('show.bs.modal');
  shareModal.off('show.bs.modal');
  btnShareAdd.off('click');
  $(document).off('click', '.js-share-file'); // Clear previous delegate

  // Event Delegation for Share Button
  $(document).on('click', '.js-share-file', function (e) {
    e.preventDefault();
    // Stop propagation to prevent card click if nested
    e.stopPropagation();

    const fileId = $(this).data('file-id');
    const fileName = $(this).data('file-name');
    openShareModal(fileId, fileName);
  });

  // Re-bind
  shareModal.on('show.bs.modal', function (event) {
    // Don't reset currentShareFileId here because openShareModal sets it before showing.
    // If we reset it, we lose the ID.
  });

  globalThis.openShareModal = async function (fileId, fileName) {
    currentShareFileId = fileId;
    $('#shareFileId').val(fileId);
    $('#shareModalLabel').text(`Share "${fileName}"`);

    // Reset UI
    shareEmailInput.val('');
    shareAccessList.html('<div class="text-center text-muted small py-3">Loading...</div>');

    shareModal.modal('show');

    await fetchPermissions(fileId);
  };

  async function fetchPermissions(fileId) {
    try {
      // Route changed to /api/file/permissions/:id
      const response = await fetch(`/api/file/permissions/${fileId}`);
      const result = await response.json();

      if (result.success) {
        renderPermissions(result.data.permissions, result.data.currentUserId);
        updateGeneralAccessUI(result.data.publicLink);
      } else {
        const msg = result.error || 'Failed to load permissions';
        shareAccessList.html(`<div class="text-danger small">${msg}</div>`);
      }
    } catch (e) {
      console.error(e);
      shareAccessList.html(`<div class="text-danger small">Error: ${e.message}</div>`);
    }
  }

  function renderPermissions(permissions, currentUserId) {
    shareAccessList.empty();

    if (!permissions || permissions.length === 0) {
      shareAccessList.append('<div class="text-muted small">No specific people added.</div>');
    }

    permissions.forEach(p => {
      const isMe = currentUserId && String(p.user_id) === String(currentUserId);
      const isOwner = p.role === 'owner';
      const roleLabel = p.role.charAt(0).toUpperCase() + p.role.slice(1);

      let rightSide;
      if (isMe) {
        rightSide = `<span class="text-muted small mr-2">${roleLabel} (you)</span>`;
      } else if (isOwner) {
        rightSide = `<span class="text-muted small mr-2">Owner</span>`;
      } else {
        rightSide = `<select class="access-role-select user-role-select"
                     data-email="${p.email}"
                     data-user-id="${p.user_id}">
               <option value="viewer" ${p.role === 'viewer' ? 'selected' : ''}>Viewer</option>
               <option value="editor" ${p.role === 'editor' ? 'selected' : ''}>Editor</option>
               <option disabled>──────────</option>
               <option value="remove">Remove access</option>
             </select>`;
      }

      const html = `
            <div class="d-flex align-items-center justify-content-between mb-2">
                <div class="d-flex align-items-center">
                    <div class="user-avatar small" style="width: 32px; height: 32px; font-size: 14px; line-height: 32px; margin-right: 1rem;">
                        ${p.display_name ? p.display_name[0].toUpperCase() : p.email[0].toUpperCase()}
                    </div>
                    <div>
                        <div class="font-weight-bold small">${p.display_name || p.email}${isMe ? ' (you)' : ''}</div>
                        <div class="text-muted small" style="font-size: 10px;">${p.email}</div>
                    </div>
                </div>
                <div class="d-flex align-items-center">
                    ${rightSide}
                </div>
            </div>
        `;
      shareAccessList.append(html);
    });

    // Bind Change Event for Role Selects
    $('.user-role-select').off('change').on('change', async function () {
      const select = $(this);
      const newRole = select.val();
      const email = select.data('email');
      const userId = select.data('user-id');

      select.prop('disabled', true);

      if (newRole === 'remove') {
        await handleRemoveAccess(select, userId);
      } else {
        await handleUpdateRole(select, email, newRole);
      }
    });
  }

  async function handleRemoveAccess(select, userId) {
    if (!confirm('Remove access?')) {
      await fetchPermissions(currentShareFileId);
      return;
    }

    try {
      const response = await fetch('/api/file/unshare', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ file_id: currentShareFileId, user_id: userId })
      });

      if (response.ok) {
        await fetchPermissions(currentShareFileId);
      } else {
        alert('Failed to remove user');
        await fetchPermissions(currentShareFileId);
      }
    } catch (e) {
      console.error(e);
      alert('Error removing user');
      select.prop('disabled', false);
    }
  }

  async function handleUpdateRole(select, email, newRole) {
    try {
      const response = await fetch('/api/file/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ file_id: currentShareFileId, email: email, role: newRole })
      });
      const result = await response.json();

      if (result.success) {
        await fetchPermissions(currentShareFileId);
      } else {
        alert(result.error || result.message || 'Failed to update role');
        await fetchPermissions(currentShareFileId);
      }
    } catch (e) {
      console.error(e);
      alert('Error updating role');
      select.prop('disabled', false);
    }
  }

  function updateRoleInfoBanner(role) {
    if (role === 'viewer') {
      publicLinkInfoText.text('Viewers of this file can see comments and suggestions');
    } else {
      publicLinkInfoText.text('Editors of this file can edit and share with others');
    }
  }

  function updateGeneralAccessUI(publicLink) {
    const isPublic = (publicLink?.general_access === 'anyone_with_link');

    // Always set token if available, regardless of mode
    if (publicLink?.token) {
      currentPublicLinkToken = publicLink.token;
    } else {
      currentPublicLinkToken = null;
    }

    if (isPublic) {
      // Public
      generalAccessSelect.val('public');
      generalAccessDesc.text('Anyone on the internet with the link can view');
      generalAccessIcon.html('<svg width="20" height="20" viewBox="0 0 24 24" fill="#1e8e3e"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>');
      $('.general-access-row').addClass('is-public');

      publicLinkRoleSelect.show();
      if (publicLink.role) {
        publicLinkRoleSelect.val(publicLink.role);
      }
      updateRoleInfoBanner(publicLinkRoleSelect.val());
      publicLinkInfoBanner.css('display', 'flex');

    } else {
      // Restricted
      generalAccessSelect.val('restricted');
      generalAccessDesc.text('Only added people can open with this link');
      generalAccessIcon.html('<svg width="20" height="20" viewBox="0 0 24 24" fill="#5f6368"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>');
      $('.general-access-row').removeClass('is-public');

      publicLinkRoleSelect.hide();
      publicLinkInfoBanner.hide();
      // currentPublicLinkToken is set above
    }
  }

  // Event: Public Link Role Change
  publicLinkRoleSelect.on('change', async function () {
    const role = $(this).val();
    updateRoleInfoBanner(role);

    // Auto-save role change
    try {
      const response = await fetch('/api/file/link/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ file_id: currentShareFileId, role })
      });
      const result = await response.json();

      if (result.success) {
        // Update token if it changed (it shouldn't for role update, but good practice)
        if (result.data?.token) {
          currentPublicLinkToken = result.data.token;
        }
        console.log('Role updated to ' + role);
      } else {
        console.error('Failed to update role: ' + result.message);
        alert('Failed to save role change: ' + (result.message || 'Unknown error'));
      }
    } catch (e) {
      console.error(e);
      alert('Error saving role change');
    }
  });

  // Event: Modal Done (Explicit Close)
  $('#btnShareDone').click(function () {
    shareModal.modal('hide');
  });

  shareModal.on('hidden.bs.modal', function () {
    globalThis.location.reload();
  });

  // Event: Add User
  $('#btnShareAdd').click(async function () {
    const email = shareEmailInput.val();
    const role = shareRoleSelect.val();
    const btn = $(this);

    if (!email) return;

    btn.prop('disabled', true).text('Sending...');

    try {
      const response = await fetch('/api/file/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ file_id: currentShareFileId, email, role })
      });
      const result = await response.json();
      if (result.success) {
        shareEmailInput.val('');
        await fetchPermissions(currentShareFileId);
      } else {
        alert(result.error || result.message || 'Unknown error');
      }
    } catch {
      alert('Error sharing file');
    } finally {
      btn.prop('disabled', false).text('Send');
    }
  });

  // Event: Enter key on Email Input
  shareEmailInput.on('keypress', function (e) {
    if (e.which === 13) { // Enter key
      $('#btnShareAdd').click();
    }
  });

  // Event: Remove User
  globalThis.removeUserAccess = async function (userId) {
    if (!confirm('Remove access?')) return;
    try {
      const response = await fetch('/api/file/unshare', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ file_id: currentShareFileId, user_id: userId })
      });
      if (response.ok) {
        await fetchPermissions(currentShareFileId);
      }
    } catch (e) { console.error(e); }
  };

  // Event: General Access Change
  generalAccessSelect.on('change', async function () {
    const value = $(this).val();

    // Immediately show/hide role select and info banner
    if (value === 'public') {
      publicLinkRoleSelect.show();
      updateRoleInfoBanner(publicLinkRoleSelect.val());
      publicLinkInfoBanner.css('display', 'flex');

      // Optimistic UI Update: Show Globe Icon & Public Text immediately
      generalAccessIcon.html('<svg width="20" height="20" viewBox="0 0 24 24" fill="#1e8e3e"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>');
      generalAccessDesc.text('Anyone on the internet with the link can view');
      $('.general-access-row').addClass('is-public');

    } else {
      publicLinkRoleSelect.hide();
      publicLinkInfoBanner.hide();

      // Optimistic UI Update: Show Lock Icon & Restricted Text immediately
      generalAccessIcon.html('<svg width="20" height="20" viewBox="0 0 24 24" fill="#5f6368"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>');
      generalAccessDesc.text('Only added people can open with this link');
      $('.general-access-row').removeClass('is-public');
    }

    if (value === 'restricted') {
      // Revoke Link
      try {
        await fetch('/api/file/link/revoke', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ file_id: currentShareFileId })
        });
        updateGeneralAccessUI(null);
      } catch (e) { console.error(e); }
    } else {
      // Create Link
      try {
        const role = publicLinkRoleSelect.val() || 'viewer';
        const response = await fetch('/api/file/link/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ file_id: currentShareFileId, role })
        });
        const result = await response.json();
        if (result.success) {
          updateGeneralAccessUI({ ...result.data, role, general_access: 'anyone_with_link' });
          currentPublicLinkToken = result.data.token;
        }
      } catch (e) {
        console.error(e);
        // Revert UI if failed? For now, just log.
      }
    }
  });

  // Event: Copy Link
  btnCopyLink.click(async function () {
    const btn = $(this);
    const originalText = btn.html();

    let tokenToCopy = currentPublicLinkToken;

    // If no public token (Restricted Mode), generate a new one
    if (!tokenToCopy) {
      try {
        btn.prop('disabled', true).text('Generating...');
        tokenToCopy = await generateLinkToken();
      } catch (e) {
        console.error(e);
        const msg = e.message || 'Unknown error';
        alert('Error generating link: ' + msg);
        btn.html(originalText).prop('disabled', false);
        return;
      }
    }

    if (tokenToCopy) {
      const url = `${globalThis.location.origin}/s/${tokenToCopy}`;

      navigator.clipboard.writeText(url).then(() => {
        btn.html('<i class="fas fa-check mr-1"></i> Copied');
        btn.prop('disabled', false);
        setTimeout(() => btn.html(originalText), 2000);
      }).catch(err => {
        console.error('Clipboard API failed, trying fallback', err);
        fallbackCopyLink(url, btn, originalText);
      });
    }
  });

  async function generateLinkToken() {
    const response = await fetch('/api/file/link/copy', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ file_id: currentShareFileId })
    });

    if (!response.ok) {
      const text = await response.text();
      let errorMsg = response.statusText;
      try {
        const json = JSON.parse(text);
        errorMsg = json.message || errorMsg;
        if (json.stack) errorMsg += '\n\nStack: ' + json.stack;
      } catch {
        errorMsg += ' Body: ' + text.substring(0, 100);
      }
      throw new Error('Server Error (' + response.status + '): ' + errorMsg);
    }

    const result = await response.json();
    if (result.success) {
      return result.data.token;
    }

    const err = new Error(result.message || 'Failed to generate link');
    if (result.stack) err.stack = result.stack;
    throw err;
  }

  // fallbackCopyLink is defined at the outer scope

  // Fix Grid View Dropdown Overflow
  // When a dropdown is shown, check if it overflows the window width.
  // If so, add a class to align it to the right.
  $(document).on('shown.bs.dropdown', '.file-card, .folder-card', function (event) {
    const dropdownMenu = $(event.target).find('.dropdown-menu'); // The menu inside the card

    // Reset first
    dropdownMenu.removeClass('dropdown-menu-right');

    const menuRect = dropdownMenu[0].getBoundingClientRect();
    const windowWidth = $(globalThis).width();

    // If the right edge of the menu exceeds the window width (with some buffer)
    if (menuRect.right > windowWidth) {
      // Apply inline style or class. Bootstrap 4 uses .dropdown-menu-right
      dropdownMenu.addClass('dropdown-menu-right');
    }
  });


});

// Copy Public Link Helper (Invoked from grid/list action)


// Move File Modal Logic
globalThis.openMoveFileModal = function (fileId, currentFolderId, fileName) {
  $('#moveFileId').val(fileId);

  if (fileName) {
    $('#moveFileModalLabel').text('Move File "' + fileName + '"');
  } else {
    $('#moveFileModalLabel').text('Move File');
  }

  // Show modal immediately with loading state
  const select = $('#moveDestFolder');
  select.empty().append('<option>Loading...</option>');
  $('#moveFileModal').modal('show');

  // Fetch folders
  $.getJSON('/api/folder/list/json', function (data) {
    select.empty();
    if (data.error) {
      alert(data.error);
      return;
    }

    if (data.length === 0) {
      select.append('<option disabled>No folders found</option>');
    } else {
      data.forEach(f => {
        // Disable current folder
        const disabled = (f.id == currentFolderId);
        let name = f.name;
        let depth = f.depth || 0;
        let prefix = '\u00A0'.repeat(depth * 4);

        select.append($('<option>', {
          value: f.id,
          text: prefix + name,
          disabled: disabled
        }));
      });
    }
  }).fail(function () {
    select.empty().append('<option disabled>Error loading folders</option>');
  });
};

// Handle Move Form Submit
// Handle Move Form Submit
$(document).on('submit', '#moveFileModal form', function () {
  if (!$('#moveDestFolder').val()) {
    alert('Please select a folder');
    return false;
  }
  return true;
});

// Cancel Move
$(document).on('click', '#btnMoveFileCancel', function () {
  $('#moveFileModal').modal('hide');
});

// Move Folder Modal Logic
globalThis.openMoveFolderModal = function (folderId, currentParentId, folderName) {
  $('#moveFolderId').val(folderId);

  if (folderName) {
    $('#moveFolderModalLabel').text('Move "' + folderName + '"');
  } else {
    $('#moveFolderModalLabel').text('Move Folder');
  }

  const select = $('#moveFolderDest');
  select.empty().append('<option>Loading...</option>');
  $('#moveFolderModal').modal('show');

  $.getJSON('/api/folder/list/json', function (data) {
    select.empty();
    if (data.error) {
      alert(data.error);
      return;
    }

    if (data.length === 0) {
      select.append('<option disabled>No folders found</option>');
    } else {
      // Build a set of IDs to disable: the folder itself + its descendants
      const disabledIds = {};
      disabledIds[folderId] = true;

      // Walk the flat (depth-ordered) list to find descendants
      let insideDisabled = false;
      let disabledDepth = -1;
      data.forEach(function (f) {
        if (f.id === folderId) {
          insideDisabled = true;
          disabledDepth = f.depth || 0;
        } else if (insideDisabled) {
          if ((f.depth || 0) > disabledDepth) {
            disabledIds[f.id] = true;
          } else {
            insideDisabled = false;
          }
        }
      });

      data.forEach(function (f) {
        const disabled = !!disabledIds[f.id];
        const depth = f.depth || 0;
        const prefix = '\u00A0'.repeat(depth * 4);

        select.append($('<option>', {
          value: f.id,
          text: prefix + f.name,
          disabled: disabled
        }));
      });
    }
  }).fail(function () {
    select.empty().append('<option disabled>Error loading folders</option>');
  });
};

// Handle Move Folder Form Submit
$(document).on('submit', '#moveFolderModal form', function () {
  if (!$('#moveFolderDest').val()) {
    alert('Please select a destination folder');
    return false;
  }
  return true;
});

// Toggle Folder Star
globalThis.toggleFolderStar = function (folderId, btn) {
  const icon = $(btn).find('svg');
  // Optimistic UI update
  // SVG fill attribute
  const currentFill = icon.attr('fill');
  const isFilled = (currentFill && currentFill !== 'none');

  if (isFilled) {
    icon.attr('fill', 'none');
  } else {
    icon.attr('fill', '#fbbc04'); // Google Drive limit Star Color
  }

  // Call API
  $.post('/api/folder/star/toggle', { folder_id: folderId }, function (data) {
    if (data?.status === 'success') {
      const starred = data.data.starred;
      if (starred) {
        icon.attr('fill', '#fbbc04');
      } else {
        icon.attr('fill', 'none');
      }
    } else {
      console.error('Failed to toggle star');
      // Revert UI?
    }
  }).fail(function () {
    console.error('Failed to toggle star');
  });
};


// ===== File Preview Overlay (Lightbox) =====

/**
 * Main click handler for file items in grid/list view.
 * Previewable files open in a lightbox overlay.
 * Non-previewable files trigger a direct download.
 */
globalThis.handleFileClick = function (event, fileId, fileName, previewType, viewUrl, downloadUrl) {
  if (!previewType) {
    globalThis.location.href = downloadUrl;
    return;
  }
  openFilePreview(fileName, previewType, viewUrl, downloadUrl);
};

function openFilePreview(fileName, previewType, viewUrl, downloadUrl) {
  closeFilePreview();

  let previewContent = '';
  if (previewType === 'image') {
    previewContent = '<img src="' + viewUrl + '" class="file-preview-content" alt="' + escapeHtml(fileName) + '">';
  } else if (previewType === 'pdf') {
    previewContent = '<iframe src="' + viewUrl + '" class="file-preview-content file-preview-pdf" frameborder="0"></iframe>';
  } else if (previewType === 'video') {
    previewContent = '<video controls autoplay class="file-preview-content"><source src="' + viewUrl + '">Your browser does not support the video tag.</video>';
  } else if (previewType === 'preview_pages') {
    // Delegated to Lightbox2 — fetch manifest then open the set
    openPreviewPagesLightbox(fileName, viewUrl, downloadUrl);
    return;
  }

  const overlayHtml =
    '<div id="filePreviewOverlay" class="file-preview-overlay">' +
      '<div class="file-preview-topbar">' +
        '<div class="file-preview-filename" title="' + escapeHtml(fileName) + '">' + escapeHtml(fileName) + '</div>' +
        '<div class="file-preview-actions">' +
          '<a href="' + downloadUrl + '" class="btn btn-sm btn-outline-light mr-2" title="Download">' +
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
              '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>' +
              '<polyline points="7 10 12 15 17 10"></polyline>' +
              '<line x1="12" y1="15" x2="12" y2="3"></line>' +
            '</svg>' +
            ' Download' +
          '</a>' +
          '<button class="btn btn-sm btn-outline-light file-preview-close-btn" onclick="closeFilePreview()" title="Close">' +
            '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
              '<line x1="18" y1="6" x2="6" y2="18"></line>' +
              '<line x1="6" y1="6" x2="18" y2="18"></line>' +
            '</svg>' +
          '</button>' +
        '</div>' +
      '</div>' +
      '<div class="file-preview-body">' +
        '<div class="file-preview-spinner">' +
          '<div class="spinner-border text-light" role="status"><span class="sr-only">Loading...</span></div>' +
        '</div>' +
        previewContent +
      '</div>' +
    '</div>';

  $('body').append(overlayHtml);

  const $overlay = $('#filePreviewOverlay');

  // Hide spinner once content loads
  $overlay.find('img, iframe, video').on('load loadeddata', function () {
    $overlay.find('.file-preview-spinner').hide();
  });

  // Handle image load error
  $overlay.find('img').on('error', function () {
    $overlay.find('.file-preview-spinner').hide();
    $(this).replaceWith('<div class="text-light text-center p-4">Unable to load preview</div>');
  });

  // Prevent body scrolling
  $('body').addClass('file-preview-open');

  // Close on Escape key
  $(document).on('keydown.filePreview', function (e) {
    if (e.key === 'Escape') closeFilePreview();
  });

  // Close when clicking the dark background (not the content)
  $overlay.find('.file-preview-body').on('click', function (e) {
    if (e.target === this) closeFilePreview();
  });
}

function openPreviewPagesLightbox(fileName, manifestUrl, downloadUrl) {
  $.getJSON(manifestUrl)
    .done(function (manifest) {
      const pages = manifest.pages || [];
      if (!pages.length) return;

      const setName = 'doc-preview-' + Date.now();

      // Remove any previous hidden anchor set
      $('#lb-doc-preview-set').remove();

      const $set = $('<div id="lb-doc-preview-set" style="display:none"></div>');
      pages.forEach(function (p) {
        const pageUrl = manifestUrl + '&page=' + p.page;
        $('<a>')
          .attr('href', pageUrl)
          .attr('data-lightbox', setName)
          .appendTo($set);
      });
      $('body').append($set);

      // Inject topbar (filename + download) into the Lightbox2 overlay
      function injectLbTopbar() {
        const $lb = $('.lightbox');
        if (!$lb.length) return;

        const downloadSvg =
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
            '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>' +
            '<polyline points="7 10 12 15 17 10"></polyline>' +
            '<line x1="12" y1="15" x2="12" y2="3"></line>' +
          '</svg>';

        const $topbar = $('<div id="lb-doc-topbar"></div>').append(
          $('<span class="lb-doc-filename"></span>').text(fileName),
          $('<a class="lb-doc-download" title="Download"></a>')
            .attr('href', downloadUrl)
            .html(downloadSvg + ' Download')
        );
        $('body').append($topbar);
      }

      // lightbox:open fires on $(globalThis) each time an image is shown (open + navigate)
      $(globalThis).off('lightbox:open.docpreview lightbox:change.docpreview')
        .on('lightbox:open.docpreview lightbox:change.docpreview', function () {
          $('#lb-doc-topbar').remove(); // remove stale one on navigate
          injectLbTopbar();
        });

      // Clean up when lightbox closes
      $(globalThis).off('lightbox:close.docpreview')
        .on('lightbox:close.docpreview', function () {
          $(globalThis).off('lightbox:open.docpreview lightbox:change.docpreview lightbox:close.docpreview');
          $('#lb-doc-topbar').remove();
          $('#lb-doc-preview-set').remove();
        });

      // Open Lightbox2 on the first page
      lightbox.start($set.find('a:first'));
    })
    .fail(function () {
      alert('Unable to load document preview.');
    });
}

globalThis.closeFilePreview = function () {
  $('#filePreviewOverlay').remove();
  $('body').removeClass('file-preview-open');
  $(document).off('keydown.filePreview');
};

function escapeHtml(str) {
  if (!str) return '';
  return str.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

// ── Thumbnail polling after upload ──
// After a page reload following upload, poll derivative endpoint for each newly
// uploaded file and inject the thumbnail image into its card without another reload.
(function () {
  let pending;
  try {
    pending = JSON.parse(sessionStorage.getItem('pendingThumbnails') || 'null');
    sessionStorage.removeItem('pendingThumbnails');
  } catch { /* Intentionally ignored - sessionStorage unavailable or corrupt data; skip thumbnail polling */ return; }
  if (!Array.isArray(pending) || pending.length === 0) return;
  pending.forEach(function (fileId) { pollForThumbnail(fileId); });
})();

function pollForThumbnail(fileId) {
  let attempts = 0;
  const maxAttempts = 20; // 40 seconds total
  const timer = setInterval(function () {
    attempts++;
    const xhr = new XMLHttpRequest();
    xhr.open('HEAD', '/admin/file/derivative?id=' + encodeURIComponent(fileId) + '&kind=thumbnail&size=256', true);
    xhr.onload = function () {
      if (xhr.status >= 200 && xhr.status < 300) {
        clearInterval(timer);
        injectThumbnailIntoCard(fileId);
      } else if (attempts >= maxAttempts) {
        clearInterval(timer);
      }
    };
    xhr.onerror = function () {
      if (attempts >= maxAttempts) clearInterval(timer);
    };
    xhr.send();
  }, 2000);
}

function injectThumbnailIntoCard(fileId) {
  const card = document.querySelector('.file-grid-card[data-file-id="' + fileId + '"]');
  if (!card) return;

  const body = card.querySelector('.grid-card-body');
  if (!body) return;

  const thumbnailUrl = '/admin/file/derivative?id=' + encodeURIComponent(fileId) + '&kind=thumbnail&size=256';
  const previewUrl   = '/admin/file/derivative?id=' + encodeURIComponent(fileId) + '&kind=preview_pages';
  // Swap badge for thumbnail image
  body.innerHTML = '<img src="' + thumbnailUrl + '" alt="" loading="lazy">';

  // Enable lightbox preview only for docs that previously had no previewType (null)
  const currentOnclick = card.getAttribute('onclick');
  if (currentOnclick?.includes(', null,')) {
    card.setAttribute('onclick',
      currentOnclick
        .replaceAll(', null,', ", 'preview_pages',")
        .replace(/, '[^']*',(\s*'[^']*'\s*\))$/, ", '" + previewUrl + "',$1")
    );
  }
}

// ── Hover prefetch: warm server cache for sidebar views on mouseenter ──
(function () {
  const prefetched = {};
  let timer = null;
  $(document).on('mouseenter', '[data-prefetch-view]', function () {
    const view = this.dataset.prefetchView;
    if (!view || prefetched[view]) return;
    clearTimeout(timer);
    timer = setTimeout(function () {
      prefetched[view] = true;
      fetch('/api/view/prefetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'view=' + encodeURIComponent(view)
      }).catch(function () { /* Intentionally ignored - prefetch is best-effort; network failure should not affect UI */ });
    }, 80);
  });
  $(document).on('mouseleave', '[data-prefetch-view]', function () {
    clearTimeout(timer);
  });
})();

// ── Hover prefetch: warm server cache on mouseenter ──
(function () {
  const prefetched = {};
  let timer = null;
  $(document).on('mouseenter', '[data-prefetch-id]', function () {
    const id = this.dataset.prefetchId;
    if (!id || prefetched[id]) return;
    clearTimeout(timer);
    const folderId = id;
    timer = setTimeout(function () {
      prefetched[folderId] = true;
      fetch('/api/folder/prefetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'folderId=' + encodeURIComponent(folderId)
      }).catch(function () { /* Intentionally ignored - prefetch is best-effort; network failure should not affect UI */ });
    }, 80);
  });
  $(document).on('mouseleave', '[data-prefetch-id]', function () {
    clearTimeout(timer);
  });
})();

// ── Hover prefetch: warm server cache for file metadata/derivatives on mouseenter ──
(function () {
  var prefetched = {};
  var timer = null;
  $(document).on('mouseenter', '[data-prefetch-file]', function () {
    var id = this.dataset.prefetchFile;
    if (!id || prefetched[id]) return;
    clearTimeout(timer);
    var fileId = id;
    timer = setTimeout(function () {
      prefetched[fileId] = true;
      fetch('/api/file/prefetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'fileId=' + encodeURIComponent(fileId)
      }).catch(function () { /* Intentionally ignored - prefetch is best-effort; network failure should not affect UI */ });
    }, 80);
  });
  $(document).on('mouseleave', '[data-prefetch-file]', function () {
    clearTimeout(timer);
  });
})();

/**
 * Location Breadcrumb Tooltip - Cache Warming on Hover
 *
 * When the user hovers over a file/folder card (grid) or row (list) in
 * trash/starred/recent/shared views, we fetch the breadcrumb trail for
 * its parent folder and display it in a tooltip. Results are cached
 * in-memory so subsequent hovers are instant.
 */
(function () {
  var breadcrumbCache = {};
  var pendingRequests = {};
  var hoverTimer = null;

  var folderSvg = '<svg width="14" height="14" viewBox="0 0 24 24" fill="#5f6368" stroke="none"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>';
  var homeSvg = '<svg width="14" height="14" viewBox="0 0 24 24" fill="#5f6368" stroke="none"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>';
  var chevronSvg = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9aa0a6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>';

  function fetchBreadcrumb(folderId, callback) {
    if (breadcrumbCache[folderId]) {
      callback(breadcrumbCache[folderId]);
      return;
    }
    if (pendingRequests[folderId]) {
      pendingRequests[folderId].push(callback);
      return;
    }
    pendingRequests[folderId] = [callback];
    fetch('/api/folder/breadcrumb', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'folderId=' + encodeURIComponent(folderId)
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var crumbs = (data && data.breadcrumbs) || [];
        breadcrumbCache[folderId] = crumbs;
        var cbs = pendingRequests[folderId] || [];
        delete pendingRequests[folderId];
        cbs.forEach(function (cb) { cb(crumbs); });
      })
      .catch(function () {
        var cbs = pendingRequests[folderId] || [];
        delete pendingRequests[folderId];
        cbs.forEach(function (cb) { cb([]); });
      });
  }

  function buildTooltipHtml(crumbs) {
    if (!crumbs || crumbs.length === 0) return '';
    var parts = crumbs.map(function (c, i) {
      var icon = i === 0 ? homeSvg : folderSvg;
      return '<span class="location-crumb">' + icon + '&nbsp;' + c.name + '</span>';
    });
    return parts.join('<span class="location-chevron">' + chevronSvg + '</span>');
  }

  function showTooltip(el, crumbs) {
    // Remove any existing tooltip on this element
    var existing = el.querySelector('.breadcrumb-hover-tooltip');
    if (existing) existing.remove();
    if (!crumbs || crumbs.length === 0) return;

    var tooltip = document.createElement('div');
    tooltip.className = 'breadcrumb-hover-tooltip';
    tooltip.innerHTML = buildTooltipHtml(crumbs);
    el.style.position = 'relative';
    el.appendChild(tooltip);
  }

  function removeTooltip(el) {
    var tooltip = el.querySelector('.breadcrumb-hover-tooltip');
    if (tooltip) tooltip.remove();
  }

  // Cache warming: preload breadcrumbs for all visible location cells on page load
  function warmCache() {
    var seen = {};
    document.querySelectorAll('[data-folder-id]').forEach(function (el) {
      var fid = el.dataset.folderId;
      if (fid && !seen[fid] && !breadcrumbCache[fid]) {
        seen[fid] = true;
        fetchBreadcrumb(fid, function () { /* Intentionally ignored - cache warming is fire-and-forget */ });
      }
    });
  }

  // --- Grid layout: hover on card ---
  $(document).on('mouseenter', '.grid-card-location[data-folder-id]', function () {
    var el = this;
    var folderId = el.dataset.folderId;
    if (!folderId) return;
    clearTimeout(hoverTimer);
    hoverTimer = setTimeout(function () {
      fetchBreadcrumb(folderId, function (crumbs) {
        showTooltip(el, crumbs);
      });
    }, 150);
  });
  $(document).on('mouseleave', '.grid-card-location[data-folder-id]', function () {
    clearTimeout(hoverTimer);
    removeTooltip(this);
  });

  // --- List layout: hover on location cell ---
  $(document).on('mouseenter', '.location-cell[data-folder-id]', function () {
    var el = this;
    var folderId = el.dataset.folderId;
    if (!folderId) return;
    clearTimeout(hoverTimer);
    hoverTimer = setTimeout(function () {
      fetchBreadcrumb(folderId, function (crumbs) {
        showTooltip(el, crumbs);
      });
    }, 150);
  });
  $(document).on('mouseleave', '.location-cell[data-folder-id]', function () {
    clearTimeout(hoverTimer);
    removeTooltip(this);
  });

  // --- Cache warming on hover over row (list) or card (grid) ---
  $(document).on('mouseenter', '.list-row, .folder-grid-card, .file-grid-card', function () {
    var locationEl = this.querySelector('[data-folder-id]');
    if (!locationEl) return;
    var folderId = locationEl.dataset.folderId;
    if (folderId && !breadcrumbCache[folderId]) {
      fetchBreadcrumb(folderId, function () { /* Intentionally ignored - cache warming is fire-and-forget */ });
    }
  });

  // Warm cache on page load
  $(document).ready(function () {
    setTimeout(warmCache, 500);
  });
})();

/**
 * List Layout Checkbox Selection
 *
 * Manages multi-select checkboxes in list view. Shows/hides the Actions
 * dropdown based on selection count. Supports select-all via header checkbox.
 */
(function () {
  var actionsBtn = document.getElementById('actions-btn');
  var actionsCount = document.getElementById('actions-count');
  var selectAllCheckbox = document.getElementById('select-all-checkbox');

  function getRowCheckboxes() {
    return document.querySelectorAll('.row-checkbox');
  }

  function getSelectedItems() {
    var items = [];
    document.querySelectorAll('.row-checkbox:checked').forEach(function (cb) {
      items.push({
        id: cb.dataset.itemId,
        type: cb.dataset.itemType,
        name: cb.dataset.itemName
      });
    });
    return items;
  }

  function updateUI() {
    var selected = getSelectedItems();
    var count = selected.length;

    // Enable/disable Actions button
    if (actionsBtn) {
      actionsBtn.disabled = count === 0;
    }

    // Update count badge
    if (actionsCount) {
      actionsCount.textContent = count > 0 ? count : '';
    }

    // Update select-all checkbox state
    if (selectAllCheckbox) {
      var all = getRowCheckboxes();
      if (all.length === 0) {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = false;
      } else if (count === all.length) {
        selectAllCheckbox.checked = true;
        selectAllCheckbox.indeterminate = false;
      } else if (count > 0) {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = true;
      } else {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = false;
      }
    }

    // Toggle selected class on rows and grid cards
    document.querySelectorAll('.list-row, .folder-grid-card, .file-grid-card').forEach(function (el) {
      var cb = el.querySelector('.row-checkbox');
      if (cb && cb.checked) {
        el.classList.add('selected');
      } else {
        el.classList.remove('selected');
      }
    });
  }

  // Select-all checkbox
  if (selectAllCheckbox) {
    selectAllCheckbox.addEventListener('change', function () {
      var checked = this.checked;
      getRowCheckboxes().forEach(function (cb) {
        cb.checked = checked;
      });
      updateUI();
    });
  }

  // Individual row checkboxes (event delegation)
  $(document).on('change', '.row-checkbox', function () {
    updateUI();
  });

  // Expose selected items for Actions menu consumers
  globalThis.getSelectedItems = getSelectedItems;
})();

/**
 * Copy File Browser Modal
 *
 * Provides a folder browser UI for selecting a destination folder
 * when copying files/folders. Loads folder tree from the API and
 * allows navigation into subfolders with breadcrumb trail.
 */
(function () {
  var allFolders = [];     // flat list from API: [{ id, name, depth }]
  var folderTree = [];     // hierarchical: [{ id, name, children }]
  var currentFolderId = null;
  var selectedFolderId = null;
  var breadcrumbTrail = []; // [{ id, name }]
  var loaded = false;

  /**
   * Build hierarchical tree from flat depth-based list.
   */
  function buildTree(flat) {
    var root = [];
    var stack = [{ children: root, depth: -1 }];

    flat.forEach(function (item) {
      var node = { id: item.id, name: item.name, children: [] };
      while (stack.length > 1 && stack[stack.length - 1].depth >= item.depth) {
        stack.pop();
      }
      stack[stack.length - 1].children.push(node);
      stack.push({ children: node.children, depth: item.depth, id: item.id, name: item.name });
    });

    return root;
  }

  /**
   * Find node + path in tree by id.
   */
  function findNodeWithPath(nodes, targetId, path) {
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      var currentPath = path.concat([{ id: n.id, name: n.name }]);
      if (n.id === targetId) {
        return { node: n, path: currentPath };
      }
      if (n.children && n.children.length > 0) {
        var result = findNodeWithPath(n.children, targetId, currentPath);
        if (result) return result;
      }
    }
    return null;
  }

  /**
   * Get children for a folder id (null = root level).
   */
  function getChildren(folderId) {
    if (!folderId) return folderTree;
    var result = findNodeWithPath(folderTree, folderId, []);
    return result ? result.node.children : [];
  }

  /**
   * Render the breadcrumb bar.
   */
  function renderBreadcrumb() {
    var el = document.getElementById('fb-breadcrumb');
    if (!el) return;
    var html = '';

    // "My Drive" root
    if (!currentFolderId) {
      html += '<span class="fb-breadcrumb-item current">My Drive</span>';
    } else {
      html += '<span class="fb-breadcrumb-item" data-fb-nav="">My Drive</span>';

      for (var i = 0; i < breadcrumbTrail.length; i++) {
        html += '<span class="fb-breadcrumb-sep">›</span>';
        var isLast = i === breadcrumbTrail.length - 1;
        if (isLast) {
          html += '<span class="fb-breadcrumb-item current">' + escapeHtml(breadcrumbTrail[i].name) + '</span>';
        } else {
          html += '<span class="fb-breadcrumb-item" data-fb-nav="' + breadcrumbTrail[i].id + '">' + escapeHtml(breadcrumbTrail[i].name) + '</span>';
        }
      }
    }
    el.innerHTML = html;
  }

  /**
   * Render the folder list for the current level.
   */
  function renderFolderList() {
    var el = document.getElementById('fb-folder-list');
    if (!el) return;

    var children = getChildren(currentFolderId);
    if (children.length === 0) {
      el.innerHTML = '<div class="fb-empty">No subfolders</div>';
    } else {
      var html = '';
      children.forEach(function (child) {
        var hasChildren = child.children && child.children.length > 0;
        html += '<div class="fb-folder-item' + (child.id === selectedFolderId ? ' selected' : '') + '" data-fb-id="' + child.id + '" data-fb-name="' + escapeHtml(child.name) + '">';
        html += '<svg width="20" height="20" viewBox="0 0 24 24" fill="#5f6368" stroke="none"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>';
        html += '<span class="fb-folder-name">' + escapeHtml(child.name) + '</span>';
        if (hasChildren) {
          html += '<span class="fb-folder-arrow"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg></span>';
        }
        html += '</div>';
      });
      el.innerHTML = html;
    }

    // Update copy button
    updateCopyButton();
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str || ''));
    return div.innerHTML;
  }

  function updateCopyButton() {
    var btn = document.getElementById('fb-copy-btn');
    if (!btn) return;
    // Enable if we have navigated into a folder or selected one
    btn.disabled = !selectedFolderId && currentFolderId === null;
    if (selectedFolderId || currentFolderId) {
      btn.disabled = false;
    }
  }

  /**
   * Navigate into a folder.
   */
  function navigateTo(folderId) {
    currentFolderId = folderId || null;
    selectedFolderId = null;

    if (!folderId) {
      breadcrumbTrail = [];
    } else {
      var result = findNodeWithPath(folderTree, folderId, []);
      breadcrumbTrail = result ? result.path : [];
    }

    renderBreadcrumb();
    renderFolderList();
  }

  /**
   * Load folders from API and open the modal.
   */
  function openCopyBrowser() {
    var listEl = document.getElementById('fb-folder-list');
    var breadcrumbEl = document.getElementById('fb-breadcrumb');

    currentFolderId = null;
    selectedFolderId = null;
    breadcrumbTrail = [];

    if (breadcrumbEl) breadcrumbEl.innerHTML = '';
    if (listEl) listEl.innerHTML = '<div class="fb-loading">Loading folders...</div>';

    var btn = document.getElementById('fb-copy-btn');
    if (btn) btn.disabled = true;

    $('#copyBrowserModal').modal('show');

    $.getJSON('/api/folder/list/json', function (data) {
      if (data.error) {
        if (listEl) listEl.innerHTML = '<div class="fb-empty">Error loading folders</div>';
        return;
      }
      allFolders = data;
      folderTree = buildTree(data);
      loaded = true;
      navigateTo(null);
    }).fail(function () {
      if (listEl) listEl.innerHTML = '<div class="fb-empty">Error loading folders</div>';
    });
  }

  // Click on folder item — single click selects, double click navigates in
  $(document).on('click', '.fb-folder-item', function () {
    var id = $(this).data('fb-id');
    selectedFolderId = id;
    // Highlight selection
    $('.fb-folder-item').removeClass('selected');
    $(this).addClass('selected');
    updateCopyButton();
  });

  $(document).on('dblclick', '.fb-folder-item', function () {
    var id = $(this).data('fb-id');
    navigateTo(id);
  });

  // Click on folder arrow to navigate in
  $(document).on('click', '.fb-folder-arrow', function (e) {
    e.stopPropagation();
    var id = $(this).closest('.fb-folder-item').data('fb-id');
    navigateTo(id);
  });

  // Click on breadcrumb item to navigate
  $(document).on('click', '.fb-breadcrumb-item:not(.current)', function () {
    var id = $(this).data('fb-nav');
    navigateTo(id || null);
  });

  // Wire up the Actions > Copy menu item
  $(document).on('click', '#action-copy', function (e) {
    e.preventDefault();
    openCopyBrowser();
  });

  // Copy button click
  $(document).on('click', '#fb-copy-btn', function () {
    var destId = selectedFolderId || currentFolderId;
    if (!destId) return;

    var items = globalThis.getSelectedItems ? globalThis.getSelectedItems() : [];
    if (items.length === 0) return;

    var btn = $(this);
    btn.prop('disabled', true).text('Copying...');

    $.ajax({
      url: '/api/items/copy',
      method: 'POST',
      contentType: 'application/json',
      data: JSON.stringify({
        items: items.map(function (i) { return { id: i.id, type: i.type }; }),
        targetFolderId: destId
      }),
      success: function (resp) {
        $('#copyBrowserModal').modal('hide');
        btn.prop('disabled', false).text('Copy here');

        if (resp && resp.success) {
          var failed = (resp.results || []).filter(function (r) { return !r.success; });
          if (failed.length > 0) {
            alert(failed.length + ' item(s) failed to copy.');
          } else {
            location.reload();
          }
        } else {
          alert(resp.error || 'Copy failed');
        }
      },
      error: function () {
        btn.prop('disabled', false).text('Copy here');
        alert('Copy request failed. Please try again.');
      }
    });
  });

  globalThis.openCopyBrowser = openCopyBrowser;
})();

/**
 * Move File Browser Modal
 *
 * Reuses the same folder-tree logic as Copy but POSTs to /api/items/move
 * and uses a separate modal (#moveBrowserModal).
 */
(function () {
  var allFolders = [];
  var folderTree = [];
  var currentFolderId = null;
  var selectedFolderId = null;
  var breadcrumbTrail = [];

  function buildTree(flat) {
    var root = [];
    var stack = [{ children: root, depth: -1 }];
    flat.forEach(function (item) {
      var node = { id: item.id, name: item.name, children: [] };
      while (stack.length > 1 && stack[stack.length - 1].depth >= item.depth) {
        stack.pop();
      }
      stack[stack.length - 1].children.push(node);
      stack.push({ children: node.children, depth: item.depth, id: item.id, name: item.name });
    });
    return root;
  }

  function findNodeWithPath(nodes, targetId, path) {
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      var currentPath = path.concat([{ id: n.id, name: n.name }]);
      if (n.id === targetId) return { node: n, path: currentPath };
      if (n.children && n.children.length > 0) {
        var result = findNodeWithPath(n.children, targetId, currentPath);
        if (result) return result;
      }
    }
    return null;
  }

  function getChildren(folderId) {
    if (!folderId) return folderTree;
    var result = findNodeWithPath(folderTree, folderId, []);
    return result ? result.node.children : [];
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str || ''));
    return div.innerHTML;
  }

  function renderBreadcrumb() {
    var el = document.getElementById('mv-breadcrumb');
    if (!el) return;
    var html = '';
    if (!currentFolderId) {
      html += '<span class="fb-breadcrumb-item current">My Drive</span>';
    } else {
      html += '<span class="fb-breadcrumb-item" data-mv-nav="">My Drive</span>';
      for (var i = 0; i < breadcrumbTrail.length; i++) {
        html += '<span class="fb-breadcrumb-sep">›</span>';
        var isLast = i === breadcrumbTrail.length - 1;
        if (isLast) {
          html += '<span class="fb-breadcrumb-item current">' + escapeHtml(breadcrumbTrail[i].name) + '</span>';
        } else {
          html += '<span class="fb-breadcrumb-item" data-mv-nav="' + breadcrumbTrail[i].id + '">' + escapeHtml(breadcrumbTrail[i].name) + '</span>';
        }
      }
    }
    el.innerHTML = html;
  }

  function updateMoveButton() {
    var btn = document.getElementById('mv-move-btn');
    if (!btn) return;
    btn.disabled = !selectedFolderId && currentFolderId === null;
    if (selectedFolderId || currentFolderId) btn.disabled = false;
  }

  function renderFolderList() {
    var el = document.getElementById('mv-folder-list');
    if (!el) return;
    var children = getChildren(currentFolderId);
    if (children.length === 0) {
      el.innerHTML = '<div class="fb-empty">No subfolders</div>';
    } else {
      var html = '';
      children.forEach(function (child) {
        var hasChildren = child.children && child.children.length > 0;
        html += '<div class="fb-folder-item mv-folder-item' + (child.id === selectedFolderId ? ' selected' : '') + '" data-mv-id="' + child.id + '" data-mv-name="' + escapeHtml(child.name) + '">';
        html += '<svg width="20" height="20" viewBox="0 0 24 24" fill="#5f6368" stroke="none"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>';
        html += '<span class="fb-folder-name">' + escapeHtml(child.name) + '</span>';
        if (hasChildren) {
          html += '<span class="mv-folder-arrow"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg></span>';
        }
        html += '</div>';
      });
      el.innerHTML = html;
    }
    updateMoveButton();
  }

  function navigateTo(folderId) {
    currentFolderId = folderId || null;
    selectedFolderId = null;
    if (!folderId) {
      breadcrumbTrail = [];
    } else {
      var result = findNodeWithPath(folderTree, folderId, []);
      breadcrumbTrail = result ? result.path : [];
    }
    renderBreadcrumb();
    renderFolderList();
  }

  function openMoveBrowser() {
    var listEl = document.getElementById('mv-folder-list');
    var breadcrumbEl = document.getElementById('mv-breadcrumb');

    currentFolderId = null;
    selectedFolderId = null;
    breadcrumbTrail = [];

    if (breadcrumbEl) breadcrumbEl.innerHTML = '';
    if (listEl) listEl.innerHTML = '<div class="fb-loading">Loading folders...</div>';

    var btn = document.getElementById('mv-move-btn');
    if (btn) btn.disabled = true;

    $('#moveBrowserModal').modal('show');

    $.getJSON('/api/folder/list/json', function (data) {
      if (data.error) {
        if (listEl) listEl.innerHTML = '<div class="fb-empty">Error loading folders</div>';
        return;
      }
      allFolders = data;
      folderTree = buildTree(data);
      navigateTo(null);
    }).fail(function () {
      if (listEl) listEl.innerHTML = '<div class="fb-empty">Error loading folders</div>';
    });
  }

  // Single click — select
  $(document).on('click', '.mv-folder-item', function () {
    var id = $(this).data('mv-id');
    selectedFolderId = id;
    $('.mv-folder-item').removeClass('selected');
    $(this).addClass('selected');
    updateMoveButton();
  });

  // Double click — navigate in
  $(document).on('dblclick', '.mv-folder-item', function () {
    navigateTo($(this).data('mv-id'));
  });

  // Arrow click — navigate in
  $(document).on('click', '.mv-folder-arrow', function (e) {
    e.stopPropagation();
    navigateTo($(this).closest('.mv-folder-item').data('mv-id'));
  });

  // Breadcrumb navigation
  $(document).on('click', '[data-mv-nav]', function () {
    var id = $(this).data('mv-nav');
    navigateTo(id || null);
  });

  // Wire up Actions > Move
  $(document).on('click', '#action-move', function (e) {
    e.preventDefault();
    openMoveBrowser();
  });

  // Move button click
  $(document).on('click', '#mv-move-btn', function () {
    var destId = selectedFolderId || currentFolderId;
    if (!destId) return;

    var items = globalThis.getSelectedItems ? globalThis.getSelectedItems() : [];
    if (items.length === 0) return;

    var btn = $(this);
    btn.prop('disabled', true).text('Moving...');

    $.ajax({
      url: '/api/items/move',
      method: 'POST',
      contentType: 'application/json',
      data: JSON.stringify({
        items: items.map(function (i) { return { id: i.id, type: i.type }; }),
        targetFolderId: destId
      }),
      success: function (resp) {
        $('#moveBrowserModal').modal('hide');
        btn.prop('disabled', false).text('Move here');

        if (resp && resp.success) {
          var failed = (resp.results || []).filter(function (r) { return !r.success; });
          if (failed.length > 0) {
            alert(failed.length + ' item(s) failed to move.');
          } else {
            location.reload();
          }
        } else {
          alert(resp.error || 'Move failed');
        }
      },
      error: function () {
        btn.prop('disabled', false).text('Move here');
        alert('Move request failed. Please try again.');
      }
    });
  });

  globalThis.openMoveBrowser = openMoveBrowser;
})();

// Calculate total size action
$(document).on('click', '#action-calculate-size', function (e) {
  e.preventDefault();

  var items = globalThis.getSelectedItems ? globalThis.getSelectedItems() : [];
  if (items.length === 0) return;

  var $valueEl = $('#size-result-value');
  var $filesEl = $('#size-result-files');

  $valueEl.text('Calculating\u2026');
  $filesEl.text('');
  $('#sizeResultModal').modal('show');

  $.ajax({
    url: '/api/items/calculate-size',
    method: 'POST',
    contentType: 'application/json',
    data: JSON.stringify({
      items: items.map(function (i) { return { id: i.id, type: i.type }; })
    }),
    success: function (resp) {
      if (resp && resp.success) {
        $valueEl.text(resp.formatted);
        var count = resp.file_count;
        $filesEl.text(count + ' file' + (count === 1 ? '' : 's'));
      } else {
        $valueEl.text('Error');
        $filesEl.text(resp.error || 'Could not calculate size');
      }
    },
    error: function () {
      $valueEl.text('Error');
      $filesEl.text('Request failed. Please try again.');
    }
  });
});

// ── Trash view: enable/disable Restore and Delete Permanently buttons ──
(function () {
  var isTrash = (document.querySelector('[data-view="trash"]') !== null);
  if (!isTrash) return;

  var btnRestore = document.getElementById('btn-restore');
  var btnPermDelete = document.getElementById('btn-permanent-delete');

  // Override updateUI to also toggle trash primary buttons
  var _origUpdate = globalThis._updateUIHook;
  document.addEventListener('selectionchange.admin', function () {
    var count = globalThis.getSelectedItems ? globalThis.getSelectedItems().length : 0;
    if (btnRestore) btnRestore.disabled = count === 0;
    if (btnPermDelete) btnPermDelete.disabled = count === 0;
  });

  // Also hook into the checkbox change events directly
  $(document).on('change', '.row-checkbox', function () {
    var count = globalThis.getSelectedItems ? globalThis.getSelectedItems().length : 0;
    if (btnRestore) btnRestore.disabled = count === 0;
    if (btnPermDelete) btnPermDelete.disabled = count === 0;
  });
  $(document).on('change', '#select-all-checkbox', function () {
    setTimeout(function () {
      var count = globalThis.getSelectedItems ? globalThis.getSelectedItems().length : 0;
      if (btnRestore) btnRestore.disabled = count === 0;
      if (btnPermDelete) btnPermDelete.disabled = count === 0;
    }, 0);
  });
})();

// Restore selected items (trash view)
$(document).on('click', '#btn-restore', function () {
  var items = globalThis.getSelectedItems ? globalThis.getSelectedItems() : [];
  if (items.length === 0) return;
  if (!confirm('Restore ' + items.length + ' item' + (items.length === 1 ? '' : 's') + '?')) return;

  $.ajax({
    url: '/api/items/restore',
    method: 'POST',
    contentType: 'application/json',
    data: JSON.stringify({ items: items.map(function (i) { return { id: i.id, type: i.type }; }) }),
    success: function (resp) {
      if (resp && resp.success) {
        var failed = (resp.results || []).filter(function (r) { return !r.success; });
        if (failed.length) alert(failed.length + ' item(s) could not be restored.');
        location.reload();
      } else { alert(resp.error || 'Restore failed'); }
    },
    error: function () { alert('Restore request failed. Please try again.'); }
  });
});

// Delete Permanently selected items (trash view)
$(document).on('click', '#btn-permanent-delete', function () {
  var items = globalThis.getSelectedItems ? globalThis.getSelectedItems() : [];
  if (items.length === 0) return;
  if (!confirm('Permanently delete ' + items.length + ' item' + (items.length === 1 ? '' : 's') + '?\n\nThis cannot be undone.')) return;

  $.ajax({
    url: '/api/items/permanent-delete',
    method: 'POST',
    contentType: 'application/json',
    data: JSON.stringify({ items: items.map(function (i) { return { id: i.id, type: i.type }; }) }),
    success: function (resp) {
      if (resp && resp.success) {
        var failed = (resp.results || []).filter(function (r) { return !r.success; });
        if (failed.length) alert(failed.length + ' item(s) could not be deleted.');
        location.reload();
      } else { alert(resp.error || 'Delete failed'); }
    },
    error: function () { alert('Delete request failed. Please try again.'); }
  });
});

// Restore All (trash view Actions menu)
$(document).on('click', '#action-restore-all', function (e) {
  e.preventDefault();
  if (!confirm('Restore all items from Trash?')) return;
  $.ajax({
    url: '/api/trash/restore-all',
    method: 'POST',
    contentType: 'application/json',
    data: JSON.stringify({}),
    success: function (resp) {
      if (resp && resp.success) { location.reload(); }
      else { alert(resp.error || 'Restore all failed'); }
    },
    error: function () { alert('Restore all request failed. Please try again.'); }
  });
});

// Empty Trash (trash view Actions menu)
$(document).on('click', '#action-empty-trash', function (e) {
  e.preventDefault();
  if (!confirm('Permanently delete everything in Trash?\n\nThis cannot be undone.')) return;
  $.ajax({
    url: '/api/trash/empty',
    method: 'POST',
    contentType: 'application/json',
    data: JSON.stringify({}),
    success: function (resp) {
      if (resp && resp.success) { location.reload(); }
      else { alert(resp.error || 'Empty trash failed'); }
    },
    error: function () { alert('Empty trash request failed. Please try again.'); }
  });
});

// Trash action
$(document).on('click', '#action-trash', function (e) {
  e.preventDefault();

  var items = globalThis.getSelectedItems ? globalThis.getSelectedItems() : [];
  if (items.length === 0) return;

  var label = items.length === 1
    ? '"' + (items[0].name || 'this item') + '"'
    : items.length + ' items';

  if (!confirm('Move ' + label + ' to Trash?')) return;

  $.ajax({
    url: '/api/items/trash',
    method: 'POST',
    contentType: 'application/json',
    data: JSON.stringify({
      items: items.map(function (i) { return { id: i.id, type: i.type }; })
    }),
    success: function (resp) {
      if (resp && resp.success) {
        var failed = (resp.results || []).filter(function (r) { return !r.success; });
        if (failed.length > 0) {
          alert(failed.length + ' item(s) could not be trashed:\n' +
            failed.map(function (r) { return r.error; }).join('\n'));
        }
        location.reload();
      } else {
        alert(resp.error || 'Trash failed');
      }
    },
    error: function () {
      alert('Trash request failed. Please try again.');
    }
  });
});

// ── Trash Actions: View details ──────────────────────────────────────────────
$(document).on('click', '#trash-action-view-details', function (e) {
  e.preventDefault();
  var items = globalThis.getSelectedItems ? globalThis.getSelectedItems() : [];
  if (items.length === 0) { alert('Select an item to view its details.'); return; }
  if (items.length > 1)   { alert('Select only one item to view details.'); return; }

  var item = items[0];
  var $row  = $('[data-item-id="' + item.id + '"]').first();
  var location = $row.find('.location-name').text().trim() ||
                 $row.find('.grid-card-location').text().trim() || '—';

  // Pull displayed metadata from the row cells (list layout)
  var lastModified = '—';
  var fileSize     = '—';
  $row.find('td').each(function () {
    var text = $(this).text().trim();
    if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(text) || /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/.test(text)) {
      lastModified = text;
    }
    if (/^\d+(\.\d+)?\s*(B|KB|MB|GB|TB)$/i.test(text)) {
      fileSize = text;
    }
  });

  var type = item.type === 'folder' ? 'Folder' : 'File';
  var rows = [
    ['Name',              escapeHtml(item.name || '—')],
    ['Type',              type],
    ['Original location', escapeHtml(location)],
    ['Last modified',     escapeHtml(lastModified)],
  ];
  if (item.type === 'file') rows.push(['Size', escapeHtml(fileSize)]);

  var html = '<table style="width:100%;border-collapse:collapse;">' +
    rows.map(function (r) {
      return '<tr>' +
        '<td style="color:#5f6368;padding:2px 10px 2px 0;white-space:nowrap;vertical-align:top;">' + r[0] + '</td>' +
        '<td style="font-weight:500;">' + r[1] + '</td>' +
        '</tr>';
    }).join('') +
    '</table>';

  $('#trash-details-body').html(html);
  $('#trashDetailsModal').modal('show');
});

// ── Trash Actions: Download ───────────────────────────────────────────────────
$(document).on('click', '#trash-action-download', function (e) {
  e.preventDefault();
  var items = (globalThis.getSelectedItems ? globalThis.getSelectedItems() : [])
    .filter(function (i) { return i.type === 'file'; });

  if (items.length === 0) { alert('Select one or more files to download.'); return; }

  items.forEach(function (item) {
    var a = document.createElement('a');
    a.href = '/admin/file/download?id=' + encodeURIComponent(item.id);
    a.download = '';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  });
});

// ── Trash Actions: Copy original location ────────────────────────────────────
$(document).on('click', '#trash-action-copy-location', function (e) {
  e.preventDefault();
  var items = globalThis.getSelectedItems ? globalThis.getSelectedItems() : [];
  if (items.length === 0) { alert('Select an item to copy its original location.'); return; }
  if (items.length > 1)   { alert('Select only one item to copy its original location.'); return; }

  var $row = $('[data-item-id="' + items[0].id + '"]').first();
  var location = $row.find('.location-name').text().trim() ||
                 $row.find('.grid-card-location').text().trim();

  if (!location) { alert('Original location not available.'); return; }

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(location).then(function () {
      var $el = $('#trash-action-copy-location');
      var orig = $el.html();
      $el.html($el.html().replace('Copy original location', 'Copied!'));
      setTimeout(function () { $el.html(orig); }, 1500);
    }).catch(function () { alert('Location: ' + location); });
  } else {
    alert('Location: ' + location);
  }
});

// ── Trash Actions: Select all ─────────────────────────────────────────────────
$(document).on('click', '#trash-action-select-all', function (e) {
  e.preventDefault();
  var $selectAll = $('#select-all-checkbox');
  if ($selectAll.length) {
    $selectAll.prop('checked', true).trigger('change');
  } else {
    // Grid layout — check all individual checkboxes
    $('.row-checkbox').prop('checked', true).trigger('change');
  }
});

// ── Trash Actions: Clear selection ───────────────────────────────────────────
$(document).on('click', '#trash-action-clear-selection', function (e) {
  e.preventDefault();
  $('.row-checkbox').prop('checked', false).trigger('change');
  var $selectAll = $('#select-all-checkbox');
  if ($selectAll.length) $selectAll.prop('checked', false).trigger('change');
});

// ── Drive Actions: Select all ────────────────────────────────────────────────
$(document).on('click', '#action-select-all', function (e) {
  e.preventDefault();
  var $selectAll = $('#select-all-checkbox');
  if ($selectAll.length) {
    $selectAll.prop('checked', true).trigger('change');
  } else {
    $('.row-checkbox').prop('checked', true).trigger('change');
  }
});

// ── Drive Actions: Clear selection ───────────────────────────────────────────
$(document).on('click', '#action-clear-selection', function (e) {
  e.preventDefault();
  $('.row-checkbox').prop('checked', false).trigger('change');
  var $selectAll = $('#select-all-checkbox');
  if ($selectAll.length) $selectAll.prop('checked', false).trigger('change');
});

