package com.hexatombe.inventario.web;

import com.hexatombe.inventario.model.GridSize;
import com.hexatombe.inventario.model.Item;
import com.hexatombe.inventario.storage.CharacterService;
import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/characters/{id}")
public class InventoryController {
    private final CharacterService characterService;

    public InventoryController(CharacterService characterService) {
        this.characterService = characterService;
    }

    @GetMapping("/items")
    public List<Item> getItems(HttpServletRequest request, @PathVariable String id) {
        return characterService.getItems(AuthController.currentUser(request), PathIds.requireValidCharacterId(id));
    }

    @PutMapping("/items")
    public void saveItems(HttpServletRequest request, @PathVariable String id, @RequestBody List<Item> items) {
        characterService.saveItems(AuthController.currentUser(request), PathIds.requireValidCharacterId(id), items);
    }

    @GetMapping("/stored")
    public List<Item> getStored(HttpServletRequest request, @PathVariable String id) {
        return characterService.getStored(AuthController.currentUser(request), PathIds.requireValidCharacterId(id));
    }

    @PutMapping("/stored")
    public void saveStored(HttpServletRequest request, @PathVariable String id, @RequestBody List<Item> items) {
        characterService.saveStored(AuthController.currentUser(request), PathIds.requireValidCharacterId(id), items);
    }

    @GetMapping("/size")
    public GridSize getSize(HttpServletRequest request, @PathVariable String id) {
        return characterService.getSize(AuthController.currentUser(request), PathIds.requireValidCharacterId(id));
    }

    @PutMapping("/size")
    public void saveSize(HttpServletRequest request, @PathVariable String id, @RequestBody GridSize size) {
        characterService.saveSize(AuthController.currentUser(request), PathIds.requireValidCharacterId(id), size);
    }
}
