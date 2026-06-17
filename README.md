# Telecom Prepaid Card Inventory System

**Language:** [English](README.md) · [华语](README.zh.md) · [Bahasa Malaysia](README.ms.md)

A locally hosted inventory management web app for tracking Malaysian prepaid reload card stock — purchases, sales, and inventory levels.

## Features

- Inventory overview (low stock highlighted in red)
- Full inventory CRUD (create, read, update, delete)
- Stock in / stock out
- Transaction history
- Add new products

## Requirements

- [Node.js LTS](https://nodejs.org/) (includes npm)

## Getting Started

Open a terminal in the project directory and run:

```bash
npm start
```

Or on Windows, double-click `start.bat`.

Open your browser at: http://localhost:3000

## Data Backup

The database file is located at `db/inventory.db`.

- Manual backup: copy `db/inventory.db` to a USB drive or cloud storage
- Or double-click `backup.bat` to save a backup in the `backups/` folder

Weekly backups are recommended.

## Project Structure

```
telecom-inventory-system/
├── server.js          # Express backend
├── db/
│   ├── database.js    # Database logic
│   └── inventory.db   # SQLite data file (created on first run)
├── public/            # Frontend pages
├── start.bat          # One-click start
└── backup.bat         # One-click backup
```

## Daily Usage Tips

1. Run `start.bat` after booting your computer
2. Bookmark http://localhost:3000 in your browser
3. Run `backup.bat` regularly to back up your data
