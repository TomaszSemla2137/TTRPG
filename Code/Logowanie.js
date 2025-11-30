// Logowanie.js — zarządzanie lokalnymi użytkownikami i postaciami (localStorage)
// Struktura danych w localStorage pod kluczem 'ttrpg_users':
// { "uzytkownik1": ["PostacA","PostacB"], "uzytkownik2": ["PostacX"] }

(function () {
    const KEY = 'ttrpg_users';
    // Pobierz obiekt użytkowników
    function getUsers() {
        try {
            const raw = localStorage.getItem(KEY);
            return raw ? JSON.parse(raw) : {};
        } catch (e) {
            console.error('Błąd czytania users:', e);
            return {};
        }
    }
    function saveUsers(obj) {
        localStorage.setItem(KEY, JSON.stringify(obj));
    }

    // UI References
    const userSelect = document.getElementById('userSelect');
    const charSelect = document.getElementById('charSelect');
    const roleRadios = document.getElementsByName('role');
    const newUserBtn = document.getElementById('newUserBtn');
    const newUserFields = document.getElementById('newUserFields');
    const createUserBtn = document.getElementById('createUserBtn');
    const newUserName = document.getElementById('newUserName');
    const newCharName = document.getElementById('newCharName');

    const newCharBtn = document.getElementById('newCharBtn');
    const newCharFields = document.getElementById('newCharFields');
    const createCharBtn = document.getElementById('createCharBtn');
    const newCharOnlyName = document.getElementById('newCharOnlyName');

    const loginBtn = document.getElementById('loginBtn');

    function populateUserSelect() {
        const users = getUsers();
        // clear
        userSelect.innerHTML = '';
        const emptyOpt = document.createElement('option');
        emptyOpt.value = '';
        emptyOpt.textContent = '-- Wybierz użytkownika --';
        userSelect.appendChild(emptyOpt);

        Object.keys(users).forEach(name => {
            const opt = document.createElement('option');
            opt.value = name;
            opt.textContent = name;
            userSelect.appendChild(opt);
        });
        // po przeładowaniu danych zaktualizuj listę postaci
        populateCharSelect();
    }

    function populateCharSelect() {
        const users = getUsers();
        const selectedUser = userSelect.value;
        charSelect.innerHTML = '';
        const emptyOpt = document.createElement('option');
        emptyOpt.value = '';
        emptyOpt.textContent = '-- Wybierz postać --';
        charSelect.appendChild(emptyOpt);
        // if role is GM, keep charSelect disabled
        const role = getSelectedRole();
        if (role === 'gm') {
            charSelect.disabled = true;
            newCharBtn.disabled = true;
            return;
        }
        if (selectedUser && users[selectedUser]) {
            users[selectedUser].forEach(ch => {
                const opt = document.createElement('option');
                opt.value = ch;
                opt.textContent = ch;
                charSelect.appendChild(opt);
            });
            charSelect.disabled = false;
            newCharBtn.disabled = false;
        } else {
            charSelect.disabled = true;
            newCharBtn.disabled = true;
        }
    }

    function getSelectedRole(){
        for(const r of roleRadios) if (r.checked) return r.value;
        return 'player';
    }

    function toggleNewUserFields(show) {
        newUserFields.style.display = show ? '' : 'none';
    }
    function toggleNewCharFields(show) {
        newCharFields.style.display = show ? '' : 'none';
    }

    // Create user + first character
    function createUserWithChar() {
        const u = newUserName.value && newUserName.value.trim();
        const c = newCharName.value && newCharName.value.trim();
        if (!u) { alert('Podaj nazwę użytkownika'); return; }
        if (!c) { alert('Podaj nazwę postaci'); return; }
        const users = getUsers();
        if (users[u]) {
            alert('Użytkownik o takiej nazwie już istnieje');
            return;
        }
        users[u] = [c];
        saveUsers(users);
        populateUserSelect();
        userSelect.value = u;
        populateCharSelect();
        charSelect.value = c;
        toggleNewUserFields(false);
        newUserName.value = '';
        newCharName.value = '';
        alert('Utworzono użytkownika i postać');
    }

    // Create new character for selected user
    function createCharForUser() {
        const u = userSelect.value;
        const c = newCharOnlyName.value && newCharOnlyName.value.trim();
        if (!u) { alert('Wybierz użytkownika'); return; }
        if (!c) { alert('Podaj nazwę postaci'); return; }
        const users = getUsers();
        users[u] = users[u] || [];
        if (users[u].includes(c)) { alert('Postać o takiej nazwie już istnieje dla tego użytkownika'); return; }
        users[u].push(c);
        saveUsers(users);
        populateCharSelect();
        charSelect.value = c;
        toggleNewCharFields(false);
        newCharOnlyName.value = '';
        alert('Utworzono postać');
    }

    // "Logowanie" — zapisanie wyboru sesji lokalnie (możesz użyć do przejścia dalej)
    function doLogin() {
        const role = getSelectedRole();
        const u = userSelect.value;
        const c = charSelect.value;
        if (!u) { alert('Wybierz użytkownika'); return; }
        if (role === 'player') {
            if (!c) { alert('Wybierz postać'); return; }
            const session = { user: u, character: c, role: 'player' };
            localStorage.setItem('ttrpg_current', JSON.stringify(session));
        } else {
            const session = { user: u, character: '', role: 'gm' };
            localStorage.setItem('ttrpg_current', JSON.stringify(session));
        }
        // Przekieruj do strony gry po wyborze
        window.location.href = 'gra.html';
    }

    document.addEventListener('DOMContentLoaded', function () {
        populateUserSelect();

        // role radio change: toggle character selection when GM selected
        roleRadios.forEach(r => r.addEventListener('change', function(){
            populateCharSelect();
        }));

        newUserBtn.addEventListener('click', function () {
            toggleNewUserFields(newUserFields.style.display === 'none');
        });

        createUserBtn.addEventListener('click', createUserWithChar);

        userSelect.addEventListener('change', function () {
            populateCharSelect();
        });

        newCharBtn.addEventListener('click', function () {
            toggleNewCharFields(newCharFields.style.display === 'none');
        });

        createCharBtn.addEventListener('click', createCharForUser);

        loginBtn.addEventListener('click', doLogin);
    });

})();
