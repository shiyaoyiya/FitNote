package com.fitnote.backup;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fitnote.modules.backup.support.BackupStatsExtractResult;
import com.fitnote.modules.backup.support.BackupStatsExtractor;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 备份解析统计提取测试（RED→GREEN）
 *
 * 目标：从备份 JSON 的 fitness_daydata 中提取 totalDays 和 totalVolumeKg。
 * 兼容 3 种 entry 格式：
 *   - 旧极简：entries[动作名] = [ {input:"10×50", total:500} ]
 *   - 旧单段：entries[动作名] = [ {stages:[{weight:50, reps:10, total:500}]} ]
 *   - 多段阶段：entries[动作名] = [ {stages:[{w:10,r:5,t:50},{w:20,r:10,t:200}]} ]
 * volumeLoad 字段若存在优先使用，退化到 weight×reps，再退化到 entry.total。
 */
class BackupStatsExtractorTest {

    private final ObjectMapper om = new ObjectMapper();

    // ---------------- 正确格式下的结果 ----------------

    @Test
    void twoDays_twoEntries_eachOldSimpleFormat_totalCorrect() throws Exception {
        String json = "{\n" +
                "  \"version\":\"1.0\",\n" +
                "  \"data\": {\n" +
                "    \"fitness_daydata\": {\n" +
                "      \"2026-01-01\": {\n" +
                "        \"entries\": {\n" +
                "          \"卧推\": [{\"input\":\"10×50\",\"total\":500}, {\"input\":\"8×60\",\"total\":480}],\n" +
                "          \"深蹲\": [{\"input\":\"5×100\",\"total\":500}]\n" +
                "        }\n" +
                "      },\n" +
                "      \"2026-01-02\": {\n" +
                "        \"entries\": {\n" +
                "          \"硬拉\": [{\"stages\":[{\"weight\":120,\"reps\":5,\"total\":600,\"volumeLoad\":600}]}]\n" +
                "        }\n" +
                "      }\n" +
                "    }\n" +
                "  }\n" +
                "}";
        JsonNode root = om.readTree(json);
        BackupStatsExtractResult r = BackupStatsExtractor.extract(root);
        assertEquals(2, r.getTotalDays());
        assertEquals(new BigDecimal("2080.00"), r.getTotalVolumeKg());
    }

    // ---------------- 格式兼容 ----------------

    @Test
    void multiStage_entry_sumAllStages() throws Exception {
        String json = "{\"data\":{\"fitness_daydata\":{\n" +
                "  \"2026-01-01\":{\"entries\":{\n" +
                "    \"推\":[{\"stages\":[{\"weight\":10,\"reps\":5,\"total\":50},{\"weight\":20,\"reps\":10,\"total\":200}]}]\n" +
                "  }}\n" +
                "}}}";
        BackupStatsExtractResult r = BackupStatsExtractor.extract(om.readTree(json));
        assertEquals(new BigDecimal("250.00"), r.getTotalVolumeKg());
    }

    // ---------------- 容错 ----------------

    @Test
    void noDataObject_zeroes() throws Exception {
        String json = "{\"version\":\"1.0\"}";
        BackupStatsExtractResult r = BackupStatsExtractor.extract(om.readTree(json));
        assertEquals(0, r.getTotalDays());
        assertEquals(new BigDecimal("0.00"), r.getTotalVolumeKg());
    }

    @Test
    void entryWithoutAnyNumericField_contributesZero() throws Exception {
        String json = "{\"data\":{\"fitness_daydata\":{\n" +
                "  \"2026-01-01\":{\"entries\":{\n" +
                "    \"x\":[{\"note\":\"empty-no-stages\"}]\n" +
                "  }}\n" +
                "}}}";
        BackupStatsExtractResult r = BackupStatsExtractor.extract(om.readTree(json));
        assertEquals(1, r.getTotalDays());
        assertEquals(new BigDecimal("0.00"), r.getTotalVolumeKg());
    }

    @Test
    void stringWeightReps_convertedProperly() throws Exception {
        String json = "{\"data\":{\"fitness_daydata\":{\n" +
                "  \"2026-01-01\":{\"entries\":{\n" +
                "    \"x\":[{\"stages\":[{\"weight\":\"20.5\",\"reps\":\"6\",\"total\":123}]}]\n" +
                "  }}\n" +
                "}}}";
        BackupStatsExtractResult r = BackupStatsExtractor.extract(om.readTree(json));
        assertEquals(new BigDecimal("123.00"), r.getTotalVolumeKg());
    }

    @Test
    void volumeLoadPresent_winsOverWeightRepsAndTotal() throws Exception {
        String json = "{\"data\":{\"fitness_daydata\":{\n" +
                "  \"2026-01-01\":{\"entries\":{\n" +
                "    \"x\":[{\"stages\":[{\"weight\":10,\"reps\":5,\"total\":50,\"volumeLoad\":999}]}]\n" +
                "  }}\n" +
                "}}}";
        BackupStatsExtractResult r = BackupStatsExtractor.extract(om.readTree(json));
        assertEquals(new BigDecimal("999.00"), r.getTotalVolumeKg());
    }

    @Test
    void nullDayValue_skippedSilently() throws Exception {
        String json = "{\"data\":{\"fitness_daydata\":{\n" +
                "  \"2026-01-01\": null,\n" +
                "  \"2026-01-02\": {\"entries\":{\n" +
                "    \"卧推\":[{\"input\":\"10×50\",\"total\":500}]\n" +
                "  }}\n" +
                "}}}";
        BackupStatsExtractResult r = BackupStatsExtractor.extract(om.readTree(json));
        assertEquals(1, r.getTotalDays());
        assertEquals(new BigDecimal("500.00"), r.getTotalVolumeKg());
    }
}
