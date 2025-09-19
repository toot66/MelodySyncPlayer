<?php
// /admin/downloads.php - manage downloadable files
session_start();
if (!isset($_SESSION['token'])) { header('Location: /admin/index.php'); exit; }
$token = $_SESSION['token'];
?>
<!doctype html>
<meta charset="utf-8">
<title>下载文件管理 - Melody Sync Player</title>
<style>
  body{font-family:system-ui;margin:24px;background:#0b1220;color:#e5e7eb}
  .card{background:#111827;border:1px solid #374151;border-radius:12px;padding:16px;margin-bottom:16px}
  input,select,button,textarea{padding:10px;border-radius:8px;border:1px solid #374151;background:#0b1220;color:#e5e7eb}
  label{display:block;margin:6px 0 4px;color:#9ca3af}
  .row{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
  .row-1{display:grid;grid-template-columns:1fr;gap:10px}
  .btn{background:#10b981;border:none;cursor:pointer}
  .btn:hover{background:#34d399}
  table{border-collapse:collapse;width:100%}
  th,td{border:1px solid #374151;padding:8px}
  th{background:#0f172a}
  .bar{display:flex;gap:12px;align-items:center;margin-bottom:8px}
  a.link{color:#9ca3af;text-decoration:none}
</style>
<div class="bar">
  <a class="link" href="/admin/dashboard.php">← 返回管理</a>
  <a class="link" href="/admin/account.php">账户设置</a>
  <a class="link" href="/admin/logout.php">退出登录</a>
</div>

<div class="card">
  <h2 style="margin-top:0">上传新文件</h2>
  <form id="uploadForm">
    <div class="row">
      <div>
        <label>平台</label>
        <select name="platform" required>
          <option value="windows">Windows</option>
          <option value="macos">macOS</option>
          <option value="linux">Linux</option>
          <option value="android">Android</option>
        </select>
      </div>
      <div>
        <label>版本号</label>
        <input name="version" placeholder="例如 1.2.3" required />
      </div>
    </div>
    <div class="row-1">
      <div>
        <label>备注（可选）</label>
        <input name="notes" placeholder="例如 适配说明等" />
      </div>
      <div>
        <label>文件</label>
        <input type="file" name="file" required />
      </div>
    </div>
    <div style="margin-top:10px">
      <button class="btn" type="submit">上传并保存</button>
      <span id="msg" style="margin-left:10px;color:#9ca3af"></span>
    </div>
  </form>
</div>

<div class="card">
  <h2 style="margin-top:0">已上传文件</h2>
  <table id="tbl"><thead>
    <tr><th>ID</th><th>平台</th><th>版本</th><th>文件名</th><th>大小</th><th>链接</th><th>创建时间</th><th>操作</th></tr>
  </thead><tbody></tbody></table>
</div>

<script>
const token = <?= json_encode($token) ?>;

async function listAll(){
  const r = await fetch('/api/downloads.php');
  const rows = await r.json();
  const tb = document.querySelector('#tbl tbody');
  tb.innerHTML = '';
  (rows||[]).forEach(it=>{
    const tr = document.createElement('tr');
    const size = (Number(it.file_size)||0);
    const sizeMB = (size/1024/1024).toFixed(2)+' MB';
    tr.innerHTML = `
      <td>${it.id}</td>
      <td>${it.platform}</td>
      <td>${it.version}</td>
      <td>${it.file_name}</td>
      <td>${sizeMB}</td>
      <td><a href="${it.url}" target="_blank">下载</a></td>
      <td>${it.created_at||''}</td>
      <td><button onclick="del(${it.id})">删除</button></td>
    `;
    tb.appendChild(tr);
  });
}

async function del(id){
  if(!confirm('确认删除？')) return;
  const r = await fetch('/api/downloads_manage.php?id='+id, {
    method:'DELETE',
    headers:{'Authorization':'Bearer '+token}
  });
  if(!r.ok){ alert('删除失败'); return; }
  listAll();
}

const form = document.getElementById('uploadForm');
form.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const formData = new FormData(form);
  const r = await fetch('/api/downloads_manage.php',{
    method:'POST',
    headers:{'Authorization':'Bearer '+token},
    body: formData
  });
  const d = await r.json();
  document.getElementById('msg').textContent = r.ok?('上传成功：'+(d.url||'')):(d.message||'上传失败');
  if(r.ok){ form.reset(); listAll(); }
});

listAll();
</script>
