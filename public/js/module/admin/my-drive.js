(function() {
  var btn = document.getElementById('primaryNewBtn');
  var menu = document.getElementById('primaryNewMenu');
  if (!btn || !menu) return;

  btn.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    if (menu.classList.contains('show')) {
      menu.classList.remove('show');
      return;
    }
    var rect = btn.getBoundingClientRect();
    menu.style.left = (rect.right + 8) + 'px';
    menu.style.top = rect.top + 'px';
    menu.classList.add('show');
  });

  document.addEventListener('click', function(e) {
    if (!menu.contains(e.target) && e.target !== btn && !btn.contains(e.target)) {
      menu.classList.remove('show');
    }
  });

  var newFolderBtn = document.getElementById('primaryNewFolder');
  if (newFolderBtn) {
    newFolderBtn.addEventListener('click', function(e) {
      e.preventDefault();
      menu.classList.remove('show');
      $('#newFolderModal').modal('show');
    });
  }

  var fileUploadBtn = document.getElementById('primaryFileUpload');
  if (fileUploadBtn) {
    fileUploadBtn.addEventListener('click', function(e) {
      e.preventDefault();
      menu.classList.remove('show');
      document.getElementById('fileUploadInput').click();
    });
  }
})();

// ── Image Gallery (prev/next navigation in lightbox) ──
(function () {
  var _gallery = null;

  // Override handleFileClick to build image gallery before opening preview
  globalThis.handleFileClick = function (event, fileId, fileName, previewType, viewUrl, downloadUrl) {
    if (!previewType) {
      globalThis.location.href = downloadUrl;
      return;
    }

    _gallery = null;

    if (previewType === 'image') {
      var imageItems = [];
      var re = /handleFileClick\(event,\s*'([^']*)',\s*'((?:[^'\\]|\\.)*)',\s*'image',\s*'([^']*)',\s*'([^']*)'\)/;
      document.querySelectorAll('[onclick*="handleFileClick"]').forEach(function (el) {
        var m = el.getAttribute('onclick').match(re);
        if (m) {
          imageItems.push({ id: m[1], name: m[2].replaceAll("\\'", "'"), viewUrl: m[3], downloadUrl: m[4] });
        }
      });
      if (imageItems.length > 1) {
        var idx = imageItems.findIndex(function (img) { return img.id === fileId; });
        if (idx >= 0) {
          _gallery = { items: imageItems, index: idx };
        }
      }
    }

    // Open base preview (this calls closeFilePreview internally, but _gallery
    // is a local var inside this IIFE so it won't be cleared)
    openFilePreview(fileName, previewType, viewUrl, downloadUrl);

    // Inject gallery nav into the overlay after it's been created
    if (_gallery) {
      _injectGalleryNav();
    }
  };

  function _injectGalleryNav() {
    var $overlay = $('#filePreviewOverlay');
    if (!$overlay.length || !_gallery) return;

    var idx = _gallery.index;
    var total = _gallery.items.length;

    // Add counter to topbar
    $overlay.find('.file-preview-actions').prepend(
      '<span class="file-preview-counter">' + (idx + 1) + ' / ' + total + '</span>'
    );

    // Add prev/next arrows to body
    var $body = $overlay.find('.file-preview-body');
    $body.prepend(
      '<button class="file-preview-nav file-preview-nav-prev' + (idx === 0 ? ' disabled' : '') + '" onclick="navigateGallery(-1); event.stopPropagation();" title="Previous">' +
        '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>' +
      '</button>'
    );
    $body.append(
      '<button class="file-preview-nav file-preview-nav-next' + (idx === total - 1 ? ' disabled' : '') + '" onclick="navigateGallery(1); event.stopPropagation();" title="Next">' +
        '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 6 15 12 9 18"></polyline></svg>' +
      '</button>'
    );

    // Rebind keyboard to add arrow key navigation
    $(document).off('keydown.filePreview').on('keydown.filePreview', function (e) {
      if (e.key === 'Escape') globalThis.closeFilePreview();
      else if (e.key === 'ArrowLeft') globalThis.navigateGallery(-1);
      else if (e.key === 'ArrowRight') globalThis.navigateGallery(1);
    });
  }

  globalThis.navigateGallery = function (direction) {
    if (!_gallery || !_gallery.items.length) return;

    var newIndex = _gallery.index + direction;
    if (newIndex < 0 || newIndex >= _gallery.items.length) return;

    _gallery.index = newIndex;
    var item = _gallery.items[newIndex];
    var total = _gallery.items.length;

    var $overlay = $('#filePreviewOverlay');
    var $spinner = $overlay.find('.file-preview-spinner');
    $spinner.show();
    $overlay.find('.file-preview-content')
      .off('load error')
      .on('load', function () { $spinner.hide(); })
      .on('error', function () {
        $spinner.hide();
        $(this).replaceWith('<div class="text-light text-center p-4">Unable to load preview</div>');
      })
      .attr('src', item.viewUrl)
      .attr('alt', item.name);

    $overlay.find('.file-preview-filename').text(item.name).attr('title', item.name);
    $overlay.find('.file-preview-actions a[title="Download"]').attr('href', item.downloadUrl);
    $overlay.find('.file-preview-counter').text((newIndex + 1) + ' / ' + total);
    $overlay.find('.file-preview-nav-prev').toggleClass('disabled', newIndex === 0);
    $overlay.find('.file-preview-nav-next').toggleClass('disabled', newIndex === total - 1);
  };
})();
