# MedStock TH

MedStock TH is an offline Windows desktop application for medicine and medical supply stock management in hospitals, clinics, and small healthcare units. It is built with Wails v2, Go, SQLite, React, and TypeScript.

The app stores data locally on each Windows machine and does not require a database server.

## Current Version

**v1.0.1**

Installer:

```text
build/bin/medstock-amd64-installer.exe
```

Database location:

```text
%AppData%\MedStock\medstock.db
```

## What's New in v1.0.1

### User Roles and Permissions

- Added user roles: `admin`, `staff`, and `viewer`
- `admin` can manage users and master data
- `staff` can receive, issue, and adjust stock
- `viewer` can view data only
- Added role display in the app layout
- Restricted buttons and pages based on user permissions

### User Management

- Added edit username and display name
- Added activate button for inactive users
- Admin users can reset passwords and manage users

### Backup and Restore

- Added database backup from the Reports page
- Users can choose where to save the backup file
- Backup creates a full SQLite database snapshot, including:
  - products and master data
  - stock lots
  - stock movements
  - receive documents
  - issue documents
  - adjustments
  - users, roles, and audit/history data
- Added restore from `.db` backup file
- Before restore, the app automatically backs up the current database
- Before database migration/version upgrade, the app automatically creates a backup in:

```text
%AppData%\MedStock\backups
```

## Main Features

- Dashboard for stock status, low stock, near-expiry items, and recent activity
- Product and medicine master data
- Stock In documents for receiving inventory
- Stock Out documents for issuing inventory
- FEFO lot selection for stock issue
- Stock adjustment
- Stock card and movement history
- Excel import for product/master data and opening stock
- Excel export for reports
- User login with password confirmation for important transactions
- Local SQLite database with automatic migrations
- Full database backup and restore

## Tech Stack

| Layer | Technology |
| --- | --- |
| Desktop framework | Wails v2 |
| Backend | Go |
| Database | SQLite via `modernc.org/sqlite` |
| Frontend | React 18, TypeScript, Vite |
| Styling | Tailwind CSS |
| Charts | Recharts |
| Excel | excelize/v2 |
| Password hashing | bcrypt |
| Installer | NSIS |

## Project Structure

```text
medstock-app/
├── app.go
├── main.go
├── wails.json
├── db/
│   ├── db.go
│   └── migrations/
├── handlers/
├── models/
├── services/
├── build/
│   ├── appicon.png
│   └── windows/
└── frontend/
    ├── src/
    ├── package.json
    └── package-lock.json
```

## Development

### Prerequisites

- Go 1.21+
- Node.js 18+
- Wails CLI v2
- Windows with WebView2 Runtime
- NSIS, required only when building the installer

Install Wails CLI:

```bash
go install github.com/wailsapp/wails/v2/cmd/wails@latest
```

Run development mode:

```bash
wails dev
```

Build production executable:

```bash
wails build
```

Build production executable and NSIS installer:

```bash
wails build -nsis
```

Output files:

```text
build/bin/medstock-app.exe
build/bin/medstock-amd64-installer.exe
```

## Database and Upgrade Safety

- The application database is stored in `%AppData%\MedStock\medstock.db`
- Database migrations run automatically when the app starts
- Before running pending migrations on an existing database, the app creates an automatic backup
- Manual backup and restore are available from the Reports page
- The database is intentionally stored in AppData, not Program Files, because Windows normally protects Program Files from normal user writes

## Default Login

| Account | Username | Initial Password | Permission |
| --- | --- | --- | --- |
| System admin | `sysadmin` | `MedS@2568#Rx!` | Full admin access |
| Staff | Created by admin | Created by admin | Stock operation access |
| Viewer | Created by admin | Created by admin | View only |

Change the `sysadmin` password after the first deployment.

## Release Checklist

1. Update version text in the app
2. Update `frontend/package.json`
3. Add migration file if the database schema changes
4. Run tests and production build
5. Build installer with `wails build -nsis`
6. Create Git tag, for example `v1.0.1`
7. Upload `medstock-amd64-installer.exe` to GitHub Release
8. Add release notes

## License

[AGPL-3.0](LICENSE)

For commercial licensing or support, contact:

```text
kittanai.ka@gmail.com
```
