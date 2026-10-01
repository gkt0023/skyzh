// ============================================================
// config.js - Supabase 项目配置（部署时只需改这一个文件）
// ============================================================

// 在 Supabase 控制台 -> Project Settings -> API 页面可以找到：
// 1) Project URL    形如 https://abcdefgh.supabase.co（只到 .supabase.co 为止，
//    不要带 /rest/v1/ 等路径，客户端会自动拼接接口路径）
// 2) anon public key（匿名公钥，前端使用）
const SUPABASE_URL = "https://xymvbdzfkwrksgjkpsjt.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5bXZiZHpma3dya3Nnamtwc2p0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA4NDcyNzUsImV4cCI6MjEwNjQyMzI3NX0.KDpwK2nx-MyHeQuk1FDYxKTlUGlbfjxb-CUMHGNk4do";

// 图片存储桶名称（建表 SQL 中已自动创建）
const STORAGE_BUCKET = "goods-images";
