const AbstractService = require('./abstract-service');
const FileStarTable = require('../table/file-star-table');

class FileStarService extends AbstractService {
  /**
   * Get FileStarTable
   */
  async getFileStarTable() {
    const adapter = await this.initializeDatabase();
    return new FileStarTable({ adapter });
  }

  /**
   * Helper: Resolve User and Tenant IDs from Email
   * @param {string} email
   * @returns {Promise<{user_id: string, tenant_id: string}>}
   */
  async _resolveUser(email) {
    const adapter = await this.initializeDatabase();
    const Select = require(global.applicationPath('/library/db/sql/select'));

    const qUser = new Select(adapter)
      .from({ u: 'app_user' }, ['u.user_id', 'tm.tenant_id'])
      .join({ tm: 'tenant_member' }, 'tm.user_id = u.user_id')
      .where('u.email = ?', email)
      .where("u.status = 'active'");

    const resUser = await qUser.execute();
    const userRows = (resUser && resUser.rows) ? resUser.rows : (Array.isArray(resUser) ? resUser : []);

    if (userRows.length === 0) {
      throw new Error('User not found or inactive');
    }
    return userRows[0];
  }

  /**
   * Star a file
   * @param {string} fileId
   * @param {string} userEmail
   */
  async starFile(fileId, userEmail) {
    const { user_id, tenant_id } = await this._resolveUser(userEmail);
    const table = await this.getFileStarTable();

    // Check availability? Or just try insert.
    // Insert might fail if already exists (unique constraint).
    // Let's catch duplicate error or just verify first.
    // Verify first is safer for specific error messaging, but insert ignore is faster.
    // Given the constraints, I'll try insert and catch specific error if needed, 
    // or just 'add' which does simple insert.

    // Check if file exists in tenant? 
    // Ideally yes, but foreign key constraint will handle it if we want strictness.
    // For now, trust the input or constraints.

    try {
      await table.add(tenant_id, fileId, user_id);
      return true;
    } catch (e) {
      // If duplicate key error, it's already starred. Return true or ignore.
      if (e.message.includes('unique') || e.code === '23505') { // Postgres generic unique violation
        return true;
      }
      throw e;
    }
  }

  /**
   * Toggle star status
   * @param {string} fileId 
   * @param {string} userEmail 
   */
  async toggleStar(fileId, userEmail) {
    const { user_id, tenant_id } = await this._resolveUser(userEmail);
    const table = await this.getFileStarTable();

    const isStarred = await table.check(tenant_id, fileId, user_id);

    if (isStarred) {
      await table.removeWithTenantCheck(tenant_id, fileId, user_id);
      return false; // Result is unstarred
    } else {
      await table.add(tenant_id, fileId, user_id);
      return true; // Result is starred
    }
  }



  /**
   * Check if file is starred by user
   * @param {string} fileId
   * @param {string} userEmail
   */
  async isStarred(fileId, userEmail) {
    const { user_id, tenant_id } = await this._resolveUser(userEmail);
    const table = await this.getFileStarTable();
    return table.check(tenant_id, fileId, user_id);
  }

  /**
   * Get all starred files for a user
   * Returns list of FileStar objects (or we could fetch metadata)
   * @param {string} userEmail
   */
  async getStarredFiles(userEmail) {
    const { user_id, tenant_id } = await this._resolveUser(userEmail);
    const table = await this.getFileStarTable();
    return table.fetchByUser(tenant_id, user_id);
  }
}

module.exports = FileStarService;
