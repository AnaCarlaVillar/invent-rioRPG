package com.hexatombe.inventario.storage;

import com.fasterxml.jackson.core.type.TypeReference;
import com.hexatombe.inventario.model.CharacterProfile;
import com.hexatombe.inventario.model.GridSize;
import com.hexatombe.inventario.model.Item;
import com.hexatombe.inventario.web.ApiException;
import java.nio.file.Path;
import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class CharacterService {
    private static final SecureRandom RANDOM = new SecureRandom();
    private final JsonFileStore store;

    public CharacterService(JsonFileStore store) {
        this.store = store;
    }

    private Path charactersFile(String username) {
        return Path.of(username, "characters.json");
    }

    private Path characterDir(String username, String characterId) {
        return Path.of(username, characterId);
    }

    public synchronized List<CharacterProfile> list(String username) {
        return store.read(charactersFile(username), new TypeReference<List<CharacterProfile>>() {
        }, new ArrayList<>());
    }

    public synchronized CharacterProfile create(String username, String name) {
        if (name == null || name.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Informe um nome para o personagem.");
        }
        List<CharacterProfile> characters = list(username);
        if (characters.size() >= 12) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Limite de 12 personagens por conta.");
        }
        byte[] idBytes = new byte[8];
        RANDOM.nextBytes(idBytes);
        CharacterProfile character = new CharacterProfile("char_" + HexFormat.of().formatHex(idBytes), name.trim());
        characters.add(character);
        store.write(charactersFile(username), characters);
        return character;
    }

    public synchronized CharacterProfile rename(String username, String characterId, String name) {
        if (name == null || name.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Informe um nome para o personagem.");
        }
        List<CharacterProfile> characters = list(username);
        CharacterProfile character = characters.stream()
                .filter(c -> c.id.equals(characterId))
                .findFirst()
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Personagem não encontrado."));
        character.name = name.trim();
        store.write(charactersFile(username), characters);
        return character;
    }

    public synchronized void delete(String username, String characterId) {
        List<CharacterProfile> characters = list(username);
        boolean removed = characters.removeIf(c -> c.id.equals(characterId));
        if (!removed) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Personagem não encontrado.");
        }
        store.write(charactersFile(username), characters);
        store.deleteDir(characterDir(username, characterId));
    }

    public List<Item> getItems(String username, String characterId) {
        return store.read(characterDir(username, characterId).resolve("items.json"), new TypeReference<List<Item>>() {
        }, new ArrayList<>());
    }

    public void saveItems(String username, String characterId, List<Item> items) {
        store.write(characterDir(username, characterId).resolve("items.json"), items);
    }

    public List<Item> getStored(String username, String characterId) {
        return store.read(characterDir(username, characterId).resolve("stored.json"), new TypeReference<List<Item>>() {
        }, new ArrayList<>());
    }

    public void saveStored(String username, String characterId, List<Item> items) {
        store.write(characterDir(username, characterId).resolve("stored.json"), items);
    }

    public GridSize getSize(String username, String characterId) {
        return store.read(characterDir(username, characterId).resolve("size.json"), new TypeReference<GridSize>() {
        }, new GridSize());
    }

    public void saveSize(String username, String characterId, GridSize size) {
        store.write(characterDir(username, characterId).resolve("size.json"), size);
    }
}
