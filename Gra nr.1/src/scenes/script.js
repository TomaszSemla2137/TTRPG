// ============================================
// STAN APLIKACJI (Application State)
// ============================================
// Główny obiekt przechowujący cały stan aplikacji RPG
// Wszystkie dane są ładowane z localStorage przy starcie
const state = {
    currentView: 'character', // Aktualnie wyświetlany widok (character/map/library)
    currentCharacter: null, // Aktualnie edytowana postać
    characters: JSON.parse(localStorage.getItem('rpg_characters') || '[]'), // Lista wszystkich postaci
    tokens: JSON.parse(localStorage.getItem('rpg_tokens') || '[]'), // Lista wszystkich żetonów
    maps: JSON.parse(localStorage.getItem('rpg_maps') || '[]'), // Lista wszystkich map (tylko metadane)
    boundaries: JSON.parse(localStorage.getItem('rpg_boundaries') || '[]'), // Lista obszarów na mapie
    currentMap: null, // Aktualnie wyświetlana mapa
    mapImage: null, // Obrazek aktualnej mapy (jako data URL)
    gridVisible: true, // Czy siatka na mapie jest widoczna
    selectedToken: null, // ID aktualnie wybranego żetonu
    libraryTab: 'characters', // Aktualna zakładka w bibliotece
    drawingMode: false, // Czy tryb rysowania obszarów jest aktywny
    currentBoundary: { // Aktualnie rysowany obszar
        points: [], // Punkty tworzące obszar
        color: '#6c5ce7', // Kolor obszaru
        name: '' // Nazwa obszaru
    },
    boundariesCache: null, // Cache obrazu zapisanych obszarów (dla wydajności)
    boundariesCacheDirty: true // Flaga czy cache wymaga aktualizacji
};

// ============================================
// INICJALIZACJA APLIKACJI
// ============================================
// Funkcja uruchamiana po załadowaniu DOM - inicjalizuje wszystkie moduły
document.addEventListener('DOMContentLoaded', () => {
    initializeNavigation(); // Inicjalizacja nawigacji między widokami
    initializeCharacterBuilder(); // Inicjalizacja budowniczego postaci
    initializeMap(); // Inicjalizacja funkcji mapy
    initializeLibrary(); // Inicjalizacja biblioteki
    initializeModals(); // Inicjalizacja okien modalnych
    initializeBoundaries(); // Inicjalizacja funkcji obszarów
    loadSavedData(); // Załaduj zapisane dane z localStorage
});

// ============================================
// NAWIGACJA
// ============================================
// Funkcje odpowiedzialne za przełączanie między widokami aplikacji

// Inicjalizacja przycisków nawigacji - dodaje obsługę kliknięć
function initializeNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const view = btn.dataset.view; // Pobierz nazwę widoku z atrybutu data-view
            switchView(view); // Przełącz widok
            
            // Zaktualizuj wizualne oznaczenie aktywnego przycisku
            navButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
}

// Przełączanie między widokami aplikacji (character/map/library)
function switchView(viewName) {
    // Ukryj wszystkie widoki
    document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
    // Pokaż wybrany widok
    document.getElementById(`${viewName}-view`).classList.add('active');
    state.currentView = viewName;
    
    // Odśwież odpowiednie widoki w zależności od wybranego
    if (viewName === 'map') {
        renderTokensList(); // Odśwież listę żetonów
        renderMap(); // Odśwież mapę
        setTimeout(() => {
            renderBoundaries(); // Odśwież obszary (z opóźnieniem dla lepszej wydajności)
            renderBoundariesList(); // Odśwież listę obszarów
        }, 150);
    } else if (viewName === 'library') {
        renderLibrary(); // Odśwież bibliotekę
    }
}

// ============================================
// BUDOWNICZY POSTACI (Character Builder)
// ============================================
// Funkcje odpowiedzialne za tworzenie i edycję kart postaci

// Inicjalizacja budowniczego postaci - ustawia wszystkie event listenery
function initializeCharacterBuilder() {
    // Przyciski dodawania bloczków (statystyki, umiejętności, itp.)
    document.querySelectorAll('.block-type-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const blockType = btn.dataset.block; // Pobierz typ bloczka z atrybutu
            addBlockToCharacter(blockType); // Dodaj bloczek do postaci
        });
    });

    // Przycisk tworzenia nowej postaci
    document.getElementById('new-character-btn')?.addEventListener('click', createNewCharacter);

    // Pole nazwy postaci - zapisuje automatycznie przy zmianie
    document.getElementById('character-name')?.addEventListener('input', (e) => {
        if (!state.currentCharacter) createNewCharacter(); // Utwórz nową jeśli nie ma
        state.currentCharacter.name = e.target.value;
        saveCharacters(); // Zapisz do localStorage
    });

    // Pole klasy postaci - zapisuje automatycznie przy zmianie
    document.getElementById('character-class')?.addEventListener('input', (e) => {
        if (!state.currentCharacter) createNewCharacter(); // Utwórz nową jeśli nie ma
        state.currentCharacter.class = e.target.value;
        saveCharacters(); // Zapisz do localStorage
    });

    // Inicjalizacja przeciągania i upuszczania bloczków (zmiana kolejności)
    setupBlockDragAndDrop();
}

// Tworzy nową postać z unikalnym ID
function createNewCharacter() {
    const characterId = Date.now().toString(); // Użyj timestamp jako ID
    state.currentCharacter = {
        id: characterId,
        name: '',
        class: '',
        blocks: [] // Pusta lista bloczków
    };
    state.characters.push(state.currentCharacter); // Dodaj do listy postaci
    saveCharacters(); // Zapisz do localStorage
    renderCharacterSheet(); // Odśwież widok karty postaci
    // Wyczyść pola formularza
    document.getElementById('character-name').value = '';
    document.getElementById('character-class').value = '';
}

// Dodaje bloczek określonego typu do aktualnej postaci
function addBlockToCharacter(type) {
    // Jeśli nie ma aktualnej postaci, utwórz nową
    if (!state.currentCharacter) {
        createNewCharacter();
    }

    const blockId = Date.now().toString();
    const block = createBlock(type, blockId); // Utwórz bloczek na podstawie szablonu
    state.currentCharacter.blocks.push(block); // Dodaj do listy bloczków postaci
    saveCharacters(); // Zapisz do localStorage
    renderCharacterSheet(); // Odśwież widok karty postaci
}

// Tworzy bloczek na podstawie typu - zwraca szablon z domyślnymi danymi
function createBlock(type, id) {
    // Szablony dla różnych typów bloczków z domyślnymi wartościami
    const blockTemplates = {
        stat: {
            type: 'stat',
            title: 'Statystyki',
            data: {
                stats: [
                    { name: 'Siła', value: 10 },
                    { name: 'Zręczność', value: 10 },
                    { name: 'Kondycja', value: 10 }
                ]
            }
        },
        skill: {
            type: 'skill',
            title: 'Umiejętności',
            data: {
                skills: [
                    { name: 'Walka', level: 1 },
                    { name: 'Magia', level: 1 }
                ]
            }
        },
        inventory: {
            type: 'inventory',
            title: 'Ekwipunek',
            data: {
                items: [
                    { name: 'Miecz', quantity: 1 },
                    { name: 'Złoto', quantity: 50 }
                ]
            }
        },
        spell: {
            type: 'spell',
            title: 'Zaklęcia',
            data: {
                spells: [
                    { name: 'Ognista Kula', level: 3, description: 'Rzuca kulę ognia' }
                ]
            }
        },
        note: {
            type: 'note',
            title: 'Notatki',
            data: {
                content: 'Twoje notatki tutaj...'
            }
        },
        health: {
            type: 'health',
            title: 'Punkty Życia',
            data: {
                current: 20,
                max: 20,
                temp: 0
            }
        },
        custom: {
            type: 'custom',
            title: 'Własny Bloczek',
            data: {
                content: 'Tutaj możesz dodać własną zawartość...'
            }
        }
    };

    // Zwróć szablon dla danego typu lub domyślny (custom) jeśli typ nie istnieje
    return blockTemplates[type] || blockTemplates.custom;
}

