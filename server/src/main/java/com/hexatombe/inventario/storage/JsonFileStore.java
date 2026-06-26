package com.hexatombe.inventario.storage;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Comparator;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class JsonFileStore {
    private final ObjectMapper objectMapper;
    private final Path dataDir;

    public JsonFileStore(ObjectMapper objectMapper, @Value("${app.data-dir}") String dataDir) {
        this.objectMapper = objectMapper;
        this.dataDir = Path.of(dataDir);
    }

    public <T> T read(Path relativePath, TypeReference<T> type, T defaultValue) {
        Path full = dataDir.resolve(relativePath);
        if (!Files.exists(full)) {
            return defaultValue;
        }
        try {
            return objectMapper.readValue(full.toFile(), type);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    public void write(Path relativePath, Object value) {
        Path full = dataDir.resolve(relativePath);
        try {
            Files.createDirectories(full.getParent());
            objectMapper.writerWithDefaultPrettyPrinter().writeValue(full.toFile(), value);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    public void deleteDir(Path relativeDir) {
        Path full = dataDir.resolve(relativeDir);
        if (!Files.exists(full)) {
            return;
        }
        try (var stream = Files.walk(full)) {
            stream.sorted(Comparator.reverseOrder()).forEach(p -> {
                try {
                    Files.delete(p);
                } catch (IOException ignored) {
                }
            });
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }
}
