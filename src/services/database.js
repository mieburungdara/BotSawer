const knex = require('knex');
require('dotenv').config();

const db = knex({
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    charset: 'utf8mb4'
  },
  pool: { min: 0, max: 10 }
});

// LEGACY COMPATIBILITY INTERCEPTOR
// This proxy intercepts calls to 'media_files' and automatically joins 'contents' 
// if columns like 'user_id', 'caption', or 'status' are requested.
const originalFrom = db.from;
db.from = function(tableName) {
  const queryBuilder = originalFrom.apply(this, arguments);
  if (tableName === 'media_files') {
    const originalSelect = queryBuilder.select;
    queryBuilder.select = function() {
      const args = Array.from(arguments);
      if (args.includes('user_id') || args.includes('caption') || args.includes('status') || args.includes('*')) {
        this.join('contents', 'media_files.content_id', '=', 'contents.id')
            .select('media_files.*', 'contents.user_id', 'contents.caption', 'contents.status', 'contents.created_at as posted_at');
        return this;
      }
      return originalSelect.apply(this, arguments);
    };
  }
  return queryBuilder;
};

module.exports = db;
