import * as SQLite from 'expo-sqlite';

let _db: SQLite.SQLiteDatabase | null = null;

export function getDb(): SQLite.SQLiteDatabase {
	if (!_db) {
		_db = SQLite.openDatabaseSync('raalhu.db');
		_db.execSync(`
			CREATE TABLE IF NOT EXISTS sessions (
				id TEXT PRIMARY KEY,
				title TEXT NOT NULL DEFAULT '',
				modeId TEXT NOT NULL DEFAULT 'agent',
				model TEXT NOT NULL DEFAULT '',
				messages TEXT NOT NULL DEFAULT '[]',
				archived INTEGER NOT NULL DEFAULT 0,
				createdAt INTEGER NOT NULL,
				updatedAt INTEGER NOT NULL,
				agentMessages TEXT,
				agentContents TEXT,
				projectId TEXT
			);
			CREATE INDEX IF NOT EXISTS idx_sessions_archived_updated ON sessions (archived, updatedAt);
		`);
	}
	return _db;
}
