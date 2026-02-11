/**
 * Verification Script: Compare Post Styles vs Category Styles
 *
 * This script checks if posts with presentation_style_id set have DIFFERENT
 * styles from their categories. This tells us if posts are intentionally
 * overriding category styles or just happen to match.
 */

const path = require('path');

// Setup global application path helper
global.applicationPath = function(relativePath) {
  return path.join(__dirname, relativePath);
};

const config = require('./application/config/application.config.js');
const PostgreSQLAdapter = require('./library/db/adapter/postgre-sql-adapter');

async function comparePostAndCategoryStyles() {
  const db = new PostgreSQLAdapter(config.database.connection);

  try {
    await db.connect();
    console.log('Connected to database...\n');

    // Query to compare post styles with their category's styles
    const query = `
      SELECT
        p.id,
        p.title,
        p.presentation_style_id as post_style_id,
        ps.name as post_style_name,
        eps.style_id as category_style_id,
        cs.name as category_style_name,
        c.name as category_name,
        CASE
          WHEN p.presentation_style_id = eps.style_id THEN 'MATCH'
          WHEN p.presentation_style_id != eps.style_id THEN 'DIFFERENT'
          WHEN eps.style_id IS NULL THEN 'NO_CATEGORY_STYLE'
          ELSE 'UNKNOWN'
        END as comparison
      FROM posts p
      LEFT JOIN presentation_styles ps ON p.presentation_style_id = ps.id
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN entity_presentation_styles eps ON
        eps.entity_type = 'categories' AND
        eps.entity_id = p.category_id AND
        eps.is_default = true
      LEFT JOIN presentation_styles cs ON eps.style_id = cs.id
      WHERE p.presentation_style_id IS NOT NULL
      ORDER BY comparison, p.id;
    `;

    const result = await db.query(query);

    // Analyze results
    const matches = result.filter(r => r.comparison === 'MATCH');
    const different = result.filter(r => r.comparison === 'DIFFERENT');
    const noCategoryStyle = result.filter(r => r.comparison === 'NO_CATEGORY_STYLE');

    console.log('=== Post Styles vs Category Styles Comparison ===\n');
    console.log('Total posts with presentation_style_id:', result.length);
    console.log('Posts with SAME style as category:', matches.length);
    console.log('Posts with DIFFERENT style from category:', different.length);
    console.log('Posts where category has no style:', noCategoryStyle.length);

    console.log('\n=== Analysis ===\n');

    if (different.length > 0) {
      console.log('🚨 CRITICAL: ' + different.length + ' posts are INTENTIONALLY using different styles!');
      console.log('   These posts would LOSE their intended styling if the field is removed.\n');
      console.log('   Posts with different styles:');
      different.forEach(post => {
        console.log(`   - Post #${post.id}: "${post.title}"`);
        console.log(`     Category: ${post.category_name} (style: ${post.category_style_name || 'none'})`);
        console.log(`     Post override: ${post.post_style_name}`);
        console.log('');
      });
    }

    if (matches.length > 0) {
      console.log('ℹ️  ' + matches.length + ' posts have the SAME style as their category.');
      console.log('   These could potentially be cleared without data loss.\n');
      console.log('   Posts matching category style:');
      matches.forEach(post => {
        console.log(`   - Post #${post.id}: "${post.title}" (${post.post_style_name})`);
      });
      console.log('');
    }

    if (noCategoryStyle.length > 0) {
      console.log('⚠️  ' + noCategoryStyle.length + ' posts have styles but their category has no default style!');
      console.log('   These posts RELY on presentation_style_id.\n');
      noCategoryStyle.forEach(post => {
        console.log(`   - Post #${post.id}: "${post.title}" (${post.post_style_name})`);
      });
      console.log('');
    }

    console.log('=== Recommendation ===\n');
    if (different.length > 0 || noCategoryStyle.length > 0) {
      console.log('❌ DO NOT REMOVE posts.presentation_style_id');
      console.log('   ' + (different.length + noCategoryStyle.length) + ' posts would lose their styling.');
      console.log('\n   Instead, COMPLETE THE FEATURE by updating queries to:');
      console.log('   1. Check post.presentation_style_id first');
      console.log('   2. Fallback to category style if post style is null');
      console.log('   3. This honors the existing data');
    } else {
      console.log('✅ All posts match their category styles');
      console.log('   Could safely clear presentation_style_id values');
      console.log('   But still need to update entity/controller code');
    }

    await db.disconnect();
    console.log('\nDatabase connection closed.');

  } catch (error) {
    console.error('Error:', error);
    await db.disconnect();
    process.exit(1);
  }
}

comparePostAndCategoryStyles();
