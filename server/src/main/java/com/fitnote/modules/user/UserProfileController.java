package com.fitnote.modules.user;

import com.fitnote.common.BusinessException;
import com.fitnote.common.Result;
import com.fitnote.common.ResultCode;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fitnote.entity.SysUser;
import com.fitnote.mapper.SysUserMapper;
import com.fitnote.modules.user.dto.UserProfileDTO;
import com.fitnote.modules.user.vo.UserProfileVO;
import com.fitnote.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * 普通用户（小程序 / APP / H5）自己的个人资料接口
 * 路径：/api/user/profile、/api/user/avatar
 *
 * 权限：必须为 USER 类型 JWT（由 JwtAuthFilter + anyRequest.authenticated 保证）
 * 所有操作仅能查看 / 修改当前登录用户自己的资料。
 */
@RestController
@RequestMapping("/api/user")
@RequiredArgsConstructor
public class UserProfileController {

    private final SysUserMapper userMapper;

    @Value("${fitnote.avatar.base-dir:./data/avatars}")
    private String avatarBaseDir;

    /** 头像 web 访问前缀（配合 WebMvcConfig 静态映射） */
    @Value("${fitnote.avatar.url-prefix:/avatars}")
    private String avatarUrlPrefix;

    /** 单文件大小上限 5MB（multipart 全局上限为 50MB，这里再防御一次） */
    private static final long MAX_AVATAR_BYTES = 5L * 1024 * 1024;

    /**
     * 获取当前登录用户的个人资料
     */
    @GetMapping("/profile")
    public Result<UserProfileVO> getProfile() {
        Long userId = SecurityUtils.getUserIdOrThrow();
        SysUser u = userMapper.selectById(userId);
        if (u == null) throw new BusinessException(ResultCode.NOT_FOUND, "用户不存在");
        return Result.ok(toVO(u));
    }

    /**
     * 修改当前登录用户的个人资料（昵称 / 头像 / 手机号 / 性别 / 生日）
     * 仅非空字段会被更新；用户名（账号）、密码、统计字段不可在此修改。
     * 昵称独立于用户名，可自由修改。
     */
    @PutMapping("/profile")
    public Result<UserProfileVO> updateProfile(@RequestBody UserProfileDTO dto) {
        Long userId = SecurityUtils.getUserIdOrThrow();
        SysUser u = userMapper.selectById(userId);
        if (u == null) throw new BusinessException(ResultCode.NOT_FOUND, "用户不存在");
        if (u.getStatus() == null || u.getStatus() != 1) {
            throw new BusinessException(ResultCode.FORBIDDEN, "账号已被停用");
        }

        boolean changed = false;
        // 昵称独立于用户名（账号），可自由修改，不做唯一性校验
        if (dto.getNickname() != null) {
            String nick = dto.getNickname().trim();
            if (nick.isEmpty()) throw new BusinessException(ResultCode.BAD_REQUEST, "昵称不能为空");
            if (nick.length() > 30) {
                throw new BusinessException(ResultCode.BAD_REQUEST, "昵称不超过30字");
            }
            u.setNickname(nick);
            changed = true;
        }
        if (dto.getAvatarUrl() != null) {
            String a = dto.getAvatarUrl().trim();
            // 仅允许相对 /avatars/** 路径，杜绝 SSRF / 越权外链
            if (!a.isEmpty() && !a.startsWith(avatarUrlPrefix + "/") && !a.startsWith("/avatars/")) {
                throw new BusinessException(ResultCode.BAD_REQUEST, "头像地址非法");
            }
            u.setAvatarUrl(a.isEmpty() ? null : a);
            changed = true;
        }
        if (dto.getPhone() != null) {
            String p = dto.getPhone().trim();
            if (!p.isEmpty() && !p.matches("^1[3-9]\\d{9}$")) {
                throw new BusinessException(ResultCode.BAD_REQUEST, "手机号格式不正确");
            }
            u.setPhone(p.isEmpty() ? null : p);
            changed = true;
        }
        if (dto.getGender() != null) {
            int g = dto.getGender();
            if (g < 0 || g > 2) throw new BusinessException(ResultCode.BAD_REQUEST, "性别取值非法");
            u.setGender(g);
            changed = true;
        }
        if (dto.getBirthday() != null) {
            if (dto.getBirthday().isAfter(LocalDate.now())) {
                throw new BusinessException(ResultCode.BAD_REQUEST, "生日不能晚于今天");
            }
            u.setBirthday(dto.getBirthday());
            changed = true;
        }

        if (changed) {
            u.setLastActiveTime(LocalDateTime.now());
            userMapper.updateById(u);
        }
        // 回查最新数据返回
        SysUser fresh = userMapper.selectById(userId);
        return Result.ok(toVO(fresh));
    }

    /**
     * 上传当前用户头像（multipart/form-data）
     * 返回可直接用于 PUT /api/user/profile 的 avatarUrl（相对路径 /avatars/xxx.png）
     */
    @PostMapping("/avatar")
    public Result<String> uploadAvatar(@RequestParam("file") MultipartFile file) throws IOException {
        Long userId = SecurityUtils.getUserIdOrThrow();
        if (file == null || file.isEmpty()) {
            throw new BusinessException(ResultCode.BAD_REQUEST, "头像文件为空");
        }
        if (file.getSize() > MAX_AVATAR_BYTES) {
            throw new BusinessException(ResultCode.BAD_REQUEST, "头像不能超过 5MB");
        }
        String contentType = file.getContentType();
        if (contentType == null || !contentType.toLowerCase().startsWith("image/")) {
            throw new BusinessException(ResultCode.BAD_REQUEST, "仅支持图片格式");
        }
        String original = file.getOriginalFilename();
        String ext = ".png";
        if (StringUtils.hasText(original) && original.contains(".")) {
            ext = original.substring(original.lastIndexOf('.')).toLowerCase();
        }
        // 简单白名单
        if (!ext.matches("\\.(png|jpg|jpeg|webp|gif)")) {
            throw new BusinessException(ResultCode.BAD_REQUEST, "仅支持 png/jpg/jpeg/webp/gif 格式");
        }

        Path dir = Paths.get(avatarBaseDir);
        Files.createDirectories(dir);
        String filename = "u" + userId + "_" + System.currentTimeMillis() + "_" +
                UUID.randomUUID().toString().replace("-", "").substring(0, 8) + ext;
        Path target = dir.resolve(filename);
        Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);

        String url = avatarUrlPrefix + "/" + filename;
        // 直接把头像写回当前用户，省去前端再调一次 PUT
        SysUser u = userMapper.selectById(userId);
        if (u != null) {
            u.setAvatarUrl(url);
            u.setLastActiveTime(LocalDateTime.now());
            userMapper.updateById(u);
        }
        return Result.ok(url);
    }

    private UserProfileVO toVO(SysUser u) {
        UserProfileVO vo = new UserProfileVO();
        vo.setId(u.getId());
        vo.setUsername(u.getUsername());
        vo.setNickname(u.getNickname());
        vo.setAvatarUrl(u.getAvatarUrl());
        vo.setPhone(u.getPhone());
        vo.setGender(u.getGender());
        vo.setBirthday(u.getBirthday());
        vo.setTotalTrainDays(u.getTotalTrainDays());
        vo.setTotalVolumeKg(u.getTotalVolumeKg());
        vo.setRegisterTime(u.getRegisterTime());
        return vo;
    }
}
