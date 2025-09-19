<?php
// /admin/dashboard.php - donations CRUD
session_start();
if (!isset($_SESSION['token'])) { header('Location: /admin/index.php'); exit; }
$token = $_SESSION['token'];
?>
<!doctype html>
<meta charset="utf-8">
<title>Donations - Melody Sync Player</title>
<style>
  body{font-family:system-ui;margin:24px;background:#0b1220;color:#e5e7eb}
  .bar{display:flex;gap:12px;align-items:center;margin-bottom:16px}
  .card{background:#111827;border:1px solid #374151;border-radius:12px;padding:16px}
  .row{display:flex;gap:8px;flex-wrap:wrap}
  input,button{padding:10px;border-radius:8px;border:1px solid #374151;background:#0b1220;color:#e5e7eb}
  button{background:#10b981;border:none;cursor:pointer}
  button:hover{background:#34d399}
  table{border-collapse:collapse;width:100%;margin-top:12px}
  th,td{border:1px solid #374151;padding:10px}
  th{background:#0f172a}
</style>
<div class="bar" style="justify-content:space-between;align-items:center;margin-bottom:8px">
  <h2 style="margin:0">捐赠名单管理</h2>
  <div style="display:flex;gap:12px;align-items:center">
    <a href="/admin/downloads.php" style="color:#9ca3af">下载文件管理</a>
    <a href="/admin/account.php" style="color:#9ca3af">账户设置</a>
    <a href="/admin/logout.php" style="color:#9ca3af">退出登录</a>
  </div>
  </div>
<div class="card">
  <div class="row">
    <input id="name" placeholder="姓名">
    <input id="amount" placeholder="金额" type="number" step="0.01">
    <input id="date" placeholder="日期" type="date">
    <input id="badge" placeholder="徽章(可选)">
    <input id="badgeColor" placeholder="徽章颜色#hex(可选)">
    <input id="avatar" placeholder="头像URL(可选)">
  </div>
  <div class="row" style="margin-top:8px">
    <input id="message" placeholder="留言(可选)" style="flex:1">
    <button onclick="createItem()">新增</button>
    <a href="/admin/logout.php" style="margin-left:auto;color:#9ca3af">退出登录</a>
  </div>
</div>

<div class="card" style="margin-top:16px">
  <table id="tbl"><thead><tr>
    <th>ID</th><th>姓名</th><th>金额</th><th>日期</th><th>徽章</th><th>操作</th>
  </tr></thead><tbody></tbody></table>
</div>

<script>
const token = <?= json_encode($token) ?>;
const base = '/api';

async function listAll(){
  const r = await fetch(`${base}/donations.php?page=1&pageSize=500`);
  const d = await r.json();
  const tb = document.querySelector('#tbl tbody');
  tb.innerHTML='';
  (d.list||[]).forEach(it=>{
    const tr=document.createElement('tr');
    tr.innerHTML = `
      <td>${it.id}</td>
      <td contenteditable onblur="update(${it.id}, 'name', this.textContent)">${it.name||''}</td>
      <td contenteditable onblur="update(${it.id}, 'amount', this.textContent)">${it.amount||''}</td>
      <td contenteditable onblur="update(${it.id}, 'date', this.textContent)">${it.date||''}</td>
      <td contenteditable onblur="update(${it.id}, 'badge', this.textContent)">${it.badge||''}</td>
      <td>
        <button onclick="del(${it.id})">删除</button>
      </td>`;
    tb.appendChild(tr);
  });
}

async function createItem(){
  const body = {
    name: q('#name').value.trim(),
    amount: parseFloat(q('#amount').value || '0'),
    date: q('#date').value,
    message: q('#message').value.trim(),
    avatar: q('#avatar').value.trim(),
    badge: q('#badge').value.trim(),
    badgeColor: q('#badgeColor').value.trim()
  };
  if(!body.name || !body.amount || !body.date){ alert('姓名/金额/日期必填'); return; }
  await fetch(`${base}/donations.php`,{
    method:'POST',
    headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},
    body: JSON.stringify(body)
  });
  ['#name','#amount','#date','#message','#avatar','#badge','#badgeColor'].forEach(s=>q(s).value='');
  listAll();
}

async function update(id, field, value){
  const body = {}; body[field]=value;
  await fetch(`${base}/donations.php?id=${id}`,{
    method:'PUT',
    headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},
    body: JSON.stringify(body)
  });
}

async function del(id){
  if(!confirm('确认删除?')) return;
  await fetch(`${base}/donations.php?id=${id}`,{
    method:'DELETE',
    headers:{'Authorization':'Bearer '+token}
  });
  listAll();
}
function q(s){return document.querySelector(s)}
listAll();
</script>
