const TableGateway = require(global.applicationPath('/library/db/table-gateway'));
const ClassMethodsHydrator = require(global.applicationPath('/library/db/hydrator/class-methods-hydrator'));
const HydratingResultSet = require(global.applicationPath('/library/db/result-set/hydrating-result-set'));
const UserGroupMemberEntity = require('../entity/user-group-member-entity');
const UserGroupMemberDTO = require('../dto/user-group-member-dto');

class UserGroupMemberTable extends TableGateway {
  constructor({ adapter, hydrator } = {}) {
    super({
      table: 'user_group_member',
      adapter,
      primaryKey: ['group_id', 'user_id'],
      hydrator: hydrator || new ClassMethodsHydrator(),
      objectPrototype: new UserGroupMemberEntity()
    });
  }

  baseColumns() {
    return UserGroupMemberEntity.columns();
  }

  async getSelectQuery() {
    const Select = require(global.applicationPath('/library/db/sql/select'));
    return new Select(this.adapter);
  }

  _normalizeRows(result) {
    return (result && result.rows) ? result.rows : (Array.isArray(result) ? result : []);
  }

  _hydrateToDtoArray(rows, dtoPrototype) {
    return new HydratingResultSet(this.hydrator, dtoPrototype)
      .initialize(rows)
      .toArray();
  }

  // ------------------------------------------------------------
  // Entity methods
  // ------------------------------------------------------------

  async fetchByGroupId(groupId) {
    const query = await this.getSelectQuery();
    query.from(this.table)
      .columns(this.baseColumns())
      .where('group_id = ?', groupId)
      .order('created_dt', 'ASC');

    const result = await query.execute();
    const rows = this._normalizeRows(result);

    return rows.map(r => new UserGroupMemberEntity(r));
  }

  async fetchByUserId(userId) {
    const query = await this.getSelectQuery();
    query.from(this.table)
      .columns(this.baseColumns())
      .where('user_id = ?', userId)
      .order('created_dt', 'ASC');

    const result = await query.execute();
    const rows = this._normalizeRows(result);

    return rows.map(r => new UserGroupMemberEntity(r));
  }

  // ------------------------------------------------------------
  // DTO / projection methods
  // ------------------------------------------------------------

  /**
   * Fetch all members of a group with user details.
   * Returns UserGroupMemberDTO[]
   */
  async fetchByGroupWithUserDetails(groupId) {
    const query = await this.getSelectQuery();

    query
      .from({ m: 'user_group_member' }, [])
      .columns({
        group_id: 'm.group_id',
        user_id: 'm.user_id',
        created_dt: 'm.created_dt',

        user_email: 'u.email',
        user_display_name: 'u.display_name'
      })
      .joinLeft({ u: 'app_user' }, 'u.user_id = m.user_id')
      .where('m.group_id = ?', groupId)
      .order('u.display_name', 'ASC');

    const result = await query.execute();
    const rows = this._normalizeRows(result);

    return this._hydrateToDtoArray(rows, new UserGroupMemberDTO());
  }

  /**
   * Fetch all groups a user belongs to with group name.
   * Returns UserGroupMemberDTO[]
   */
  async fetchByUserWithGroupDetails(userId) {
    const query = await this.getSelectQuery();

    query
      .from({ m: 'user_group_member' }, [])
      .columns({
        group_id: 'm.group_id',
        user_id: 'm.user_id',
        created_dt: 'm.created_dt',

        group_name: 'g.name'
      })
      .joinLeft({ g: 'user_group' }, 'g.group_id = m.group_id')
      .where('m.user_id = ?', userId)
      .order('g.name', 'ASC');

    const result = await query.execute();
    const rows = this._normalizeRows(result);

    return this._hydrateToDtoArray(rows, new UserGroupMemberDTO());
  }

  // ------------------------------------------------------------
  // Write methods
  // ------------------------------------------------------------

  async addMember(groupId, userId) {
    const Insert = require(global.applicationPath('/library/db/sql/insert'));

    const insert = new Insert(this.adapter)
      .into(this.table)
      .set({
        group_id: groupId,
        user_id: userId,
        created_dt: new Date()
      })
      .returning(this.baseColumns());

    const result = await insert.execute();

    if (!result || !result.success || !result.insertedRecord) return null;

    return new UserGroupMemberEntity(result.insertedRecord);
  }

  async removeMember(groupId, userId) {
    const Delete = require(global.applicationPath('/library/db/sql/delete'));

    const del = new Delete(this.adapter)
      .from(this.table)
      .where('group_id = ?', groupId)
      .where('user_id = ?', userId);

    return del.execute();
  }

  async removeAllMembersFromGroup(groupId) {
    const Delete = require(global.applicationPath('/library/db/sql/delete'));

    const del = new Delete(this.adapter)
      .from(this.table)
      .where('group_id = ?', groupId);

    return del.execute();
  }

  async removeUserFromAllGroups(userId) {
    const Delete = require(global.applicationPath('/library/db/sql/delete'));

    const del = new Delete(this.adapter)
      .from(this.table)
      .where('user_id = ?', userId);

    return del.execute();
  }
}

module.exports = UserGroupMemberTable;
