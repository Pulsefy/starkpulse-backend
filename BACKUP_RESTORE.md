# Backup Restoration Procedures

This guide explains how to restore database and configuration backups created by the automated backup system.

## Prerequisites
- Access to the backup `.enc` files (encrypted and compressed)
- The AES-256 encryption key used for backup (see your config)
- `openssl`, `gunzip`, and `psql` (for database restore)

## 1. Locate the Backup File
Find the desired backup file in your backup directory (e.g., `backups/db-backup-YYYY-MM-DDTHH-MM-SS.sql.gz.enc`).

## 2. Decrypt the Backup
Replace `<ENCRYPTION_KEY>` and `<BACKUP_FILE>` with your values:

```
openssl enc -d -aes-256-cbc -K $(echo -n '<ENCRYPTION_KEY>' | xxd -p) -iv 00000000000000000000000000000000 -in <BACKUP_FILE> -out decrypted.gz
```

## 3. Decompress the Backup
```
gunzip decrypted.gz
```
This will produce a `.sql` file (for database) or `.ts` file (for config).

## 4. Restore the Database
```
psql <DATABASE_URL> < decrypted.sql
```
Replace `<DATABASE_URL>` with your PostgreSQL connection string.

## 5. Restore the Configuration
Replace your config file with the decompressed `.ts` file as needed.

## Notes
- Always verify the integrity of the restored data.
- Never share your encryption key.
- For production, test the restore process regularly.
