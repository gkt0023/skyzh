-- ============================================================
-- 账号商品展示站 - Supabase 数据库初始化脚本
-- 使用方法：
--   1. 打开 Supabase 控制台 -> SQL Editor -> New query
--   2. 把本文件全部内容粘贴进去 -> Run 执行
--   3. 到 Project Settings -> API 复制 URL 和 anon key，填入 js/config.js
-- ============================================================

-- ------------------------------------------------------------
-- 1) users 用户表
--    role   : user=普通用户  admin=管理员
--    status : pending=待审核  approved=已通过  rejected=已驳回
-- ------------------------------------------------------------
create table if not exists public.users (
  id            uuid primary key default gen_random_uuid(),  -- 主键
  email         text not null unique,                        -- 登录邮箱（唯一）
  password_hash text not null,                               -- 密码 SHA-256 哈希（前端计算）
  username      text not null,                               -- 昵称
  role          text not null default 'user'
                check (role in ('user', 'admin')),           -- 角色：普通用户/管理员
  status        text not null default 'pending'
                check (status in ('pending', 'approved', 'rejected')), -- 账号审核状态
  created_at    timestamptz not null default now(),          -- 注册时间
  reviewed_at   timestamptz                                  -- 审核时间
);

-- ------------------------------------------------------------
-- 2) goods 商品表
--    goods_no : 审核通过时由下方触发器自动生成的递增唯一编号（起始 1001）
--    images   : 图片公开 URL 数组（存 Supabase Storage）
--    status   : pending=待审核  approved=已展示  rejected=已驳回
-- ------------------------------------------------------------
create table if not exists public.goods (
  id          uuid primary key default gen_random_uuid(),
  goods_no    bigint unique,                                 -- 审核通过后自动填充
  user_id     uuid not null references public.users(id),     -- 发布人
  images      text[] not null default '{}',                  -- 图片 URL 列表
  intro       text not null,                                 -- 账号简介
  status      text not null default 'pending'
              check (status in ('pending', 'approved', 'rejected')),
  created_at  timestamptz not null default now(),
  reviewed_at timestamptz
);

-- ------------------------------------------------------------
-- 3) 商品编号自动递增（核心需求：审核通过时自动生成唯一编号）
--    用独立序列保证编号连续且唯一；触发器在状态变为 approved 时写入
-- ------------------------------------------------------------
create sequence if not exists public.goods_no_seq start with 1001;

create or replace function public.assign_goods_no()
returns trigger
language plpgsql
as $$
begin
  -- 仅在【变为已通过】且【还没有编号】时生成编号，避免重复编号
  if new.status = 'approved' and new.goods_no is null then
    new.goods_no := nextval('public.goods_no_seq');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_goods_no on public.goods;
create trigger trg_goods_no
  before insert or update of status on public.goods
  for each row execute function public.assign_goods_no();

-- ------------------------------------------------------------
-- 4) 种子管理员账号（建表后自动写入）
--    默认邮箱：admin@example.com
--    默认密码：admin123（登录后请按部署文档修改！）
--    密码哈希 = 前端 SHA-256('admin123')
-- ------------------------------------------------------------
insert into public.users (email, password_hash, username, role, status)
values (
  'admin@example.com',
  '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9',
  '管理员',
  'admin',
  'approved'
)
on conflict (email) do nothing;

-- ------------------------------------------------------------
-- 5) 存储桶：存放商品图片（公开读，前端可直接用 URL 展示）
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('goods-images', 'goods-images', true)
on conflict (id) do nothing;

-- 允许任意登录前用户向该存储桶上传图片（图片 URL 需要入库展示）
drop policy if exists "public upload" on storage.objects;
create policy "public upload"
  on storage.objects for insert
  with check (bucket_id = 'goods-images');

-- ------------------------------------------------------------
-- 6) 演示项目关闭表级行级安全（RLS），保证纯前端可直接读写
--    ⚠️ 生产环境请务必开启 RLS + Supabase Auth + 服务端接口，
--       详见 DEPLOY.md 的「安全说明」章节
-- ------------------------------------------------------------
alter table public.users disable row level security;
alter table public.goods disable row level security;
