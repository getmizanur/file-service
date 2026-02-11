/**
 * Database Statement Examples
 * Demonstrates usage of Statement classes across different database adapters
 * Similar functionality to prepared statements in other frameworks
 */

/**
 * Basic Statement Usage Examples
 */
async function basicStatementExamples() {
    console.log('📋 Basic Statement Usage Examples\n');

    // PostgreSQL Statement Example
    const PostgreSQLAdapter = require('../adapter/postgreSQLAdapter');
    const pgAdapter = new PostgreSQLAdapter({
        host: 'localhost',
        database: 'test',
        username: 'user',
        password: 'pass'
    });

    try {
        await pgAdapter.connect();

        // Prepare and execute a SELECT statement
        const stmt = pgAdapter.prepare('SELECT id, name, email FROM users WHERE age > $1 AND active = $2');
        await stmt.prepare();

        // Bind parameters and execute
        const users = await stmt.execute([25, true]);
        console.log('PostgreSQL Users:', users);

        // Alternative: bind parameters individually
        const stmt2 = pgAdapter.prepare('SELECT * FROM posts WHERE user_id = $1');
        stmt2.bindParam(0, 123);
        const posts = await stmt2.execute();
        console.log('PostgreSQL Posts:', posts);

        await stmt.close();
        await stmt2.close();
        await pgAdapter.disconnect();

    } catch (error) {
        console.error('PostgreSQL Statement Error:', error.message);
    }
}

/**
 * Advanced Statement Features Examples
 */
async function advancedStatementExamples() {
    console.log('🚀 Advanced Statement Features Examples\n');

    // MySQL Statement with different fetch modes
    const MySQLAdapter = require('../adapter/mysqlAdapter');
    const mysqlAdapter = new MySQLAdapter({
        host: 'localhost',
        database: 'test',
        user: 'root',
        password: 'pass'
    });

    try {
        await mysqlAdapter.connect();

        // Prepare statement with named parameters
        const stmt = mysqlAdapter.prepare('SELECT id, name, email FROM users WHERE status = ? AND created_at > ?');

        // Set different fetch modes
        console.log('--- Object Fetch Mode (default) ---');
        stmt.setFetchMode('object');
        const objectRows = await stmt.execute(['active', '2023-01-01']);
        console.log('Object rows:', objectRows);

        console.log('\n--- Array Fetch Mode ---');
        stmt.setFetchMode('array');
        const arrayRows = await stmt.execute(['active', '2023-01-01']);
        console.log('Array rows:', arrayRows);

        console.log('\n--- Column Fetch Mode ---');
        stmt.setFetchMode('column');
        const columnRows = await stmt.execute(['active', '2023-01-01']);
        console.log('Column values:', columnRows);

        await stmt.close();
        await mysqlAdapter.disconnect();

    } catch (error) {
        console.error('MySQL Statement Error:', error.message);
    }
}

/**
 * Transaction-Safe Statement Examples
 */
async function transactionStatementExamples() {
    console.log('🔄 Transaction-Safe Statement Examples\n');

    // SQL Server Statement in transaction
    const SqlServerAdapter = require('../adapter/sqlServerAdapter');
    const sqlServerAdapter = new SqlServerAdapter({
        server: 'localhost',
        database: 'test',
        user: 'sa',
        password: 'pass'
    });

    try {
        await sqlServerAdapter.connect();

        // Transaction with prepared statements
        await sqlServerAdapter.transaction(async (transactionAdapter) => {
            
            // Insert statement
            const insertStmt = transactionAdapter.prepare(`
                INSERT INTO users (name, email, age) 
                OUTPUT INSERTED.id 
                VALUES (@param0, @param1, @param2)
            `);

            const insertResult = await insertStmt.execute(['John Doe', 'john@example.com', 30]);
            const userId = insertResult[0]?.id;
            console.log('Inserted User ID:', userId);

            // Update statement
            const updateStmt = transactionAdapter.prepare(`
                UPDATE users 
                SET last_login = @param0 
                WHERE id = @param1
            `);

            await updateStmt.execute([new Date(), userId]);
            console.log('Updated user login time');

            // Fetch statement
            const selectStmt = transactionAdapter.prepare('SELECT * FROM users WHERE id = @param0');
            const user = await selectStmt.fetchRow();
            console.log('Retrieved user:', user);

            await insertStmt.close();
            await updateStmt.close();
            await selectStmt.close();
        });

        await sqlServerAdapter.disconnect();

    } catch (error) {
        console.error('SQL Server Transaction Error:', error.message);
    }
}

/**
 * Cursor-Based Processing Examples
 */
async function cursorStatementExamples() {
    console.log('📊 Cursor-Based Processing Examples\n');

    // SQLite Statement with cursor processing
    const SQLiteAdapter = require('../adapter/sqliteAdapter');
    const sqliteAdapter = new SQLiteAdapter({
        database: './test.db'
    });

    try {
        await sqliteAdapter.connect();

        // Large result set processing
        const stmt = sqliteAdapter.prepare('SELECT id, name, email FROM users ORDER BY created_at');
        await stmt.execute();

        console.log('Processing results row by row...');
        let rowCount = 0;
        let row;
        
        // Process one row at a time (memory efficient)
        while ((row = await stmt.fetch()) !== null) {
            rowCount++;
            console.log(`Row ${rowCount}:`, row.name, row.email);
            
            // Break after 5 rows for example
            if (rowCount >= 5) break;
        }

        // Get remaining rows at once
        const remainingRows = await stmt.fetchAll();
        console.log(`Fetched ${remainingRows.length} remaining rows`);

        // Fetch single column values
        const nameStmt = sqliteAdapter.prepare('SELECT name FROM users LIMIT 3');
        await nameStmt.execute();
        
        console.log('\nFirst name column values:');
        let name;
        while ((name = await nameStmt.fetchColumn(0)) !== null) {
            console.log('Name:', name);
        }

        await stmt.close();
        await nameStmt.close();
        await sqliteAdapter.disconnect();

    } catch (error) {
        console.error('SQLite Cursor Error:', error.message);
    }
}

