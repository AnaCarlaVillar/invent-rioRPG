(function () {
  const CELL = 96;
  const GAP = 4;
  const MIN_COLS = 4;
  const MIN_ROWS = 4;
  const MAX_COLS = 24;
  const MAX_ROWS = 16;
  const MAX_CHARACTERS = 12;
  const USERS_KEY = 'hexatombe_users';
  const SESSION_KEY = 'hexatombe_session';
  const TOKEN_KEY = 'hexatombe_token';
  const TOKEN_USERNAME_KEY = 'hexatombe_token_username';

  // When opened straight from disk (file://) the app keeps working exactly as
  // before, fully offline via localStorage. When served by the Java backend
  // (http://...) it talks to the REST API instead. Same UI, same code paths,
  // just a different storage adapter underneath.
  const SERVER_MODE = location.protocol !== 'file:';
  let authToken = SERVER_MODE ? localStorage.getItem(TOKEN_KEY) : null;

  async function apiFetch(path, options = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (authToken) headers.Authorization = `Bearer ${authToken}`;
    const res = await fetch(path, {
      method: options.method || 'GET',
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined
    });
    const text = await res.text();
    const data = text ? JSON.parse(text) : null;
    if (!res.ok) {
      throw new Error((data && data.error) || 'Erro de comunicação com o servidor.');
    }
    return data;
  }

  function setAuthToken(token, username) {
    authToken = token;
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(TOKEN_USERNAME_KEY, username);
  }

  function clearAuthToken() {
    authToken = null;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_USERNAME_KEY);
  }

  // ---- DOM refs: auth ----
  const authOverlay = document.getElementById('authOverlay');
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const loginUser = document.getElementById('loginUser');
  const loginPass = document.getElementById('loginPass');
  const loginError = document.getElementById('loginError');
  const registerUser = document.getElementById('registerUser');
  const registerPass = document.getElementById('registerPass');
  const registerPass2 = document.getElementById('registerPass2');
  const registerError = document.getElementById('registerError');
  const goToRegister = document.getElementById('goToRegister');
  const goToLogin = document.getElementById('goToLogin');

  // ---- DOM refs: character select ----
  const characterOverlay = document.getElementById('characterOverlay');
  const characterList = document.getElementById('characterList');
  const newCharacterForm = document.getElementById('newCharacterForm');
  const newCharacterName = document.getElementById('newCharacterName');
  const characterError = document.getElementById('characterError');
  const characterLogoutLink = document.getElementById('characterLogoutLink');
  const switchCharacterBtn = document.getElementById('switchCharacterBtn');

  // ---- DOM refs: app ----
  const caseEl = document.getElementById('case');
  const currentUserLabel = document.getElementById('currentUserLabel');
  const logoutBtn = document.getElementById('logoutBtn');
  const grid = document.getElementById('grid');
  const addItemBtn = document.getElementById('addItemBtn');
  const sizeMinus = document.getElementById('sizeMinus');
  const sizePlus = document.getElementById('sizePlus');
  const sizeValueEl = document.getElementById('sizeValue');
  const modalOverlay = document.getElementById('modalOverlay');
  const modalTitleEl = document.getElementById('modalTitle');
  const itemImageHint = document.getElementById('itemImageHint');
  const cancelAdd = document.getElementById('cancelAdd');
  const confirmAdd = document.getElementById('confirmAdd');
  const itemNameInput = document.getElementById('itemName');
  const itemImageInput = document.getElementById('itemImage');
  const imagePreview = document.getElementById('imagePreview');
  const itemWidthInput = document.getElementById('itemWidth');
  const itemHeightInput = document.getElementById('itemHeight');
  const itemQtyInput = document.getElementById('itemQty');
  const modalError = document.getElementById('modalError');
  const detailsPanel = document.getElementById('detailsPanel');
  const storedItemsBtn = document.getElementById('storedItemsBtn');
  const storedOverlay = document.getElementById('storedOverlay');
  const storedList = document.getElementById('storedList');
  const storedError = document.getElementById('storedError');
  const closeStored = document.getElementById('closeStored');

  let currentUser = null;
  let currentCharacterId = null;
  let GRID_COLS = 9;
  let GRID_ROWS = 6;
  let items = [];
  let storedItems = [];
  let selectedId = null;
  let pendingImageData = null;
  let dragState = null;
  let editingItemId = null;

  // ---- Users / session (file mode only: client-side, not secure storage) ----
  function loadUsers() {
    try {
      const raw = localStorage.getItem(USERS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  function findUser(username) {
    return loadUsers().find(u => u.username.toLowerCase() === username.toLowerCase());
  }

  // ---- Per-character inventory storage ----
  function itemsKey(characterId) {
    return `hexatombe_inventory_items_${currentUser}__${characterId}`;
  }

  function sizeKey(characterId) {
    return `hexatombe_inventory_size_${currentUser}__${characterId}`;
  }

  async function loadItems() {
    if (SERVER_MODE) {
      return apiFetch(`/api/characters/${currentCharacterId}/items`);
    }
    try {
      const raw = localStorage.getItem(itemsKey(currentCharacterId));
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  async function saveItems() {
    if (SERVER_MODE) {
      return apiFetch(`/api/characters/${currentCharacterId}/items`, { method: 'PUT', body: items });
    }
    localStorage.setItem(itemsKey(currentCharacterId), JSON.stringify(items));
  }

  async function loadSize() {
    if (SERVER_MODE) {
      return apiFetch(`/api/characters/${currentCharacterId}/size`);
    }
    try {
      const raw = localStorage.getItem(sizeKey(currentCharacterId));
      const parsed = raw ? JSON.parse(raw) : null;
      if (parsed && parsed.cols && parsed.rows) return parsed;
    } catch (e) {}
    return null;
  }

  async function saveSize() {
    if (SERVER_MODE) {
      return apiFetch(`/api/characters/${currentCharacterId}/size`, {
        method: 'PUT',
        body: { cols: GRID_COLS, rows: GRID_ROWS }
      });
    }
    localStorage.setItem(sizeKey(currentCharacterId), JSON.stringify({ cols: GRID_COLS, rows: GRID_ROWS }));
  }

  // ---- Stored items (removed from the grid, kept for later) ----
  function storedItemsKey(characterId) {
    return `hexatombe_inventory_stored_${currentUser}__${characterId}`;
  }

  async function loadStoredItems() {
    if (SERVER_MODE) {
      return apiFetch(`/api/characters/${currentCharacterId}/stored`);
    }
    try {
      const raw = localStorage.getItem(storedItemsKey(currentCharacterId));
      const parsed = raw ? JSON.parse(raw) : null;
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  async function saveStoredItems() {
    if (SERVER_MODE) {
      return apiFetch(`/api/characters/${currentCharacterId}/stored`, { method: 'PUT', body: storedItems });
    }
    localStorage.setItem(storedItemsKey(currentCharacterId), JSON.stringify(storedItems));
  }

  function updateStoredItemsBtnLabel() {
    storedItemsBtn.textContent = storedItems.length > 0 ? `Guardados (${storedItems.length})` : 'Guardados';
  }

  // ---- Characters (per user) ----
  function charactersKey() {
    return `hexatombe_characters_${currentUser}`;
  }

  async function loadCharacters() {
    if (SERVER_MODE) {
      return apiFetch('/api/characters');
    }
    try {
      const raw = localStorage.getItem(charactersKey());
      const parsed = raw ? JSON.parse(raw) : null;
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function saveCharacters(list) {
    localStorage.setItem(charactersKey(), JSON.stringify(list));
  }

  // Older versions of this app stored a single inventory per user (no characters).
  // Move that data into a default character so existing users don't lose it.
  // (File mode only — the server backend never had the old single-inventory shape.)
  function migrateLegacyInventory() {
    const legacyItemsKey = `hexatombe_inventory_items_${currentUser}`;
    const legacySizeKey = `hexatombe_inventory_size_${currentUser}`;
    const legacyItems = localStorage.getItem(legacyItemsKey);
    const legacySize = localStorage.getItem(legacySizeKey);
    if (!legacyItems && !legacySize) return [];

    const defaultCharacter = { id: 'char_' + Date.now(), name: 'Personagem 1' };
    if (legacyItems) {
      localStorage.setItem(itemsKey(defaultCharacter.id), legacyItems);
      localStorage.removeItem(legacyItemsKey);
    }
    if (legacySize) {
      localStorage.setItem(sizeKey(defaultCharacter.id), legacySize);
      localStorage.removeItem(legacySizeKey);
    }
    return [defaultCharacter];
  }

  // ---- Grid building ----
  function buildGridCells() {
    grid.style.gridTemplateColumns = `repeat(${GRID_COLS}, ${CELL}px)`;
    grid.style.gridTemplateRows = `repeat(${GRID_ROWS}, ${CELL}px)`;
    grid.querySelectorAll('.cell').forEach(c => c.remove());
    for (let row = 1; row <= GRID_ROWS; row++) {
      for (let col = 1; col <= GRID_COLS; col++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.style.gridColumn = String(col);
        cell.style.gridRow = String(row);
        grid.appendChild(cell);
      }
    }
    sizeValueEl.textContent = `${GRID_COLS} x ${GRID_ROWS}`;
    sizeMinus.disabled = GRID_COLS <= MIN_COLS || GRID_ROWS <= MIN_ROWS;
    sizePlus.disabled = GRID_COLS >= MAX_COLS || GRID_ROWS >= MAX_ROWS;
  }

  function maxOccupiedCol() {
    return items.reduce((max, it) => Math.max(max, it.col + it.w - 1), 0);
  }

  function maxOccupiedRow() {
    return items.reduce((max, it) => Math.max(max, it.row + it.h - 1), 0);
  }

  async function setGridSize(newCols, newRows) {
    newCols = Math.max(MIN_COLS, Math.min(MAX_COLS, newCols));
    newRows = Math.max(MIN_ROWS, Math.min(MAX_ROWS, newRows));
    if (newCols < maxOccupiedCol() || newRows < maxOccupiedRow()) return;
    if (newCols === GRID_COLS && newRows === GRID_ROWS) return;
    GRID_COLS = newCols;
    GRID_ROWS = newRows;
    try {
      await saveSize();
    } catch (err) {
      window.alert(err.message);
      return;
    }
    buildGridCells();
    render();
  }

  sizeMinus.addEventListener('click', () => setGridSize(GRID_COLS - 1, GRID_ROWS - 1));
  sizePlus.addEventListener('click', () => setGridSize(GRID_COLS + 1, GRID_ROWS + 1));

  function cellFree(col, row, w, h, ignoreId) {
    if (col < 1 || row < 1 || col + w - 1 > GRID_COLS || row + h - 1 > GRID_ROWS) return false;
    return !items.some(it => {
      if (it.id === ignoreId) return false;
      return col < it.col + it.w && col + w > it.col && row < it.row + it.h && row + h > it.row;
    });
  }

  function findFreeSpot(w, h, ignoreId) {
    for (let row = 1; row <= GRID_ROWS - h + 1; row++) {
      for (let col = 1; col <= GRID_COLS - w + 1; col++) {
        if (cellFree(col, row, w, h, ignoreId)) return { col, row };
      }
    }
    return null;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function cellsToPx(n) {
    return n * CELL + (n - 1) * GAP;
  }

  function render() {
    grid.querySelectorAll('.item').forEach(el => el.remove());
    items.forEach(it => {
      const el = document.createElement('div');
      el.className = 'item' + (it.id === selectedId ? ' selected' : '');
      el.style.gridColumn = `${it.col} / span ${it.w}`;
      el.style.gridRow = `${it.row} / span ${it.h}`;
      el.dataset.id = it.id;
      el.title = it.name;

      const boxW = cellsToPx(it.w);
      const boxH = cellsToPx(it.h);
      const img = document.createElement('div');
      img.className = 'item-image';
      img.style.backgroundImage = `url("${it.image}")`;
      if (it.rotated) {
        img.style.width = boxH + 'px';
        img.style.height = boxW + 'px';
        img.style.transform = 'translate(-50%, -50%) rotate(90deg)';
      } else {
        img.style.width = boxW + 'px';
        img.style.height = boxH + 'px';
        img.style.transform = 'translate(-50%, -50%)';
      }
      el.appendChild(img);

      if (it.qty > 1) {
        const badge = document.createElement('span');
        badge.className = 'qty-badge';
        badge.textContent = it.qty;
        el.appendChild(badge);
      }

      el.addEventListener('mousedown', onItemMouseDown);
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        selectItem(it.id);
      });

      grid.appendChild(el);
    });
    renderDetails();
  }

  function selectItem(id) {
    selectedId = id;
    render();
  }

  function renderDetails() {
    const it = items.find(i => i.id === selectedId);
    if (!it) {
      detailsPanel.innerHTML = '<div class="details-empty">Selecione um item</div>';
      return;
    }
    detailsPanel.innerHTML = `
      <img src="${it.image}" alt="${escapeHtml(it.name)}">
      <div class="details-name">${escapeHtml(it.name)}</div>
      <div class="details-qty">Qtd: ${it.qty}</div>
      <button class="btn btn-secondary" id="rotateItemBtn"${it.w === it.h ? ' disabled' : ''}>Girar</button>
      <button class="btn btn-secondary" id="editItemBtn">Editar</button>
      <button class="btn btn-secondary" id="storeItemBtn">Guardar</button>
      <p class="details-error" id="detailsError"></p>
      <button class="btn btn-danger" id="removeItemBtn">Remover</button>
    `;
    document.getElementById('rotateItemBtn').addEventListener('click', rotateItem);
    document.getElementById('editItemBtn').addEventListener('click', () => openEditModal(selectedId));
    document.getElementById('storeItemBtn').addEventListener('click', storeItem);
    document.getElementById('removeItemBtn').addEventListener('click', async () => {
      items = items.filter(i => i.id !== selectedId);
      selectedId = null;
      try {
        await saveItems();
      } catch (err) {
        window.alert(err.message);
      }
      render();
    });
  }

  async function rotateItem() {
    const it = items.find(i => i.id === selectedId);
    if (!it || it.w === it.h) return;
    const newW = it.h;
    const newH = it.w;
    if (!cellFree(it.col, it.row, newW, newH, it.id)) {
      const errEl = document.getElementById('detailsError');
      if (errEl) errEl.textContent = 'Não há espaço para girar aqui.';
      return;
    }
    it.w = newW;
    it.h = newH;
    it.rotated = !it.rotated;
    try {
      await saveItems();
    } catch (err) {
      window.alert(err.message);
      return;
    }
    render();
  }

  // ---- Store / retrieve items ----
  async function storeItem() {
    const idx = items.findIndex(i => i.id === selectedId);
    if (idx === -1) return;
    const it = items[idx];
    items.splice(idx, 1);
    storedItems.push({
      id: it.id,
      name: it.name,
      image: it.image,
      w: it.w,
      h: it.h,
      qty: it.qty,
      rotated: it.rotated
    });
    selectedId = null;
    try {
      await saveItems();
      await saveStoredItems();
    } catch (err) {
      window.alert(err.message);
    }
    updateStoredItemsBtnLabel();
    render();
  }

  function renderStoredList() {
    storedList.innerHTML = '';
    storedError.textContent = '';
    if (storedItems.length === 0) {
      storedList.innerHTML = '<p class="stored-empty">Nenhum item guardado.</p>';
      return;
    }
    storedItems.forEach(it => {
      const card = document.createElement('div');
      card.className = 'stored-card';

      const thumb = document.createElement('img');
      thumb.className = 'stored-thumb';
      thumb.src = it.image;
      thumb.alt = it.name;

      const info = document.createElement('div');
      info.className = 'stored-info';
      const nameEl = document.createElement('span');
      nameEl.className = 'stored-name';
      nameEl.textContent = it.name;
      const qtyEl = document.createElement('span');
      qtyEl.className = 'stored-qty';
      qtyEl.textContent = `Qtd: ${it.qty} — ${it.w}x${it.h}`;
      info.appendChild(nameEl);
      info.appendChild(qtyEl);

      const actions = document.createElement('div');
      actions.className = 'stored-actions';

      const placeBtn = document.createElement('button');
      placeBtn.className = 'btn btn-small';
      placeBtn.textContent = 'Colocar';
      placeBtn.addEventListener('click', () => placeStoredItem(it.id));

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn btn-danger btn-small';
      deleteBtn.textContent = 'Excluir';
      deleteBtn.addEventListener('click', () => deleteStoredItem(it.id, it.name));

      actions.appendChild(placeBtn);
      actions.appendChild(deleteBtn);
      card.appendChild(thumb);
      card.appendChild(info);
      card.appendChild(actions);
      storedList.appendChild(card);
    });
  }

  async function placeStoredItem(id) {
    const idx = storedItems.findIndex(i => i.id === id);
    if (idx === -1) return;
    const it = storedItems[idx];
    const spot = findFreeSpot(it.w, it.h);
    if (!spot) {
      storedError.textContent = 'Não há espaço no inventário para colocar esse item.';
      return;
    }
    storedItems.splice(idx, 1);
    items.push({
      id: it.id,
      name: it.name,
      image: it.image,
      w: it.w,
      h: it.h,
      qty: it.qty,
      rotated: it.rotated,
      col: spot.col,
      row: spot.row
    });
    try {
      await saveItems();
      await saveStoredItems();
    } catch (err) {
      storedError.textContent = err.message;
      return;
    }
    updateStoredItemsBtnLabel();
    renderStoredList();
    render();
  }

  async function deleteStoredItem(id, name) {
    const confirmed = window.confirm(`Excluir "${name}" definitivamente? Essa ação não pode ser desfeita.`);
    if (!confirmed) return;
    storedItems = storedItems.filter(i => i.id !== id);
    try {
      await saveStoredItems();
    } catch (err) {
      window.alert(err.message);
    }
    updateStoredItemsBtnLabel();
    renderStoredList();
  }

  function openStoredOverlay() {
    renderStoredList();
    storedOverlay.classList.add('open');
  }

  function closeStoredOverlay() {
    storedOverlay.classList.remove('open');
  }

  storedItemsBtn.addEventListener('click', openStoredOverlay);
  closeStored.addEventListener('click', closeStoredOverlay);
  storedOverlay.addEventListener('click', (e) => {
    if (e.target === storedOverlay) closeStoredOverlay();
  });

  grid.addEventListener('click', () => {
    selectedId = null;
    render();
  });

  // ---- Drag to reposition ----
  function onItemMouseDown(e) {
    if (e.button !== 0) return;
    const id = e.currentTarget.dataset.id;
    const it = items.find(i => i.id === id);
    if (!it) return;
    e.preventDefault();
    selectItem(id);
    const gridRect = grid.getBoundingClientRect();
    dragState = { it, gridRect, startCol: it.col, startRow: it.row };
    document.addEventListener('mousemove', onItemMouseMove);
    document.addEventListener('mouseup', onItemMouseUp);
  }

  function onItemMouseMove(e) {
    if (!dragState) return;
    const { gridRect, it } = dragState;
    const cellSize = CELL + GAP;
    const x = e.clientX - gridRect.left;
    const y = e.clientY - gridRect.top;
    let col = Math.floor(x / cellSize) + 1 - Math.floor(it.w / 2);
    let row = Math.floor(y / cellSize) + 1 - Math.floor(it.h / 2);
    col = Math.max(1, Math.min(col, GRID_COLS - it.w + 1));
    row = Math.max(1, Math.min(row, GRID_ROWS - it.h + 1));
    dragState.previewCol = col;
    dragState.previewRow = row;

    const el = grid.querySelector(`.item[data-id="${it.id}"]`);
    if (el) {
      el.style.gridColumn = `${col} / span ${it.w}`;
      el.style.gridRow = `${row} / span ${it.h}`;
      el.classList.add('dragging');
      el.classList.toggle('invalid', !cellFree(col, row, it.w, it.h, it.id));
    }
  }

  async function onItemMouseUp() {
    if (!dragState) return;
    const { it, previewCol, previewRow, startCol, startRow } = dragState;
    const targetCol = previewCol === undefined ? startCol : previewCol;
    const targetRow = previewRow === undefined ? startRow : previewRow;
    if (cellFree(targetCol, targetRow, it.w, it.h, it.id)) {
      it.col = targetCol;
      it.row = targetRow;
    }
    dragState = null;
    document.removeEventListener('mousemove', onItemMouseMove);
    document.removeEventListener('mouseup', onItemMouseUp);
    try {
      await saveItems();
    } catch (err) {
      window.alert(err.message);
    }
    render();
  }

  // ---- Add / edit item modal ----
  function openModal() {
    editingItemId = null;
    modalTitleEl.textContent = 'Adicionar Item';
    confirmAdd.textContent = 'Adicionar';
    itemImageHint.hidden = true;
    modalOverlay.classList.add('open');
    itemNameInput.value = '';
    itemImageInput.value = '';
    imagePreview.hidden = true;
    pendingImageData = null;
    itemWidthInput.value = 1;
    itemHeightInput.value = 1;
    itemQtyInput.value = 1;
    modalError.textContent = '';
    itemNameInput.focus();
  }

  function openEditModal(id) {
    const it = items.find(i => i.id === id);
    if (!it) return;
    editingItemId = id;
    modalTitleEl.textContent = 'Editar Item';
    confirmAdd.textContent = 'Salvar';
    itemImageHint.hidden = false;
    modalOverlay.classList.add('open');
    itemNameInput.value = it.name;
    itemImageInput.value = '';
    pendingImageData = it.image;
    imagePreview.src = it.image;
    imagePreview.hidden = false;
    itemWidthInput.value = it.w;
    itemHeightInput.value = it.h;
    itemQtyInput.value = it.qty;
    modalError.textContent = '';
    itemNameInput.focus();
  }

  function closeModal() {
    modalOverlay.classList.remove('open');
    editingItemId = null;
  }

  addItemBtn.addEventListener('click', openModal);
  cancelAdd.addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalOverlay.classList.contains('open')) closeModal();
    if (e.key === 'Escape' && storedOverlay.classList.contains('open')) closeStoredOverlay();
    if ((e.key === 'r' || e.key === 'R') && selectedId && !modalOverlay.classList.contains('open')) {
      const tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      rotateItem();
    }
  });

  itemImageInput.addEventListener('change', () => {
    const file = itemImageInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      pendingImageData = reader.result;
      imagePreview.src = pendingImageData;
      imagePreview.hidden = false;
    };
    reader.readAsDataURL(file);
  });

  confirmAdd.addEventListener('click', async () => {
    const name = itemNameInput.value.trim();
    if (!name) {
      modalError.textContent = 'Informe um nome para o item.';
      return;
    }
    if (!pendingImageData) {
      modalError.textContent = 'Selecione uma foto para o item.';
      return;
    }
    const w = Math.max(1, Math.min(MAX_COLS, parseInt(itemWidthInput.value, 10) || 1));
    const h = Math.max(1, Math.min(MAX_ROWS, parseInt(itemHeightInput.value, 10) || 1));
    const qty = Math.max(1, Math.min(99, parseInt(itemQtyInput.value, 10) || 1));

    if (w > GRID_COLS || h > GRID_ROWS) {
      modalError.textContent = `Esse tamanho (${w} x ${h}) não cabe na grade atual (${GRID_COLS} x ${GRID_ROWS}). Aumente o inventário primeiro.`;
      return;
    }

    if (editingItemId) {
      const it = items.find(i => i.id === editingItemId);
      if (!it) {
        closeModal();
        return;
      }
      let col = it.col;
      let row = it.row;
      if (!cellFree(col, row, w, h, it.id)) {
        const spot = findFreeSpot(w, h, it.id);
        if (!spot) {
          modalError.textContent = 'Não há espaço suficiente para esse novo tamanho.';
          return;
        }
        col = spot.col;
        row = spot.row;
      }
      it.name = name;
      it.image = pendingImageData;
      it.w = w;
      it.h = h;
      it.col = col;
      it.row = row;
      it.qty = qty;
      it.rotated = false;
      try {
        await saveItems();
      } catch (err) {
        modalError.textContent = err.message;
        return;
      }
      closeModal();
      render();
      return;
    }

    const spot = findFreeSpot(w, h);
    if (!spot) {
      modalError.textContent = 'Não há espaço suficiente no inventário.';
      return;
    }

    items.push({
      id: 'item_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      name,
      image: pendingImageData,
      w, h,
      col: spot.col,
      row: spot.row,
      qty
    });
    try {
      await saveItems();
    } catch (err) {
      items.pop();
      modalError.textContent = err.message;
      return;
    }
    closeModal();
    render();
  });

  // ---- Session lifecycle ----
  function enterApp(username) {
    currentUser = username;
    if (!SERVER_MODE) {
      localStorage.setItem(SESSION_KEY, username);
    }
    authOverlay.hidden = true;
    caseEl.hidden = true;
    showCharacterScreen();
  }

  async function exitApp() {
    if (SERVER_MODE) {
      try {
        await apiFetch('/api/logout', { method: 'POST' });
      } catch (e) {}
      clearAuthToken();
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
    currentUser = null;
    currentCharacterId = null;
    items = [];
    storedItems = [];
    selectedId = null;
    caseEl.hidden = true;
    characterOverlay.hidden = true;
    authOverlay.hidden = false;
    showLoginForm();
  }

  logoutBtn.addEventListener('click', exitApp);
  characterLogoutLink.addEventListener('click', (e) => {
    e.preventDefault();
    exitApp();
  });

  // ---- Character select ----
  async function showCharacterScreen() {
    caseEl.hidden = true;
    currentCharacterId = null;
    items = [];
    storedItems = [];

    let characters;
    try {
      characters = await loadCharacters();
    } catch (err) {
      window.alert(err.message);
      characters = [];
    }

    if (!SERVER_MODE && characters.length === 0) {
      const migrated = migrateLegacyInventory();
      if (migrated.length) {
        characters = migrated;
        saveCharacters(characters);
      }
    }

    renderCharacterList(characters);
    newCharacterName.value = '';
    characterError.textContent = '';
    characterOverlay.hidden = false;
  }

  function renderCharacterList(characters) {
    characterList.innerHTML = '';
    if (characters.length === 0) {
      characterList.innerHTML = '<p class="character-empty">Nenhum personagem ainda. Crie um abaixo.</p>';
      return;
    }
    characters.forEach(ch => {
      const card = document.createElement('div');
      card.className = 'character-card';

      const nameEl = document.createElement('span');
      nameEl.className = 'character-name';
      nameEl.textContent = ch.name;

      const actions = document.createElement('div');
      actions.className = 'character-card-actions';

      const openBtn = document.createElement('button');
      openBtn.className = 'btn btn-small';
      openBtn.textContent = 'Abrir';
      openBtn.addEventListener('click', () => openCharacter(ch.id));

      const renameBtn = document.createElement('button');
      renameBtn.className = 'btn btn-secondary btn-small';
      renameBtn.textContent = 'Renomear';
      renameBtn.addEventListener('click', () => renameCharacter(ch.id, ch.name));

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn btn-danger btn-small';
      deleteBtn.textContent = 'Remover';
      deleteBtn.addEventListener('click', () => deleteCharacter(ch.id, ch.name));

      actions.appendChild(openBtn);
      actions.appendChild(renameBtn);
      actions.appendChild(deleteBtn);
      card.appendChild(nameEl);
      card.appendChild(actions);
      characterList.appendChild(card);
    });
  }

  async function openCharacter(characterId) {
    currentCharacterId = characterId;
    let character, savedSize, loadedItems, loadedStored;
    try {
      const characters = await loadCharacters();
      character = characters.find(c => c.id === characterId);
      savedSize = await loadSize();
      loadedItems = await loadItems();
      loadedStored = await loadStoredItems();
    } catch (err) {
      window.alert(err.message);
      return;
    }

    GRID_COLS = savedSize ? savedSize.cols : 9;
    GRID_ROWS = savedSize ? savedSize.rows : 6;
    items = loadedItems.filter(it => it && it.image && it.name && it.w && it.h && it.col && it.row);
    storedItems = loadedStored.filter(it => it && it.image && it.name && it.w && it.h);
    selectedId = null;

    buildGridCells();
    render();
    updateStoredItemsBtnLabel();

    currentUserLabel.textContent = character ? `${currentUser} — ${character.name}` : currentUser;
    characterOverlay.hidden = true;
    caseEl.hidden = false;
  }

  async function deleteCharacter(characterId, name) {
    const confirmed = window.confirm(`Remover o personagem "${name}" e todo o inventário dele? Essa ação não pode ser desfeita.`);
    if (!confirmed) return;

    try {
      if (SERVER_MODE) {
        await apiFetch(`/api/characters/${characterId}`, { method: 'DELETE' });
      } else {
        const characters = (await loadCharacters()).filter(c => c.id !== characterId);
        saveCharacters(characters);
        localStorage.removeItem(itemsKey(characterId));
        localStorage.removeItem(sizeKey(characterId));
        localStorage.removeItem(storedItemsKey(characterId));
      }
    } catch (err) {
      window.alert(err.message);
      return;
    }

    renderCharacterList(await loadCharacters());
  }

  async function renameCharacter(characterId, currentName) {
    const input = window.prompt('Novo nome do personagem:', currentName);
    if (input === null) return;
    const newName = input.trim();
    if (!newName) return;

    try {
      if (SERVER_MODE) {
        await apiFetch(`/api/characters/${characterId}`, { method: 'PUT', body: { name: newName } });
      } else {
        const characters = await loadCharacters();
        const character = characters.find(c => c.id === characterId);
        if (!character) return;
        character.name = newName;
        saveCharacters(characters);
      }
    } catch (err) {
      window.alert(err.message);
      return;
    }

    renderCharacterList(await loadCharacters());
    if (currentCharacterId === characterId) {
      currentUserLabel.textContent = `${currentUser} — ${newName}`;
    }
  }

  switchCharacterBtn.addEventListener('click', showCharacterScreen);

  newCharacterForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = newCharacterName.value.trim();
    if (!name) {
      characterError.textContent = 'Informe um nome para o personagem.';
      return;
    }

    try {
      if (SERVER_MODE) {
        await apiFetch('/api/characters', { method: 'POST', body: { name } });
      } else {
        const characters = await loadCharacters();
        if (characters.length >= MAX_CHARACTERS) {
          characterError.textContent = `Limite de ${MAX_CHARACTERS} personagens por conta.`;
          return;
        }
        const newCharacter = { id: 'char_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7), name };
        characters.push(newCharacter);
        saveCharacters(characters);
      }
    } catch (err) {
      characterError.textContent = err.message;
      return;
    }

    newCharacterName.value = '';
    characterError.textContent = '';
    renderCharacterList(await loadCharacters());
  });

  // ---- Auth forms ----
  function showLoginForm() {
    registerForm.hidden = true;
    loginForm.hidden = false;
    loginError.textContent = '';
    loginUser.value = '';
    loginPass.value = '';
    loginUser.focus();
  }

  function showRegisterForm() {
    loginForm.hidden = true;
    registerForm.hidden = false;
    registerError.textContent = '';
    registerUser.value = '';
    registerPass.value = '';
    registerPass2.value = '';
    registerUser.focus();
  }

  goToRegister.addEventListener('click', (e) => {
    e.preventDefault();
    showRegisterForm();
  });

  goToLogin.addEventListener('click', (e) => {
    e.preventDefault();
    showLoginForm();
  });

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = loginUser.value.trim();
    const password = loginPass.value;

    if (SERVER_MODE) {
      try {
        const data = await apiFetch('/api/login', { method: 'POST', body: { username, password } });
        setAuthToken(data.token, data.username);
        enterApp(data.username);
      } catch (err) {
        loginError.textContent = err.message;
      }
      return;
    }

    const user = findUser(username);
    if (!user || user.password !== password) {
      loginError.textContent = 'Usuário ou senha inválidos.';
      return;
    }
    enterApp(user.username);
  });

  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = registerUser.value.trim();
    const password = registerPass.value;
    const password2 = registerPass2.value;

    if (password !== password2) {
      registerError.textContent = 'As senhas não coincidem.';
      return;
    }

    if (SERVER_MODE) {
      try {
        const data = await apiFetch('/api/register', { method: 'POST', body: { username, password } });
        setAuthToken(data.token, data.username);
        enterApp(data.username);
      } catch (err) {
        registerError.textContent = err.message;
      }
      return;
    }

    if (username.length < 3) {
      registerError.textContent = 'O usuário precisa ter ao menos 3 caracteres.';
      return;
    }
    if (password.length < 4) {
      registerError.textContent = 'A senha precisa ter ao menos 4 caracteres.';
      return;
    }
    if (findUser(username)) {
      registerError.textContent = 'Esse usuário já existe.';
      return;
    }

    const users = loadUsers();
    users.push({ username, password });
    saveUsers(users);
    enterApp(username);
  });

  // ---- Boot ----
  async function boot() {
    if (SERVER_MODE) {
      if (authToken) {
        try {
          await apiFetch('/api/characters');
          const savedUsername = localStorage.getItem(TOKEN_USERNAME_KEY);
          enterApp(savedUsername || '');
          return;
        } catch (e) {
          clearAuthToken();
        }
      }
      authOverlay.hidden = false;
      caseEl.hidden = true;
      showLoginForm();
      return;
    }

    const sessionUser = localStorage.getItem(SESSION_KEY);
    if (sessionUser && findUser(sessionUser)) {
      enterApp(sessionUser);
    } else {
      localStorage.removeItem(SESSION_KEY);
      authOverlay.hidden = false;
      caseEl.hidden = true;
      showLoginForm();
    }
  }

  boot();
})();
