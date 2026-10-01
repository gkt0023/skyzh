// ============================================================
// common.js - Supabase 初始化 + 通用工具
// 包含：客户端初始化、登录态管理、页面守卫、密码哈希、图片上传
// 所有页面都会引入本文件（引入顺序：supabase CDN -> config.js -> common.js）
//
// 说明：整体包在一个 IIFE（立即执行函数）中运行，
// 内部声明的函数通过 window.xxx 显式挂载到全局供各页面调用。
// 这样做可以避免大段顶层声明脚本在部分嵌入式浏览器环境下的兼容问题，
// 也让全局 API 边界更清晰。
// ============================================================
(function () {

  // ---------- 初始化 Supabase 客户端 ----------
  // window.supabase 来自 CDN 的 supabase-js；这里创建客户端实例后
  // 重新挂到 window.supabase，页面里直接写 supabase.xxx 即可调用
  const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  window.supabase = supabase;

  // ---------- 登录态管理（本地 localStorage） ----------
  // 注意：演示项目用 localStorage 存登录态；生产环境建议用 Supabase Auth 的会话
  const SESSION_KEY = "showcase_session";

  // 读取本地登录态（返回 null 表示未登录）
  function getSession() {
    try {
      return JSON.parse(localStorage.getItem(SESSION_KEY));
    } catch (e) {
      return null;
    }
  }

  // 保存登录态（user: { id, email, username, role }）
  function setSession(user) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  }

  // 清除登录态（退出登录）
  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
  }

  // 校验登录态：向数据库确认该账号仍存在且状态为 approved
  // 防止"被驳回/被删除的账号"继续持有有效登录态
  async function checkSession() {
    const s = getSession();
    if (!s || !s.id) return null;
    const { data, error } = await supabase
      .from("users")
      .select("id, email, username, role, status")
      .eq("id", s.id)
      .maybeSingle();
    if (error || !data || data.status !== "approved") {
      clearSession();
      return null;
    }
    return data;
  }

  // ---------- 页面守卫 ----------
  // 普通页面守卫：未登录自动跳转到登录页（需求 1）
  async function requireLogin(redirect = "login.html") {
    const user = await checkSession();
    if (!user) {
      location.href = redirect;
      return null;
    }
    return user;
  }

  // 管理员页面守卫：非管理员直接弹窗提示并跳回首页（需求 7）
  async function requireAdmin() {
    const user = await requireLogin();
    if (!user) return null;
    if (user.role !== "admin") {
      alert("您不是管理员，无权访问该页面");
      location.href = "index.html";
      return null;
    }
    return user;
  }

  // ---------- 密码哈希（SHA-256，浏览器 Web Crypto 实现） ----------
  // 注册/登录时前端计算哈希，与数据库中的哈希比对。
  // 说明：演示项目用纯前端哈希简化实现；生产环境建议改用 Supabase Auth
  //       （自带加盐哈希、会话管理，更安全）。
  async function sha256(text) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  // ---------- 图片上传（Supabase Storage） ----------
  // 上传单张图片到存储桶的指定目录，返回公开访问 URL
  // folder 形如 uploads/<用户id>，按用户分目录存放
  async function uploadImage(file, folder) {
    if (!file) return null;
    // 提取扩展名（没有扩展名时默认 jpg）
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    // 时间戳 + 随机串 拼文件名，避免重名覆盖
    const path = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false });
    if (error) throw new Error("图片上传失败：" + error.message);
    // 桶是公开的，直接拼公开 URL
    return supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path).data.publicUrl;
  }

  // ---------- 通用小工具 ----------

  // 时间格式化：2026-10-01 14:30
  function formatTime(iso) {
    if (!iso) return "-";
    const d = new Date(iso);
    const p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
  }

  // HTML 转义，防止用户输入内容造成 XSS
  function escapeHtml(s) {
    return String(s ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }

  // 退出登录：清空本地登录态并跳回登录页
  function logout() {
    clearSession();
    location.href = "login.html";
  }

  // ---------- 显式挂载到全局（供各页面脚本调用） ----------
  window.getSession = getSession;
  window.setSession = setSession;
  window.clearSession = clearSession;
  window.checkSession = checkSession;
  window.requireLogin = requireLogin;
  window.requireAdmin = requireAdmin;
  window.sha256 = sha256;
  window.uploadImage = uploadImage;
  window.formatTime = formatTime;
  window.escapeHtml = escapeHtml;
  window.logout = logout;

})();
