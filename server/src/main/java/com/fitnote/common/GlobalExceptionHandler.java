package com.fitnote.common;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.util.stream.Collectors;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(BusinessException.class)
    public Result<?> biz(BusinessException e) {
        return Result.fail(e.getCode(), e.getMessage());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public Result<?> valid(MethodArgumentNotValidException e) {
        String msg = e.getBindingResult().getFieldErrors().stream()
                .map(f -> f.getField() + ":" + f.getDefaultMessage())
                .collect(Collectors.joining("; "));
        return Result.fail(ResultCode.BAD_REQUEST, msg);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public Result<?> deny(AccessDeniedException e) {
        return Result.fail(ResultCode.FORBIDDEN);
    }

    @ExceptionHandler(AuthenticationException.class)
    public Result<?> auth(AuthenticationException e) {
        return Result.fail(ResultCode.UNAUTHORIZED);
    }

    /**
     * 静态资源（如 /avatars/xxx）不存在时返回真正的 404，
     * 避免被下面的兜底当成服务器内部错误（500）返回。
     */
    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<Result<?>> noResource(NoResourceFoundException e) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Result.fail(ResultCode.NOT_FOUND));
    }

    @ExceptionHandler(Exception.class)
    public Result<?> any(Exception e) {
        log.error("Unhandled exception caught: {}", e.getMessage(), e);
        return Result.fail(ResultCode.INTERNAL);
    }
}
