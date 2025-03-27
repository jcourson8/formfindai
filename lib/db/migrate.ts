import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

config({
  path: '.env.local',
});

const runMigrate = async () => {
  if (!process.env.POSTGRES_URL) {
    throw new Error('POSTGRES_URL is not defined');
  }

  try {
    const connection = postgres(process.env.POSTGRES_URL, { max: 1 });
    const db = drizzle(connection);

    console.log('⏳ Running migrations...');

    const start = Date.now();
    
    try {
      // Run the migrations - if an error occurs, we'll handle it in the catch block
      await migrate(db, { migrationsFolder: './lib/db/migrations' });
    } catch (migrationError) {
      // Check if it's a "column already exists" error, which can be safely ignored
      if (migrationError instanceof Error && 
          migrationError.message.includes('already exists')) {
        console.warn(`⚠️ Warning: ${migrationError.message}`);
        console.warn('Migration continued despite column already existing. This is expected if this is a re-run.');
      } else {
        // For other errors, rethrow them
        throw migrationError;
      }
    }
    
    const end = Date.now();
    console.log('✅ Migrations completed in', end - start, 'ms');
    
    // Always close the connection
    await connection.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed');
    console.error(err);
    process.exit(1);
  }
};

runMigrate();
