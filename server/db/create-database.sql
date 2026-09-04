-- FitNote 数据库初始化脚本（仅建库，建表&种子数据由 Spring Boot 自动执行）
SET NAMES utf8mb4;

-- 1. 创建数据库
CREATE DATABASE IF NOT EXISTS fitnote
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_general_ci;

-- 2. 授权（确保 root 可从本地访问）
ALTER USER 'root'@'localhost' IDENTIFIED BY '123456';
FLUSH PRIVILEGES;
