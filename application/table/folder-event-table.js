const TableGateway = require(global.applicationPath('/library/db/table-gateway'));
const FolderEventEntity = require('../entity/folder-event-entity');

class FolderEventTable extends TableGateway {
  constructor(dbAdapter) {
    super(dbAdapter);
    this.table = 'folder_event';
    this.primaryKey = 'event_id';
  }

  getNewEntity(data) {
    return new FolderEventEntity(data);
  }
}

module.exports = FolderEventTable;
