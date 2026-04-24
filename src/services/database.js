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
const originalFrom = db.from;
db.from = function(tableName) {
  const queryBuilder = originalFrom.apply(this, arguments);
  
  if (tableName === 'media_files') {
    // 1. Intercept SELECT
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

    // 2. Intercept WHERE
    const originalWhere = queryBuilder.where;
    queryBuilder.where = function(column, operator, value) {
        // If where('user_id', ...) or where({user_id: ...})
        const isLegacy = (typeof column === 'string' && (column === 'user_id' || column === 'caption')) || 
                         (typeof column === 'object' && (column.user_id || column.caption));
        
        if (isLegacy) {
            this.join('contents', 'media_files.content_id', '=', 'contents.id');
            // Re-route the column name if it's an object
            if (typeof column === 'object') {
                const newObj = {};
                if (column.user_id) newObj['contents.user_id'] = column.user_id;
                if (column.caption) newObj['contents.caption'] = column.caption;
                return originalWhere.call(this, newObj);
            }
            return originalWhere.call(this, `contents.${column}`, operator, value);
        }
        return originalWhere.apply(this, arguments);
    };
  }
  return queryBuilder;
};

module.exports = db;
