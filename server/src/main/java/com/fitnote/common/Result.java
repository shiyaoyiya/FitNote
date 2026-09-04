package com.fitnote.common;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class Result<T> {
    private Integer code;
    private String message;
    private T data;
    private Long timestamp;

    public static <T> Result<T> ok(T data) {
        return new Result<>(200, "success", data, System.currentTimeMillis());
    }

    public static <T> Result<T> ok() {
        return ok(null);
    }

    public static <T> Result<T> fail(ResultCode rc, String msg) {
        return new Result<>(rc.code, (msg != null && !msg.isEmpty()) ? msg : rc.message, null, System.currentTimeMillis());
    }

    public static <T> Result<T> fail(ResultCode rc) {
        return fail(rc, null);
    }
}
