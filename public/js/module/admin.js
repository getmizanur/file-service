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

  // --- Cookie Helpers ---
  function setCookie(name, value, days) {
    let expires = "";
    if (days) {
      const date = new Date();
      date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
      expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "") + expires + "; path=/";
  }

  function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
  }

  // Folder Expansion State Persistence (Cookie based)
  // Consolidated Folder Expansion & Caret Logic
  // Using document delegation to ensure we catch all collapses, but filtering for folders
  $(document).on('show.bs.collapse hide.bs.collapse', '.collapse', function (e) {
    e.stopPropagation();

    // 1. Rotate Caret (applies to all collapsible items with a caret-icon parent)
    const isExpandedCaret = e.type.indexOf('show') !== -1; // Renamed to avoid conflict
    const rotation = isExpandedCaret ? 'rotate(0deg)' : 'rotate(-90deg)';
    $(this).parent().find('.caret-icon').first().css('transform', rotation);

    // 2. Session Persistence (via REST API)
    const folderIdRaw = $(this).attr('id'); // e.g., "folder-123"

    if (folderIdRaw && folderIdRaw.startsWith('folder-')) {
      const folderId = folderIdRaw.replace('folder-', '');
      // Check for "show" in event type (handles both 'show' and 'show.bs.collapse')
      const isExpanded = e.type.indexOf('show') !== -1;

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

  // Toggle Secondary Sidebar (Desktop)
  if (btnMyDrive && secondarySidebar) {
    btnMyDrive.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      secondarySidebar.classList.toggle('collapsed');

      // Toggle active state visual
      if (secondarySidebar.classList.contains('collapsed')) {
        btnMyDrive.classList.remove('active');
        // If we are on My Drive view, we might want to keep it active?
        // For now, let's just toggle the class based on visibility
      } else {
        btnMyDrive.classList.add('active');
      }
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
  window.openDeleteModal = function (deleteUrl) {
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
      window.location.href = deleteUrl;
    }
  });

  // Rename Folder Modal Logic
  window.openRenameModal = function (folderId, currentName) {
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
        window.location.reload();
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
  window.openRenameFileModal = function (fileId, currentName) {
    $('#renameFileId').val(fileId);
    $('#renameFileName').val(currentName);
    $('#renameFileModal').modal('show');
  };

  $('#renameFileModal').on('shown.bs.modal', function () {
    $('#renameFileName').focus().select();
  });

  $('#btnRenameFileConfirm').click(async function () {
    const fileId = $('#renameFileId').val();
    const name = $('#renameFileName').val();
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
        window.location.reload();
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

var UPLOAD_MAX_FILES = 10;
var UPLOAD_MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
var UPLOAD_CONCURRENCY = 3;

/**
 * Format bytes into human-readable string.
 * @param {number} bytes
 * @returns {string}
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  var units = ['B', 'KB', 'MB', 'GB'];
  var i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1) + ' ' + units[i];
}

/**
 * UploadPanel - Manages the bottom-right floating upload progress panel.
 * Google Drive style: fixed bottom-right, collapsible header, per-file rows.
 */
var UploadPanel = {
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

    var panel = document.createElement('div');
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

    var self = this;

    // Toggle minimize/expand
    panel.querySelector('#uploadPanelToggle').addEventListener('click', function () {
      self._isMinimized = !self._isMinimized;
      self._bodyEl.style.display = self._isMinimized ? 'none' : 'block';
      var svg = panel.querySelector('#uploadPanelToggle svg polyline');
      svg.setAttribute('points', self._isMinimized ? '6 15 12 9 18 15' : '6 9 12 15 18 9');
    });

    // Close button
    panel.querySelector('#uploadPanelClose').addEventListener('click', function () {
      self.reset();
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
    var svg = this._panelEl.querySelector('#uploadPanelToggle svg polyline');
    svg.setAttribute('points', '6 9 12 15 18 9');
    this._updateHeaderText();
  },

  addFile: function (id, filename, size) {
    this._ensurePanel();

    var row = document.createElement('div');
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
    var bar = document.getElementById('upload-bar-' + id);
    var status = document.getElementById('upload-status-' + id);
    if (bar) {
      bar.style.width = Math.min(percent, 100) + '%';
    }
    if (status && this._fileEntries[id]) {
      this._fileEntries[id].status = 'uploading';
      status.innerHTML = '<span class="upload-status-text upload-status-uploading">' + Math.round(percent) + '%</span>';
    }
  },

  markSuccess: function (id) {
    var bar = document.getElementById('upload-bar-' + id);
    var status = document.getElementById('upload-status-' + id);
    var row = document.getElementById('upload-row-' + id);
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
    var bar = document.getElementById('upload-bar-' + id);
    var status = document.getElementById('upload-status-' + id);
    var row = document.getElementById('upload-row-' + id);
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
      var uploading = this._totalCount - this._completedCount;
      this._headerTextEl.textContent = 'Uploading ' + uploading + ' item' + (uploading > 1 ? 's' : '') + '...';
    } else {
      if (this._failedCount === 0) {
        this._headerTextEl.textContent = this._totalCount + ' upload' + (this._totalCount > 1 ? 's' : '') + ' complete';
      } else {
        var succeeded = this._totalCount - this._failedCount;
        this._headerTextEl.textContent = succeeded + ' complete, ' + this._failedCount + ' failed';
      }
    }
  },

  _checkAllDone: function () {
    if (this._completedCount >= this._totalCount) {
      this._panelEl.querySelector('#uploadPanelClose').style.display = 'inline-flex';
      // Auto-reload after 1.5s if at least one succeeded
      if (this._failedCount < this._totalCount) {
        setTimeout(function () {
          window.location.reload();
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
    var ext = str.lastIndexOf('.') > -1 ? str.substring(str.lastIndexOf('.')) : '';
    var nameWithoutExt = str.substring(0, str.length - ext.length);
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
    var uploadUrl = '/api/file/upload?folder_id=' + encodeURIComponent(folderId)
      + '&filename=' + encodeURIComponent(file.name)
      + '&content_type=' + encodeURIComponent(file.type || 'application/octet-stream')
      + '&size=' + file.size;

    var xhr = new XMLHttpRequest();
    xhr.open('POST', uploadUrl, true);
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');

    xhr.upload.addEventListener('progress', function (e) {
      if (e.lengthComputable) {
        var percent = (e.loaded / e.total) * 100;
        UploadPanel.updateProgress(uploadId, percent);
      }
    });

    xhr.addEventListener('load', function () {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch (parseErr) {
          reject(new Error('Invalid server response'));
        }
      } else {
        var errorMsg = 'Upload failed (HTTP ' + xhr.status + ')';
        try {
          var errResult = JSON.parse(xhr.responseText);
          errorMsg = errResult.message || errorMsg;
        } catch (e) { /* ignore */ }
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
    var index = 0;
    var active = 0;
    var completed = 0;
    var total = tasks.length;

    function next() {
      while (active < concurrency && index < total) {
        var taskIndex = index++;
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

/**
 * Handle multi-file upload from the file input.
 * @param {HTMLInputElement} input
 */
window.handleMultiFileUpload = function (input) {
  if (!input.files || input.files.length === 0) return;

  var files = Array.from(input.files);

  // Validate: max file count
  if (files.length > UPLOAD_MAX_FILES) {
    alert('You can upload a maximum of ' + UPLOAD_MAX_FILES + ' files at once. You selected ' + files.length + '.');
    input.value = '';
    return;
  }

  // Validate: max file size per file
  var oversizedFiles = files.filter(function (f) { return f.size > UPLOAD_MAX_SIZE_BYTES; });
  if (oversizedFiles.length > 0) {
    var names = oversizedFiles.map(function (f) { return f.name + ' (' + formatFileSize(f.size) + ')'; }).join('\n');
    alert('The following files exceed the ' + formatFileSize(UPLOAD_MAX_SIZE_BYTES) + ' limit:\n\n' + names);
    input.value = '';
    return;
  }

  // Validate: no empty files
  var emptyFiles = files.filter(function (f) { return f.size === 0; });
  if (emptyFiles.length > 0) {
    var emptyNames = emptyFiles.map(function (f) { return f.name; }).join(', ');
    alert('Empty files cannot be uploaded: ' + emptyNames);
    input.value = '';
    return;
  }

  // Resolve folder ID
  var urlParams = new URLSearchParams(window.location.search);
  var folderId = urlParams.get('id') || 'a1000000-0000-0000-0000-000000000001';

  // Initialize the upload panel
  UploadPanel.startBatch(files.length);

  // Warn if user tries to leave during upload
  var beforeUnloadHandler = function (e) {
    e.preventDefault();
    e.returnValue = 'Files are still uploading. Are you sure you want to leave?';
    return e.returnValue;
  };
  window.addEventListener('beforeunload', beforeUnloadHandler);

  // Create upload tasks
  var tasks = files.map(function (file, index) {
    var uploadId = 'upload-' + Date.now() + '-' + index;

    UploadPanel.addFile(uploadId, file.name, file.size);

    return function () {
      return uploadSingleFile(file, folderId, uploadId)
        .then(function (result) {
          console.log('[Upload] Success:', file.name, result);
          UploadPanel.markSuccess(uploadId);
        })
        .catch(function (error) {
          console.error('[Upload] Failed:', file.name, error);
          UploadPanel.markFailed(uploadId, error.message);
        });
    };
  });

  // Execute with concurrency limit
  runWithConcurrency(tasks, UPLOAD_CONCURRENCY).then(function () {
    window.removeEventListener('beforeunload', beforeUnloadHandler);
  });

  // Reset input so the same files can be re-selected
  input.value = '';
};

// Backward compatibility alias
window.handleFileUpload = window.handleMultiFileUpload;

/**
 * Copy Public Link
 * Publishes the file if needed and copies the link.
 */
/**
 * Show a toast notification
 */
window.showToast = function (message, type = 'success') {
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
window.copyPublicLink = async function (element, fileId) {
  const btn = $(element);
  const originalHtml = btn.html();

  if (btn.prop('disabled')) return;
  btn.prop('disabled', true);

  // Show spinner
  const icon = btn.find('svg');
  icon.replaceWith('<span class="spinner-border spinner-border-sm mr-2" role="status" aria-hidden="true"></span>');

  try {
    const response = await fetch('/admin/file/link/public-copy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ file_id: fileId })
    });
    const result = await response.json();

    if (result.success && result.data && result.data.link) {
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
window.disablePublicLink = async function (element, fileId) {
  const btn = $(element);
  const dropdownMenu = btn.closest('.dropdown-menu');
  const gridCard = btn.closest('.file-grid-card, .folder-grid-card');

  if (btn.prop('disabled')) return;
  btn.prop('disabled', true);

  // Show spinner
  const icon = btn.find('svg');
  icon.replaceWith('<span class="spinner-border spinner-border-sm mr-2" role="status" aria-hidden="true"></span>');

  try {
    const response = await fetch('/admin/file/link/toggle-public', {
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

function fallbackCopyTextToClipboard(text) {
  var textArea = document.createElement("textarea");
  textArea.value = text;

  // Avoid scrolling to bottom
  textArea.style.top = "0";
  textArea.style.left = "0";
  textArea.style.position = "fixed";

  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  try {
    var successful = document.execCommand('copy');
    if (!successful) throw new Error('Copy command failed');
  } catch (err) {
    console.warn('Fallback: execCommand failed, using prompt', err);
    window.prompt("Copy to clipboard: Ctrl+C, Enter", text);
  }

  document.body.removeChild(textArea);
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
  window.toggleDensity = function () {
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
  const shareFileIdInput = $('#shareFileId');
  const btnShareAdd = $('#btnShareAdd');
  const generalAccessSelect = $('#generalAccessSelect');
  const generalAccessIcon = $('#generalAccessIcon');
  const generalAccessDesc = $('#generalAccessDesc');
  const publicLinkRoleSelect = $('#publicLinkRoleSelect');
  const publicLinkInfoBanner = $('#publicLinkInfoBanner');
  const publicLinkInfoText = $('#publicLinkInfoText');
  const btnCopyLink = $('#btnCopyLink');
  const generalAccessRow = $('.general-access-row');

  // --- Autocomplete Logic ---
  const autocompleteList = $('<div class="autocomplete-dropdown" style="display:none;"></div>');
  $('.share-input-box').css('position', 'relative').append(autocompleteList);

  let searchTimeout = null;

  shareEmailInput.on('keyup', function (e) {
    // Ignore navigation keys
    if (e.which === 13 || e.which === 27 || e.which === 38 || e.which === 40) return;

    const term = $(this).val().trim();
    if (term.length < 2) {
      autocompleteList.hide();
      return;
    }

    if (searchTimeout) clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      fetch(`/api/user/search?q=${encodeURIComponent(term)}`)
        .then(res => res.json())
        .then(json => {
          // API returns the array directly, but we check for data property just in case
          const users = Array.isArray(json) ? json : (json.data || []);

          autocompleteList.empty();

          if (users.length > 0) {
            users.forEach(u => {
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

              autocompleteList.append(item);
            });
            autocompleteList.show();
          } else {
            autocompleteList.hide();
          }
        })
        .catch(err => console.error(err));
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

  window.openShareModal = async function (fileId, fileName) {
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

      const rightSide = isMe
        ? `<span class="text-muted small mr-2">${roleLabel} (you)</span>`
        : isOwner
          ? `<span class="text-muted small mr-2">Owner</span>`
          : `<select class="access-role-select user-role-select"
                     data-email="${p.email}"
                     data-user-id="${p.user_id}">
               <option value="viewer" ${p.role === 'viewer' ? 'selected' : ''}>Viewer</option>
               <option value="editor" ${p.role === 'editor' ? 'selected' : ''}>Editor</option>
               <option disabled>──────────</option>
               <option value="remove">Remove access</option>
             </select>`;

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

      // Disable to prevent multiple clicks
      select.prop('disabled', true);

      if (newRole === 'remove') {
        // Use existing remove function but handle "this" context or call directly
        // We can just call window.removeUserAccess(userId)
        // But removeUserAccess uses confirm() which is synchronous/blocking alert
        // We might want to handle UI state if user cancels
        if (confirm('Remove access?')) {
          try {
            // Call API directly to maintain control or reuse helper
            // existing: window.removeUserAccess
            // It refreshes list on success.
            // Let's reuse but bypass the confirm inside it? No, it has confirm inside.
            // Let's just call it.
            // But wait, if user cancels, we need to revert select.
            // The existing function has confirm inside.
            // I'll reimplement specific logic here to handle revert.

            const response = await fetch('/api/file/unshare', {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: new URLSearchParams({ file_id: currentShareFileId, user_id: userId })
            });

            if (response.ok) {
              await fetchPermissions(currentShareFileId);
            } else {
              alert('Failed to remove user');
              select.prop('disabled', false); // Re-enable but incorrect value selected
              // Ideally revert to previous value (need to store it)
              // For MVP, user just sees error.
              await fetchPermissions(currentShareFileId); // Refresh to reset UI 
            }
          } catch (e) {
            console.error(e);
            alert('Error removing user');
            select.prop('disabled', false);
          }
        } else {
          // User cancelled
          // Revert selection? We need previous value.
          // Easiest is to refresh list or just reset manually if we knew it.
          // Or just let them change it back.
          // Ideally: select.val(previousVal);
          // We can get previous from `p.role` but that variable is lost here.
          // We can re-fetch permissions to reset UI.
          await fetchPermissions(currentShareFileId);
        }
      } else {
        // Update Role
        try {
          const response = await fetch('/api/file/share', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ file_id: currentShareFileId, email: email, role: newRole })
          });
          const result = await response.json();

          if (result.success) {
            // Success!
            // Maybe show a toast?
            // Refresh permissions to confirm/clean UI
            await fetchPermissions(currentShareFileId);
          } else {
            alert(result.error || result.message || 'Failed to update role');
            await fetchPermissions(currentShareFileId); // Reset UI
          }
        } catch (e) {
          console.error(e);
          alert('Error updating role');
          select.prop('disabled', false);
        }
      }
    });
  }

  function updateRoleInfoBanner(role) {
    if (role === 'viewer') {
      publicLinkInfoText.text('Viewers of this file can see comments and suggestions');
    } else {
      publicLinkInfoText.text('Editors of this file can edit and share with others');
    }
  }

  function updateGeneralAccessUI(publicLink) {
    const isPublic = (publicLink && publicLink.general_access === 'anyone_with_link');

    // Always set token if available, regardless of mode
    if (publicLink && publicLink.token) {
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
        if (result.data && result.data.token) {
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
    } catch (e) {
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
  window.removeUserAccess = async function (userId) {
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

        // DEBUG: Alert file ID
        // alert('Debug: Generating for ' + currentShareFileId); 

        const response = await fetch('/api/file/link/copy', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ file_id: currentShareFileId })
        });

        if (!response.ok) {
          // Handle non-200 responses
          const text = await response.text();
          let errorMsg = response.statusText;
          try {
            const json = JSON.parse(text);
            errorMsg = json.message || errorMsg;
            if (json.stack) errorMsg += '\n\nStack: ' + json.stack;
          } catch (e) {
            // Not JSON, usage text
            errorMsg += ' Body: ' + text.substring(0, 100);
          }
          throw new Error('Server Error (' + response.status + '): ' + errorMsg);
        }

        const result = await response.json();
        if (result.success) {
          tokenToCopy = result.data.token;
        } else {
          const err = new Error(result.message || 'Failed to generate link');
          if (result.stack) err.stack = result.stack;
          throw err;
        }
      }
      catch (e) {
        console.error(e);
        let msg = e.message || 'Unknown error';
        if (e.stack) msg += '\n\n' + e.stack;
        // Note: fetch error "e" won't have server stack, but if we parsed result.message above it might.
        // But "e" here is the Error object created in the "else throw new Error(result.message)".
        // So we need to access the result object if we want the stack.
        // I'll update the throw logic slightly above or just rely on console.log if I could see it.
        // User reports alert content. I need to put the stack IN the error message I throw.
        alert('Error generating link: ' + msg);
        btn.html(originalText).prop('disabled', false);
        return;
      }
    }

    if (tokenToCopy) {
      // Construct URL: http://localhost:8080/s/<token>
      const url = `${window.location.origin}/s/${tokenToCopy}`;

      navigator.clipboard.writeText(url).then(() => {
        btn.html('<i class="fas fa-check mr-1"></i> Copied');
        btn.prop('disabled', false); // Re-enable
        setTimeout(() => btn.html(originalText), 2000);
      }).catch(err => {
        console.error('Clipboard API failed, trying fallback', err);
        fallbackCopyTextToClipboard(url, btn, originalText);
      });
    }
  });

  function fallbackCopyTextToClipboard(text, btn, originalText) {
    // Force prompt for manual copy
    prompt('Link:', text);

    // Reset button state
    btn.prop('disabled', false);
    btn.html(originalText);
  }

  // Fix Grid View Dropdown Overflow
  // When a dropdown is shown, check if it overflows the window width.
  // If so, add a class to align it to the right.
  $(document).on('shown.bs.dropdown', '.file-card, .folder-card', function (event) {
    const dropdownMenu = $(event.target).find('.dropdown-menu'); // The menu inside the card

    // Reset first
    dropdownMenu.removeClass('dropdown-menu-right');

    const menuRect = dropdownMenu[0].getBoundingClientRect();
    const windowWidth = $(window).width();

    // If the right edge of the menu exceeds the window width (with some buffer)
    if (menuRect.right > windowWidth) {
      // Apply inline style or class. Bootstrap 4 uses .dropdown-menu-right
      dropdownMenu.addClass('dropdown-menu-right');
    }
  });


});

// Copy Public Link Helper (Invoked from grid/list action)


// Move File Modal Logic
window.openMoveFileModal = function (fileId, currentFolderId, fileName) {
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
window.openMoveFolderModal = function (folderId, currentParentId, folderName) {
  $('#moveFolderId').val(folderId);

  if (folderName) {
    $('#moveFolderModalLabel').text('Move "' + folderName + '"');
  } else {
    $('#moveFolderModalLabel').text('Move Folder');
  }

  var select = $('#moveFolderDest');
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
      var disabledIds = {};
      disabledIds[folderId] = true;

      // Walk the flat (depth-ordered) list to find descendants
      var insideDisabled = false;
      var disabledDepth = -1;
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
        var disabled = !!disabledIds[f.id];
        var depth = f.depth || 0;
        var prefix = '\u00A0'.repeat(depth * 4);

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
window.toggleFolderStar = function (folderId, btn) {
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
    if (data && data.status === 'success') {
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
