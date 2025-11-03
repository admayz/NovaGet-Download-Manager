/**
 * Database migration system
 */

import Database from 'better-sqlite3';
import { SCHEMA_VERSION, INITIAL_SCHEMA, MIGRATIONS } from './schema';

export class MigrationManager {
  constructor(private db: Database.Database) {}

  /**
   * Initialize database with schema
   */
  initialize(): void {
    // Enable foreign keys
    this.db.pragma('foreign_keys = ON');

    // Create initial schema
    this.db.exec(INITIAL_SCHEMA);

    // Check current version
    const currentVersion = this.getCurrentVersion();

    if (currentVersion === 0) {
      // First time setup
      this.setVersion(SCHEMA_VERSION);
    } else if (currentVersion < SCHEMA_VERSION) {
      // Run migrations
      this.runMigrations(currentVersion, SCHEMA_VERSION);
    }
  }

  /**
   * Get current schema version
   */
  private getCurrentVersion(): number {
    try {
      const result = this.db
        .prepare('SELECT MAX(version) as version FROM schema_version')
        .get() as { version: number | null };
      return result.version || 0;
    } catch (error) {
      // Table doesn't exist yet
      return 0;
    }
  }

  /**
   * Set schema version
   */
  private setVersion(version: number): void {
    const now = Date.now();
    this.db
      .prepare('INSERT INTO schema_version (version, applied_at) VALUES (?, ?)')
      .run(version, now);
  }

  /**
   * Run migrations from current version to target version
   */
  private runMigrations(fromVersion: number, toVersion: number): void {
    console.log(`Running migrations from version ${fromVersion} to ${toVersion}`);

    for (let version = fromVersion + 1; version <= toVersion; version++) {
      const migration = MIGRATIONS[version];
      if (migration) {
        console.log(`Applying migration ${version}`);
        this.db.exec(migration);
        this.setVersion(version);
      }
    }
  }

  /**
   * Reset database (for development/testing)
   */
  reset(): void {
    const tables = ['downloads', 'segments', 'settings', 'speed_history', 'schema_version'];
    
    for (const table of tables) {
      this.db.exec(`DROP TABLE IF EXISTS ${table}`);
    }

    this.initialize();
  }
}
