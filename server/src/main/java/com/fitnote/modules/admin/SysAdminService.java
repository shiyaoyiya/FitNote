package com.fitnote.modules.admin;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fitnote.common.BusinessException;
import com.fitnote.common.PageVO;
import com.fitnote.common.ResultCode;
import com.fitnote.entity.SysAdmin;
import com.fitnote.entity.SysMenu;
import com.fitnote.entity.SysRoleMenu;
import com.fitnote.mapper.SysAdminMapper;
import com.fitnote.mapper.SysMenuMapper;
import com.fitnote.mapper.SysRoleMenuMapper;
import com.fitnote.modules.admin.dto.AdminSaveDTO;
import com.fitnote.modules.admin.dto.ResetPwdDTO;
import com.fitnote.modules.admin.dto.SaveRoleMenuDTO;
import com.fitnote.modules.admin.vo.AdminVO;
import com.fitnote.modules.admin.vo.MenuTreeVO;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SysAdminService {

    private final SysAdminMapper adminMapper;
    private final SysMenuMapper menuMapper;
    private final SysRoleMenuMapper roleMenuMapper;
    private final PasswordEncoder passwordEncoder;

    /* --------------------- Admin 列表/CRUD --------------------- */

    public PageVO<AdminVO> page(Integer page, Integer size, String keyword, String roleCode, Integer status) {
        int p = page == null || page < 1 ? 1 : page;
        int s = size == null || size < 1 ? 10 : size;
        LambdaQueryWrapper<SysAdmin> w = new LambdaQueryWrapper<>();
        if (StringUtils.hasText(keyword)) {
            String k = keyword.trim();
            w.and(x -> x.like(SysAdmin::getUsername, k).or().like(SysAdmin::getNickname, k));
        }
        if (StringUtils.hasText(roleCode)) w.eq(SysAdmin::getRoleCode, roleCode);
        if (status != null) w.eq(SysAdmin::getStatus, status);
        w.orderByDesc(SysAdmin::getCreateTime);
        Page<SysAdmin> pr = adminMapper.selectPage(new Page<>(p, s), w);
        List<SysAdmin> rs = pr.getRecords();
        if (rs.isEmpty()) return new PageVO<>(pr.getTotal(), Collections.emptyList());
        List<AdminVO> vos = rs.stream().map(this::toAdminVO).collect(Collectors.toList());
        return new PageVO<>(pr.getTotal(), vos);
    }

    public Long saveOrUpdate(AdminSaveDTO dto) {
        if (dto.getId() == null) {
            if (!StringUtils.hasText(dto.getPassword()) || dto.getPassword().length() < 6) {
                throw new BusinessException(ResultCode.BAD_REQUEST, "新增管理员密码必填且长度不少于6位");
            }
            Long cnt = adminMapper.selectCount(new LambdaQueryWrapper<SysAdmin>()
                    .eq(SysAdmin::getUsername, dto.getUsername().trim()));
            if (cnt != null && cnt > 0) {
                throw new BusinessException(ResultCode.CONFLICT, "用户名已存在");
            }
            SysAdmin a = new SysAdmin();
            a.setUsername(dto.getUsername().trim());
            a.setPassword(passwordEncoder.encode(dto.getPassword()));
            a.setNickname(dto.getNickname());
            a.setRoleCode(dto.getRoleCode());
            a.setStatus(dto.getStatus() == null ? 1 : dto.getStatus());
            adminMapper.insert(a);
            return a.getId();
        } else {
            SysAdmin a = adminMapper.selectById(dto.getId());
            if (a == null) throw new BusinessException(ResultCode.NOT_FOUND, "管理员不存在");
            // 校验用户名唯一性（排除自己）
            if (!a.getUsername().equals(dto.getUsername().trim())) {
                Long cnt = adminMapper.selectCount(new LambdaQueryWrapper<SysAdmin>()
                        .eq(SysAdmin::getUsername, dto.getUsername().trim()));
                if (cnt != null && cnt > 0) {
                    throw new BusinessException(ResultCode.CONFLICT, "用户名已存在");
                }
                a.setUsername(dto.getUsername().trim());
            }
            a.setNickname(dto.getNickname());
            a.setRoleCode(dto.getRoleCode());
            if (dto.getStatus() != null) a.setStatus(dto.getStatus());
            adminMapper.updateById(a);
            return a.getId();
        }
    }

    public void resetPassword(Long id, ResetPwdDTO dto) {
        SysAdmin a = adminMapper.selectById(id);
        if (a == null) throw new BusinessException(ResultCode.NOT_FOUND, "管理员不存在");
        a.setPassword(passwordEncoder.encode(dto.getNewPassword()));
        adminMapper.updateById(a);
    }

    public void setStatus(Long id, Integer status) {
        SysAdmin a = adminMapper.selectById(id);
        if (a == null) throw new BusinessException(ResultCode.NOT_FOUND, "管理员不存在");
        if ("admin".equals(a.getUsername()) && status == 0) {
            throw new BusinessException(ResultCode.BAD_REQUEST, "默认超级管理员不可停用");
        }
        a.setStatus(status == 1 ? 1 : 0);
        adminMapper.updateById(a);
    }

    public void delete(Long id) {
        SysAdmin a = adminMapper.selectById(id);
        if (a == null) throw new BusinessException(ResultCode.NOT_FOUND, "管理员不存在");
        if ("admin".equals(a.getUsername())) {
            throw new BusinessException(ResultCode.BAD_REQUEST, "默认超级管理员不可删除");
        }
        adminMapper.deleteById(id);
    }

    /* --------------------- 角色菜单 --------------------- */

    public List<MenuTreeVO> menuTree() {
        List<SysMenu> all = menuMapper.selectList(new LambdaQueryWrapper<SysMenu>()
                .orderByAsc(SysMenu::getSortOrder, SysMenu::getId));
        return buildTree(all);
    }

    public List<Long> getRoleMenuIds(String roleCode) {
        List<SysRoleMenu> list = roleMenuMapper.selectList(new LambdaQueryWrapper<SysRoleMenu>()
                .eq(SysRoleMenu::getRoleCode, roleCode));
        return list.stream().map(SysRoleMenu::getMenuId).collect(Collectors.toList());
    }

    @Transactional(rollbackFor = Exception.class)
    public void saveRoleMenu(SaveRoleMenuDTO dto) {
        String rc = dto.getRoleCode();
        roleMenuMapper.delete(new LambdaQueryWrapper<SysRoleMenu>().eq(SysRoleMenu::getRoleCode, rc));
        if (dto.getMenuIds() != null && !dto.getMenuIds().isEmpty()) {
            // 去重保持顺序
            List<Long> ids = new ArrayList<>(new LinkedHashSet<>(dto.getMenuIds()));
            for (Long mid : ids) {
                SysRoleMenu rm = new SysRoleMenu();
                rm.setRoleCode(rc);
                rm.setMenuId(mid);
                roleMenuMapper.insert(rm);
            }
        }
    }

    /* --------------------- 辅助 --------------------- */

    private AdminVO toAdminVO(SysAdmin a) {
        AdminVO vo = new AdminVO();
        vo.setId(a.getId());
        vo.setUsername(a.getUsername());
        vo.setNickname(a.getNickname());
        vo.setRoleCode(a.getRoleCode());
        vo.setRoleText(roleText(a.getRoleCode()));
        vo.setStatus(a.getStatus());
        vo.setLastLoginTime(a.getLastLoginTime());
        vo.setCreateTime(a.getCreateTime());
        return vo;
    }

    private String roleText(String r) {
        if ("ADMIN".equals(r)) return "超级管理员";
        if ("AUDITOR".equals(r)) return "审核员";
        return r == null ? "未知" : r;
    }

    private List<MenuTreeVO> buildTree(List<SysMenu> list) {
        Map<Long, MenuTreeVO> map = new LinkedHashMap<>();
        for (SysMenu m : list) {
            MenuTreeVO v = new MenuTreeVO();
            v.setId(m.getId());
            v.setParentId(m.getParentId());
            v.setName(m.getName());
            v.setTitle(m.getTitle());
            v.setPath(m.getPath());
            v.setComponent(m.getComponent());
            v.setIcon(m.getIcon());
            v.setSortOrder(m.getSortOrder());
            v.setVisible(m.getVisible());
            v.setPerms(m.getPerms());
            v.setType(m.getType());
            v.setChildren(new ArrayList<>());
            map.put(m.getId(), v);
        }
        List<MenuTreeVO> roots = new ArrayList<>();
        for (MenuTreeVO v : map.values()) {
            if (v.getParentId() == null || v.getParentId() == 0L) {
                roots.add(v);
            } else {
                MenuTreeVO p = map.get(v.getParentId());
                if (p != null) p.getChildren().add(v);
            }
        }
        return roots;
    }
}
