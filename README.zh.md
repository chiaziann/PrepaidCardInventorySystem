# 预付充值卡库存系统

**语言：** [English](README.md) · [华语](README.zh.md) · [Bahasa Malaysia](README.ms.md)

本地运行的库存管理网站，用于记录马来西亚预付充值卡的进货、出货和库存管理。

## 功能

- 库存总览（低库存标红提醒）
- 完整库存 CRUD（新增、查看、编辑、删除）
- 进货 / 出货
- 操作记录
- 新增商品

## 环境要求

- [Node.js LTS](https://nodejs.org/)（已安装 npm）

## 启动方式

在项目目录打开终端，执行：

```bash
npm start
```

或在 Windows 上双击 `start.bat`。

浏览器访问：http://localhost:3000

## 数据备份

数据库文件位于 `db/inventory.db`。

- 手动备份：复制 `db/inventory.db` 到 U 盘或网盘
- 或双击 `backup.bat`，备份会保存到 `backups/` 文件夹

建议每周备份一次。

## 项目结构

```
telecom-inventory-system/
├── server.js          # Express 后端
├── db/
│   ├── database.js    # 数据库逻辑
│   └── inventory.db   # SQLite 数据文件（运行后生成）
├── public/            # 前端页面
├── start.bat          # 一键启动
└── backup.bat         # 一键备份
```

## 日常使用建议

1. 开机后运行 `start.bat`
2. 浏览器收藏 http://localhost:3000
3. 定期运行 `backup.bat` 备份数据
