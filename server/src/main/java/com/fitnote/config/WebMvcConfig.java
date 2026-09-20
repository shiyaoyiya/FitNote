package com.fitnote.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Paths;

@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

    @Value("${fitnote.avatar.base-dir:./data/avatars}")
    private String avatarBaseDir;

    @Value("${fitnote.avatar.url-prefix:/avatars}")
    private String avatarUrlPrefix;

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
                .allowedOriginPatterns("*")
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(true)
                .maxAge(3600L);
    }

    /**
     * 把本地头像目录映射成 /avatars/** 静态可访问，
     * 用户上传的头像可直接通过 HTTP GET 公开访问。
     * 使用 toUri() 自动完成 percent-encoding，避免中文路径导致 file:/// URL 解析失败。
     */
    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        String location = Paths.get(avatarBaseDir).toAbsolutePath().toUri().toString();
        String prefix = avatarUrlPrefix.startsWith("/") ? avatarUrlPrefix : "/" + avatarUrlPrefix;
        String pattern = prefix.endsWith("/") ? prefix + "**" : prefix + "/**";
        registry.addResourceHandler(pattern)
                .addResourceLocations(location);
    }
}
