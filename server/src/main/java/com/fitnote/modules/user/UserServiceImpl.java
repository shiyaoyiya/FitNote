package com.fitnote.modules.user;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fitnote.common.BusinessException;
import com.fitnote.common.PageVO;
import com.fitnote.common.ResultCode;
import com.fitnote.entity.BackupRecord;
import com.fitnote.entity.SharedTemplate;
import com.fitnote.entity.SysUser;
import com.fitnote.mapper.BackupRecordMapper;
import com.fitnote.mapper.SharedTemplateMapper;
import com.fitnote.mapper.SysUserMapper;
import com.fitnote.modules.backup.support.BackupStatsExtractResult;
import com.fitnote.modules.backup.support.BackupStatsExtractor;
import com.fitnote.modules.user.dto.UserQueryDTO;
import com.fitnote.modules.user.vo.BodyPartDistVO;
import com.fitnote.modules.user.vo.DailyVolumePointVO;
import com.fitnote.modules.user.vo.ShareTemplateMiniVO;
import com.fitnote.modules.user.vo.UserDetailVO;
import com.fitnote.modules.user.vo.UserTrainingStatsVO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final SysUserMapper userMapper;
    private final BackupRecordMapper backupRecordMapper;
    private final SharedTemplateMapper sharedTemplateMapper;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public PageVO<UserDetailVO> page(UserQueryDTO query) {
        int page = query.getPage() == null || query.getPage() < 1 ? 1 : query.getPage();
        int size = query.getSize() == null || query.getSize() < 1 ? 10 : query.getSize();

        LambdaQueryWrapper<SysUser> wrapper = new LambdaQueryWrapper<>();
        if (StringUtils.hasText(query.getKeyword())) {
            String kw = query.getKeyword();
            wrapper.and(w -> w.like(SysUser::getUsername, kw)
                    .or().like(SysUser::getNickname, kw));
        }
        if (query.getStatus() != null) {
            wrapper.eq(SysUser::getStatus, query.getStatus());
        }
        wrapper.orderByDesc(SysUser::getCreateTime);

        Page<SysUser> p = new Page<>(page, size);
        Page<SysUser> result = userMapper.selectPage(p, wrapper);

        List<UserDetailVO> records = result.getRecords().stream()
                .map(this::toVO)
                .collect(Collectors.toList());
        return new PageVO<>(result.getTotal(), records);
    }

    @Override
    public void ban(Long userId) {
        SysUser u = userMapper.selectById(userId);
        if (u == null) throw new BusinessException(ResultCode.NOT_FOUND, "用户不存在");
        u.setStatus(0);
        userMapper.updateById(u);
    }

    @Override
    public void unban(Long userId) {
        SysUser u = userMapper.selectById(userId);
        if (u == null) throw new BusinessException(ResultCode.NOT_FOUND, "用户不存在");
        u.setStatus(1);
        userMapper.updateById(u);
    }

    @Override
    public UserDetailVO detail(Long userId) {
        SysUser u = userMapper.selectById(userId);
        if (u == null) throw new BusinessException(ResultCode.NOT_FOUND, "用户不存在");
        return toVO(u);
    }

    @Override
    public long countTodayNew() {
        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
        Long cnt = userMapper.selectCount(new LambdaQueryWrapper<SysUser>()
                .ge(SysUser::getRegisterTime, startOfDay));
        return cnt == null ? 0 : cnt;
    }

    private UserDetailVO toVO(SysUser u) {
        UserDetailVO vo = new UserDetailVO();
        vo.setId(u.getId());
        vo.setUsername(u.getUsername());
        vo.setNickname(u.getNickname());
        vo.setAvatarUrl(u.getAvatarUrl());
        vo.setPhone(u.getPhone());
        vo.setGender(u.getGender());
        vo.setBirthday(u.getBirthday());
        vo.setStatus(u.getStatus());
        vo.setTotalTrainDays(u.getTotalTrainDays());
        vo.setTotalVolumeKg(u.getTotalVolumeKg());
        vo.setLastLoginTime(u.getLastLoginTime());
        vo.setLastActiveTime(u.getLastActiveTime());
        vo.setRegisterTime(u.getRegisterTime());
        return vo;
    }

    // --- 训练统计 ---

    @Override
    public int updateStatsGreatest(Long userId, Integer days, BigDecimal volumeKg) {
        if (userId == null) return 0;
        int d = days == null || days < 0 ? 0 : days;
        BigDecimal v = volumeKg == null ? BigDecimal.ZERO : volumeKg.setScale(2, java.math.RoundingMode.HALF_UP);
        return userMapper.updateTrainStatsGreatest(userId, d, v);
    }

    @Override
    public boolean refreshTrainStatsFromLatestBackup(Long userId) {
        if (userId == null) return false;
        BackupRecord latest = backupRecordMapper.selectOne(
                new LambdaQueryWrapper<BackupRecord>()
                        .eq(BackupRecord::getUserId, userId)
                        .orderByDesc(BackupRecord::getCreateTime)
                        .last("LIMIT 1"));
        if (latest == null) return false;

        // 方案 B 兼容：不再信任 BackupRecord 缓存的 totalDays/volumeKg，
        // 因为缓存可能是「按注册日期过滤」功能上线前写入的（含注册前历史数据）。
        // 始终从物理文件重新解析（携带 registerTime），保证正确性；低频异步调用，I/O 可接受。
        BackupStatsExtractResult stats = recalcBackupStatsByFile(latest);

        if (stats == null) return false;

        // 注意：这条分支是「基于最新备份文件的权威重算」，算出来的值就是对用户而言真实的累计训练数据
        // （registerTime 过滤之后 / 文件重新解析之后）。必须直接 SET 覆盖，不能走 GREATEST。
        // GREATEST 会让「值变小（比如方案 B 排除了注册前历史导致天数减少）」的正确更新被静默丢弃。
        SysUser patch = new SysUser();
        patch.setId(userId);
        patch.setTotalTrainDays(stats.getTotalDays());
        patch.setTotalVolumeKg(stats.getTotalVolumeKg());
        int affected = userMapper.updateById(patch);
        return affected > 0;
    }

    @Override
    public void refreshAllTrainStatsFromLatestBackup() {
        List<SysUser> users = userMapper.selectList(null);
        if (users == null || users.isEmpty()) return;
        int ok = 0;
        for (SysUser u : users) {
            try {
                if (Boolean.TRUE.equals(refreshTrainStatsFromLatestBackup(u.getId()))) ok++;
            } catch (Exception e) {
                log.warn("refresh user {} stats failed: {}", u.getId(), e.getMessage());
            }
        }
        log.info("refreshAllTrainStatsFromLatestBackup done, updated {}/{} users", ok, users.size());
    }

    /**
     * 读取备份物理文件，重新解析统计并写回 BackupRecord.totalDays/volumeKg。
     * 文件不存在 / 解析失败时不抛错，返回 null。
     */
    private BackupStatsExtractResult recalcBackupStatsByFile(BackupRecord rec) {
        if (rec == null || !StringUtils.hasText(rec.getFilePath())) return null;
        try {
            Path p = Paths.get(rec.getFilePath());
            if (!Files.exists(p)) {
                log.debug("backup file not found, skip: {}", rec.getFilePath());
                return null;
            }
            String content = new String(Files.readAllBytes(p), StandardCharsets.UTF_8);
            JsonNode root = objectMapper.readTree(content);
            BackupStatsExtractResult r = BackupStatsExtractor.extract(root);
            // 写回备份记录（后续不用再读物理文件）。totalDays 为基本 int（>=0），>0 或 volumeKg 非空即写
            if (r.getTotalDays() > 0 || r.getTotalVolumeKg() != null) {
                BackupRecord patch = new BackupRecord();
                patch.setId(rec.getId());
                patch.setTotalDays(r.getTotalDays());
                patch.setTotalVolumeKg(r.getTotalVolumeKg());
                backupRecordMapper.updateById(patch);
            }
            return r;
        } catch (IOException | RuntimeException e) {
            log.warn("recalc backup {} stats failed: {}", rec.getId(), e.getMessage());
            return null;
        }
    }

    // ============================ 用户画像页：训练统计 ============================

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    @Override
    public UserTrainingStatsVO getUserTrainingStats(Long userId) {
        SysUser u = userMapper.selectById(userId);
        if (u == null) throw new BusinessException(ResultCode.NOT_FOUND, "用户不存在");

        UserTrainingStatsVO vo = new UserTrainingStatsVO();
        vo.setTotalTrainDays(u.getTotalTrainDays() == null ? 0 : u.getTotalTrainDays());
        vo.setTotalVolumeKg(u.getTotalVolumeKg() == null ? BigDecimal.ZERO : u.getTotalVolumeKg());

        // 拉取该用户所有备份（按 createTime 升序）作为累计容量快照的数据来源
        List<BackupRecord> backups = backupRecordMapper.selectList(
                new LambdaQueryWrapper<BackupRecord>()
                        .eq(BackupRecord::getUserId, userId)
                        .select(BackupRecord::getId,
                                BackupRecord::getCreateTime,
                                BackupRecord::getTotalVolumeKg,
                                BackupRecord::getTotalDays,
                                BackupRecord::getTotalTemplates,
                                BackupRecord::getTotalActions)
                        .orderByAsc(BackupRecord::getCreateTime));

        int backupCount = backups == null ? 0 : backups.size();
        vo.setBackupCount(backupCount);

        // 近 30 天累计容量快照：用备份时间戳作为累计值的"上台阶"时刻
        List<DailyVolumePointVO> trend = buildDailyTrend(backups);
        vo.setDailyTrend(trend);

        // 4 大指标的 templates/actions 取最新备份（权威总天数/容量已在上面）
        if (backups != null && !backups.isEmpty()) {
            BackupRecord latest = backups.get(backups.size() - 1);
            vo.setTotalTemplates(latest.getTotalTemplates() == null ? 0 : latest.getTotalTemplates());
            vo.setTotalActions(latest.getTotalActions() == null ? 0 : latest.getTotalActions());
        } else {
            vo.setTotalTemplates(0);
            vo.setTotalActions(0);
        }

        // 部位容量分布：从最新备份文件解析（无文件时返回"暂无数据"）
        List<BodyPartDistVO> bodyDist = buildBodyPartDistribution(userId);
        vo.setBodyPartDist(bodyDist);

        return vo;
    }

    /**
     * 以用户上传备份的 createTime 作为"累计容量台阶"的锚点，构造近 30 天日期序列。
     * <p>实现细节：</p>
     * <ul>
     *   <li>某备份之前的所有天 → 容量为 0（或上一个备份的累计值，向前外推到首个备份日）</li>
     *   <li>从备份日到下一个备份日前一天 → 维持该备份的累计容量值</li>
     *   <li>最后一个备份日之后到今天 → 维持最后一个备份的累计容量值</li>
     * </ul>
     */
    private List<DailyVolumePointVO> buildDailyTrend(List<BackupRecord> backups) {
        LocalDate today = LocalDate.now();
        List<LocalDate> days = new ArrayList<>();
        for (int i = 29; i >= 0; i--) {
            days.add(today.minusDays(i));
        }

        // 把备份按日期分组（同一天多次备份取最后一次的累计值）
        Map<LocalDate, BigDecimal> dayToVolume = new LinkedHashMap<>();
        if (backups != null) {
            for (BackupRecord b : backups) {
                if (b.getCreateTime() == null) continue;
                LocalDate d = b.getCreateTime().toLocalDate();
                BigDecimal v = b.getTotalVolumeKg() == null ? BigDecimal.ZERO : b.getTotalVolumeKg();
                dayToVolume.put(d, v);
            }
        }

        // 把备份的日期-值键值对按日期升序
        List<Map.Entry<LocalDate, BigDecimal>> sorted = dayToVolume.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .collect(Collectors.toList());

        List<DailyVolumePointVO> points = new ArrayList<>();
        BigDecimal carry = BigDecimal.ZERO;
        int idx = 0;
        for (LocalDate d : days) {
            // 把所有 <= d 的备份值滚动到 carry
            while (idx < sorted.size() && !sorted.get(idx).getKey().isAfter(d)) {
                carry = sorted.get(idx).getValue();
                idx++;
            }
            points.add(new DailyVolumePointVO(d.format(DATE_FMT), carry.setScale(2, RoundingMode.HALF_UP)));
        }
        return points;
    }

    /**
     * 从最新备份 JSON 解析训练动作的部位分布。
     * 前端 daydata 里 entries 的 key 是动作名，需要按中文名关键字映射到部位。
     * 无备份或解析失败 → 返回一条「暂无数据 0kg」占位。
     */
    private List<BodyPartDistVO> buildBodyPartDistribution(Long userId) {
        BackupRecord latest = backupRecordMapper.selectOne(
                new LambdaQueryWrapper<BackupRecord>()
                        .eq(BackupRecord::getUserId, userId)
                        .orderByDesc(BackupRecord::getCreateTime)
                        .last("LIMIT 1"));
        if (latest == null || !StringUtils.hasText(latest.getFilePath())) {
            return Collections.singletonList(new BodyPartDistVO("暂无数据", BigDecimal.ZERO));
        }
        try {
            Path p = Paths.get(latest.getFilePath());
            if (!Files.exists(p)) {
                return Collections.singletonList(new BodyPartDistVO("暂无数据", BigDecimal.ZERO));
            }
            String content = new String(Files.readAllBytes(p), StandardCharsets.UTF_8);
            JsonNode root = objectMapper.readTree(content);
            JsonNode daydata = root.path("data").path("fitness_daydata");
            if (!daydata.isObject()) {
                return Collections.singletonList(new BodyPartDistVO("暂无数据", BigDecimal.ZERO));
            }

            // 部位 → 累计容量
            Map<String, BigDecimal> acc = new LinkedHashMap<>();
            acc.put("胸", BigDecimal.ZERO);
            acc.put("背", BigDecimal.ZERO);
            acc.put("腿", BigDecimal.ZERO);
            acc.put("肩", BigDecimal.ZERO);
            acc.put("臂", BigDecimal.ZERO);
            acc.put("核心", BigDecimal.ZERO);
            acc.put("其他", BigDecimal.ZERO);

            Iterator<Map.Entry<String, JsonNode>> days = daydata.fields();
            while (days.hasNext()) {
                JsonNode dayNode = days.next().getValue();
                if (dayNode == null || !dayNode.isObject()) continue;
                JsonNode entries = dayNode.get("entries");
                if (entries == null || !entries.isObject()) continue;
                Iterator<Map.Entry<String, JsonNode>> es = entries.fields();
                while (es.hasNext()) {
                    Map.Entry<String, JsonNode> e = es.next();
                    String actionName = e.getKey();
                    BigDecimal vol = sumEntryVolume(e.getValue());
                    if (vol.compareTo(BigDecimal.ZERO) == 0) continue;
                    String part = classifyBodyPart(actionName);
                    acc.merge(part, vol, BigDecimal::add);
                }
            }

            // 过滤掉 0 的部位，按容量降序
            List<BodyPartDistVO> list = acc.entrySet().stream()
                    .filter(en -> en.getValue().compareTo(BigDecimal.ZERO) > 0)
                    .sorted(Map.Entry.<String, BigDecimal>comparingByValue().reversed())
                    .map(en -> new BodyPartDistVO(en.getKey(), en.getValue().setScale(2, RoundingMode.HALF_UP)))
                    .collect(Collectors.toList());
            if (list.isEmpty()) {
                return Collections.singletonList(new BodyPartDistVO("暂无数据", BigDecimal.ZERO));
            }
            return list;
        } catch (Exception ex) {
            log.warn("buildBodyPartDistribution user {} failed: {}", userId, ex.getMessage());
            return Collections.singletonList(new BodyPartDistVO("暂无数据", BigDecimal.ZERO));
        }
    }

    /**
     * 动作名 → 部位。关键字匹配，未命中归「其他」。
     * 用英文小写比较，兼顾中英文动作名。
     */
    private String classifyBodyPart(String actionName) {
        if (!StringUtils.hasText(actionName)) return "其他";
        String n = actionName.toLowerCase(Locale.ROOT);
        if (containsAny(n, "胸", "chest", "bench", "push-up", "pushup", "飞鸟")) return "胸";
        if (containsAny(n, "背", "back", "row", "pull", "dead", "硬拉", "引体", "高位")) return "背";
        if (containsAny(n, "腿", "leg", "squat", "lunge", "深蹲", "箭步", "硬拉")) return "腿";
        if (containsAny(n, "肩", "shoulder", "press", "侧平举", "推举")) return "肩";
        if (containsAny(n, "臂", "bicep", "tricep", "curl", "弯举", "臂屈伸", "臂")) return "臂";
        if (containsAny(n, "腹", "核心", "core", "crunch", "plank", "平板", "卷腹")) return "核心";
        return "其他";
    }

    private boolean containsAny(String text, String... keys) {
        for (String k : keys) if (text.contains(k)) return true;
        return false;
    }

    /** 复用 BackupStatsExtractor 的单 entry 容量算法（这里不直接调私有方法，复刻一份最小集合） */
    private BigDecimal sumEntryVolume(JsonNode entry) {
        if (entry == null || entry.isNull()) return BigDecimal.ZERO;
        BigDecimal s = BigDecimal.ZERO;
        JsonNode stages = entry.get("stages");
        if (stages != null && stages.isArray()) {
            for (JsonNode st : stages) s = s.add(stageVol(st));
            if (s.compareTo(BigDecimal.ZERO) != 0) return s;
        }
        BigDecimal t = toBD(entry.get("total"));
        if (t.compareTo(BigDecimal.ZERO) != 0) return t;
        JsonNode input = entry.get("input");
        if (input != null && input.isTextual()) {
            BigDecimal v = parseInput(input.asText());
            if (v.compareTo(BigDecimal.ZERO) != 0) return v;
        }
        return BigDecimal.ZERO;
    }

    private BigDecimal stageVol(JsonNode st) {
        if (st == null || st.isNull()) return BigDecimal.ZERO;
        BigDecimal vl = toBD(st.get("volumeLoad"));
        if (vl.compareTo(BigDecimal.ZERO) != 0) return vl;
        BigDecimal w = toBD(st.get("weight"));
        BigDecimal r = toBD(st.get("reps"));
        BigDecimal wr = w.multiply(r);
        if (wr.compareTo(BigDecimal.ZERO) != 0) return wr;
        return toBD(st.get("total"));
    }

    private BigDecimal toBD(JsonNode n) {
        if (n == null || n.isNull() || n.isMissingNode()) return BigDecimal.ZERO;
        try {
            return new BigDecimal(n.asText()).setScale(2, RoundingMode.HALF_UP);
        } catch (Exception e) {
            return BigDecimal.ZERO;
        }
    }

    private BigDecimal parseInput(String text) {
        if (text == null) return BigDecimal.ZERO;
        String[] parts = text.trim().split("\\s*[×xX*]\\s*");
        if (parts.length != 2) return BigDecimal.ZERO;
        try {
            return new BigDecimal(parts[0].trim()).multiply(new BigDecimal(parts[1].trim()));
        } catch (Exception e) {
            return BigDecimal.ZERO;
        }
    }

    // ============================ 用户画像页：分享模板列表 ============================

    @Override
    public PageVO<ShareTemplateMiniVO> pageUserShareTemplates(Long userId, Integer page, Integer size) {
        int p = page == null || page < 1 ? 1 : page;
        int s = size == null || size < 1 ? 5 : size;

        Page<SharedTemplate> pg = new Page<>(p, s);
        Page<SharedTemplate> result = sharedTemplateMapper.selectPage(pg,
                new LambdaQueryWrapper<SharedTemplate>()
                        .eq(SharedTemplate::getUserId, userId)
                        .select(SharedTemplate.class, t -> !"template_data".equals(t.getColumn()))
                        .orderByDesc(SharedTemplate::getCreateTime));

        List<ShareTemplateMiniVO> records = result.getRecords().stream()
                .map(this::toShareMiniVO)
                .collect(Collectors.toList());
        return new PageVO<>(result.getTotal(), records);
    }

    private ShareTemplateMiniVO toShareMiniVO(SharedTemplate st) {
        ShareTemplateMiniVO vo = new ShareTemplateMiniVO();
        vo.setId(st.getId());
        vo.setName(st.getName());
        vo.setDescription(st.getDescription());
        vo.setCoverColor(st.getCoverColor());
        vo.setActionCount(st.getActionCount());
        vo.setTotalSets(st.getTotalSets());
        vo.setStatus(st.getStatus());
        vo.setRejectReason(st.getRejectReason());
        vo.setViewCount(st.getViewCount() == null ? 0 : st.getViewCount());
        vo.setCollectCount(st.getCollectCount() == null ? 0 : st.getCollectCount());
        vo.setDownloadCount(st.getDownloadCount() == null ? 0 : st.getDownloadCount());
        vo.setCreateTime(st.getCreateTime());
        return vo;
    }
}
