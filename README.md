# TaskFlow - REST API Task Management System
**Tugas Akhir Learning Labs: Backend Development**  
**Nama Pengembang:** Faridh Adzan Al Arsy  
**NIM:** 21114012610046  
**Stack Teknologi:** Node.js, Express.js, TypeScript, PostgreSQL (Supabase), Vite, React, Vercel

---

## 1. Deskripsi Proyek

**TaskFlow** adalah layanan REST API backend relasional untuk manajemen tugas (task management) yang dirancang untuk membantu pengguna mengelola alur kerja tugas secara terstruktur. Sistem ini dibangun dengan arsitektur database relasional PostgreSQL (dihosting di **Supabase**) yang terdiri dari minimal 5 tabel saling berelasi, mendukung operasi **CRUD lengkap (GET, POST, PUT, PATCH, DELETE)**, pencatatan otomatis riwayat status (*audit log / task history*), filter berdasarkan kategori & prioritas, serta pencarian judul tugas.

Backend ini siap di-deploy secara serverless ke **Vercel** dengan konfigurasi zero-downtime, aman dari *hardcoded secrets* menggunakan Environment Variables, dan telah diuji secara komprehensif menggunakan **Thunder Client** dan **Postman**.

---

## 2. Skema Relasi Database (ERD - Entity Relationship Diagram)

Sistem database menggunakan **5 tabel relasional** dengan Foreign Key dan *constraints*:

```
+----------------+          +------------------+          +--------------------+
|   categories   |          |    priorities    |          |   task_statuses    |
+----------------+          +------------------+          +--------------------+
| PK category_id |          | PK  priority_id  |          | PK  status_id      |
|    category_nam|          |     priority_name|          |     status_name    |
|    description |          |     priority_levl|          +--------------------+
+-------+--------+          +--------+---------+                     |
        | 1                          | 1                             | 1
        |                            |                               |
        | N                          | N                             | N
+-------v----------------------------v-------------------------------v---------+
|                                  tasks                                       |
+------------------------------------------------------------------------------+
| PK task_id                                                                   |
| FK category_id  ----------------> categories(category_id)   ON DELETE SET NULL|
| FK priority_id  ----------------> priorities(priority_id)                     |
| FK status_id    ----------------> task_statuses(status_id)                   |
|    title                                                                     |
|    description                                                               |
|    due_date                                                                  |
|    created_at                                                                |
|    updated_at                                                                |
+---------------------------------------+--------------------------------------+
                                        | 1
                                        |
                                        | N (ON DELETE CASCADE)
                        +---------------v------------------+
                        |           task_history           |
                        +----------------------------------+
                        | PK history_id                    |
                        | FK task_id       -> tasks        |
                        | FK old_status_id -> task_statuses|
                        | FK new_status_id -> task_statuses|
                        |    changed_at                    |
                        |    notes                         |
                        +----------------------------------+
```

### Relasi & Kardinalitas Antar Tabel:
1. **`categories` ──< `tasks` (One-to-Many):**  
   Satu kategori dapat menampung banyak tugas. Jika kategori dihapus, kolom `category_id` pada tugas diset `NULL` (`ON DELETE SET NULL`).
2. **`priorities` ──< `tasks` (One-to-Many):**  
   Satu level prioritas (1–5: Rendah, Normal, Tinggi, Penting, Darurat) dapat dimiliki oleh banyak tugas.
3. **`task_statuses` ──< `tasks` (One-to-Many):**  
   Satu status pengerjaan (Belum Selesai, Sedang Dikerjakan, Selesai) dapat diaplikasikan ke banyak tugas.
4. **`tasks` ──< `task_history` (One-to-Many):**  
   Setiap perubahan status tugas akan otomatis membuat baris log baru di `task_history` yang merekam status lama, status baru, waktu perubahan, dan catatan. Jika tugas dihapus, seluruh riwayat tugas tersebut ikut terhapus otomatis (`ON DELETE CASCADE`).
5. **`task_statuses` ──< `task_history` (One-to-Many):**  
   Kolom `old_status_id` dan `new_status_id` merujuk ke tabel `task_statuses`.

---

## 3. Pemetaan Fungsi Tugas Akhir ke Endpoint REST API

Berdasarkan dokumen spesifikasi fungsi (`21114012610046_FaridhAdzanAlArsy_TaskManagement__2__9ef76f84.md`):