// Renderuje kartę postaci - wyświetla wszystkie bloczki aktualnej postaci
function renderCharacterSheet() {
    const container = document.getElementById('character-blocks');
    container.innerHTML = ''; // Wyczyść kontener

    // Jeśli nie ma postaci lub bloczków, pokaż komunikat
    if (!state.currentCharacter || state.currentCharacter.blocks.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 2rem;">Dodaj bloczki z lewej strony, aby zbudować swoją kartę postaci</p>';
        return;
    }

    // Dla każdego bloczka utwórz element DOM i dodaj do kontenera
    state.currentCharacter.blocks.forEach((block, index) => {
        const blockElement = createBlockElement(block, index);
        container.appendChild(blockElement);
    });

    // Ponownie ustaw drag & drop (potrzebne po każdym renderowaniu)
    setupBlockDragAndDrop();
}

// Tworzy element DOM dla pojedynczego bloczka postaci
function createBlockElement(block, index) {
    const div = document.createElement('div');
    div.className = 'character-block';
    div.dataset.index = index;
    div.draggable = true;

    let content = '';

    switch (block.type) {
        case 'stat':
            content = `
                <div class="stat-block">
                    ${block.data.stats.map(stat => `
                        <div class="stat-item">
                            <div class="stat-value">
                                <input type="number" value="${stat.value}" 
                                    onchange="updateStat(${index}, '${stat.name}', this.value)"
                                    style="width: 60px; text-align: center; background: var(--bg-secondary); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 4px; padding: 0.25rem;">
                            </div>
                            <div class="stat-label">${stat.name}</div>
                        </div>
                    `).join('')}
                </div>
            `;
            break;
        case 'skill':
            content = `
                <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                    ${block.data.skills.map(skill => `
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem; background: var(--bg-secondary); border-radius: 6px;">
                            <span>${skill.name}</span>
                            <input type="number" value="${skill.level}" min="0" max="20"
                                style="width: 60px; text-align: center; background: var(--bg-tertiary); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 4px; padding: 0.25rem;">
                        </div>
                    `).join('')}
                </div>
            `;
            break;
        case 'inventory':
            content = `
                <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                    ${block.data.items.map(item => `
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem; background: var(--bg-secondary); border-radius: 6px;">
                            <span>${item.name}</span>
                            <span style="color: var(--accent-primary);">x${item.quantity}</span>
                        </div>
                    `).join('')}
                </div>
            `;
            break;
        case 'spell':
            content = `
                <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                    ${block.data.spells.map(spell => `
                        <div style="padding: 0.75rem; background: var(--bg-secondary); border-radius: 6px; border-left: 3px solid var(--accent-primary);">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
                                <strong>${spell.name}</strong>
                                <span style="color: var(--accent-primary);">Poziom ${spell.level}</span>
                            </div>
                            <div style="color: var(--text-secondary); font-size: 0.9rem;">${spell.description}</div>
                        </div>
                    `).join('')}
                </div>
            `;
            break;
        case 'health':
            content = `
                <div style="text-align: center; padding: 1rem;">
                    <div style="font-size: 2rem; font-weight: bold; color: var(--accent-danger); margin-bottom: 0.5rem;">
                        <input type="number" value="${block.data.current}" 
                            onchange="updateHealth(${index}, 'current', this.value)"
                            style="width: 80px; text-align: center; background: var(--bg-secondary); border: 2px solid var(--accent-danger); color: var(--text-primary); border-radius: 6px; padding: 0.5rem; font-size: 1.5rem;">
                        / 
                        <input type="number" value="${block.data.max}" 
                            onchange="updateHealth(${index}, 'max', this.value)"
                            style="width: 80px; text-align: center; background: var(--bg-secondary); border: 2px solid var(--border-color); color: var(--text-primary); border-radius: 6px; padding: 0.5rem; font-size: 1.5rem;">
                    </div>
                    <div style="color: var(--text-muted);">Maksymalne Punkty Życia</div>
                </div>
            `;
            break;
        case 'note':
            content = `
                <textarea style="width: 100%; min-height: 100px; background: var(--bg-secondary); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 6px; padding: 0.75rem; resize: vertical; font-family: inherit;"
                    onchange="updateNote(${index}, this.value)">${block.data.content}</textarea>
            `;
            break;
        case 'custom':
            content = `
                <textarea style="width: 100%; min-height: 100px; background: var(--bg-secondary); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 6px; padding: 0.75rem; resize: vertical; font-family: inherit;"
                    onchange="updateCustom(${index}, this.value)">${block.data.content}</textarea>
            `;
            break;
    }

    const iconMap = {
        stat: 'fa-chart-line',
        skill: 'fa-star',
        inventory: 'fa-backpack',
        spell: 'fa-wand-magic-sparkles',
        note: 'fa-sticky-note',
        health: 'fa-heart',
        custom: 'fa-shapes'
    };

    div.innerHTML = `
        <div class="block-header">
            <div class="block-title">
                <i class="fas ${iconMap[block.type]}"></i>
                ${block.title}
            </div>
            <div class="block-actions">
                <button class="block-action-btn" onclick="deleteBlock(${index})" title="Usuń">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
        <div class="block-content">
            ${content}
        </div>
    `;

    return div;
}

// Ustawia funkcjonalność przeciągania i upuszczania bloczków (zmiana kolejności)
function setupBlockDragAndDrop() {
    const blocks = document.querySelectorAll('.character-block');
    const container = document.getElementById('character-blocks');

    // Dla każdego bloczka ustaw obsługę przeciągania
    blocks.forEach(block => {
        // Rozpoczęcie przeciągania
        block.addEventListener('dragstart', (e) => {
            block.classList.add('dragging'); // Oznacz jako przeciągany
            e.dataTransfer.effectAllowed = 'move'; // Typ operacji
            e.dataTransfer.setData('text/html', block.outerHTML); // Zapisz HTML
            e.dataTransfer.setData('text/plain', block.dataset.index); // Zapisz indeks
        });

        // Zakończenie przeciągania
        block.addEventListener('dragend', () => {
            block.classList.remove('dragging'); // Usuń oznaczenie
        });
    });

    // Obsługa przeciągania nad kontenerem (podgląd pozycji)
    container.addEventListener('dragover', (e) => {
        e.preventDefault(); // Pozwól na upuszczenie
        const dragging = document.querySelector('.dragging');
        if (!dragging) return;

        // Znajdź element po którym ma być wstawiony przeciągany element
        const afterElement = getDragAfterElement(container, e.clientY);
        if (afterElement == null) {
            container.appendChild(dragging); // Wstaw na końcu
        } else {
            container.insertBefore(dragging, afterElement); // Wstaw przed elementem
        }
    });

    // Obsługa upuszczenia - zmiana kolejności w stanie
    container.addEventListener('drop', (e) => {
        e.preventDefault();
        const fromIndex = parseInt(e.dataTransfer.getData('text/plain')); // Indeks źródłowy
        const blocks = Array.from(container.querySelectorAll('.character-block'));
        const toIndex = blocks.indexOf(document.querySelector('.dragging')); // Indeks docelowy

        // Jeśli pozycja się zmieniła, zaktualizuj kolejność w stanie
        if (fromIndex !== toIndex && toIndex !== -1) {
            const block = state.currentCharacter.blocks[fromIndex];
            state.currentCharacter.blocks.splice(fromIndex, 1); // Usuń ze starej pozycji
            state.currentCharacter.blocks.splice(toIndex, 0, block); // Wstaw w nową pozycję
            saveCharacters(); // Zapisz zmiany
            renderCharacterSheet(); // Odśwież widok
        }
    });
}

