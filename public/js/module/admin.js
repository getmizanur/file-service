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

  // Sidebar Toggle
  const sidebarToggle = document.getElementById('sidebarToggle');
  const mainRow = document.querySelector('.container-fluid > .row'); // Select the parent row

  if (sidebarToggle && mainRow) {
    sidebarToggle.addEventListener('click', function (e) {
      e.preventDefault();
      mainRow.classList.toggle('sidebar-collapsed');

      // Optional: Persist state
      // localStorage.setItem('sidebar-collapsed', mainRow.classList.contains('sidebar-collapsed'));
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

  // Also prevent clicks inside the dropdown menu from triggering the card click (navigation)
  $(document).on('click', '.folder-card .dropdown-menu, .file-card .dropdown-menu', function (e) {
    e.stopPropagation();
  });

});
