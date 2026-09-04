package com.fitnote.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fitnote.modules.auth.dto.RegisterDTO;
import com.fitnote.modules.auth.dto.UserLoginDTO;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class AuthFlowTest {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper om;

    private static final String TEST_USER = "u_iter0_test_" + System.currentTimeMillis();

    @Test @Order(1)
    void register_then_userTokenReturned() throws Exception {
        RegisterDTO dto = new RegisterDTO();
        dto.setUsername(TEST_USER);
        dto.setPassword("user123");
        dto.setConfirmPassword("user123");
        dto.setNickname("测" + TEST_USER);

        mvc.perform(post("/api/auth/user/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(om.writeValueAsString(dto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.token").isNotEmpty())
                .andExpect(jsonPath("$.data.user.username").value(TEST_USER));
    }

    @Test @Order(2)
    void login_admin_success_menusHasDashboard() throws Exception {
        String body = "{\"username\":\"admin\",\"password\":\"admin123\"}";
        mvc.perform(post("/api/auth/admin/login")
                .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.token").isNotEmpty())
                .andExpect(jsonPath("$.data.admin.role").value("ADMIN"))
                .andExpect(jsonPath("$.data.menus").isArray())
                .andExpect(jsonPath("$.data.menus.length()").value(org.hamcrest.Matchers.greaterThanOrEqualTo(20)));
    }

    @Test @Order(3)
    void login_auditor_success_menusLimited() throws Exception {
        String body = "{\"username\":\"auditor\",\"password\":\"auditor123\"}";
        mvc.perform(post("/api/auth/admin/login")
                .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.admin.role").value("AUDITOR"))
                // AUDITOR 5 菜单节点（41/411/6/61/611）
                .andExpect(jsonPath("$.data.menus.length()").value(5));
    }

    @Test @Order(4)
    void userLogin_afterRegister_ok() throws Exception {
        UserLoginDTO dto = new UserLoginDTO();
        dto.setUsername(TEST_USER);
        dto.setPassword("user123");
        mvc.perform(post("/api/auth/user/login")
                .contentType(MediaType.APPLICATION_JSON).content(om.writeValueAsString(dto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.token").isNotEmpty());
    }

    @Test @Order(5)
    void userLogin_wrongPassword_401() throws Exception {
        UserLoginDTO dto = new UserLoginDTO();
        dto.setUsername(TEST_USER);
        dto.setPassword("wrongpass");
        mvc.perform(post("/api/auth/user/login")
                .contentType(MediaType.APPLICATION_JSON).content(om.writeValueAsString(dto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(401));
    }

    @Test @Order(6)
    void register_duplicateUsername_409() throws Exception {
        RegisterDTO dto = new RegisterDTO();
        dto.setUsername(TEST_USER);
        dto.setPassword("user123");
        dto.setConfirmPassword("user123");
        mvc.perform(post("/api/auth/user/register")
                .contentType(MediaType.APPLICATION_JSON).content(om.writeValueAsString(dto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(409));
    }
}