| No | Nama Function di Dokumen | Method | Endpoint URL | Deskripsi Kegunaan |
|:--:|:-------------------------|:------:|:-------------|:-------------------|
| 1 | `getDaftarTugas()` | **GET** | `/api/tasks` | Mengambil dan menampilkan seluruh daftar tugas dari database (beserta data relasi category, priority, status). |
| 2 | `tambahTugasBaru()` | **POST** | `/api/tasks` | Menambahkan tugas baru ke dalam database dan mencatat entri awal ke `task_history`. |
| 3 | `updateStatusTugas()` | **PATCH** | `/api/tasks/:id/status` | Mengubah status tugas (misal: "Belum Selesai" -> "Selesai") dan mencatat log perpindahan ke `task_history`. |
| 4 | `editDetailTugas()` | **PUT / PATCH** | `/api/tasks/:id` | Memperbarui informasi tugas seperti judul, deskripsi, tenggat waktu, atau prioritas. |
| 5 | `hapusTugas()` | **DELETE** | `/api/tasks/:id` | Menghapus tugas dari database beserta seluruh riwayat terkait (*cascade delete*). |
| 6 | `cariTugasByKategori()` | **GET** | `/api/tasks?category_id=1` | Mengambil daftar tugas yang difilter berdasarkan kategori tertentu (atau via `/api/categories/:id/tasks`). |

---

## 4. Dokumentasi Lengkap Endpoint API

**Live Base URL (Vercel):** `https://task-management-one-navy.vercel.app/api`  
*(Atau `http://localhost:3000/api` saat pengujian server lokal).*

### 4.1. Health Check & Status Database (Supabase Transaction Pooler)
- **Method:** `GET`
- **URL:** `https://task-management-one-navy.vercel.app/api/health`
- **Deskripsi:** Memeriksa status kesehatan server dan koneksi database Supabase via Transaction Pooler.
- **Headers:** None
- **Response Sukses (200 OK):**
```json
{
  "status": "ok",
  "timestamp": "2026-10-25T11:15:51.098Z",
  "database": {
    "engine": "supabase_transaction_pooler",
    "isSupabaseConfigured": true,
    "host": "aws-0-ap-southeast-1.pooler.supabase.com:6543",
    "port": "6543",
    "database": "postgres",
    "note": "Terhubung langsung ke database Supabase PostgreSQL via Transaction Pooler"
  }
}
```

---

### 4.2. [1] Ambil Seluruh Daftar Tugas (`getDaftarTugas`)
- **Method:** `GET`
- **URL:** `https://task-management-one-navy.vercel.app/api/tasks`
- **Query Parameters (Opsional):**
  - `category_id`: ID kategori untuk filter (contoh: `1`)
  - `priority_id`: ID prioritas untuk filter (contoh: `4`)
  - `status_id`: ID status untuk filter (contoh: `2`)
  - `search`: Kata kunci pencarian judul/deskripsi (contoh: `Laporan`)
- **Headers:** None
- **Response Sukses (200 OK):**
```json
{
  "message": "Daftar tugas berhasil diambil",
  "count": 3,
  "data": [
    {
      "task_id": 1,
      "category_id": 1,
      "priority_id": 4,
      "status_id": 2,
      "title": "Menyiapkan Arsitektur REST API & Supabase",
      "description": "Implementasi 5 tabel relasional dan CRUD tasks lengkap",
      "due_date": "2026-10-27T10:50:22.542Z",
      "created_at": "2026-10-25T10:50:22.542Z",
      "updated_at": "2026-10-25T10:50:22.542Z",
      "category": {
        "category_id": 1,
        "category_name": "Pekerjaan",
        "description": "Tugas yang berkaitan dengan pekerjaan"
      },
      "priority": {
        "priority_id": 4,
        "priority_name": "Penting",
        "priority_level": 4
      },
      "status": {
        "status_id": 2,
        "status_name": "Sedang Dikerjakan"
      }
    }
  ]
}
```

---

