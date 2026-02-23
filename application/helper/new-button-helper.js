// application/helper/new-button-helper.js
const AbstractHelper = require(global.applicationPath('/library/mvc/view/helper/abstract-helper'));
const UrlHelper = require(global.applicationPath('/library/mvc/view/helper/url'));


class NewButtonHelper extends AbstractHelper {

  /**
   * Render the New Button Dropdown
   * @returns {string} HTML content
   */

  /**
   * Render the New Button Dropdown
   * @param {string} currentFolderId - ID of the current folder
   * @returns {string} HTML content
   */
  render(...args) {
    const { args: cleanArgs } = this._extractContext(args);
    let [currentFolderId] = cleanArgs;

    // Default to root if undefined
    if (!currentFolderId) {
      currentFolderId = 'a1000000-0000-0000-0000-000000000001';
    }
    const urlHelper = new UrlHelper();
    const createUrl = urlHelper.fromRoute('adminFolderCreate');
    const modalHtml = `
      <!-- New Folder Modal -->
      <div class="modal fade" id="newFolderModal" tabindex="-1" role="dialog" aria-labelledby="newFolderModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered" role="document" style="max-width: 400px;">
          <div class="modal-content border-0 shadow-lg" style="border-radius: 8px;">
            <div class="modal-body p-4">
              <h5 class="modal-title mb-3" id="newFolderModalLabel" style="font-weight: 400; font-size: 1.5rem;">New folder</h5>
              <form action="${createUrl}" method="POST">
                <input type="hidden" name="parent_folder_id" value="${currentFolderId}">
                <div class="form-group mb-4">
                  <input type="text" class="form-control p-2" id="newFolderName" name="name" value="Untitled folder" required style="border: 1px solid #1a73e8; border-radius: 4px;">
                </div>
                <div class="d-flex justify-content-end">
                  <button type="button" class="btn btn-outline-secondary" data-dismiss="modal" style="margin-right: 16px;">Cancel</button>
                  <button type="submit" class="btn btn-primary">Create</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    `;

    return `
        <div class="dropdown new-dropdown-container">
          <a href="#" class="new-btn" id="newDropdown" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M11.883 5.49219V11.5173H5.85791V13.3361H11.883V19.3612H13.7018V13.3361H19.7269V11.5173H13.7018V5.49219H11.883Z" fill="currentColor"/>
            </svg>
            <span class="">New</span>
          </a>
          <div class="dropdown-menu shadow-lg border-0" aria-labelledby="newDropdown" style="width: 280px; border-radius: 8px;">
            <a class="dropdown-item d-flex justify-content-between align-items-center py-2" href="#" id="btnNewFolder" data-toggle="modal" data-target="#newFolderModal">
              <div class="d-flex align-items-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-3 text-muted">
                   <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                   <line x1="12" y1="11" x2="12" y2="17"></line>
                   <line x1="9" y1="14" x2="15" y2="14"></line>
                </svg>
                &nbsp;New folder
              </div>
              <span class="text-muted small">^C then F</span>
            </a>
            <div class="dropdown-divider my-1"></div>
            <a class="dropdown-item d-flex justify-content-between align-items-center py-2" href="#" onclick="document.getElementById('fileUploadInput').click(); return false;">
               <div class="d-flex align-items-center">
                 <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-3 text-muted">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="12" y1="18" x2="12" y2="12"></line>
                    <line x1="9" y1="15" x2="12" y2="12"></line>
                    <line x1="15" y1="15" x2="12" y2="12"></line>
                 </svg>
                 &nbsp;File upload
               </div>
               <span class="text-muted small">^C then U</span>
            </a>
            <input type="file" id="fileUploadInput" multiple style="display: none;" onchange="handleMultiFileUpload(this)">
            <!--<a class="dropdown-item d-flex justify-content-between align-items-center py-2" href="#">
               <div class="d-flex align-items-center">
                 <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-3 text-muted">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                    <line x1="12" y1="17" x2="12" y2="11"></line>
                    <line x1="9" y1="14" x2="12" y2="11"></line>
                    <line x1="15" y1="14" x2="12" y2="11"></line>
                 </svg>
                 &nbsp;Folder upload
               </div>
               <span class="text-muted small">^C then I</span>
            </a>-->
          </div>
        </div>
        ${modalHtml}
    `;
  }

}

module.exports = NewButtonHelper;
