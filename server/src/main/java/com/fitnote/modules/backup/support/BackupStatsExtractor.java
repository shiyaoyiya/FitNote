package com.fitnote.modules.backup.support;

import com.fasterxml.jackson.databind.JsonNode;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.Map;

/**
 * 备份 JSON 统计提取工具。
 *
 * <p>核心职责：从 {@code {version, data:{fitness_daydata:{date: {entries:{...}}}}}}
 * 结构中提取 totalDays、totalVolumeKg、totalTemplates、totalActions。</p>
 *
 * <p>兼容性设计（前端 daydata 已产生过 3 种 entry 格式，必须全部兼容）：</p>
 * <ul>
 *   <li>旧极简：entries[动作名] = [ {input:"10×50", total:500} ]
 *       → 用 entry.total，没有就从 input 解析 weight×reps</li>
 *   <li>单阶段：entries[动作名] = [ {stages:[{weight,reps,total,volumeLoad}]} ]
 *       → 每个 stage 优先 volumeLoad，退化 weight*reps，退化 total</li>
 *   <li>多阶段：同上数组多段</li>
 *   <li>未知格式：贡献 0，不抛异常</li>
 * </ul>
 *
 * <p>所有数值支持 Number / String / Null；null、空字符串视为 0。
 * 数值解析失败不抛错，视为 0。</p>
 */
public final class BackupStatsExtractor {

    private BackupStatsExtractor() {}

    public static BackupStatsExtractResult extract(JsonNode root) {
        int totalDays = 0;
        BigDecimal totalVolumeKg = BigDecimal.ZERO;
        int totalTemplates = 0;
        int totalActions = 0;

        if (root == null || root.isNull() || root.isMissingNode()) {
            return result(totalDays, totalVolumeKg, totalTemplates, totalActions);
        }

        JsonNode data = root.get("data");
        if (data == null || !data.isObject()) {
            return result(totalDays, totalVolumeKg, totalTemplates, totalActions);
        }

        JsonNode templates = data.get("fitness_templates");
        if (templates != null && templates.isArray()) totalTemplates = templates.size();
        JsonNode actions = data.get("fitness_actions");
        if (actions != null && actions.isArray()) totalActions = actions.size();

        JsonNode daydata = data.get("fitness_daydata");
        if (daydata == null || !daydata.isObject()) {
            return result(totalDays, BigDecimal.ZERO, totalTemplates, totalActions);
        }

        Iterator<Map.Entry<String, JsonNode>> it = daydata.fields();
        while (it.hasNext()) {
            Map.Entry<String, JsonNode> e = it.next();
            JsonNode dayNode = e.getValue();
            if (dayNode == null || dayNode.isNull() || !dayNode.isObject()) {
                // 空天（例如 null / 字符串）跳过
                continue;
            }
            totalDays++;
            BigDecimal dayVol = sumDayVolume(dayNode);
            totalVolumeKg = totalVolumeKg.add(dayVol);
        }

        return result(totalDays, totalVolumeKg, totalTemplates, totalActions);
    }

    // --- 内部辅助 ---

    private static BigDecimal sumDayVolume(JsonNode dayNode) {
        BigDecimal sum = BigDecimal.ZERO;
        JsonNode entriesNode = dayNode.get("entries");
        if (entriesNode == null || !entriesNode.isObject()) return sum;

        Iterator<Map.Entry<String, JsonNode>> it = entriesNode.fields();
        while (it.hasNext()) {
            JsonNode arr = it.next().getValue();
            if (arr == null || !arr.isArray()) continue;
            for (JsonNode entry : arr) {
                if (entry == null || entry.isNull()) continue;
                sum = sum.add(sumEntryVolume(entry));
            }
        }
        return sum;
    }

    /**
     * 单个 entry（可能极简或含 stages 数组）的容量合计。
     */
    private static BigDecimal sumEntryVolume(JsonNode entry) {
        // 存在 stages 数组优先走 stages（新版格式）
        JsonNode stages = entry.get("stages");
        if (stages != null && stages.isArray() && stages.size() > 0) {
            BigDecimal s = BigDecimal.ZERO;
            for (JsonNode stage : stages) {
                s = s.add(sumStageVolume(stage));
            }
            if (s.compareTo(BigDecimal.ZERO) != 0) return s;
        }

        // 否则尝试 entry 自身的 total / input 字段（旧极简格式）
        BigDecimal entryTotal = toBigDecimal(entry.get("total"));
        if (entryTotal.compareTo(BigDecimal.ZERO) != 0) return entryTotal;

        JsonNode inputN = entry.get("input");
        if (inputN != null && !inputN.isNull() && inputN.isTextual()) {
            BigDecimal fromInput = parseInputMultiplication(inputN.asText());
            if (fromInput.compareTo(BigDecimal.ZERO) != 0) return fromInput;
        }

        return BigDecimal.ZERO;
    }

    /** 单个 stage 的容量：volumeLoad 优先 > weight*reps > total */
    private static BigDecimal sumStageVolume(JsonNode stage) {
        if (stage == null || stage.isNull()) return BigDecimal.ZERO;
        BigDecimal vl = toBigDecimal(stage.get("volumeLoad"));
        if (vl.compareTo(BigDecimal.ZERO) != 0) return vl;
        BigDecimal w = toBigDecimal(stage.get("weight"));
        BigDecimal r = toBigDecimal(stage.get("reps"));
        BigDecimal wr = w.multiply(r);
        if (wr.compareTo(BigDecimal.ZERO) != 0) return wr;
        return toBigDecimal(stage.get("total"));
    }

    /** "10×50" / "10*50" / "10 x 50" → 500；解析失败 → 0 */
    private static BigDecimal parseInputMultiplication(String text) {
        if (text == null) return BigDecimal.ZERO;
        String t = text.trim();
        if (t.isEmpty()) return BigDecimal.ZERO;
        try {
            String[] parts = t.split("\\s*[×xX*]\\s*");
            if (parts.length != 2) return BigDecimal.ZERO;
            BigDecimal a = new BigDecimal(parts[0].trim());
            BigDecimal b = new BigDecimal(parts[1].trim());
            return a.multiply(b);
        } catch (Exception e) {
            return BigDecimal.ZERO;
        }
    }

    /** JsonNode → BigDecimal，Number / String / Null / 空 全部兼容；非法 → 0 */
    private static BigDecimal toBigDecimal(JsonNode n) {
        if (n == null || n.isNull() || n.isMissingNode()) return BigDecimal.ZERO;
        if (n.isNumber()) {
            try {
                return new BigDecimal(n.asText()).setScale(2, RoundingMode.HALF_UP);
            } catch (Exception e) {
                return BigDecimal.ZERO;
            }
        }
        if (n.isTextual()) {
            String s = n.asText().trim();
            if (s.isEmpty()) return BigDecimal.ZERO;
            try {
                return new BigDecimal(s).setScale(2, RoundingMode.HALF_UP);
            } catch (Exception e) {
                return BigDecimal.ZERO;
            }
        }
        return BigDecimal.ZERO;
    }

    private static BackupStatsExtractResult result(int days, BigDecimal vol, int tpl, int acts) {
        BigDecimal v = vol == null ? BigDecimal.ZERO : vol.setScale(2, RoundingMode.HALF_UP);
        return new BackupStatsExtractResult(days, v, tpl, acts);
    }
}