### 4.3. [2] Tambah Tugas Baru (`tambahTugasBaru`)
- **Method:** `POST`
- **URL:** `https://task-management-one-navy.vercel.app/api/tasks`
- **Deskripsi:** Menambahkan tugas baru ke dalam tabel `tasks` dan mencatat entri log awal pada tabel `task_history`.
- **Headers:** `Content-Type: application/json`
- **Request Body:**
```json
{
  "title": "Implementasi Integrasi Supabase Transaction Pooler",
  "description": "Konfigurasi koneksi PostgreSQL port 6543 dan auto-migration tabel",
  "due_date": "2026-11-05T12:00:00Z",
  "category_id": 1,
  "priority_id": 4,
  "status_id": 1
}
```
- **Response Sukses (201 Created):**
```json
{
  "message": "Tugas baru berhasil ditambahkan",
  "data": {
    "task_id": 4,
    "title": "Implementasi Integrasi Supabase Transaction Pooler",
    "description": "Konfigurasi koneksi PostgreSQL port 6543 dan auto-migration tabel",
    "due_date": "2026-11-05T12:00:00.000Z",
    "category_id": 1,
    "priority_id": 4,
    "status_id": 1,
    "created_at": "2026-10-25T11:20:00.000Z",
    "updated_at": "2026-10-25T11:20:00.000Z",
    "category": { "category_id": 1, "category_name": "Pekerjaan" },
    "priority": { "priority_id": 4, "priority_name": "Penting", "priority_level": 4 },
    "status": { "status_id": 1, "status_name": "Belum Selesai" }
  }
}
```
- **Response Error (400 Bad Request):**
```json
{
  "error": "Field title wajib diisi dan berupa teks"
}
```

---

### 4.4. [3] Ubah Status Tugas (`updateStatusTugas`)
- **Method:** `PATCH`
- **URL:** `https://task-management-one-navy.vercel.app/api/tasks/1/status`
- **Deskripsi:** Memperbarui kolom `status_id` tugas dan secara otomatis menyisipkan rekaman log ke tabel `task_history`.
- **Headers:** `Content-Type: application/json`
- **Request Body:**
```json
{
  "status_id": 3,
  "notes": "Tugas telah selesai dikerjakan dan diverifikasi oleh tim"
}
```
- **Response Sukses (200 OK):**
```json
{
  "message": "Status tugas berhasil diperbarui dan dicatat ke riwayat",
  "data": {
    "task_id": 1,
    "status_id": 3,
    "updated_at": "2026-10-25T11:22:00.000Z",
    "status": {
      "status_id": 3,
      "status_name": "Selesai"
    }
  }
}
```
- **Response Error (404 Not Found):**
```json
{
  "error": "Tugas dengan ID 999999 tidak ditemukan"
}
```

---

### 4.5. [4] Edit Detail Tugas (`editDetailTugas`)
- **Method:** `PUT` atau `PATCH`
- **URL:** `https://task-management-one-navy.vercel.app/api/tasks/1`
- **Deskripsi:** Memperbarui informasi tugas seperti judul, deskripsi, tenggat waktu, kategori, atau tingkat prioritas.
- **Headers:** `Content-Type: application/json`
- **Request Body:**
```json
{
  "title": "Menyiapkan Arsitektur REST API & Supabase (Revisi Live Vercel)",
  "description": "Koneksi live ke Supabase Transaction Pooler port 6543 dengan SSL",
  "due_date": "2026-10-30T17:00:00Z",
  "category_id": 1,
  "priority_id": 5
}
```
- **Response Sukses (200 OK):**
```json
{
  "message": "Detail tugas berhasil diperbarui",
  "data": {
    "task_id": 1,
    "title": "Menyiapkan Arsitektur REST API & Supabase (Revisi Live Vercel)",
    "description": "Koneksi live ke Supabase Transaction Pooler port 6543 dengan SSL",
    "due_date": "2026-10-30T17:00:00.000Z",
    "category_id": 1,
    "priority_id": 5,
    "status_id": 3,
    "updated_at": "2026-10-25T11:24:00.000Z"
  }
}
```

---

### 4.6. [5] Hapus Tugas (`hapusTugas`)
- **Method:** `DELETE`
- **URL:** `https://task-management-one-navy.vercel.app/api/tasks/3`
- **Deskripsi:** Menghapus data tugas dari database. Foreign key `ON DELETE CASCADE` memastikan rekaman riwayat terkait di tabel `task_history` ikut terhapus bersih.
- **Headers:** None
- **Response Sukses (200 OK):**
```json
{
  "message": "Tugas dengan ID 3 berhasil dihapus beserta log riwayatnya",
  "data": {
    "deleted_id": 3
  }
}
```
- **Response Error (404 Not Found):**
```json
{
  "error": "Tugas dengan ID 999999 tidak ditemukan"
}
```

---

