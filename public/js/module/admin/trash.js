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
