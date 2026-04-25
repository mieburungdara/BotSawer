const db = require('../src/services/database');

async function migrate() {
  console.log('Creating payment_methods table...');
  try {
    const hasTable = await db.schema.hasTable('payment_methods');
    if (!hasTable) {
      await db.schema.createTable('payment_methods', (table) => {
        table.increments('id').primary();
        table.string('code', 50).unique().notNullable();
        table.string('name', 100).notNullable();
        table.integer('admin_fee').defaultTo(5000);
        table.decimal('commission_rate', 5, 4).defaultTo(0.025); // 2.5%
        table.boolean('is_active').defaultTo(true);
        table.timestamps(true, true);
      });
      
      // Insert default data
      await db('payment_methods').insert([
        { code: 'DANA', name: 'DANA', admin_fee: 2500, commission_rate: 0.02 },
        { code: 'OVO', name: 'OVO', admin_fee: 5000, commission_rate: 0.025 },
        { code: 'GOPAY', name: 'GoPay', admin_fee: 3000, commission_rate: 0.025 },
        { code: 'SHOPEEPAY', name: 'ShopeePay', admin_fee: 4000, commission_rate: 0.025 }
      ]);
      
      console.log('Table payment_methods created and populated.');
    } else {
      console.log('Table already exists.');
    }
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