### 4.7. [6] Cari Tugas Berdasarkan Kategori (`cariTugasByKategori`)
- **Method:** `GET`
- **URL:** `https://task-management-one-navy.vercel.app/api/tasks?category_id=1` atau `https://task-management-one-navy.vercel.app/api/categories/1/tasks`
- **Deskripsi:** Mengambil daftar tugas spesifik kategori Pekerjaan (ID 1).
- **Response Sukses (200 OK):**
```json
{
  "message": "Daftar tugas untuk kategori ID 1 berhasil diambil",
  "category_id": 1,
  "count": 2,
  "data": [ ... ]
}
```

---

### 4.8. Riwayat Perubahan Tugas (`task_history`)
- **Method:** `GET`
- **URL:** `https://task-management-one-navy.vercel.app/api/tasks/1/history`
- **Deskripsi:** Mengambil audit trail pergantian status tugas dari tabel `task_history`.
- **Response Sukses (200 OK):**
```json
{
  "message": "Riwayat perubahan tugas berhasil diambil",
  "task_id": 1,
  "count": 2,
  "data": [
    {
      "history_id": 2,
      "task_id": 1,
      "old_status_id": 2,
      "new_status_id": 3,
      "changed_at": "2026-10-25T11:22:00.000Z",
      "notes": "Tugas telah selesai dikerjakan dan diverifikasi oleh tim",
      "old_status": { "status_id": 2, "status_name": "Sedang Dikerjakan" },
      "new_status": { "status_id": 3, "status_name": "Selesai" }
    }
  ]
}
```

---

### 4.9. Master Data: Kategori, Prioritas, Status
- `GET https://task-management-one-navy.vercel.app/api/categories` : Mengambil daftar seluruh kategori
- `POST https://task-management-one-navy.vercel.app/api/categories` : Menambah kategori baru (`{"category_name": "Riset & Pengembangan", "description": "..."}`)
- `GET https://task-management-one-navy.vercel.app/api/priorities` : Mengambil daftar 5 level prioritas (Rendah s/d Darurat)
- `GET https://task-management-one-navy.vercel.app/api/statuses` : Mengambil daftar 3 status (Belum Selesai, Sedang Dikerjakan, Selesai)
- `GET https://task-management-one-navy.vercel.app/api/stats` : Mengambil total tugas, pending, sedang dikerjakan, dan selesai

---

## 5. Bukti Pengujian dengan Thunder Client / Postman

File koleksi pengujian Thunder Client telah disertakan di root project:  
📁 **`thunder-collection_task-management.json`**

### Target Pengujian Domain Live Vercel:
`https://task-management-one-navy.vercel.app/api`

### Cara Mengimpor & Menjalankan di Thunder Client:
1. Buka Visual Studio Code dengan ekstensi **Thunder Client**.
2. Klik tab **Collections** di sidebar Thunder Client.
3. Klik menu titik tiga (...) di pojok kanan atas -> pilih **Import Collection**.
4. Pilih file `thunder-collection_task-management.json` dari repositori ini.
5. Jalankan collection secara langsung (seluruh endpoint otomatis mengarah ke `https://task-management-one-navy.vercel.app/api`).
6. Klik **Run Collection** untuk mengeksekusi seluruh 18 test case secara otomatis.