// Znajduje element po którym ma być wstawiony przeciągany element
// na podstawie pozycji kursora myszy
function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.character-block:not(.dragging)')];
    
    // Znajdź najbliższy element nad którym jest kursor
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2; // Odległość od środka elementu
        
        // Jeśli kursor jest nad elementem i bliżej niż poprzedni najbliższy
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element; // Zwróć element
}

// ============================================
// FUNKCJE AKTUALIZACJI BLOCZKÓW
// ============================================
// Funkcje wywoływane z HTML (onchange) do aktualizacji danych bloczków
// Są dostępne globalnie (window) aby mogły być wywoływane z inline handlers

// Aktualizuje wartość statystyki w bloczku statystyk
window.updateStat = function(index, statName, value) {
    const stat = state.currentCharacter.blocks[index].data.stats.find(s => s.name === statName);
    if (stat) stat.value = parseInt(value) || 0; // Konwertuj na liczbę
    saveCharacters(); // Zapisz zmiany
};

// Aktualizuje punkty życia (current/max) w bloczku zdrowia
window.updateHealth = function(index, type, value) {
    state.currentCharacter.blocks[index].data[type] = parseInt(value) || 0; // Konwertuj na liczbę
    saveCharacters(); // Zapisz zmiany
};

// Aktualizuje zawartość bloczka notatek
window.updateNote = function(index, content) {
    state.currentCharacter.blocks[index].data.content = content;
    saveCharacters(); // Zapisz zmiany
};

// Aktualizuje zawartość własnego bloczka
window.updateCustom = function(index, content) {
    state.currentCharacter.blocks[index].data.content = content;
    saveCharacters(); // Zapisz zmiany
};

// Usuwa bloczek z postaci
window.deleteBlock = function(index) {
    if (confirm('Czy na pewno chcesz usunąć ten bloczek?')) {
        state.currentCharacter.blocks.splice(index, 1); // Usuń z tablicy
        saveCharacters(); // Zapisz zmiany
        renderCharacterSheet(); // Odśwież widok
    }
};

// ============================================
// FUNKCJE MAPY
// ============================================
// Funkcje odpowiedzialne za zarządzanie mapami i żetonami na mapie

// Inicjalizacja funkcji mapy - ustawia event listenery dla przycisków
function initializeMap() {
    const mapUploadBtn = document.getElementById('upload-map-btn');
    const mapUploadInput = document.getElementById('map-upload-input');
    const gridToggle = document.getElementById('grid-toggle');
    const addTokenBtn = document.getElementById('add-token-btn');

    // Przycisk wgrywania mapy - otwiera dialog wyboru pliku
    mapUploadBtn?.addEventListener('click', () => mapUploadInput.click());
    // Obsługa wyboru pliku mapy
    mapUploadInput?.addEventListener('change', handleMapUpload);
    // Przełącznik widoczności siatki
    gridToggle?.addEventListener('click', toggleGrid);
    // Przycisk dodawania żetonu - otwiera modal
    addTokenBtn?.addEventListener('click', openTokenModal);

    // Ustaw canvas mapy (obsługa kliknięć, drag & drop)
    setupMapCanvas();
}

// Obsługuje wgrywanie pliku mapy przez użytkownika
function handleMapUpload(e) {
    const file = e.target.files[0];
    if (!file) {
        console.log('No file selected');
        e.target.value = '';
        return;
    }

    console.log('File selected:', file.name, 'Type:', file.type);
    
    const input = e.target;
    
    // Użyj FileReader do konwersji pliku na data URL
    const reader = new FileReader();
    reader.onload = (event) => {
        const imageUrl = event.target.result; // Data URL obrazu
        console.log('Image loaded, setting mapImage. URL length:', imageUrl.length);
        
        const mapId = Date.now().toString(); // Unikalne ID mapy
        state.mapImage = imageUrl; // Zapisz obraz w stanie
        state.currentMap = {
            id: mapId,
            name: file.name,
            date: new Date().toISOString(),
            tokens: []
        };
        
        // Zapisz mapę (tylko metadane bez obrazka) do tablicy map
        // Obrazki są za duże dla localStorage, więc zapisujemy tylko jedną ostatnią
        state.maps.push({
            id: mapId,
            name: file.name,
            date: state.currentMap.date
        });
        saveMaps();
        
        // Zapisz ostatnią używaną mapę Z OBRAZKIEM osobno (tylko jedna)
        // To pozwala na przywrócenie ostatniej mapy po odświeżeniu strony
        try {
            localStorage.setItem('rpg_lastMapId', mapId);
            localStorage.setItem('rpg_lastMapImage', imageUrl);
            console.log('Map saved successfully');
        } catch (error) {
            console.error('Error saving map to localStorage:', error);
            if (error.name === 'QuotaExceededError') {
                alert('Obrazek mapy jest za duży dla localStorage. Mapa zostanie użyta, ale nie będzie zapisana po odświeżeniu strony.');
                // Usuń najstarszą mapę jeśli jest (próba zwolnienia miejsca)
                if (state.maps.length > 1) {
                    state.maps.shift();
                    saveMaps();
                }
            }
        }
        
        console.log('Calling renderMap()');
        renderMap(); // Wyświetl mapę
        
        input.value = ''; // Wyczyść input
    };
    
    reader.onerror = (error) => {
        console.error('Error reading file:', error);
        alert('Błąd podczas wczytywania pliku!');
        input.value = '';
    };
    
    reader.readAsDataURL(file); // Rozpocznij odczyt pliku jako data URL
}

// Renderuje mapę - wyświetla obraz mapy, żetony i obszary
function renderMap() {
    const canvas = document.getElementById('map-canvas');
    if (!canvas) {
        console.error('Map canvas not found in renderMap!');
        return;
    }
    
    console.log('renderMap called, state.mapImage exists:', !!state.mapImage);
    
    // Znajdź canvas dla obszarów (boundaries) - musi być zachowany
    let boundaryCanvas = canvas.querySelector('#boundary-canvas');
    
    // Wyczyść canvas (zachowując tylko boundary canvas)
    const existingImg = canvas.querySelector('img');
    const placeholder = canvas.querySelector('.map-placeholder');
    
    if (existingImg) existingImg.remove(); // Usuń stary obraz
    if (placeholder) placeholder.remove(); // Usuń placeholder
    
    // Usuń stare żetony (zostaną dodane ponownie)
    canvas.querySelectorAll('.token').forEach(token => token.remove());

    if (state.mapImage) {
        // Jeśli jest obraz mapy, utwórz element img
        console.log('Creating image element with mapImage');
        const img = document.createElement('img');
        img.src = state.mapImage;
        img.alt = 'Mapa';
        
        // Dodaj obrazek przed boundary canvas (jeśli istnieje) lub na końcu
        // Boundary canvas musi być na wierzchu
        if (boundaryCanvas && boundaryCanvas.parentNode === canvas) {
            canvas.insertBefore(img, boundaryCanvas);
        } else {
            canvas.appendChild(img);
        }
        
        console.log('Image element added to canvas');

        // Po załadowaniu obrazu, dodaj żetony i zaktualizuj rozmiar canvas obszarów
        img.onload = () => {
            console.log('Map image loaded successfully!');
            // Dodaj wszystkie żetony które są na mapie
            state.tokens.forEach(token => {
                if (token.onMap) {
                    addTokenToMap(token);
                }
            });
            updateBoundaryCanvasSize(); // Zsynchronizuj rozmiar canvas obszarów
        };
        
        img.onerror = (e) => {
            console.error('Error loading map image:', e);
            alert('Błąd podczas ładowania obrazu mapy!');
        };
    } else {
        // Jeśli nie ma obrazu, pokaż placeholder
        // Dodaj placeholder bez użycia innerHTML (żeby nie usunąć boundary canvas)
        const placeholderDiv = document.createElement('div');
        placeholderDiv.className = 'map-placeholder';
        placeholderDiv.innerHTML = `
            <i class="fas fa-map-location-dot"></i>
            <p>Brak wgranej mapy. Kliknij "Wgraj Mapę", aby dodać własną mapę.</p>
        `;
        canvas.appendChild(placeholderDiv);
        
        // Upewnij się, że boundary canvas istnieje (dla obszarów)
        if (!boundaryCanvas) {
            boundaryCanvas = document.createElement('canvas');
            boundaryCanvas.id = 'boundary-canvas';
            boundaryCanvas.className = 'boundary-canvas';
            canvas.appendChild(boundaryCanvas);
        }
    }

    // Ustaw widoczność siatki
    if (!state.gridVisible) {
        canvas.classList.add('grid-hidden');
    } else {
        canvas.classList.remove('grid-hidden');
    }
    
    updateBoundaryCanvasSize(); // Zaktualizuj rozmiar canvas obszarów
}

