/**
 * Admin Dashboard - Sidebar Toggle Logic
 */
$(document).ready(function () {

  // Handle My Drive toggle manually if needed, or enhance Bootstrap's collapse
  // This ensures that when a user clicks the caret or the link, it toggles correctly

  // Rotate caret icon on collapse/expand
  // Rotate caret icon on collapse/expand
  $('.collapse').on('show.bs.collapse', function (e) {
    // Only toggle the direct parent's caret
    e.stopPropagation();
    // Structure: li > div.nav-link > span > svg.caret-icon
    $(this).parent().find('.caret-icon').first().css('transform', 'rotate(0deg)');
  });

  // Fix Modal Backdrop Issue: Move modal to body
  if ($('#newFolderModal').length) {
    $('#newFolderModal').appendTo('body');
  }

  $('.collapse').on('hide.bs.collapse', function (e) {
    e.stopPropagation();
    $(this).parent().find('.caret-icon').first().css('transform', 'rotate(-90deg)');
  });

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
      const response = await fetch('/admin/folder/update', {
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
      const response = await fetch('/admin/file/update', {
        method: 'POST',
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

/**
 * Handle File Upload
 * @param {HTMLInputElement} input 
 */
window.handleFileUpload = async function (input) {
  if (!input.files || input.files.length === 0) return;

  const file = input.files[0];
  const urlParams = new URLSearchParams(window.location.search);
  const folderId = urlParams.get('id') || 'a1000000-0000-0000-0000-000000000001'; // Default to root if missing

  // Show loading state (optimistic UI or simple alert for now)
  const originalText = $('.new-btn span').text();
  $('.new-btn span').text('Uploading...');
  $('.new-btn').addClass('disabled');

  try {
    const uploadUrl = `/admin/file/upload?folder_id=${folderId}&filename=${encodeURIComponent(file.name)}&content_type=${encodeURIComponent(file.type)}&size=${file.size}`;

    // We usage PUT with binary body
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': file.type || 'application/octet-stream'
      },
      body: file
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.message || 'Upload failed');
    }

    const result = await response.json();
    console.log('Upload success:', result);

    // Reload to show new file
    window.location.reload();

  } catch (error) {
    console.error('Upload Error:', error);
    alert('Failed to upload file: ' + error.message);

    // Reset buttor state
    $('.new-btn span').text(originalText);
    $('.new-btn').removeClass('disabled');
    input.value = ''; // Clear input to allow selecting same file again
  }
};

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
});