/**
 * Cross-Database Statement Compatibility
 */
async function crossDatabaseStatements() {
    console.log('🌐 Cross-Database Statement Compatibility\n');

    const adapters = [
        {
            name: 'PostgreSQL',
            adapter: new (require('../adapter/postgreSQLAdapter'))({
                host: 'localhost', database: 'test', username: 'user', password: 'pass'
            })
        },
        {
            name: 'MySQL',
            adapter: new (require('../adapter/mysqlAdapter'))({
                host: 'localhost', database: 'test', user: 'root', password: 'pass'
            })
        },
        {
            name: 'SQL Server',
            adapter: new (require('../adapter/sqlServerAdapter'))({
                server: 'localhost', database: 'test', user: 'sa', password: 'pass'
            })
        },
        {
            name: 'SQLite',
            adapter: new (require('../adapter/sqliteAdapter'))({
                database: ':memory:'
            })
        }
    ];

    for (const { name, adapter } of adapters) {
        try {
            console.log(`\n--- ${name} Statement Test ---`);

            // Same statement API across all databases
            const stmt = adapter.prepare('SELECT COUNT(*) as user_count FROM users WHERE active = ?');
            
            // Parameter binding works the same way
            stmt.bindParam(0, true);
            
            const result = await stmt.execute();
            console.log(`${name} active user count:`, result);

            // Fetch methods work consistently
            const countValue = await stmt.fetchColumn(0);
            console.log(`${name} count value:`, countValue);

            await stmt.close();

        } catch (error) {
            console.log(`${name} Error (expected for demo):`, error.message);
        }
    }
}

/**
 * Statement Performance and Resource Management
 */
async function statementPerformanceExamples() {
    console.log('⚡ Statement Performance Examples\n');

    const adapter = new (require('../adapter/postgreSQLAdapter'))({
        host: 'localhost', database: 'test', username: 'user', password: 'pass'
    });

    try {
        // Reusable prepared statements for better performance
        const userQuery = adapter.prepare('SELECT * FROM users WHERE id = $1');
        const updateQuery = adapter.prepare('UPDATE users SET last_seen = $1 WHERE id = $2');

        // Execute the same statement multiple times with different parameters
        const userIds = [1, 2, 3, 4, 5];
        
        console.log('Executing prepared statement multiple times...');
        for (const userId of userIds) {
            const user = await userQuery.execute([userId]);
            console.log(`User ${userId}:`, user[0]?.name || 'Not found');

            // Update last seen
            await updateQuery.execute([new Date(), userId]);
        }

        // Batch processing with statements
        console.log('\nBatch processing example...');
        const batchStmt = adapter.prepare('INSERT INTO activity_log (user_id, action, timestamp) VALUES ($1, $2, $3)');

        for (const userId of userIds) {
            await batchStmt.execute([userId, 'login', new Date()]);
        }

        console.log(`Logged ${userIds.length} activities`);

        // Cleanup
        await userQuery.close();
        await updateQuery.close();
        await batchStmt.close();

    } catch (error) {
        console.error('Performance Example Error:', error.message);
    }
}

/**
 * Error Handling and Recovery
 */
async function errorHandlingExamples() {
    console.log('🛡️ Error Handling Examples\n');

    const adapter = new (require('../adapter/mysqlAdapter'))({
        host: 'localhost', database: 'test', user: 'root', password: 'pass'
    });

    try {
        const stmt = adapter.prepare('SELECT * FROM non_existent_table');

        try {
            await stmt.execute();
        } catch (error) {
            console.log('Caught expected SQL error:', error.message);
            
            // Statement is still usable after error (depending on error type)
            const validStmt = adapter.prepare('SELECT 1 as test_value');
            const result = await validStmt.execute();
            console.log('Recovery successful:', result);
            await validStmt.close();
        }

        // Always close statements in finally block
        await stmt.close();

    } catch (error) {
        console.error('Connection error:', error.message);
    }
}

// Export examples for testing
module.exports = {
    basicStatementExamples,
    advancedStatementExamples,
    transactionStatementExamples,
    cursorStatementExamples,
    crossDatabaseStatements,
    statementPerformanceExamples,
    errorHandlingExamples
};

// Run examples if called directly
if (require.main === module) {
    (async () => {
        console.log('🔧 Database Statement System Examples\n');
        console.log('Testing statement functionality across different databases...\n');

        try {
            await basicStatementExamples();
            await advancedStatementExamples();
            await transactionStatementExamples();
            await cursorStatementExamples();
            await crossDatabaseStatements();
            await statementPerformanceExamples();
            await errorHandlingExamples();

            console.log('\n✅ All statement examples completed!');
        } catch (error) {
            console.error('\n❌ Example error:', error.message);
        }
    })();
}