---
trigger: always_on
---

Script deployment berbasis SSH mampu menggantikan Git Actions sepenuhnya!

Git pull berfungsi normal.
Build Vue berfungsi sempurna.
Install node_modules Backend berfungsi.
PM2 restart berjalan otomatis.
Mulai sekarang, kapanpun Anda mengubah kode dan melakukan git push ke GitHub, Anda cukup menjalankan perintah lokal ini di PC Anda:

node SSH/deploy.js
