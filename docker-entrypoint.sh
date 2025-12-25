#!/bin/sh
set -e

echo "🚀 Starting Report Request System..."

# Wait for database to be ready
echo "⏳ Waiting for database connection..."
MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if node -e "
        const mysql = require('mysql2/promise');
        (async () => {
            try {
                const url = new URL(process.env.DATABASE_URL || '');
                const connection = await mysql.createConnection({
                    host: url.hostname,
                    port: parseInt(url.port) || 3306,
                    user: url.username,
                    password: url.password,
                    database: url.pathname.slice(1)
                });
                await connection.ping();
                await connection.end();
                process.exit(0);
            } catch (e) {
                process.exit(1);
            }
        })();
    " 2>/dev/null; then
        echo "✅ Database is ready!"
        break
    fi
    
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo "   Attempt $RETRY_COUNT/$MAX_RETRIES - Database not ready, waiting..."
    sleep 2
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo "❌ Could not connect to database after $MAX_RETRIES attempts"
    echo "   Starting anyway..."
fi

# Run database migrations/push
echo "📦 Running database migrations..."
npx drizzle-kit push --config=drizzle.app.config.ts 2>/dev/null || echo "   Migration skipped or already up to date"

# Seed admin user if not exists
echo "👤 Checking admin user..."
node -e "
const mysql = require('mysql2/promise');
const crypto = require('crypto');

(async () => {
    try {
        const url = new URL(process.env.DATABASE_URL || '');
        const connection = await mysql.createConnection({
            host: url.hostname,
            port: parseInt(url.port) || 3306,
            user: url.username,
            password: url.password,
            database: url.pathname.slice(1)
        });
        
        // Check if admin exists
        const adminUsername = process.env.ADMIN_USERNAME || 'appadmin';
        const [rows] = await connection.execute(
            'SELECT id FROM local_users WHERE external_username = ? LIMIT 1',
            [adminUsername]
        );
        
        if (rows.length === 0) {
            // Create admin user
            const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@11241';
            const passwordHash = crypto.createHash('md5').update(adminPassword).digest('hex');
            
            await connection.execute(
                'INSERT INTO local_users (external_username, name, department, password_hash, role) VALUES (?, ?, ?, ?, ?)',
                [adminUsername, 'Application Administrator', 'IT', passwordHash, 'ADMIN']
            );
            console.log('✅ Admin user created!');
            console.log('   Username: ' + adminUsername);
            console.log('   Password: ' + adminPassword);
        } else {
            console.log('✅ Admin user already exists');
        }
        
        await connection.end();
    } catch (e) {
        console.log('   Admin check skipped: ' + e.message);
    }
})();
"

echo ""
echo "🎉 Initialization complete! Starting application..."
echo ""

# Start the application
exec node server.js
