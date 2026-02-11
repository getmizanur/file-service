/**
 * Verification Script: Check posts.presentation_style_id Usage
 *
 * This script queries the database to determine if any posts are using
 * the presentation_style_id field. This data is critical for deciding
 * whether the field can be safely removed.
 */

const path = require('path');

// Setup global application path helper
global.applicationPath = function(relativePath) {
  return path.join(__dirname, relativePath);
};

const config = require('./application/config/application.config.js');
const PostgreSQLAdapter = require('./library/db/adapter/postgre-sql-adapter');

async function checkPostsPresentationStyleId() {
  const db = new PostgreSQLAdapter(config.database.connection);

  try {
    await db.connect();
    console.log('Connected to database...\n');

    const query = `
      SELECT
        COUNT(*) FILTER (WHERE presentation_style_id IS NOT NULL) as posts_with_style,
        COUNT(*) as total_posts,
        array_agg(DISTINCT presentation_style_id) FILTER (WHERE presentation_style_id IS NOT NULL) as styles_used
      FROM posts;
    `;

    const result = await db.query(query);
    const data = result[0];

    console.log('=== Posts presentation_style_id Usage Analysis ===\n');
    console.log('Total posts:', data.total_posts);
    console.log('Posts with presentation_style_id set:', data.posts_with_style);
    console.log('Style IDs used:', data.styles_used);
    console.log('\n=== Conclusion ===\n');

    if (parseInt(data.posts_with_style) === 0) {
      console.log('✅ ZERO posts have presentation_style_id set');
      console.log('   The field exists but has NEVER been used in production.');
      console.log('   This confirms it is an incomplete/unused feature.');
      console.log('\n   Safe to remove IF:');
      console.log('   1. PostEntity getter/setter methods are removed');
      console.log('   2. PostRevisionEntity getter/setter methods are removed');
      console.log('   3. Admin controllers stop copying the field');
      console.log('   4. Database column is dropped via migration');
    } else {
      console.log('⚠️  WARNING: ' + data.posts_with_style + ' posts have presentation_style_id set!');
      console.log('   These posts may be relying on this field.');
      console.log('   Investigation required:');
      console.log('   1. Which posts are using it?');
      console.log('   2. Why were they assigned a presentation_style_id?');
      console.log('   3. Would removing it break anything?');

      // If posts are using it, show which ones
      const detailQuery = `
        SELECT id, title, slug, presentation_style_id, author_id, category_id
        FROM posts
        WHERE presentation_style_id IS NOT NULL
        ORDER BY created_at DESC;
      `;
      const detailResult = await db.query(detailQuery);
      console.log('\n   Posts using presentation_style_id:');
      detailResult.forEach(post => {
        console.log(`   - Post #${post.id}: "${post.title}" (style: ${post.presentation_style_id})`);
      });
    }

    await db.disconnect();
    console.log('\nDatabase connection closed.');

  } catch (error) {
    console.error('Error:', error);
    await db.disconnect();
    process.exit(1);
  }
}

checkPostsPresentationStyleId();
