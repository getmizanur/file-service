const TableGateway = require('../../library/db/table-gateway');
const UserGroupMemberEntity = require('../entity/user-group-member-entity');
class UserGroupMemberTable extends TableGateway {
  constructor({ adapter }) {
    super({
      table: 'user_group_member',
      adapter,
      primaryKey: ['group_id', 'user_id'],
      entityFactory: row => new UserGroupMemberEntity(row)
    });
  }
  async getSelectQuery() {
    const Select = require('../../library/db/sql/select');
    return new Select(this.adapter);
  }
  baseColumns() {
    return UserGroupMemberEntity.columns();
  }
  async fetchByGroupId(groupId) {
    const query = await this.getSelectQuery();
    query.from(this.table)
      .columns(this.baseColumns())
      .where('group_id = ?', groupId);
    const result = await query.execute();
    return result.rows || result;
  }
  async fetchByUserId(userId) {
    const query = await this.getSelectQuery();
    query.from(this.table)
      .columns(this.baseColumns())
      .where('user_id = ?', userId);
    const result = await query.execute();
    return result.rows || result;
  }
}
module.exports = UserGroupMemberTable;
