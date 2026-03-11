const path = require('path');
const projectRoot = path.resolve(__dirname, '../../../../');
global.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));
globalThis.applicationPath = global.applicationPath;

const Select = require(applicationPath('library/db/sql/select'));

describe('Select Query Builder', () => {
  let mockAdapter;

  beforeEach(() => {
    mockAdapter = {
      query: jest.fn(),
      quoteIdentifier: (v) => `"${v}"`
    };
  });

  describe('constructor', () => {
    test('initializes with empty query state', () => {
      const select = new Select(mockAdapter);
      expect(select.query.select).toEqual([]);
      expect(select.query.from).toBeNull();
      expect(select.query.joins).toEqual([]);
      expect(select.query.where).toEqual([]);
      expect(select.query.groupBy).toEqual([]);
      expect(select.query.having).toEqual([]);
      expect(select.query.orderBy).toEqual([]);
      expect(select.query.limit).toBeNull();
      expect(select.query.offset).toBeNull();
      expect(select.parameters).toEqual([]);
      expect(select.parameterIndex).toBe(0);
    });

    test('allows null adapter', () => {
      const select = new Select();
      expect(select.db).toBeNull();
    });
  });

  describe('from()', () => {
    test('sets table from string', () => {
      const select = new Select(mockAdapter);
      const result = select.from('users');
      expect(select.query.from).toBe('users');
      expect(result).toBe(select); // fluent interface
    });

    test('sets table from object alias { u: "users" }', () => {
      const select = new Select(mockAdapter);
      select.from({ u: 'users' });
      expect(select.query.from).toBe('users AS u');
    });

    test('sets default columns to ["*"]', () => {
      const select = new Select(mockAdapter);
      select.from('users');
      expect(select.query.select).toEqual(['*']);
    });

    test('sets specific columns when provided', () => {
      const select = new Select(mockAdapter);
      select.from('users', ['id', 'name']);
      expect(select.query.select).toEqual(['id', 'name']);
    });

    test('handles null columns parameter', () => {
      const select = new Select(mockAdapter);
      select.from('users', null);
      expect(select.query.select).toEqual([]);
    });
  });

  describe('columns()', () => {
    test('accepts string column', () => {
      const select = new Select(mockAdapter);
      select.from('users', null);
      select.columns('name');
      expect(select.query.select).toContain('name');
    });

    test('accepts array of columns', () => {
      const select = new Select(mockAdapter);
      select.from('users', null);
      select.columns(['id', 'name', 'email']);
      expect(select.query.select).toEqual(['id', 'name', 'email']);
    });

    test('accepts object with aliases { alias: "column" }', () => {
      const select = new Select(mockAdapter);
      select.from('users', null);
      select.columns({ fullName: 'name', mail: 'email' });
      expect(select.query.select).toContain('name AS fullName');
      expect(select.query.select).toContain('email AS mail');
    });

    test('replaces wildcard when explicit columns are added', () => {
      const select = new Select(mockAdapter);
      select.from('users'); // default ['*']
      select.columns(['id', 'name']);
      expect(select.query.select).not.toContain('*');
      expect(select.query.select).toContain('id');
      expect(select.query.select).toContain('name');
    });

    test('does not duplicate when adding "*" again', () => {
      const select = new Select(mockAdapter);
      select.from('users'); // default ['*']
      select.columns('*');
      expect(select.query.select).toEqual(['*']);
    });

    test('deduplicates identical columns', () => {
      const select = new Select(mockAdapter);
      select.from('users', null);
      select.columns(['id', 'name']);
      select.columns(['name', 'email']);
      expect(select.query.select.filter(c => c === 'name').length).toBe(1);
    });
  });

  describe('where()', () => {
    test('adds condition with parameter', () => {
      const select = new Select(mockAdapter);
      select.from('users').where('id = ?', 5);
      expect(select.query.where).toEqual(['id = $1']);
      expect(select.parameters).toEqual([5]);
    });

    test('adds condition without parameter', () => {
      const select = new Select(mockAdapter);
      select.from('users').where('active = true');
      expect(select.query.where).toEqual(['active = true']);
      expect(select.parameters).toEqual([]);
    });

    test('chains multiple where() with AND', () => {
      const select = new Select(mockAdapter);
      select.from('users')
        .where('id = ?', 5)
        .where('active = ?', true);
      expect(select.query.where).toEqual(['id = $1', 'AND active = $2']);
      expect(select.parameters).toEqual([5, true]);
    });

    test('allows binding null value', () => {
      const select = new Select(mockAdapter);
      select.from('users').where('deleted_at = ?', null);
      expect(select.parameters).toEqual([null]);
    });
  });

  describe('orWhere()', () => {
    test('adds OR condition', () => {
      const select = new Select(mockAdapter);
      select.from('users')
        .where('role = ?', 'admin')
        .orWhere('role = ?', 'superadmin');
      expect(select.query.where).toEqual(['role = $1', 'OR role = $2']);
      expect(select.parameters).toEqual(['admin', 'superadmin']);
    });

    test('adds OR condition without parameter', () => {
      const select = new Select(mockAdapter);
      select.from('users')
        .where('active = true')
        .orWhere('role = ?', 'admin');
      expect(select.query.where).toEqual(['active = true', 'OR role = $1']);
    });
  });

  describe('whereIn()', () => {
    test('generates IN clause with placeholders', () => {
      const select = new Select(mockAdapter);
      select.from('users').whereIn('id', [1, 2, 3]);
      expect(select.query.where[0]).toBe('id IN ($1, $2, $3)');
      expect(select.parameters).toEqual([1, 2, 3]);
    });

    test('handles empty array by adding always-false condition', () => {
      const select = new Select(mockAdapter);
      select.from('users').whereIn('id', []);
      expect(select.query.where[0]).toBe('1 = 0');
    });
  });

  describe('whereNotIn()', () => {
    test('generates NOT IN clause', () => {
      const select = new Select(mockAdapter);
      select.from('users').whereNotIn('id', [10, 20]);
      expect(select.query.where[0]).toBe('id NOT IN ($1, $2)');
      expect(select.parameters).toEqual([10, 20]);
    });

    test('does nothing for empty array', () => {
      const select = new Select(mockAdapter);
      select.from('users').whereNotIn('id', []);
      expect(select.query.where).toEqual([]);
    });
  });

  describe('join()', () => {
    test('adds INNER JOIN with string table', () => {
      const select = new Select(mockAdapter);
      select.from('users').join('profiles', 'users.id = profiles.user_id');
      expect(select.query.joins[0]).toBe('INNER JOIN profiles ON users.id = profiles.user_id');
    });

    test('adds INNER JOIN with aliased table', () => {
      const select = new Select(mockAdapter);
      select.from('users').join({ p: 'profiles' }, 'users.id = p.user_id');
      expect(select.query.joins[0]).toBe('INNER JOIN profiles AS p ON users.id = p.user_id');
    });

    test('adds columns from joined table', () => {
      const select = new Select(mockAdapter);
      select.from('users', ['id', 'name'])
        .join('profiles', 'users.id = profiles.user_id', ['bio', 'avatar']);
      expect(select.query.select).toContain('bio');
      expect(select.query.select).toContain('avatar');
    });

    test('does not add join columns when selecting "*"', () => {
      const select = new Select(mockAdapter);
      select.from('users') // default '*'
        .join('profiles', 'users.id = profiles.user_id', ['bio']);
      expect(select.query.select).toEqual(['*']);
    });
  });

  describe('joinLeft()', () => {
    test('adds LEFT JOIN', () => {
      const select = new Select(mockAdapter);
      select.from('users').joinLeft('profiles', 'users.id = profiles.user_id');
      expect(select.query.joins[0]).toBe('LEFT JOIN profiles ON users.id = profiles.user_id');
    });
  });

  describe('joinRight()', () => {
    test('adds RIGHT JOIN', () => {
      const select = new Select(mockAdapter);
      select.from('users').joinRight('profiles', 'users.id = profiles.user_id');
      expect(select.query.joins[0]).toBe('RIGHT JOIN profiles ON users.id = profiles.user_id');
    });
  });

  describe('group()', () => {
    test('adds single GROUP BY column', () => {
      const select = new Select(mockAdapter);
      select.from('users').group('role');
      expect(select.query.groupBy).toEqual(['role']);
    });

    test('adds array of GROUP BY columns', () => {
      const select = new Select(mockAdapter);
      select.from('users').group(['role', 'status']);
      expect(select.query.groupBy).toEqual(['role', 'status']);
    });

    test('accumulates GROUP BY columns', () => {
      const select = new Select(mockAdapter);
      select.from('users').group('role').group('status');
      expect(select.query.groupBy).toEqual(['role', 'status']);
    });
  });

  describe('having()', () => {
    test('adds HAVING condition with parameter', () => {
      const select = new Select(mockAdapter);
      select.from('users').group('role').having('COUNT(*) > ?', 5);
      expect(select.query.having).toEqual(['COUNT(*) > $1']);
      expect(select.parameters).toEqual([5]);
    });

    test('chains multiple having with AND', () => {
      const select = new Select(mockAdapter);
      select.from('users')
        .group('role')
        .having('COUNT(*) > ?', 5)
        .having('COUNT(*) < ?', 100);
      expect(select.query.having).toEqual(['COUNT(*) > $1', 'AND COUNT(*) < $2']);
    });

    test('adds HAVING without parameter', () => {
      const select = new Select(mockAdapter);
      select.from('users').group('role').having('COUNT(*) > 1');
      expect(select.query.having).toEqual(['COUNT(*) > 1']);
    });
  });

  describe('order()', () => {
    test('adds ORDER BY with default ASC', () => {
      const select = new Select(mockAdapter);
      select.from('users').order('name');
      expect(select.query.orderBy).toEqual(['name ASC']);
    });

    test('adds ORDER BY with DESC', () => {
      const select = new Select(mockAdapter);
      select.from('users').order('created_at', 'DESC');
      expect(select.query.orderBy).toEqual(['created_at DESC']);
    });

    test('chains multiple order clauses', () => {
      const select = new Select(mockAdapter);
      select.from('users').order('role').order('name', 'DESC');
      expect(select.query.orderBy).toEqual(['role ASC', 'name DESC']);
    });
  });

  describe('limit()', () => {
    test('sets limit', () => {
      const select = new Select(mockAdapter);
      select.from('users').limit(10);
      expect(select.query.limit).toBe(10);
    });

    test('sets limit with offset', () => {
      const select = new Select(mockAdapter);
      select.from('users').limit(10, 20);
      expect(select.query.limit).toBe(10);
      expect(select.query.offset).toBe(20);
    });
  });

  describe('offset()', () => {
    test('sets offset separately', () => {
      const select = new Select(mockAdapter);
      select.from('users').offset(50);
      expect(select.query.offset).toBe(50);
    });
  });

  describe('toString() / getSqlString()', () => {
    test('produces basic SELECT * FROM table', () => {
      const select = new Select(mockAdapter);
      const sql = select.from('users').toString();
      expect(sql).toBe('SELECT * FROM users');
    });

    test('produces SELECT with specific columns', () => {
      const select = new Select(mockAdapter);
      const sql = select.from('users', ['id', 'name']).toString();
      expect(sql).toBe('SELECT id, name FROM users');
    });

    test('produces SELECT with aliased table', () => {
      const select = new Select(mockAdapter);
      const sql = select.from({ u: 'users' }, ['u.id', 'u.name']).toString();
      expect(sql).toBe('SELECT u.id, u.name FROM users AS u');
    });

    test('produces SELECT with aliased columns', () => {
      const select = new Select(mockAdapter);
      const sql = select.from('users', { fullName: 'name' }).toString();
      expect(sql).toBe('SELECT name AS fullName FROM users');
    });

    test('throws when FROM is not set', () => {
      const select = new Select(mockAdapter);
      select.columns(['id']);
      expect(() => select.toString()).toThrow('FROM clause is required');
    });

    test('produces SELECT with WHERE clause', () => {
      const select = new Select(mockAdapter);
      const sql = select.from('users').where('id = ?', 1).toString();
      expect(sql).toBe('SELECT * FROM users WHERE id = $1');
      expect(select.parameters).toEqual([1]);
    });

    test('produces SELECT with multiple WHERE and OR', () => {
      const select = new Select(mockAdapter);
      const sql = select.from('users')
        .where('active = ?', true)
        .orWhere('role = ?', 'admin')
        .toString();
      expect(sql).toBe('SELECT * FROM users WHERE active = $1 OR role = $2');
    });

    test('produces SELECT with JOIN', () => {
      const select = new Select(mockAdapter);
      const sql = select
        .from('users', ['users.id', 'users.name'])
        .join('profiles', 'users.id = profiles.user_id', ['profiles.bio'])
        .toString();
      expect(sql).toBe('SELECT users.id, users.name, profiles.bio FROM users INNER JOIN profiles ON users.id = profiles.user_id');
    });

    test('produces SELECT with LEFT JOIN on aliased table', () => {
      const select = new Select(mockAdapter);
      const sql = select
        .from({ u: 'users' }, ['u.id'])
        .joinLeft({ p: 'profiles' }, 'u.id = p.user_id')
        .toString();
      expect(sql).toBe('SELECT u.id FROM users AS u LEFT JOIN profiles AS p ON u.id = p.user_id');
    });

    test('produces SELECT with GROUP BY and HAVING', () => {
      const select = new Select(mockAdapter);
      const sql = select
        .from('orders', ['customer_id', 'COUNT(*) AS order_count'])
        .group('customer_id')
        .having('COUNT(*) > ?', 3)
        .toString();
      expect(sql).toBe('SELECT customer_id, COUNT(*) AS order_count FROM orders GROUP BY customer_id HAVING COUNT(*) > $1');
    });

    test('produces SELECT with ORDER BY, LIMIT, OFFSET', () => {
      const select = new Select(mockAdapter);
      const sql = select
        .from('users')
        .order('name', 'ASC')
        .limit(10)
        .offset(20)
        .toString();
      expect(sql).toBe('SELECT * FROM users ORDER BY name ASC LIMIT 10 OFFSET 20');
    });

    test('produces full complex query', () => {
      const select = new Select(mockAdapter);
      const sql = select
        .from({ u: 'users' }, ['u.id', 'u.name'])
        .joinLeft({ p: 'profiles' }, 'u.id = p.user_id', ['p.bio'])
        .where('u.active = ?', true)
        .where('u.role = ?', 'editor')
        .group('u.id')
        .group(['u.name', 'p.bio'])
        .having('COUNT(*) > ?', 1)
        .order('u.name', 'ASC')
        .limit(25)
        .offset(50)
        .toString();

      expect(sql).toContain('SELECT u.id, u.name, p.bio');
      expect(sql).toContain('FROM users AS u');
      expect(sql).toContain('LEFT JOIN profiles AS p ON u.id = p.user_id');
      expect(sql).toContain('WHERE u.active = $1 AND u.role = $2');
      expect(sql).toContain('GROUP BY u.id, u.name, p.bio');
      expect(sql).toContain('HAVING COUNT(*) > $3');
      expect(sql).toContain('ORDER BY u.name ASC');
      expect(sql).toContain('LIMIT 25');
      expect(sql).toContain('OFFSET 50');
    });
  });

  describe('getParameters()', () => {
    test('returns bound parameters', () => {
      const select = new Select(mockAdapter);
      select.from('users').where('id = ?', 42).where('name = ?', 'alice');
      expect(select.getParameters()).toEqual([42, 'alice']);
    });
  });

  describe('execute()', () => {
    test('throws when no adapter is set', async () => {
      const select = new Select();
      select.from('users');
      await expect(select.execute()).rejects.toThrow('Database adapter not set');
    });

    test('calls adapter.query with SQL and parameters', async () => {
      mockAdapter.query.mockResolvedValue({ rows: [{ id: 1 }], rowCount: 1 });
      const select = new Select(mockAdapter);
      const rows = await select.from('users').where('id = ?', 1).execute();
      expect(mockAdapter.query).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE id = $1',
        [1]
      );
      expect(rows).toEqual([{ id: 1 }]);
    });

    test('handles legacy array result from adapter', async () => {
      mockAdapter.query.mockResolvedValue([{ id: 1 }, { id: 2 }]);
      const select = new Select(mockAdapter);
      const rows = await select.from('users').execute();
      expect(rows).toEqual([{ id: 1 }, { id: 2 }]);
    });

    test('handles null result from adapter', async () => {
      mockAdapter.query.mockResolvedValue(null);
      const select = new Select(mockAdapter);
      const rows = await select.from('users').execute();
      expect(rows).toEqual([]);
    });
  });

  describe('executeRaw()', () => {
    test('throws when no adapter is set', async () => {
      const select = new Select();
      select.from('users');
      await expect(select.executeRaw()).rejects.toThrow('Database adapter not set');
    });

    test('returns normalized result object', async () => {
      mockAdapter.query.mockResolvedValue({ rows: [{ id: 1 }], rowCount: 1 });
      const select = new Select(mockAdapter);
      const result = await select.from('users').executeRaw();
      expect(result).toEqual({ rows: [{ id: 1 }], rowCount: 1, insertedId: null });
    });
  });

  describe('reset()', () => {
    test('resets query to initial state', () => {
      const select = new Select(mockAdapter);
      select.from('users').where('id = ?', 1).order('name').limit(10);
      select.reset();
      expect(select.query.from).toBeNull();
      expect(select.query.where).toEqual([]);
      expect(select.query.orderBy).toEqual([]);
      expect(select.query.limit).toBeNull();
      expect(select.parameters).toEqual([]);
      expect(select.parameterIndex).toBe(0);
    });

    test('returns fluent interface', () => {
      const select = new Select(mockAdapter);
      expect(select.reset()).toBe(select);
    });
  });

  describe('clone()', () => {
    test('creates independent copy', () => {
      const select = new Select(mockAdapter);
      select.from('users').where('id = ?', 1);
      const cloned = select.clone();

      // Same state
      expect(cloned.toString()).toBe(select.toString());
      expect(cloned.getParameters()).toEqual(select.getParameters());

      // Independent
      cloned.where('active = ?', true);
      expect(cloned.getParameters().length).toBe(2);
      expect(select.getParameters().length).toBe(1);
    });
  });

  describe('union()', () => {
    test('produces UNION with raw SQL string', () => {
      const select = new Select(mockAdapter);
      const sql = select
        .from('users', ['id', 'name'])
        .union('SELECT id, name FROM admins')
        .toString();
      expect(sql).toContain('UNION');
      expect(sql).toContain('SELECT id, name FROM admins');
    });

    test('throws for invalid argument', () => {
      const select = new Select(mockAdapter);
      select.from('users');
      expect(() => select.union(123)).toThrow(TypeError);
    });
  });

  describe('_normalizeColumns()', () => {
    test('handles string input', () => {
      const select = new Select(mockAdapter);
      expect(select._normalizeColumns('id')).toEqual(['id']);
    });

    test('handles array input', () => {
      const select = new Select(mockAdapter);
      expect(select._normalizeColumns(['id', 'name'])).toEqual(['id', 'name']);
    });

    test('handles object alias input', () => {
      const select = new Select(mockAdapter);
      const result = select._normalizeColumns({ alias: 'column_name' });
      expect(result).toEqual(['column_name AS alias']);
    });

    test('handles non-string/array/object returns ["*"]', () => {
      const select = new Select(mockAdapter);
      expect(select._normalizeColumns(123)).toEqual(['*']);
    });
  });
});
