package com.fitnote.modules.user.dto;

import lombok.Data;

/**
 * 用户自助更新个人资料 DTO
 * 允许更新用户名（即昵称，二者同步）/ 头像 / 手机号 / 性别 / 生日，
 * 密码不在此处修改。
 */
@Data
public class UserProfileDTO {
    /** 用户名（即昵称，二者同步），可空表示不更新 */
    private String username;
    /** 昵称，可空表示不更新（与 username 同步，二选一传值即可） */
    private String nickname;
    /** 头像访问路径（相对 /avatars/xxx.png），可空表示不更新 */
    private String avatarUrl;
    /** 手机号，可空表示不更新 */
    private String phone;
    /** 性别 0未知 1男 2女，可空表示不更新 */
    private Integer gender;
    /** 生日 yyyy-MM-dd，可空表示不更新 */
    private java.time.LocalDate birthday;
}
