package com.hexatombe.inventario.storage;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Path;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class JsonDbStore {
    private final ObjectMapper objectMapper;
    private final JdbcTemplate jdbcTemplate;

    public JsonDbStore(ObjectMapper objectMapper, JdbcTemplate jdbcTemplate) {
        this.objectMapper = objectMapper;
        this.jdbcTemplate = jdbcTemplate;
    }

    private String key(Path relativePath) {
        return relativePath.toString().replace('\\', '/');
    }

    public <T> T read(Path relativePath, TypeReference<T> type, T defaultValue) {
        String json;
        try {
            json = jdbcTemplate.queryForObject(
                    "SELECT data FROM json_store WHERE storage_key = ?", String.class, key(relativePath));
        } catch (EmptyResultDataAccessException e) {
            return defaultValue;
        }
        try {
            return objectMapper.readValue(json, type);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    public void write(Path relativePath, Object value) {
        String json;
        try {
            json = objectMapper.writeValueAsString(value);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
        jdbcTemplate.update(
                "INSERT INTO json_store (storage_key, data) VALUES (?, ?) "
                        + "ON CONFLICT (storage_key) DO UPDATE SET data = EXCLUDED.data",
                key(relativePath), json);
    }

    public void deleteDir(Path relativeDir) {
        String prefix = key(relativeDir);
        jdbcTemplate.update(
                "DELETE FROM json_store WHERE storage_key = ? OR storage_key LIKE ?", prefix, prefix + "/%");
    }
}
