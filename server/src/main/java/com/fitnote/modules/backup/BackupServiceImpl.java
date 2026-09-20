package com.fitnote.modules.backup;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fitnote.common.BusinessException;
import com.fitnote.common.PageVO;
import com.fitnote.common.ResultCode;
import com.fitnote.entity.BackupRecord;
import com.fitnote.entity.SysUser;
import com.fitnote.mapper.BackupRecordMapper;
import com.fitnote.mapper.SysUserMapper;
import com.fitnote.modules.backup.dto.BackupQueryDTO;
import com.fitnote.modules.backup.vo.BackupActionVO;
import com.fitnote.modules.backup.vo.BackupAnniversaryVO;
import com.fitnote.modules.backup.vo.BackupDayActionEntryVO;
import com.fitnote.modules.backup.vo.BackupDayVO;
import com.fitnote.modules.backup.vo.BackupListVO;
import com.fitnote.modules.backup.vo.BackupPreviewVO;
import com.fitnote.modules.backup.vo.BackupTemplateVO;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.io.File;
import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BackupServiceImpl implements BackupService {

    private final BackupRecordMapper backupRecordMapper;
    private final SysUserMapper userMapper;
    private static final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public PageVO<BackupListVO> page(BackupQueryDTO query) {
        int page = query.getPage() == null || query.getPage() < 1 ? 1 : query.getPage();
        int size = query.getSize() == null || query.getSize() < 1 ? 10 : query.getSize();

        LambdaQueryWrapper<BackupRecord> wrapper = new LambdaQueryWrapper<>();
        if (query.getUserId() != null) {
            wrapper.eq(BackupRecord::getUserId, query.getUserId());
        }
        if (StringUtils.hasText(query.getKeyword())) {
            wrapper.like(BackupRecord::getFileName, query.getKeyword());
        }
        wrapper.orderByDesc(BackupRecord::getCreateTime);

        Page<BackupRecord> p = new Page<>(page, size);
        Page<BackupRecord> result = backupRecordMapper.selectPage(p, wrapper);
        List<BackupRecord> records = result.getRecords();
        if (records.isEmpty()) {
            return new PageVO<>(result.getTotal(), Collections.emptyList());
        }

        Set<Long> userIds = records.stream()
                .map(BackupRecord::getUserId)
                .filter(java.util.Objects::nonNull)
                .collect(Collectors.toSet());
        Map<Long, String> userNames = userIds.isEmpty()
                ? Collections.emptyMap()
                : userMapper.selectBatchIds(userIds).stream()
                .collect(Collectors.toMap(SysUser::getId,
                        u -> u.getNickname() != null && !u.getNickname().isEmpty()
                                ? u.getNickname() : u.getUsername(),
                        (a, b) -> a));

        List<BackupListVO> vos = records.stream()
                .map(r -> toVO(r, userNames))
                .collect(Collectors.toList());
        return new PageVO<>(result.getTotal(), vos);
    }

    @Override
    public void delete(Long id) {
        // @TableLogic 已开启逻辑删除，deleteById 会自动改为 update deleted=1
        BackupRecord existing = backupRecordMapper.selectById(id);
        if (existing == null) throw new BusinessException(ResultCode.NOT_FOUND, "备份记录不存在");
        backupRecordMapper.deleteById(id);
    }

    @Override
    public BackupListVO detail(Long id) {
        BackupRecord r = backupRecordMapper.selectById(id);
        if (r == null) throw new BusinessException(ResultCode.NOT_FOUND, "备份记录不存在");
        Map<Long, String> userNames = Collections.emptyMap();
        if (r.getUserId() != null) {
            SysUser u = userMapper.selectById(r.getUserId());
            if (u != null) {
                String name = u.getNickname() != null && !u.getNickname().isEmpty()
                        ? u.getNickname() : u.getUsername();
                userNames = Collections.singletonMap(u.getId(), name);
            }
        }
        return toVO(r, userNames);
    }

    @Override
    public BackupListVO saveMine(BackupRecord record) {
        backupRecordMapper.insert(record);
        // 查回后返回（含自动填充 createTime）
        BackupRecord r = backupRecordMapper.selectById(record.getId());
        Map<Long, String> userNames = Collections.emptyMap();
        if (r.getUserId() != null) {
            SysUser u = userMapper.selectById(r.getUserId());
            if (u != null) {
                String name = u.getNickname() != null && !u.getNickname().isEmpty()
                        ? u.getNickname() : u.getUsername();
                userNames = Collections.singletonMap(u.getId(), name);
            }
        }
        return toVO(r, userNames);
    }

    @Override
    public BackupRecord ensureOwned(Long id, Long userId) {
        BackupRecord r = backupRecordMapper.selectById(id);
        if (r == null) throw new BusinessException(ResultCode.NOT_FOUND, "备份记录不存在");
        if (userId == null || !userId.equals(r.getUserId())) {
            throw new BusinessException(ResultCode.FORBIDDEN, "无权操作该备份");
        }
        return r;
    }

    @Override
    public ResponseEntity<Resource> downloadBackupAsResponse(Long id) {
        BackupRecord r = backupRecordMapper.selectById(id);
        if (r == null) throw new BusinessException(ResultCode.NOT_FOUND, "备份记录不存在");
        File f = StringUtils.hasText(r.getFilePath()) ? new File(r.getFilePath()) : null;
        if (f == null || !f.exists() || !f.isFile()) {
            throw new BusinessException(ResultCode.NOT_FOUND, "备份文件不存在或已被清理");
        }
        Resource res = new FileSystemResource(f);
        String name = r.getFileName() == null || r.getFileName().isEmpty()
                ? ("backup_" + id + ".json") : r.getFileName();
        String encoded;
        try {
            encoded = URLEncoder.encode(name, StandardCharsets.UTF_8.name()).replace("+", "%20");
        } catch (Exception ex) {
            encoded = "backup_" + id + ".json";
        }
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("application/json;charset=UTF-8"))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + name + "\"; filename*=UTF-8''" + encoded)
                .contentLength(f.length())
                .body(res);
    }

    @Override
    public List<BackupTemplateVO> getBackupTemplates(Long id) {
        JsonNode root = readBackupJson(id);
        return extractTemplatesFromBackup(root);
    }

    @Override
    public BackupPreviewVO getBackupPreview(Long id) {
        JsonNode root = readBackupJson(id);
        BackupPreviewVO vo = new BackupPreviewVO();

        // 基本信息
        vo.setVersion(root.has("version") ? root.get("version").asText() : null);
        vo.setBackupTime(root.has("backupTime") && root.get("backupTime").isNumber()
                ? root.get("backupTime").asLong() : null);
        vo.setBackupType(root.has("backupType") ? root.get("backupType").asText() : null);

        JsonNode data = root.has("data") ? root.get("data") : null;
        if (data == null || !data.isObject()) {
            vo.setTotalDays(0);
            vo.setTotalTemplates(0);
            vo.setTotalActions(0);
            vo.setTotalAnniversaries(0);
            return vo;
        }

        // 模板列表
        List<BackupTemplateVO> templates = extractTemplatesFromBackup(root);
        vo.setTemplates(templates);
        vo.setTotalTemplates(templates.size());

        // 动作列表
        List<BackupActionVO> actions = extractActionsFromBackup(data);
        vo.setActions(actions);
        vo.setTotalActions(actions.size());

        // 训练数据列表
        List<BackupDayVO> dayDataList = extractDayDataFromBackup(data);
        vo.setDayDataList(dayDataList);
        vo.setTotalDays(dayDataList.size());

        // 计算总容量
        java.math.BigDecimal totalVol = java.math.BigDecimal.ZERO;
        for (BackupDayVO day : dayDataList) {
            if (day.getTotalVolumeKg() != null) {
                totalVol = totalVol.add(day.getTotalVolumeKg());
            }
        }
        vo.setTotalVolumeKg(totalVol);

        // 纪念日列表
        List<BackupAnniversaryVO> anniversaries = extractAnniversariesFromBackup(data);
        vo.setAnniversaries(anniversaries);
        vo.setTotalAnniversaries(anniversaries.size());

        return vo;
    }

    @Override
    public ResponseEntity<Resource> exportTemplatesAsText(Long id) {
        BackupRecord r = backupRecordMapper.selectById(id);
        if (r == null) throw new BusinessException(ResultCode.NOT_FOUND, "备份记录不存在");

        JsonNode root = readBackupJson(id);
        String json = buildTemplateExportJson(root, r);

        byte[] bytes = json.getBytes(StandardCharsets.UTF_8);
        ByteArrayResource resource = new ByteArrayResource(bytes);

        String baseName = r.getFileName() == null || r.getFileName().isEmpty()
                ? ("backup_" + id) : r.getFileName().replaceAll("\\.json$", "");
        String fileName = baseName + "_templates.json";
        String encoded;
        try {
            encoded = URLEncoder.encode(fileName, StandardCharsets.UTF_8.name()).replace("+", "%20");
        } catch (Exception ex) {
            encoded = "backup_templates.json";
        }

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("application/json;charset=UTF-8"))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + fileName + "\"; filename*=UTF-8''" + encoded)
                .contentLength(bytes.length)
                .body(resource);
    }

    // --- 内部辅助方法 ---

    /** 读取备份 JSON 文件并返回根节点 */
    private JsonNode readBackupJson(Long id) {
        BackupRecord r = backupRecordMapper.selectById(id);
        if (r == null) throw new BusinessException(ResultCode.NOT_FOUND, "备份记录不存在");
        File f = StringUtils.hasText(r.getFilePath()) ? new File(r.getFilePath()) : null;
        if (f == null || !f.exists() || !f.isFile()) {
            throw new BusinessException(ResultCode.NOT_FOUND, "备份文件不存在或已被清理");
        }
        try {
            return objectMapper.readTree(f);
        } catch (IOException e) {
            throw new BusinessException(ResultCode.INTERNAL, "备份文件解析失败");
        }
    }

    /** 从备份 JSON 中提取模板列表 */
    private List<BackupTemplateVO> extractTemplatesFromBackup(JsonNode root) {
        List<BackupTemplateVO> result = new ArrayList<>();
        if (root == null || root.isNull() || root.isMissingNode()) return result;

        JsonNode data = root.get("data");
        if (data == null || !data.isObject()) return result;

        JsonNode templates = data.get("fitness_templates");
        if (templates == null || !templates.isArray()) return result;

        for (JsonNode tpl : templates) {
            BackupTemplateVO vo = new BackupTemplateVO();
            vo.setId(tpl.has("id") ? tpl.get("id").asText() : null);
            vo.setName(tpl.has("name") ? tpl.get("name").asText() : "未命名模板");
            vo.setColor(tpl.has("color") ? tpl.get("color").asText() : null);

            // 提取动作列表（优先用 actions 数组，其次用 actionOrder）
            List<String> actionList = new ArrayList<>();
            JsonNode actionsNode = tpl.get("actions");
            if (actionsNode != null && actionsNode.isArray() && actionsNode.size() > 0) {
                for (JsonNode a : actionsNode) {
                    if (a != null && !a.isNull()) {
                        actionList.add(a.asText());
                    }
                }
            } else {
                JsonNode orderNode = tpl.get("actionOrder");
                if (orderNode != null && orderNode.isArray()) {
                    for (JsonNode a : orderNode) {
                        if (a != null && !a.isNull()) {
                            actionList.add(a.asText());
                        }
                    }
                }
            }
            vo.setActions(actionList);
            vo.setActionCount(actionList.size());

            // 提取动作组数映射
            Map<String, Integer> actionSets = new HashMap<>();
            JsonNode setsNode = tpl.get("actionSets");
            if (setsNode != null && setsNode.isObject()) {
                Iterator<Map.Entry<String, JsonNode>> it = setsNode.fields();
                while (it.hasNext()) {
                    Map.Entry<String, JsonNode> e = it.next();
                    JsonNode val = e.getValue();
                    if (val != null && val.isNumber()) {
                        actionSets.put(e.getKey(), val.asInt());
                    }
                }
            }
            vo.setActionSets(actionSets);

            result.add(vo);
        }
        return result;
    }

    /**
     * 构建模板导出 JSON（兼容备份导入格式）
     * 结构：{ version, backupTime, backupType: "full", data: { fitness_templates: [...] } }
     */
    private String buildTemplateExportJson(JsonNode root, BackupRecord record) {
        try {
            // 构建导出对象，保留原备份的模板完整数据
            Map<String, Object> exportData = new HashMap<>();

            // 版本信息
            String version = root.has("version") ? root.get("version").asText() : "1.0";
            exportData.put("version", version);

            // 备份时间
            if (root.has("backupTime")) {
                exportData.put("backupTime", root.get("backupTime").asLong());
            } else {
                exportData.put("backupTime", System.currentTimeMillis());
            }

            // 备份类型（标记为模板导出）
            exportData.put("backupType", "template_export");

            // data 部分：只包含模板数组
            Map<String, Object> data = new HashMap<>();
            JsonNode templatesNode = root.has("data") && root.get("data").has("fitness_templates")
                    ? root.get("data").get("fitness_templates")
                    : null;
            if (templatesNode != null && templatesNode.isArray()) {
                // 使用 objectMapper 转换 JsonNode 为 List 以保留完整结构
                List<Object> templates = objectMapper.convertValue(
                        templatesNode,
                        objectMapper.getTypeFactory().constructCollectionType(List.class, Object.class)
                );
                data.put("fitness_templates", templates);
            } else {
                data.put("fitness_templates", new ArrayList<>());
            }

            exportData.put("data", data);

            return objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(exportData);
        } catch (Exception e) {
            throw new BusinessException(ResultCode.INTERNAL, "模板导出失败");
        }
    }

    /** 从备份 data 节点中提取动作列表 */
    private List<BackupActionVO> extractActionsFromBackup(JsonNode data) {
        List<BackupActionVO> result = new ArrayList<>();
        JsonNode actions = data.get("fitness_actions");
        if (actions == null || !actions.isArray()) return result;

        for (JsonNode act : actions) {
            BackupActionVO vo = new BackupActionVO();
            vo.setId(act.has("id") ? act.get("id").asText() : null);
            vo.setName(act.has("name") ? act.get("name").asText() : "");
            vo.setCategoryName(act.has("categoryName") ? act.get("categoryName").asText() : null);

            List<String> cats = new ArrayList<>();
            JsonNode catsNode = act.get("categories");
            if (catsNode != null && catsNode.isArray()) {
                for (JsonNode c : catsNode) {
                    if (c != null && !c.isNull()) {
                        cats.add(c.asText());
                    }
                }
            }
            vo.setCategories(cats);
            result.add(vo);
        }
        return result;
    }

    /** 从备份 data 节点中提取训练日数据列表（按日期倒序） */
    private List<BackupDayVO> extractDayDataFromBackup(JsonNode data) {
        List<BackupDayVO> result = new ArrayList<>();
        JsonNode daydata = data.get("fitness_daydata");
        if (daydata == null || !daydata.isObject()) return result;

        Iterator<Map.Entry<String, JsonNode>> it = daydata.fields();
        while (it.hasNext()) {
            Map.Entry<String, JsonNode> e = it.next();
            String date = e.getKey();
            JsonNode dayNode = e.getValue();
            if (dayNode == null || dayNode.isNull() || !dayNode.isObject()) continue;

            BackupDayVO vo = new BackupDayVO();
            vo.setDate(date);

            // 动作列表
            List<String> actionNames = new ArrayList<>();
            Map<String, List<       BackupDayActionEntryVO>> actionEntries = new HashMap<>();
            JsonNode entriesNode = dayNode.get("entries");
            java.math.BigDecimal dayVol = java.math.BigDecimal.ZERO;
            if (entriesNode != null && entriesNode.isObject()) {
                Iterator<Map.Entry<String, JsonNode>> entriesIt = entriesNode.fields();
                while (entriesIt.hasNext()) {
                    Map.Entry<String, JsonNode> entry = entriesIt.next();
                    String actionName = entry.getKey();
                    actionNames.add(actionName);

                    List<BackupDayActionEntryVO> entryList = new ArrayList<>();
                    JsonNode arr = entry.getValue();
                    if (arr != null && arr.isArray()) {
                        for (JsonNode entryItem : arr) {
                            if (entryItem == null || entryItem.isNull()) continue;
                            dayVol = dayVol.add(sumEntryVolume(entryItem));

                            BackupDayActionEntryVO entryVO = new BackupDayActionEntryVO();
                            String input = entryItem.has("input") ? entryItem.get("input").asText() : null;
                            entryVO.setInput(input);
                            entryVO.setTotal(toBigDecimal(entryItem.get("total")));

                            // 解析 input 为 weight 和 reps
                            if (input != null && !input.isEmpty()) {
                                String[] parts = input.trim().split("\\s*[×xX*]\\s*");
                                if (parts.length == 2) {
                                    try {
                                        entryVO.setReps(Integer.parseInt(parts[0].trim()));
                                        entryVO.setWeight(new java.math.BigDecimal(parts[1].trim()));
                                    } catch (Exception ex) {
                                        // 解析失败忽略
                                    }
                                }
                            }
                            entryList.add(entryVO);
                        }
                    }
                    actionEntries.put(actionName, entryList);
                }
            }
            vo.setActionNames(actionNames);
            vo.setActionEntries(actionEntries);
            vo.setActionCount(actionNames.size());
            vo.setTotalVolumeKg(dayVol);

            // 模板名列表
            List<String> templateNames = new ArrayList<>();
            JsonNode templatesNode = dayNode.get("templates");
            if (templatesNode != null && templatesNode.isObject()) {
                Iterator<String> tplIt = templatesNode.fieldNames();
                while (tplIt.hasNext()) {
                    templateNames.add(tplIt.next());
                }
            }
            vo.setTemplateNames(templateNames);

            result.add(vo);
        }

        // 按日期倒序排列
        result.sort((a, b) -> b.getDate().compareTo(a.getDate()));
        return result;
    }

    /** 从备份 data 节点中提取纪念日列表 */
    private List<BackupAnniversaryVO> extractAnniversariesFromBackup(JsonNode data) {
        List<BackupAnniversaryVO> result = new ArrayList<>();
        JsonNode annivs = data.get("fitness_annivs");
        if (annivs == null || !annivs.isArray()) return result;

        for (JsonNode a : annivs) {
            BackupAnniversaryVO vo = new BackupAnniversaryVO();
            vo.setId(a.has("id") ? a.get("id").asText() : null);
            vo.setTitle(a.has("title") ? a.get("title").asText() : "");
            vo.setDate(a.has("date") ? a.get("date").asText() : null);
            vo.setType(a.has("type") ? a.get("type").asText() : null);
            vo.setEmoji(a.has("emoji") ? a.get("emoji").asText() : null);
            result.add(vo);
        }
        return result;
    }

    // --- 容量计算辅助方法 ---

    /** 单个 entry（可能极简或含 stages 数组）的容量合计。 */
    private java.math.BigDecimal sumEntryVolume(JsonNode entry) {
        if (entry == null || entry.isNull()) return java.math.BigDecimal.ZERO;
        // 存在 stages 数组优先走 stages（新版格式）
        JsonNode stages = entry.get("stages");
        if (stages != null && stages.isArray() && stages.size() > 0) {
            java.math.BigDecimal s = java.math.BigDecimal.ZERO;
            for (JsonNode stage : stages) {
                s = s.add(sumStageVolume(stage));
            }
            if (s.compareTo(java.math.BigDecimal.ZERO) != 0) return s;
        }
        // 否则尝试 entry 自身的 total / input 字段（旧极简格式）
        java.math.BigDecimal entryTotal = toBigDecimal(entry.get("total"));
        if (entryTotal.compareTo(java.math.BigDecimal.ZERO) != 0) return entryTotal;
        JsonNode inputN = entry.get("input");
        if (inputN != null && !inputN.isNull() && inputN.isTextual()) {
            java.math.BigDecimal fromInput = parseInputMultiplication(inputN.asText());
            if (fromInput.compareTo(java.math.BigDecimal.ZERO) != 0) return fromInput;
        }
        return java.math.BigDecimal.ZERO;
    }

    /** 单个 stage 的容量：volumeLoad 优先 > weight*reps > total */
    private java.math.BigDecimal sumStageVolume(JsonNode stage) {
        if (stage == null || stage.isNull()) return java.math.BigDecimal.ZERO;
        java.math.BigDecimal vl = toBigDecimal(stage.get("volumeLoad"));
        if (vl.compareTo(java.math.BigDecimal.ZERO) != 0) return vl;
        java.math.BigDecimal w = toBigDecimal(stage.get("weight"));
        java.math.BigDecimal r = toBigDecimal(stage.get("reps"));
        java.math.BigDecimal wr = w.multiply(r);
        if (wr.compareTo(java.math.BigDecimal.ZERO) != 0) return wr;
        return toBigDecimal(stage.get("total"));
    }

    /** "10×50" / "10*50" / "10 x 50" → 500；解析失败 → 0 */
    private java.math.BigDecimal parseInputMultiplication(String text) {
        if (text == null) return java.math.BigDecimal.ZERO;
        String t = text.trim();
        if (t.isEmpty()) return java.math.BigDecimal.ZERO;
        try {
            String[] parts = t.split("\\s*[×xX*]\\s*");
            if (parts.length != 2) return java.math.BigDecimal.ZERO;
            java.math.BigDecimal a = new java.math.BigDecimal(parts[0].trim());
            java.math.BigDecimal b = new java.math.BigDecimal(parts[1].trim());
            return a.multiply(b);
        } catch (Exception e) {
            return java.math.BigDecimal.ZERO;
        }
    }

    /** JsonNode → BigDecimal，Number / String / Null / 空 全部兼容；非法 → 0 */
    private java.math.BigDecimal toBigDecimal(JsonNode n) {
        if (n == null || n.isNull() || n.isMissingNode()) return java.math.BigDecimal.ZERO;
        if (n.isNumber()) {
            try {
                return new java.math.BigDecimal(n.asText()).setScale(2, java.math.RoundingMode.HALF_UP);
            } catch (Exception e) {
                return java.math.BigDecimal.ZERO;
            }
        }
        if (n.isTextual()) {
            String s = n.asText().trim();
            if (s.isEmpty()) return java.math.BigDecimal.ZERO;
            try {
                return new java.math.BigDecimal(s).setScale(2, java.math.RoundingMode.HALF_UP);
            } catch (Exception e) {
                return java.math.BigDecimal.ZERO;
            }
        }
        return java.math.BigDecimal.ZERO;
    }

    private BackupListVO toVO(BackupRecord r, Map<Long, String> userNames) {
        BackupListVO vo = new BackupListVO();
        vo.setId(r.getId());
        vo.setUserId(r.getUserId());
        vo.setUserName(r.getUserId() == null ? null : userNames.get(r.getUserId()));
        vo.setFileName(r.getFileName());
        vo.setFileSize(r.getFileSize());
        vo.setBackupType(r.getBackupType());
        vo.setVersion(r.getVersion());
        vo.setTotalDays(r.getTotalDays());
        vo.setTotalTemplates(r.getTotalTemplates());
        vo.setTotalActions(r.getTotalActions());
        vo.setTotalVolumeKg(r.getTotalVolumeKg());
        vo.setRemark(r.getRemark());
        vo.setCreateTime(r.getCreateTime());
        return vo;
    }
}
