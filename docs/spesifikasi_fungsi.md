<!-- Project Function List - Aplikasi Manajemen Tugas (Task Management) -->
<!-- mungkin ini fungsi yang sering dipakai di backend ketika membuat aplikasi management task -->

1. `getDaftarTugas()`
   - **Kegunaan:** Mengambil dan menampilkan seluruh daftar tugas dari database. 
   <!-- (buka inventory ama resep di minceraft) -->

2. `tambahTugasBaru()`
   - **Kegunaan:** Menambahkan tugas baru ke dalam database (judul tugas, deskripsi, dan tenggat waktu).
   <!-- ngambil/buat barang di inventory buat naruh di bar utama -->

3. `updateStatusTugas()`
   - **Kegunaan:** Mengubah status tugas (misalnya dari "Belum Selesai" menjadi "Selesai") berdasarkan ID tugas.
   <!-- ini kyk nandain doang tugasnya udh atau blom -->

4. `editDetailTugas()`
   - **Kegunaan:** Memperbarui informasi tugas seperti judul, deskripsi, atau tanggal tenggat waktu berdasarkan ID tugas.
   <!-- ganti nama item di anvil -->

5. `hapusTugas()`
   - **Kegunaan:** Menghapus tugas dari database berdasarkan ID tugas.
   <!-- drop item ke lava atau buang nanti hilang sendiri -->

6. `cariTugasByKategori()`
   - **Kegunaan:** Mengambil daftar tugas berdasarkan kategori atau prioritas tertentu (misal: "Pekerjaan", "Personal", "Penting").
   <!-- seperti search bar pada umumnya di inventory ada kategori masing masing -->