// Aktualizuje rozmiar canvas obszarów (boundaries) aby pasował do mapy
// Wywoływane po załadowaniu obrazu mapy lub zmianie rozmiaru okna
function updateBoundaryCanvasSize() {
    setTimeout(() => {
        const canvas = document.getElementById('map-canvas');
        const boundaryCanvas = document.getElementById('boundary-canvas');
        if (boundaryCanvas && canvas) {
            const rect = canvas.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
                const oldWidth = boundaryCanvas.width;
                const oldHeight = boundaryCanvas.height;
                
                // Ustaw rozmiar canvas na rozmiar kontenera mapy
                boundaryCanvas.width = rect.width;
                boundaryCanvas.height = rect.height;
                boundaryCanvas.style.width = rect.width + 'px';
                boundaryCanvas.style.height = rect.height + 'px';
                
                // Jeśli rozmiar się zmienił, zaktualizuj cache obszarów
                if (oldWidth !== rect.width || oldHeight !== rect.height) {
                    invalidateBoundariesCache();
                } else {
                    renderBoundaries(); // Tylko odśwież renderowanie
                }
            }
        }
    }, 100); // Opóźnienie aby upewnić się że obraz się załadował
}

// Przełącza widoczność siatki na mapie
function toggleGrid() {
    state.gridVisible = !state.gridVisible;
    const canvas = document.getElementById('map-canvas');
    if (state.gridVisible) {
        canvas.classList.remove('grid-hidden'); // Pokaż siatkę
    } else {
        canvas.classList.add('grid-hidden'); // Ukryj siatkę
    }
}

// Ustawia obsługę zdarzeń na canvas mapy (kliknięcia, drag & drop)
function setupMapCanvas() {
    const canvas = document.getElementById('map-canvas');
    const boundaryCanvas = document.getElementById('boundary-canvas');
    
    // Kliknięcie na canvas granic
    boundaryCanvas.addEventListener('click', (e) => {
        if (state.drawingMode) {
            handleBoundaryClick(e);
        }
    });
    
    // Kliknięcie na mapie
    canvas.addEventListener('click', (e) => {
        // Tylko jeśli kliknięto bezpośrednio w mapę, nie w żeton i nie w trybie rysowania
        if ((e.target === canvas || e.target.tagName === 'IMG') && !state.drawingMode) {
            // Odznacz żeton
            if (state.selectedToken) {
                deselectToken();
            }
        }
    });

    // Setup drag & drop z listy żetonów na mapę
    canvas.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        canvas.classList.add('drag-over');
    });

    canvas.addEventListener('dragleave', (e) => {
        // Tylko jeśli opuszczamy canvas, nie jego dzieci
        if (e.target === canvas) {
            canvas.classList.remove('drag-over');
        }
    });

    canvas.addEventListener('drop', (e) => {
        e.preventDefault();
        canvas.classList.remove('drag-over');
        
        const tokenId = e.dataTransfer.getData('text/plain');
        
        if (tokenId && tokenId.startsWith('token-')) {
            const actualTokenId = tokenId.replace('token-', '');
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left - 25; // Center token
            const y = e.clientY - rect.top - 25;
            
            placeTokenOnMap(actualTokenId, x, y);
        }
    });
}

// Dodaje żeton na mapę - tworzy element DOM i umieszcza go w odpowiedniej pozycji
function addTokenToMap(token) {
    const canvas = document.getElementById('map-canvas');
    const tokenElement = document.createElement('div');
    tokenElement.className = 'token';
    tokenElement.dataset.tokenId = token.id; // Zapisz ID dla późniejszego wyszukiwania
    tokenElement.style.left = `${token.x}px`; // Pozycja X
    tokenElement.style.top = `${token.y}px`; // Pozycja Y

    // Jeśli żeton ma obraz, użyj go, w przeciwnym razie użyj ikony
    if (token.image) {
        const img = document.createElement('img');
        img.src = token.image;
        img.alt = token.name;
        tokenElement.appendChild(img);
    } else {
        tokenElement.innerHTML = `<i class="fas fa-user" style="font-size: 1.5rem;"></i>`;
    }

    // Kliknięcie wybiera żeton
    tokenElement.addEventListener('click', (e) => {
        e.stopPropagation(); // Zapobiegaj propagacji do canvas
        selectToken(token.id);
    });

    // Podwójne kliknięcie usuwa żeton z mapy
    tokenElement.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        removeTokenFromMap(token.id);
    });

    makeTokenDraggable(tokenElement); // Umożliwij przeciąganie żetonu
    canvas.appendChild(tokenElement); // Dodaj do mapy
}

// Umożliwia przeciąganie żetonu po mapie - obsługuje mousedown, mousemove, mouseup
function makeTokenDraggable(element) {
    let isDragging = false; // Czy aktualnie przeciągamy
    let startX, startY, initialX, initialY; // Pozycje początkowe
    let wasClick = true; // Czy to było zwykłe kliknięcie (nie przeciąganie)

    // Rozpoczęcie przeciągania
    element.addEventListener('mousedown', (e) => {
        // Sprawdź czy to nie kliknięcie w przycisk usuwania
        if (e.target.closest('.block-action-btn')) return;
        
        if (e.button === 0) { // Tylko lewy przycisk myszy
            e.stopPropagation(); // Zapobiegaj odznaczaniu żetonu przy kliknięciu
            
            wasClick = true; // Na razie to kliknięcie
            isDragging = false;
            startX = e.clientX; // Pozycja myszy X
            startY = e.clientY; // Pozycja myszy Y
            
            // Pobierz aktualną pozycję żetonu względem canvasa
            const canvas = document.getElementById('map-canvas');
            const elementRect = element.getBoundingClientRect();
            const canvasRect = canvas.getBoundingClientRect();
            
            initialX = elementRect.left - canvasRect.left; // Pozycja X żetonu
            initialY = elementRect.top - canvasRect.top; // Pozycja Y żetonu
            
            // Wybierz żeton przy kliknięciu
            selectToken(element.dataset.tokenId);
        }
    });

    document.addEventListener('mousemove', (e) => {
        if (startX !== undefined && startY !== undefined) {
            const deltaX = Math.abs(e.clientX - startX);
            const deltaY = Math.abs(e.clientY - startY);
            
            // Rozpocznij przeciąganie jeśli mysz przesunęła się o więcej niż 5px
            if (deltaX > 5 || deltaY > 5) {
                if (!isDragging) {
                    wasClick = false; // To nie było zwykłe kliknięcie
                    isDragging = true;
                    element.style.cursor = 'grabbing';
                    element.style.zIndex = '1000';
                    element.style.opacity = '0.8';
                }
            }
            
            if (isDragging) {
                e.preventDefault();
                
                const canvas = document.getElementById('map-canvas');
                const canvasRect = canvas.getBoundingClientRect();
                
                // Oblicz nową pozycję względem canvasa
                const deltaMouseX = e.clientX - startX;
                const deltaMouseY = e.clientY - startY;
                
                let newX = initialX + deltaMouseX;
                let newY = initialY + deltaMouseY;
                
                // Constrain to canvas bounds
                const tokenSize = 50;
                newX = Math.max(0, Math.min(newX, canvasRect.width - tokenSize));
                newY = Math.max(0, Math.min(newY, canvasRect.height - tokenSize));
                
                element.style.left = `${newX}px`;
                element.style.top = `${newY}px`;
            }
        }
    });

    document.addEventListener('mouseup', (e) => {
        if (isDragging) {
            // Update token position
            const tokenId = element.dataset.tokenId;
            const token = state.tokens.find(t => t.id === tokenId);
            if (token) {
                const x = parseInt(element.style.left) || 0;
                const y = parseInt(element.style.top) || 0;
                
                token.x = x;
                token.y = y;
                token.onMap = true; // Upewnij się, że żeton jest oznaczony jako na mapie
                saveTokens();
            }
            wasClick = false;
        }
        
        // Jeśli to było zwykłe kliknięcie (bez przeciągania), tylko wybierz żeton
        if (wasClick && !isDragging) {
            selectToken(element.dataset.tokenId);
        }
        
        // Reset
        isDragging = false;
        wasClick = true;
        startX = undefined;
        startY = undefined;
        element.style.cursor = 'grab';
        element.style.zIndex = '';
        element.style.opacity = '';
    });
}

