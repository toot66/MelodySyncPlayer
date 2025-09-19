<?php
// /admin/account.php - change username/password UI
session_start();
if (!isset($_SESSION['token'])) { header('Location: /admin/index.php'); exit; }
$token = $_SESSION['token'];
?>
<!doctype html>
<meta charset="utf-8">
<title>账户设置 - Melody Sync Player</title>
<style>
  body{font-family:system-ui;margin:24px;background:#0b1220;color:#e5e7eb}
  .card{background:#111827;border:1px solid #374151;border-radius:12px;padding:16px;max-width:520px}
  input,button{padding:10px;border-radius:8px;border:1px solid #374151;background:#0b1220;color:#e5e7eb;width:100%}
  .row{display:flex;gap:10px;flex-direction:column;margin:8px 0}
  .btn{background:#10b981;border:none;cursor:pointer}
  .btn:hover{background:#34d399}
  .link{color:#9ca3af;text-decoration:none;margin-left:8px}
  .bar{display:flex;align-items:center;margin-bottom:12px}
</style>
<div class="bar">
  <a class="link" href="/admin/dashboard.php">← 返回管理</a>
</div>
<div class="card">
  <h2 style="margin:0 0 8px">账户设置</h2>
  <p style="margin:0 0 12px;color:#9ca3af">修改当前管理员的用户名或密码</p>

  <div class="row">
    <label>当前密码</label>
    <input id="current" type="password" placeholder="必填" />
  </div>
  <div class="row">
    <label>新用户名（可选）</label>
    <input id="username" placeholder="留空表示不修改" />
  </div>
  <div class="row">
    <label>新密码（可选）</label>
    <input id="password" type="password" placeholder="留空表示不修改" />
  </div>
  <div class="row">
    <button class="btn" onclick="submitChange()">保存修改</button>
  </div>
  <div id="msg" style="color:#9ca3af;margin-top:8px"></div>
</div>

<script>
const token = <?= json_encode($token) ?>;
async function submitChange(){
  const current = q('#current').value.trim();
  const newUsername = q('#username').value.trim();
  const newPassword = q('#password').value.trim();
  if(!current){ setMsg('请先输入当前密码'); return; }
  const body = { currentPassword: current };
  if(newUsername) body.newUsername = newUsername;
  if(newPassword) body.newPassword = newPassword;
  try{
    const r = await fetch('/api/admin_account.php',{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},
      body: JSON.stringify(body)
    });
    const d = await r.json();
    if(!r.ok){ setMsg('修改失败：'+(d.message||r.status)); return; }
    setMsg('修改成功');
    // 清空输入
    q('#current').value='';
    q('#username').value='';
    q('#password').value='';
  }catch(e){ setMsg('网络错误'); }
}
function q(s){return document.querySelector(s)}
function setMsg(t){ document.querySelector('#msg').textContent = t; }
</script>
