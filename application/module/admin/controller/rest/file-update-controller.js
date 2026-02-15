const RestController = require(global.applicationPath('/library/mvc/controller/rest-controller'));

class FileUpdateController extends RestController {

  /**
   * PUT /admin/file/update
   * Body: { file_id, name }
   */
  async putAction() {
    try {
      const req = this.getRequest();
      // Allow body or query, but standard PUT typically has body.
      // admin.js sends x-www-form-urlencoded body.
      const fileId = req.getPost('file_id') || req.getQuery('file_id');
      const name = req.getPost('name');
      const userEmail = 'admin@dailypolitics.com'; // Hardcoded

      if (!fileId || !name) {
        // If body parser didn't run or params missing
        throw new Error('File ID and Name are required');
      }

      const fileService = this.getServiceManager().get('FileMetadataService');
      await fileService.updateFile(fileId, name, userEmail);

      console.log(`[FileUpdateController] Renamed file ${fileId} to ${name}`);

      return this.ok({
        success: true,
        message: 'File renamed successfully'
      });

    } catch (e) {
      console.error('[FileUpdateController] Rename Error:', e.message);
      return this.ok({ success: false, message: e.message }); // Consistency with original error handling
    }
  }
}

module.exports = FileUpdateController;