function placeTokenOnMap(tokenId, x, y) {
    if (!state.mapImage) {
        alert('Najpierw wgraj mapę!');
        return;
    }

    const token = state.tokens.find(t => t.id === tokenId);
    if (!token) return;

    // Constrain to map bounds
    const canvas = document.getElementById('map-canvas');
    const rect = canvas.getBoundingClientRect();
    const tokenSize = 50;
    
    token.x = Math.max(0, Math.min(x, rect.width - tokenSize));
    token.y = Math.max(0, Math.min(y, rect.height - tokenSize));
    token.onMap = true;

    saveTokens();
    renderMap();
}

function selectToken(tokenId) {
    state.selectedToken = tokenId;
    document.querySelectorAll('.token').forEach(t => t.classList.remove('selected'));
    const tokenElement = document.querySelector(`[data-token-id="${tokenId}"]`);
    if (tokenElement) tokenElement.classList.add('selected');
    
    document.querySelectorAll('.token-item').forEach(item => item.classList.remove('selected'));
    const tokenListItem = document.querySelector(`[data-token-list-id="${tokenId}"]`);
    if (tokenListItem) tokenListItem.classList.add('selected');
}

function deselectToken() {
    state.selectedToken = null;
    document.querySelectorAll('.token').forEach(t => t.classList.remove('selected'));
    document.querySelectorAll('.token-item').forEach(item => item.classList.remove('selected'));
}

function removeTokenFromMap(tokenId) {
    const token = state.tokens.find(t => t.id === tokenId);
    if (token) {
        token.onMap = false;
        saveTokens();
        renderMap();
    }
}

// ============================================
// PANEL ŻETONÓW
// ============================================
// Funkcje odpowiedzialne za wyświetlanie i zarządzanie listą żetonów

