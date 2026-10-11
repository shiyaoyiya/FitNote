package com.fitnote.common;

import java.net.URI;
import java.nio.file.Path;
import java.nio.file.Paths;

/**
 * 统一解析配置中的相对存储目录（头像 / 备份等）。
 *
 * <p>application.yml 中 base-dir 默认是相对路径（如 ./data/avatars），
 * 若直接用 {@code Paths.get()} 解析，会随 JVM 启动时的工作目录而变化：
 * 通过 start-backend.bat（cd 到 server 目录）启动和从项目根目录手动启动，
 * 会落到两个不同的目录，导致数据库里记录的 /avatars/xxx 时好时坏。</p>
 *
 * <p>本工具把相对路径统一锚定到运行工件（jar 或 classes）所在模块目录
 * （server 模块根目录），无论从哪里启动都指向同一位置。</p>
 */
public final class StoragePaths {

    private StoragePaths() {
    }

    /**
     * 解析配置目录：绝对路径原样返回；相对路径锚定到 server 模块根目录。
     *
     * <p>锚定规则（Maven 标准布局）：</p>
     * <ul>
     *   <li>以 jar 运行：{server}/target/xxx.jar → 取父目录 {server}/target → 再取父目录 {server}</li>
     *   <li>以 IDE classes 运行：{server}/target/classes → 父目录 {server}/target → 再取父目录 {server}</li>
     * </ul>
     */
    public static Path resolve(String configured) {
        Path p = Paths.get(configured);
        if (p.isAbsolute()) {
            return p.normalize();
        }
        try {
            URI loc = StoragePaths.class.getProtectionDomain().getCodeSource().getLocation().toURI();
            Path base = Paths.get(loc);
            // jar 文件本身或 classes 目录，都先取一次父目录到 target，再取一次父目录到模块根
            if (base.toString().toLowerCase().endsWith(".jar")) {
                base = base.getParent();
            }
            base = base.getParent();
            return base.resolve(configured).normalize();
        } catch (Exception e) {
            // 极端情况下退化为基于当前工作目录的绝对路径
            return Paths.get(configured).toAbsolutePath().normalize();
        }
    }
}
