# Desktop SQLite storage

This implementation is confined to `apps/desktop`. Mobile, the SvelteKit frontend,
the extension, and shared Dexie storage keep their existing implementations.

## Development and packaging

Use Bun from the repository root:

```sh
bun install
bun --filter @raalhu/desktop build
bun --filter @raalhu/desktop test:storage
bun --filter @raalhu/desktop test:storage-ui
bun --filter @raalhu/desktop package
```

Desktop build/dev scripts rebuild `better-sqlite3` for the installed Electron
runtime. The rebuild helper resolves Bun's hoisted native module rather than
assuming a desktop-local node_modules directory. Packaged builds include the
native binding outside ASAR. Update the `build.electronVersion` setting alongside
any Electron upgrade. The current binding is pinned for Electron 33.4.11.

The renderer's dependencies are build-time dependencies: electron-vite bundles
them. Only `better-sqlite3` is an external production dependency. This also avoids
electron-builder trying to package workspace source symlinks outside the app.

## Data location and ownership

The main process owns a single database worker. The renderer can call only the
typed operations exposed by preload; caller frame and origin are validated.

The database is `app.getPath('userData')/desktop-data/raalhu.sqlite`. Development
uses `desktop-data-dev` instead. Do not derive this path from the installation
directory or change the Chromium user-data path during migration.

Storage remains local to the desktop OS/app profile, as before. This release does
not assign existing unowned history to a Google account, add account isolation,
encryption, or cloud sync. Those require a separate ownership/migration policy.

## Schema and persistence

Schema version 1 uses sessions, per-message JSON rows, projects, binary project
and sandbox files, and an artifact index. Session lists read metadata only.
Foreign keys, transactions, WAL, and FULL synchronous commits are enabled.
Unknown newer schema versions fail without overwriting the database.

User messages are committed before generation starts. Assistant messages are
checkpointed every 500 ms with ordered revisions; unchanged rows are not rewritten.
The most recent uncheckpointed streaming output can still be lost on a crash.
Normal window close/quit asks the renderer to stop generation and flush messages
and sandbox files, then drains and closes the worker. A save failure prevents
normal closure and displays an error. Tool-created files are saved before tool
results are published. This stores sandbox files, not live Python variables.

Project uploads are copied as BLOBs using the native Chromium file input.
Changing the original file does not change its stored copy. Artifact blob URLs
are recreated from saved files when opening a conversation.

## First launch and migration

Before mounting the app, a renderer-only importer opens the existing `mogger-db`
without upgrading it and reads projects and sessions in batches. Each record is
imported transactionally, with an import hash and a retained serialized record.
Retries replace only incomplete-import records. Counts and database integrity are
checked before the completion marker enables normal use. The completion marker
prevents cleared conversations from being imported again.

Original IDs, timestamps, archives, project associations, full message/tool data,
provider contents, and filesystem snapshots are retained. Legacy `steps` messages
are adapted into UI `parts` while preserving the legacy fields. Unreadable project
file handles retain metadata with a missing-file indicator and a first-run report.
Malformed conversation records stop migration; they are not silently dropped.

The original IndexedDB database is retained as a pre-migration backup and is no
longer used for normal desktop reads/writes. It is scoped to its original Chromium
origin; development and installed app histories may have different origins.
Do not downgrade and write into that backup after migration: it will diverge from
SQLite and will not be automatically merged.

## Backup and deletion

Settings offers **Save conversation backup**, using SQLite's online backup API.
The resulting SQLite file includes projects and stored files. It can be restored
manually with the app fully closed: retain the current data directory as a backup,
then place the exported file in a fresh `desktop-data` directory as `raalhu.sqlite`.
Never combine a restored database with WAL/SHM files from another database.
There is no in-app restore workflow yet.

Clear chats deletes SQLite sessions, messages, generated files, artifacts, and
retained session import records; projects remain. The original IndexedDB backup
and user-exported backups are retained, so this is not secure erasure of historical
copies. Clearing the SQLite store does not cause reimport on restart.

## Verification

`test:storage` runs the real native driver under Electron's Node runtime. It covers
resumable imports, malformed records, IndexedDB batching, source preservation,
legacy/current tool formats, message ordering and revisions, file rollback,
project deletion, clear-chat behavior, online backups, and recovery after abruptly
terminating the built storage worker. Build before running it.

`test:storage-ui` opens a hidden production renderer with a temporary profile and
network requests blocked. It verifies startup migration, preload IPC, SQLite
reads/writes, and the renderer shutdown handshake. It does not start a dev server.

Installer signing and platform-specific distribution remain release checks;
the tests do not substitute for Windows/Linux installer testing.