// Renderuje listę wszystkich żetonów w panelu bocznym
function renderTokensList() {
    const list = document.getElementById('tokens-list');
    list.innerHTML = '';

    if (state.tokens.length === 0) {
        list.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 1rem;">Brak żetonów. Dodaj nowy żeton używając przycisku powyżej.</p>';
        return;
    }

    state.tokens.forEach(token => {
        const item = document.createElement('div');
        item.className = 'token-item';
        item.dataset.tokenListId = token.id;
        item.draggable = true; // Umożliwia przeciąganie z listy
        
        item.innerHTML = `
            <div class="token-item-thumb">
                ${token.image ? `<img src="${token.image}" alt="${token.name}" draggable="false">` : `<i class="fas fa-user"></i>`}
            </div>
            <div class="token-item-info">
                <div class="token-item-name">${token.name}</div>
                ${token.onMap ? '<small style="color: var(--accent-success);">Na mapie</small>' : '<small style="color: var(--text-muted);">Gotowy do użycia</small>'}
            </div>
            <div class="token-item-actions">
                <button class="block-action-btn" onclick="event.stopPropagation(); deleteToken('${token.id}')" title="Usuń">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;

        // Kliknięcie wybiera żeton
        item.addEventListener('click', (e) => {
            if (!e.target.closest('.block-action-btn')) {
                selectToken(token.id);
            }
        });

        // Setup drag & drop z listy na mapę
        item.addEventListener('dragstart', (e) => {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', `token-${token.id}`);
            item.classList.add('dragging');
            
            // Utwórz obraz przeciągania
            const dragImage = item.cloneNode(true);
            dragImage.style.width = item.offsetWidth + 'px';
            dragImage.style.opacity = '0.8';
            document.body.appendChild(dragImage);
            dragImage.style.position = 'absolute';
            dragImage.style.top = '-1000px';
            e.dataTransfer.setDragImage(dragImage, e.offsetX, e.offsetY);
            setTimeout(() => document.body.removeChild(dragImage), 0);
        });

        item.addEventListener('dragend', () => {
            item.classList.remove('dragging');
        });

        list.appendChild(item);
    });
}

window.deleteToken = function(tokenId) {
    if (confirm('Czy na pewno chcesz usunąć ten żeton?')) {
        state.tokens = state.tokens.filter(t => t.id !== tokenId);
        saveTokens();
        renderTokensList();
        renderMap();
    }
};

// ============================================
// MODAL ŻETONU
// ============================================
// Funkcje odpowiedzialne za okno modalne do tworzenia nowych żetonów

// Inicjalizacja okna modalnego - ustawia event listenery
function initializeModals() {
    const tokenModal = document.getElementById('token-modal');
    const tokenUploadInput = document.getElementById('token-upload-input');
    const saveTokenBtn = document.getElementById('save-token-btn');
    const modalClose = document.querySelector('.modal-close');

    document.getElementById('upload-asset-btn')?.addEventListener('click', openTokenModal);

    const uploadArea = document.querySelector('.upload-area');
    uploadArea?.addEventListener('click', () => tokenUploadInput.click());

    tokenUploadInput?.addEventListener('change', handleTokenImageUpload);
    saveTokenBtn?.addEventListener('click', saveToken);
    modalClose?.addEventListener('click', closeTokenModal);

    tokenModal?.addEventListener('click', (e) => {
        if (e.target === tokenModal) closeTokenModal();
    });
}

function openTokenModal() {
    const modal = document.getElementById('token-modal');
    modal.classList.add('active');
    document.getElementById('token-preview').style.display = 'none';
    document.getElementById('token-name').value = '';
}

function closeTokenModal() {
    const modal = document.getElementById('token-modal');
    modal.classList.remove('active');
}

function handleTokenImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        const preview = document.getElementById('token-preview');
        const previewImg = document.getElementById('token-preview-img');
        previewImg.src = event.target.result;
        preview.style.display = 'block';
    };
    reader.readAsDataURL(file);
}

function saveToken() {
    const name = document.getElementById('token-name').value.trim();
    const previewImg = document.getElementById('token-preview-img');
    
    if (!name) {
        alert('Podaj nazwę żetonu!');
        return;
    }

    if (!previewImg.src) {
        alert('Wgraj grafikę żetonu!');
        return;
    }

    const token = {
        id: Date.now().toString(),
        name: name,
        image: previewImg.src,
        x: 0,
        y: 0,
        onMap: false
    };

    state.tokens.push(token);
    saveTokens();
    renderTokensList();
    closeTokenModal();
    
    // Reset form
    document.getElementById('token-upload-input').value = '';
    document.getElementById('token-preview').style.display = 'none';
    document.getElementById('token-name').value = '';
}

// ============================================
// BIBLIOTEKA
// ============================================
// Funkcje odpowiedzialne za bibliotekę (characters, tokens, maps)

// Inicjalizacja biblioteki - ustawia obsługę zakładek
function initializeLibrary() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            switchLibraryTab(tab);
            
            tabButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
}

function switchLibraryTab(tab) {
    state.libraryTab = tab;
    renderLibrary();
}

function renderLibrary() {
    const container = document.getElementById('library-items');
    container.innerHTML = '';

    switch (state.libraryTab) {
        case 'characters':
            if (state.characters.length === 0) {
                container.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 2rem;">Brak zapisanych kart postaci.</p>';
                return;
            }
            state.characters.forEach(char => {
                const item = createLibraryItem('character', char);
                container.appendChild(item);
            });
            break;
        case 'tokens':
            if (state.tokens.length === 0) {
                container.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 2rem;">Brak zapisanych żetonów.</p>';
                return;
            }
            state.tokens.forEach(token => {
                const item = createLibraryItem('token', token);
                container.appendChild(item);
            });
            break;
        case 'maps':
            if (state.maps.length === 0) {
                container.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 2rem;">Brak zapisanych map.</p>';
                return;
            }
            state.maps.forEach(map => {
                // Sprawdź czy mapa ma obrazek w cache
                const lastMapId = localStorage.getItem('rpg_lastMapId');
                const hasImage = lastMapId === map.id && localStorage.getItem('rpg_lastMapImage');
                const item = createLibraryItem('map', { ...map, hasImage });
                container.appendChild(item);
            });
            break;
    }
}

function createLibraryItem(type, item) {
    const div = document.createElement('div');
    div.className = 'library-item';
    
    switch (type) {
        case 'character':
            div.innerHTML = `
                <div style="text-align: center;">
                    <i class="fas fa-id-card" style="font-size: 3rem; color: var(--accent-primary); margin-bottom: 1rem;"></i>
                    <h4>${item.name || 'Bez nazwy'}</h4>
                    <p style="color: var(--text-muted); font-size: 0.9rem;">${item.class || 'Brak klasy'}</p>
                </div>
            `;
            div.addEventListener('click', () => loadCharacter(item.id));
            break;
        case 'token':
            div.innerHTML = `
                <div style="text-align: center;">
                    <div style="width: 100px; height: 100px; border-radius: 50%; margin: 0 auto 1rem; overflow: hidden; border: 3px solid var(--accent-primary);">
                        ${item.image ? `<img src="${item.image}" style="width: 100%; height: 100%; object-fit: cover;">` : `<i class="fas fa-user" style="font-size: 3rem; line-height: 100px;"></i>`}
                    </div>
                    <h4>${item.name}</h4>
                </div>
            `;
            break;
        case 'map':
            const lastMapId = localStorage.getItem('rpg_lastMapId');
            const lastMapImage = localStorage.getItem('rpg_lastMapImage');
            const hasImage = lastMapId === item.id && lastMapImage;
            
            div.innerHTML = `
                <div style="text-align: center;">
                    <div style="width: 100%; height: 150px; border-radius: 8px; overflow: hidden; margin-bottom: 1rem; background: var(--bg-tertiary); display: flex; align-items: center; justify-content: center; position: relative;">
                        ${hasImage ? 
                            `<img src="${lastMapImage}" style="max-width: 100%; max-height: 100%; object-fit: contain;">` :
                            `<div style="padding: 2rem; color: var(--text-muted);">
                                <i class="fas fa-image" style="font-size: 3rem; opacity: 0.5;"></i>
                                <p style="margin-top: 0.5rem; font-size: 0.9rem;">Obrazek nie w cache</p>
                            </div>`
                        }
                        ${hasImage ? '' : '<div style="position: absolute; top: 5px; right: 5px; background: var(--accent-danger); color: white; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem;">Wymaga ponownego wgrania</div>'}
                    </div>
                    <h4>${item.name || `Mapa ${new Date(parseInt(item.id)).toLocaleDateString()}`}</h4>
                    ${hasImage ? '<small style="color: var(--accent-success);">Dostępna</small>' : '<small style="color: var(--text-muted);">Wymaga ponownego wgrania</small>'}
                </div>
            `;
            div.addEventListener('click', () => {
                if (hasImage) {
                    loadMap(item.id);
                } else {
                    alert('Ta mapa nie jest dostępna w cache. Wgraj ją ponownie, aby z niej korzystać.');
                }
            });
            break;
    }
    
    return div;
}

function loadCharacter(id) {
    state.currentCharacter = state.characters.find(c => c.id === id);
    if (state.currentCharacter) {
        document.getElementById('character-name').value = state.currentCharacter.name || '';
        document.getElementById('character-class').value = state.currentCharacter.class || '';
        renderCharacterSheet();
        switchView('character');
        document.querySelector('[data-view="character"]').click();
    }
}

function loadMap(id) {
    const map = state.maps.find(m => m.id === id);
    if (map) {
        // Jeśli to ostatnia mapa, załaduj obrazek z localStorage
        const lastMapId = localStorage.getItem('rpg_lastMapId');
        if (lastMapId === id) {
            const lastMapImage = localStorage.getItem('rpg_lastMapImage');
            if (lastMapImage) {
                state.currentMap = map;
                state.mapImage = lastMapImage;
                
                // Zapisz jako aktualną
                localStorage.setItem('rpg_lastMapId', id);
                
                renderMap();
                switchView('map');
                document.querySelector('[data-view="map"]').click();
                return;
            }
        }
        
        // Jeśli mapa nie jest w cache, pokaż komunikat
        alert('Ta mapa nie jest dostępna w cache. Wgraj ją ponownie, aby z niej korzystać.');
        switchView('map');
    }
}

// ============================================
// FUNKCJE ZAPISU I WCZYTYWANIA
// ============================================
// Funkcje odpowiedzialne za zapisywanie i wczytywanie danych z localStorage

// Zapisuje wszystkie postaci do localStorage
function saveCharacters() {
    localStorage.setItem('rpg_characters', JSON.stringify(state.characters));
}

// Zapisuje wszystkie żetony do localStorage
function saveTokens() {
    localStorage.setItem('rpg_tokens', JSON.stringify(state.tokens));
}

// Zapisuje metadane map do localStorage (bez obrazków - są za duże)
function saveMaps() {
    // Zapisz tylko metadane (bez obrazków) - obrazki są za duże dla localStorage
    // Obrazki są zapisywane osobno jako ostatnia użyta mapa
    const mapsMetadata = state.maps.map(map => ({
        id: map.id,
        name: map.name || `Mapa ${new Date(parseInt(map.id)).toLocaleDateString()}`,
        date: map.date || new Date(parseInt(map.id)).toISOString()
    }));
    
    try {
        localStorage.setItem('rpg_maps', JSON.stringify(mapsMetadata));
    } catch (error) {
        console.error('Error saving maps metadata:', error);
    }
}

// Wczytuje wszystkie zapisane dane z localStorage przy starcie aplikacji
function loadSavedData() {
    // Załaduj pierwszą postać jeśli istnieje
    if (state.characters.length > 0 && !state.currentCharacter) {
        state.currentCharacter = state.characters[0];
        document.getElementById('character-name').value = state.currentCharacter.name || '';
        document.getElementById('character-class').value = state.currentCharacter.class || '';
        renderCharacterSheet(); // Wyświetl kartę postaci
    }
    
    // Renderuj listę żetonów
    renderTokensList();
    
    // Renderuj bibliotekę
    renderLibrary();
    
    // Załaduj ostatnią używaną mapę (jeśli istnieje w cache)
    const lastMapId = localStorage.getItem('rpg_lastMapId');
    const lastMapImage = localStorage.getItem('rpg_lastMapImage');
    
    if (lastMapId && lastMapImage) {
        const lastMap = state.maps.find(m => m.id === lastMapId);
        if (lastMap) {
            // Jeśli mapa jest w liście, załaduj ją
            state.currentMap = lastMap;
            state.mapImage = lastMapImage;
            console.log('Loading last used map:', lastMapId);
            
            // Renderuj mapę
            renderMap();
        } else {
            // Jeśli mapa nie ma w liście, dodaj ją jako "Ostatnia wgrana mapa"
            state.currentMap = {
                id: lastMapId,
                name: 'Ostatnia wgrana mapa',
                date: new Date().toISOString(),
                tokens: []
            };
            state.maps.push(state.currentMap);
            saveMaps();
            renderMap();
        }
    }
    
    // Renderuj obszary (cache zostanie zaktualizowany jeśli potrzeba)
    invalidateBoundariesCache();
    renderBoundariesList();
}

// ============================================
// FUNKCJE OBSZARÓW (BOUNDARIES)
// ============================================
// Funkcje odpowiedzialne za rysowanie i zarządzanie obszarami na mapie

// Inicjalizacja funkcji obszarów - ustawia event listenery dla przycisków
function initializeBoundaries() {
    const drawBtn = document.getElementById('draw-boundary-btn');
    const finishBtn = document.getElementById('finish-boundary-btn');
    const cancelBtn = document.getElementById('cancel-boundary-btn');
    
    drawBtn?.addEventListener('click', startDrawingBoundary);
    finishBtn?.addEventListener('click', finishBoundary);
    cancelBtn?.addEventListener('click', cancelBoundary);
    
    setupBoundaryCanvas();
}

function setupBoundaryCanvas() {
    const canvas = document.getElementById('map-canvas');
    const boundaryCanvas = document.getElementById('boundary-canvas');
    
    if (!canvas || !boundaryCanvas) return;
    
    // Synchronizuj rozmiar canvasa z mapą
    const updateCanvasSize = () => {
        const rect = canvas.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
            boundaryCanvas.width = rect.width;
            boundaryCanvas.height = rect.height;
            boundaryCanvas.style.width = rect.width + 'px';
            boundaryCanvas.style.height = rect.height + 'px';
            renderBoundaries();
        }
    };
    
    // Użyj ResizeObserver jeśli dostępny
    if (window.ResizeObserver) {
        const resizeObserver = new ResizeObserver(updateCanvasSize);
        resizeObserver.observe(canvas);
    } else {
        window.addEventListener('resize', updateCanvasSize);
    }
    
    // Aktualizuj przy zmianie widoku mapy
    const observer = new MutationObserver(() => {
        setTimeout(updateCanvasSize, 100);
    });
    observer.observe(canvas, { attributes: true, childList: true, subtree: true });
    
    // Inicjalizuj rozmiar
    setTimeout(updateCanvasSize, 200);
}

// Rozpoczyna tryb rysowania obszaru - użytkownik może klikać na mapie aby dodać punkty
function startDrawingBoundary() {
    state.drawingMode = true; // Włącz tryb rysowania
    state.currentBoundary = {
        points: [], // Pusta lista punktów
        color: getRandomBoundaryColor(), // Losowy kolor
        name: `Obszar ${state.boundaries.length + 1}` // Domyślna nazwa
    };
    
    // Zmień widoczność przycisków
    document.getElementById('draw-boundary-btn').style.display = 'none';
    document.getElementById('finish-boundary-btn').style.display = 'inline-flex';
    document.getElementById('cancel-boundary-btn').style.display = 'inline-flex';
    
    const canvas = document.getElementById('map-canvas');
    const boundaryCanvas = document.getElementById('boundary-canvas');
    canvas.style.cursor = 'crosshair'; // Zmień kursor na celownik
    boundaryCanvas.classList.add('active'); // Oznacz canvas jako aktywny
}

// Anuluje rysowanie obszaru - czyści aktualnie rysowany obszar
function cancelBoundary() {
    state.drawingMode = false; // Wyłącz tryb rysowania
    state.currentBoundary = { points: [], color: '#6c5ce7', name: '' }; // Wyczyść
    
    // Przywróć widoczność przycisków
    document.getElementById('draw-boundary-btn').style.display = 'inline-flex';
    document.getElementById('finish-boundary-btn').style.display = 'none';
    document.getElementById('cancel-boundary-btn').style.display = 'none';
    
    const canvas = document.getElementById('map-canvas');
    const boundaryCanvas = document.getElementById('boundary-canvas');
    canvas.style.cursor = ''; // Przywróć domyślny kursor
    boundaryCanvas.classList.remove('active'); // Oznacz canvas jako nieaktywny
    
    // Renderuj tylko cache (bez aktualnego obszaru)
    renderBoundaries();
}

// Kończy rysowanie obszaru - zapisuje obszar do listy
function finishBoundary() {
    // Wymagane minimum 3 punkty aby utworzyć obszar
    if (state.currentBoundary.points.length < 3) {
        alert('Potrzebujesz przynajmniej 3 punkty, aby stworzyć obszar!');
        return;
    }
    
    // Poproś użytkownika o nazwę obszaru
    const name = prompt('Podaj nazwę obszaru:', state.currentBoundary.name);
    if (name === null) return; // Użytkownik anulował
    
    // Utwórz nowy obszar z aktualnie rysowanych punktów
    const boundary = {
        id: Date.now().toString(), // Unikalne ID
        points: [...state.currentBoundary.points], // Kopia punktów
        color: state.currentBoundary.color,
        name: name || state.currentBoundary.name
    };
    
    state.boundaries.push(boundary); // Dodaj do listy
    saveBoundaries(); // Zapisz do localStorage
    
    // Oznacz cache jako wymagający aktualizacji
    invalidateBoundariesCache();
    
    cancelBoundary(); // Wyłącz tryb rysowania
    renderBoundariesList(); // Odśwież listę obszarów
}

// Obsługuje kliknięcie na canvas obszarów podczas rysowania
function handleBoundaryClick(e) {
    const boundaryCanvas = document.getElementById('boundary-canvas');
    const rect = boundaryCanvas.getBoundingClientRect();
    // Oblicz pozycję kliknięcia względem canvas
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Sprawdź czy kliknięto blisko pierwszego punktu (zamknij obszar)
    // Jeśli mamy już 3+ punkty i klikamy blisko pierwszego, zamykamy obszar
    if (state.currentBoundary.points.length >= 3) {
        const firstPoint = state.currentBoundary.points[0];
        const distance = Math.sqrt(Math.pow(x - firstPoint.x, 2) + Math.pow(y - firstPoint.y, 2));
        
        if (distance < 15) { // Jeśli w odległości mniejszej niż 15px
            // Zamknij obszar
            finishBoundary();
            return;
        }
    }
    
    // Dodaj nowy punkt do aktualnie rysowanego obszaru
    state.currentBoundary.points.push({ x, y });
    
    // Podczas rysowania renderuj tylko aktualny obszar (nie wszystko)
    renderBoundaries();
}

// Renderuje wszystkie obszary na canvas - używa cache dla wydajności
function renderBoundaries() {
    const boundaryCanvas = document.getElementById('boundary-canvas');
    if (!boundaryCanvas) return;
    
    const ctx = boundaryCanvas.getContext('2d');
    
    // Wyczyść canvas
    ctx.clearRect(0, 0, boundaryCanvas.width, boundaryCanvas.height);
    
    // Renderuj zapisane obszary z cache (jeśli istnieje) lub zaktualizuj cache
    // Cache jest używany dla wydajności - nie rysujemy wszystkich obszarów za każdym razem
    if (state.boundariesCacheDirty || !state.boundariesCache) {
        updateBoundariesCache(boundaryCanvas.width, boundaryCanvas.height);
        state.boundariesCacheDirty = false;
    }
    
    // Jeśli mamy cache, wyświetl go (szybkie renderowanie)
    if (state.boundariesCache) {
        ctx.drawImage(state.boundariesCache, 0, 0);
    }
    
    // Renderuj aktualnie rysowaną granicę (tylko podczas rysowania)
    // To jest rysowane na wierzchu cache
    if (state.drawingMode && state.currentBoundary.points.length > 0) {
        drawBoundary(ctx, state.currentBoundary, true);
    }
}

// Aktualizuje cache obszarów - renderuje wszystkie zapisane obszary na offscreen canvas
// Cache jest używany dla wydajności - zamiast rysować wszystkie obszary za każdym razem,
// rysujemy je raz na cache i kopiujemy na główny canvas
function updateBoundariesCache(width, height) {
    // Stwórz offscreen canvas dla cache (niewidoczny canvas w pamięci)
    const cacheCanvas = document.createElement('canvas');
    cacheCanvas.width = width || 1920; // Domyślna szerokość
    cacheCanvas.height = height || 1080; // Domyślna wysokość
    const cacheCtx = cacheCanvas.getContext('2d');
    
    // Renderuj wszystkie zapisane obszary na cache canvas
    state.boundaries.forEach(boundary => {
        drawBoundary(cacheCtx, boundary, false); // false = zapisany obszar
    });
    
    // Zapisz canvas jako cache (nie konwertujemy na data URL, zostawiamy jako canvas)
    state.boundariesCache = cacheCanvas;
}

// Oznacza cache jako nieaktualny i aktualizuje go
function invalidateBoundariesCache() {
    state.boundariesCacheDirty = true; // Oznacz jako wymagający aktualizacji
    const boundaryCanvas = document.getElementById('boundary-canvas');
    if (boundaryCanvas && boundaryCanvas.width > 0 && boundaryCanvas.height > 0) {
        updateBoundariesCache(boundaryCanvas.width, boundaryCanvas.height);
        state.boundariesCacheDirty = false;
        // Od razu zrenderuj
        renderBoundaries();
    }
}

// Rysuje pojedynczy obszar na canvas - używane zarówno dla cache jak i podczas rysowania
function drawBoundary(ctx, boundary, isDrawing) {
    if (boundary.points.length < 2) return;
    
    const points = boundary.points;
    const isClosed = !isDrawing && points.length >= 3;
    
    ctx.save();
    
    // Rysuj wypełnienie (przezroczyste)
    if (isClosed || (!isDrawing && points.length >= 3)) {
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y);
        }
        if (isClosed) {
            ctx.closePath();
        }
        
        // Przezroczyste wypełnienie
        const fillColor = hexToRgba(boundary.color, 0.3);
        ctx.fillStyle = fillColor;
        ctx.fill();
    }
    
    // Rysuj linię graniczną
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
    }
    
    // Jeśli rysujemy i mamy więcej niż 2 punkty, pokaż linię zamykającą
    if (isDrawing && points.length >= 3) {
        ctx.lineTo(points[0].x, points[0].y);
    }
    
    ctx.strokeStyle = boundary.color;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();
    
    // Rysuj punkty
    points.forEach((point, index) => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
        
        // Pierwszy punkt ma inny kolor jeśli możemy zamknąć obszar
        if (isDrawing && index === 0 && points.length >= 3) {
            ctx.fillStyle = '#00b894'; // Zielony - można zamknąć
            ctx.strokeStyle = '#00b894';
            ctx.lineWidth = 2;
        } else {
            ctx.fillStyle = boundary.color;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
        }
        
        ctx.fill();
        ctx.stroke();
    });
    
    ctx.restore();
}

// Konwertuje kolor hex na rgba z przezroczystością
function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16); // Czerwony
    const g = parseInt(hex.slice(3, 5), 16); // Zielony
    const b = parseInt(hex.slice(5, 7), 16); // Niebieski
    return `rgba(${r}, ${g}, ${b}, ${alpha})`; // Zwróć jako rgba
}

// Zwraca losowy kolor dla nowego obszaru (cyklicznie z listy)
function getRandomBoundaryColor() {
    const colors = [
        '#6c5ce7', // Fioletowy
        '#00b894', // Zielony
        '#e74c3c', // Czerwony
        '#0984e3', // Niebieski
        '#fdcb6e', // Żółty
        '#fd79a8', // Różowy
        '#55efc4', // Turkusowy
        '#a29bfe'  // Jasny fiolet
    ];
    // Użyj modulo aby cyklicznie wybierać kolory
    return colors[state.boundaries.length % colors.length];
}

// Renderuje listę wszystkich obszarów w panelu bocznym
function renderBoundariesList() {
    const list = document.getElementById('boundaries-list');
    if (!list) return;
    
    list.innerHTML = '';
    
    if (state.boundaries.length === 0) {
        list.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 1rem; font-size: 0.9rem;">Brak obszarów. Kliknij "Rysuj Obszar", aby dodać nowy.</p>';
        return;
    }
    
    state.boundaries.forEach(boundary => {
        const item = document.createElement('div');
        item.className = 'boundary-item';
        item.dataset.boundaryId = boundary.id;
        
        item.innerHTML = `
            <div class="boundary-item-info">
                <div class="boundary-item-color" style="background: ${boundary.color}; cursor: pointer;" onclick="event.stopPropagation(); changeBoundaryColor('${boundary.id}')" title="Zmień kolor"></div>
                <div class="boundary-item-name">${boundary.name}</div>
            </div>
            <div class="boundary-item-actions">
                <button class="block-action-btn" onclick="event.stopPropagation(); editBoundary('${boundary.id}')" title="Edytuj">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="block-action-btn" onclick="event.stopPropagation(); deleteBoundary('${boundary.id}')" title="Usuń">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        list.appendChild(item);
    });
}

