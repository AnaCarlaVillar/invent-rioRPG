package com.hexatombe.inventario.web;

import com.hexatombe.inventario.model.Appearance;
import com.hexatombe.inventario.model.CharacterProfile;
import com.hexatombe.inventario.model.GridSize;
import com.hexatombe.inventario.model.Item;
import com.hexatombe.inventario.storage.CharacterService;
import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
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

    @GetMapping("/appearances")
    public List<Appearance> getAppearances(HttpServletRequest request, @PathVariable String id) {
        return characterService.getAppearances(AuthController.currentUser(request), PathIds.requireValidCharacterId(id));
    }

    @PostMapping("/appearances")
    public CharacterProfile addAppearance(HttpServletRequest request, @PathVariable String id, @RequestBody AppearanceRequest body) {
        return characterService.addAppearance(AuthController.currentUser(request), PathIds.requireValidCharacterId(id), body.image);
    }

    @PutMapping("/appearances/active")
    public CharacterProfile setActiveAppearance(HttpServletRequest request, @PathVariable String id, @RequestBody ActiveAppearanceRequest body) {
        return characterService.setActiveAppearance(AuthController.currentUser(request), PathIds.requireValidCharacterId(id),
                PathIds.requireValidAppearanceId(body.appearanceId));
    }

    @DeleteMapping("/appearances/{appearanceId}")
    public CharacterProfile deleteAppearance(HttpServletRequest request, @PathVariable String id, @PathVariable String appearanceId) {
        return characterService.deleteAppearance(AuthController.currentUser(request), PathIds.requireValidCharacterId(id),
                PathIds.requireValidAppearanceId(appearanceId));
    }
}