### Ringkasan Hasil Pengujian Live di Vercel:
| ID Request | Method | Live Endpoint URL | Status Code | Keterangan Uji |
|:---|:---:|:---|:---:|:---|
| 00. Health Check | GET | `https://task-management-one-navy.vercel.app/api/health` | `200 OK` | Verifikasi koneksi serverless & Supabase pooler |
| 01. getDaftarTugas | GET | `https://task-management-one-navy.vercel.app/api/tasks` | `200 OK` | Mengambil seluruh tugas dengan relasi FK |
| 02. Detail Task | GET | `https://task-management-one-navy.vercel.app/api/tasks/1` | `200 OK` | Ambil detail 1 tugas berdasarkan ID |
| 03. tambahTugasBaru | POST | `https://task-management-one-navy.vercel.app/api/tasks` | `201 Created` | Membuat tugas baru & audit log di Supabase |
| 04. updateStatusTugas | PATCH | `https://task-management-one-navy.vercel.app/api/tasks/1/status` | `200 OK` | Pindah status & insert `task_history` |
| 05. editDetailTugas | PUT | `https://task-management-one-navy.vercel.app/api/tasks/1` | `200 OK` | Memperbarui atribut tugas di PostgreSQL |
| 06. hapusTugas | DELETE | `https://task-management-one-navy.vercel.app/api/tasks/3` | `200 OK` | Menghapus tugas (cascade history) |
| 07. cariTugasByKategori | GET | `https://task-management-one-navy.vercel.app/api/tasks?category_id=1` | `200 OK` | Filter berdasarkan kategori Pekerjaan |
| 08. Filter Prioritas | GET | `https://task-management-one-navy.vercel.app/api/tasks?priority_id=4` | `200 OK` | Filter tugas prioritas Penting (Level 4) |
| 09. Filter Status | GET | `https://task-management-one-navy.vercel.app/api/tasks?status_id=2` | `200 OK` | Filter tugas Sedang Dikerjakan |
| 10. Search Title | GET | `https://task-management-one-navy.vercel.app/api/tasks?search=Laporan` | `200 OK` | Pencarian substring judul tugas (ILIKE) |
| 11. Master Categories | GET | `https://task-management-one-navy.vercel.app/api/categories` | `200 OK` | Mengambil tabel master `categories` |
| 12. Create Category | POST | `https://task-management-one-navy.vercel.app/api/categories` | `201 Created` | Menambah kategori baru ke Supabase |
| 13. Master Priorities | GET | `https://task-management-one-navy.vercel.app/api/priorities` | `200 OK` | Mengambil tabel master `priorities` |
| 14. Master Statuses | GET | `https://task-management-one-navy.vercel.app/api/statuses` | `200 OK` | Mengambil tabel master `task_statuses` |
| 15. Task History | GET | `https://task-management-one-navy.vercel.app/api/tasks/1/history` | `200 OK` | Memeriksa log audit di `task_history` |
| 16. Stats Counter | GET | `https://task-management-one-navy.vercel.app/api/stats` | `200 OK` | Menghitung total, pending, progress, done |
| 17. Error 400 Bad Request | POST | `https://task-management-one-navy.vercel.app/api/tasks` | `400 Bad Request` | Validasi input kosong (missing title) |
| 18. Error 404 Not Found | GET | `https://task-management-one-navy.vercel.app/api/tasks/999999` | `404 Not Found` | Validasi response record tidak ditemukan |

---

## 6. Panduan Menjalankan Secara Lokal

### Prasyarat
- Node.js versi 18 atau lebih baru
- npm

### Langkah Instalasi
```bash
# 1. Clone repository
git clone <url-repository-anda>
cd <nama-folder-project>

# 2. Install seluruh dependencies
npm install

# 3. Buat file .env berdasarkan .env.example
cp .env.example .env

# 4. (Opsional) Isi SUPABASE_URL dan SUPABASE_ANON_KEY jika ingin langsung terhubung ke database online
# Jika dibiarkan kosong, server otomatis menjalankan in-memory database fallback dengan skema & data yang identik.

# 5. Jalankan server pengujian lokal
npm run dev
```
Akses web dan REST API di browser atau Thunder Client pada: `http://localhost:3000`

---

## 7. Panduan Deployment ke Vercel & Setup Supabase

### A. Setup Database Supabase
1. Buat akun dan project baru di [supabase.com](https://supabase.com).
2. Di dashboard Supabase, buka menu **SQL Editor** -> **New Query**.
3. Buka file `supabase/schema.sql` pada repository ini, salin seluruh kodenya, dan klik **Run**.
4. Kelima tabel (`categories`, `priorities`, `task_statuses`, `tasks`, `task_history`) beserta seed data awal dan RLS policies akan langsung terbuat.
5. Buka **Project Settings** -> **API**, salin:
   - **Project URL** (contoh: `https://xxxx.supabase.co`)
   - **anon public key** atau **service_role secret key**

### B. Deployment ke Vercel
1. Push project ini ke repository GitHub Anda.
2. Login ke [vercel.com](https://vercel.com) dan klik **Add New Project** -> **Import Git Repository**.
3. Pada halaman konfigurasi project di Vercel:
   - Framework Preset: **Vite**
   - Root Directory: `./`
4. Buka tab **Environment Variables**, tambahkan:
   - **`SUPABASE_URL`** atau **`TRANSACTION_POOLER`**:
     Isi dengan connection string Transaction Pooler (port 6543) dari Supabase:
     `postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?sslmode=require`
   *(Catatan: Mode Transaction Pooler di port 6543 adalah standar terbaik untuk arsitektur serverless di Vercel agar koneksi database efisien dan tidak overload).*
5. Klik **Deploy**.
6. Setelah deployment selesai, backend REST API dan frontend TaskFlow Anda telah online di `https://task-management-one-navy.vercel.app`!

---

*Disusun untuk memenuhi Tugas Akhir Learning Labs: Backend Development.*
