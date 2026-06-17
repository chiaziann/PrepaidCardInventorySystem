# Sistem Inventori Kad Prabayar Telekom

**Bahasa:** [English](README.md) · [华语](README.zh.md) · [Bahasa Malaysia](README.ms.md)

Aplikasi web inventori yang dihoskan secara tempatan untuk mengurus stok kad prabayar Malaysia — pembelian, jualan, dan tahap inventori.

## Ciri-ciri

- Gambaran keseluruhan inventori (stok rendah diserlahkan merah)
- CRUD inventori penuh (cipta, baca, kemas kini, padam)
- Stok masuk / stok keluar
- Sejarah transaksi
- Tambah produk baharu

## Keperluan

- [Node.js LTS](https://nodejs.org/) (termasuk npm)

## Cara Bermula

Buka terminal dalam folder projek dan jalankan:

```bash
npm start
```

Atau di Windows, klik dua kali `start.bat`.

Buka pelayar di: http://localhost:3000

## Sandaran Data

Fail pangkalan data terletak di `db/inventory.db`.

- Sandaran manual: salin `db/inventory.db` ke pemacu USB atau storan awan
- Atau klik dua kali `backup.bat` untuk menyimpan sandaran dalam folder `backups/`

Sandaran mingguan disyorkan.

## Struktur Projek

```
telecom-inventory-system/
├── server.js          # Backend Express
├── db/
│   ├── database.js    # Logik pangkalan data
│   └── inventory.db   # Fail data SQLite (dicipta pada jalan pertama)
├── public/            # Halaman frontend
├── start.bat          # Mulakan dengan satu klik
└── backup.bat         # Sandaran dengan satu klik
```

## Tips Penggunaan Harian

1. Jalankan `start.bat` selepas menghidupkan komputer
2. Tandakan http://localhost:3000 dalam pelayar anda
3. Jalankan `backup.bat` secara berkala untuk menyandarkan data