// Zmienia kolor obszaru - otwiera picker kolorów
window.changeBoundaryColor = function(boundaryId) {
    const boundary = state.boundaries.find(b => b.id === boundaryId);
    if (!boundary) return;
    
    // Utwórz ukryty input typu color i otwórz go
    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.value = boundary.color;
    
    colorInput.addEventListener('change', (e) => {
        boundary.color = e.target.value; // Zaktualizuj kolor
        saveBoundaries(); // Zapisz zmiany
        invalidateBoundariesCache(); // Zaktualizuj cache (kolor się zmienił)
        renderBoundariesList(); // Odśwież listę
    });
    
    colorInput.click(); // Otwórz picker kolorów
};

// Edytuje nazwę obszaru
window.editBoundary = function(boundaryId) {
    const boundary = state.boundaries.find(b => b.id === boundaryId);
    if (!boundary) return;
    
    const newName = prompt('Podaj nową nazwę obszaru:', boundary.name);
    if (newName !== null && newName.trim() !== '') {
        boundary.name = newName.trim(); // Zaktualizuj nazwę
        saveBoundaries(); // Zapisz zmiany
        renderBoundariesList(); // Odśwież listę
    }
};

// Usuwa obszar z listy
window.deleteBoundary = function(boundaryId) {
    if (confirm('Czy na pewno chcesz usunąć ten obszar?')) {
        state.boundaries = state.boundaries.filter(b => b.id !== boundaryId); // Usuń z tablicy
        saveBoundaries(); // Zapisz zmiany
        invalidateBoundariesCache(); // Zaktualizuj cache (obszar został usunięty)
        renderBoundariesList(); // Odśwież listę
    }
};

// Zapisuje wszystkie obszary do localStorage
function saveBoundaries() {
    localStorage.setItem('rpg_boundaries', JSON.stringify(state.boundaries));
}

