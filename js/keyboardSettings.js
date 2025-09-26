(function (global) {
    const STORAGE_KEY = "pixelpaint.keyboardBindings.v1";

    const BINDING_META = {
        pencil: { label: "Pencil Mode", group: "tools", tool: "pencil" },
        fill: { label: "Bucket Mode", group: "tools", tool: "fill" },
        eraser: { label: "Eraser Mode", group: "tools", tool: "eraser" },
        colorpicker: { label: "Colorpicker Mode", group: "tools", tool: "colorpicker" },
        selection: { label: "Selection Mode", group: "tools", tool: "selection" },
        undo: { label: "Undo", group: "editing" },
        redo: { label: "Redo", group: "editing" },
        swapColors: { label: "Color Swap", group: "tools" },
        toggleGrid: { label: "Toggle Grid", group: "general" }
    };

    const DEFAULT_BINDINGS = {
        pencil: "KeyN",
        fill: "KeyB",
        eraser: "KeyE",
        colorpicker: "KeyV",
        selection: "KeyS",
        undo: "KeyZ",
        redo: "KeyX",
        swapColors: "KeyC",
        toggleGrid: "KeyG"
    };

    const CODE_LABEL_OVERRIDES = {
        Escape: 'Esc',
        Space: 'Space',
        Enter: 'Enter',
        Backspace: 'Backspace',
        Delete: 'Delete',
        Tab: 'Tab',
        ArrowUp: 'Up',
        ArrowDown: 'Down',
        ArrowLeft: 'Left',
        ArrowRight: 'Right',
        ShiftLeft: 'Shift',
        ShiftRight: 'Shift',
        ControlLeft: 'Ctrl',
        ControlRight: 'Ctrl',
        AltLeft: 'Alt',
        AltRight: 'Alt'
    };

    let activeBindings = Object.assign({}, DEFAULT_BINDINGS);
    let stateRef = null;
    const changeListeners = [];

    let uiInitialized = false;
    let activeCaptureInput = null;
    const bindingErrors = {};


    function cloneBindings(bindings) {
        return JSON.parse(JSON.stringify(bindings));
    }

    function notifyUser(message) {
        if (typeof global.Alert_User === 'function') {
            global.Alert_User(message);
        } else {
            console.log(message);
        }
    }

    function applyBindingErrorState() {
        if (typeof document === 'undefined') {
            return;
        }
        Object.keys(BINDING_META).forEach(function (action) {
            const message = bindingErrors[action];
            const input = document.querySelector('input[data-binding-action="' + action + '"]');
            if (input) {
                if (message) {
                    input.classList.add('error');
                } else {
                    input.classList.remove('error');
                }
            }
            const errorNode = document.querySelector('[data-binding-error="' + action + '"]');
            if (errorNode) {
                errorNode.textContent = message || '';
                if (message) {
                    errorNode.classList.add('visible');
                } else {
                    errorNode.classList.remove('visible');
                }
            }
        });
    }

    function setBindingError(action, message) {
        if (!action) {
            return;
        }
        if (!message) {
            clearBindingError(action);
            return;
        }
        bindingErrors[action] = message;
        applyBindingErrorState();
    }

    function clearBindingError(action) {
        if (!action) {
            return;
        }
        if (Object.prototype.hasOwnProperty.call(bindingErrors, action)) {
            delete bindingErrors[action];
            applyBindingErrorState();
        }
    }

    function clearAllBindingErrors() {
        let changed = false;
        Object.keys(bindingErrors).forEach(function (key) {
            delete bindingErrors[key];
            changed = true;
        });
        if (changed) {
            applyBindingErrorState();
        }
    }

    function getStoredBindings() {
        try {
            const raw = global.localStorage ? global.localStorage.getItem(STORAGE_KEY) : null;
            if (!raw) {
                return null;
            }
            return JSON.parse(raw);
        } catch (err) {
            console.warn("Unable to read stored keyboard bindings", err);
            return null;
        }
    }

    function persistBindings() {
        try {
            if (global.localStorage) {
                global.localStorage.setItem(STORAGE_KEY, JSON.stringify({
                    version: 1,
                    bindings: activeBindings
                }));
            }
        } catch (err) {
            console.warn("Unable to persist keyboard bindings", err);
        }
    }

    function sanitizeBindings(candidate) {
        const sanitized = {};
        const claimedCodes = {};

        Object.keys(BINDING_META).forEach(function (action) {
            let code = candidate[action];
            if (code === undefined || code === null || code === '') {
                code = DEFAULT_BINDINGS[action];
            }
            if (typeof code !== 'string' || !code.trim()) {
                throw new Error("Invalid key code for action '" + action + "'");
            }
            code = code.trim();
            if (claimedCodes[code] && claimedCodes[code] !== action) {
                throw new Error("Duplicate key code '" + code + "' found for actions '" + claimedCodes[code] + "' and '" + action + "'");
            }
            claimedCodes[code] = action;
            sanitized[action] = code;
        });

        return sanitized;
    }

    function applyBindings() {
        if (global.Tools) {
            Object.keys(BINDING_META).forEach(function (action) {
                const meta = BINDING_META[action];
                if (meta.tool && global.Tools[meta.tool]) {
                    global.Tools[meta.tool].hotkey = activeBindings[action];
                }
            });
        }
        if (stateRef && stateRef.grid) {
            stateRef.grid.hotkey = activeBindings.toggleGrid;
        }
    }

    function getActionForCode(code) {
        let result = null;
        Object.keys(activeBindings).some(function (action) {
            if (activeBindings[action] === code) {
                result = action;
                return true;
            }
            return false;
        });
        return result;
    }

    function formatDisplay(code) {
        if (!code) {
            return '-';
        }
        const label = getDisplayLabel(code);
        if (!label) {
            return '-';
        }
        return label.toUpperCase();
    }

    function initializeUiElements() {
        if (uiInitialized) {
            return true;
        }
        if (typeof document === 'undefined') {
            return false;
        }
        const panel = document.getElementById('keyboard-settings-panel');
        if (!panel) {
            return false;
        }

        const inputs = panel.querySelectorAll('input[data-binding-action]');
        inputs.forEach(function (input) {
            input.addEventListener('focus', startCapture);
            input.addEventListener('click', function (e) {
                e.target.focus();
            });
            input.addEventListener('keydown', handleCaptureKeydown);
            input.addEventListener('blur', stopCapture);
        });

        const importInput = document.getElementById('bindings-file-input');
        if (importInput) {
            importInput.addEventListener('change', handleImportChange);
        }

        const downloadButton = document.getElementById('download-bindings-button');
        if (downloadButton) {
            downloadButton.addEventListener('click', function () {
                downloadBindings();
                notifyUser('Keyboard shortcuts saved');
            });
        }

        const resetButton = document.getElementById('reset-bindings-button');
        if (resetButton) {
            resetButton.addEventListener('click', function () {
                reset();
                notifyUser('Keyboard shortcuts reset to default');
            });
        }

        uiInitialized = true;
        return true;
    }

    function startCapture(e) {
        activeCaptureInput = e.target;
        const action = activeCaptureInput.getAttribute('data-binding-action');
        clearBindingError(action);
        activeCaptureInput.classList.add('listening');
        activeCaptureInput.value = 'Press a key';
    }

    function stopCapture(e) {
        if (activeCaptureInput === e.target) {
            activeCaptureInput.classList.remove('listening');
            activeCaptureInput = null;
        }
        renderBindingInputs(activeBindings);
    }

    function handleCaptureKeydown(e) {
        if (!activeCaptureInput) {
            return;
        }
        if (e.code === 'Tab') {
            return;
        }
        e.preventDefault();
        if (e.code === 'Escape') {
            activeCaptureInput.blur();
            return;
        }
        const action = activeCaptureInput.getAttribute('data-binding-action');
        if (!action) {
            activeCaptureInput.blur();
            return;
        }
        const result = setBinding(action, e.code);
        if (!result.success) {
            if (result.reason === 'conflict' && result.conflict && BINDING_META[result.conflict]) {
                const label = BINDING_META[result.conflict].label;
                setBindingError(action, 'Already used by ' + label);
                notifyUser('Shortcut already used by ' + label + '. Choose another key.');
            } else if (result.reason === 'invalid-code') {
                setBindingError(action, 'Unable to use that key');
                notifyUser('Unable to use that key for a shortcut');
            } else {
                setBindingError(action, 'Unable to update shortcut');
                notifyUser('Unable to update shortcut');
            }
        } else {
            clearBindingError(action);
            notifyUser(BINDING_META[action].label + ' shortcut updated');
        }
        activeCaptureInput.blur();
    }

    function handleImportChange(e) {
        const input = e.target;
        const file = input.files && input.files[0];
        input.value = '';
        if (!file) {
            return;
        }
        loadFromFile(file)
            .then(function () {
                notifyUser('Keyboard shortcuts loaded');
            })
            .catch(function (err) {
                console.error(err);
                notifyUser('Failed to load keyboard shortcuts');
            });
    }

    function renderBindingInputs(bindings) {
        if (typeof document === 'undefined') {
            return;
        }
        const inputs = document.querySelectorAll('input[data-binding-action]');
        inputs.forEach(function (input) {
            if (input === activeCaptureInput) {
                return;
            }
            const action = input.getAttribute('data-binding-action');
            const code = bindings[action];
            input.value = formatDisplay(code);
        });
        applyBindingErrorState();
    }

    function renderBindingDisplays(bindings) {
        if (typeof document === 'undefined') {
            return;
        }
        const nodes = document.querySelectorAll('[data-binding-display]');
        nodes.forEach(function (node) {
            const action = node.getAttribute('data-binding-display');
            const code = bindings[action];
            node.textContent = formatDisplay(code);
        });
    }

    function renderButtonHotkeys(bindings) {
        if (typeof document === 'undefined') {
            return;
        }
        const undoText = document.querySelector('#undo-button .hotkeyText');
        if (undoText) {
            undoText.textContent = '(' + formatDisplay(bindings.undo) + ')';
        }
        const redoText = document.querySelector('#redo-button .hotkeyText');
        if (redoText) {
            redoText.textContent = '(' + formatDisplay(bindings.redo) + ')';
        }
        const gridText = document.querySelector('#grid-button .hotkeyText');
        if (gridText) {
            gridText.textContent = '(' + formatDisplay(bindings.toggleGrid) + ')';
        }
    }

    function updateUi(bindings) {
        if (typeof document === 'undefined') {
            return;
        }
        initializeUiElements();
        renderBindingInputs(bindings);
        renderBindingDisplays(bindings);
        renderButtonHotkeys(bindings);
        if (typeof global.Update_Tooltip_Text === 'function') {
            global.Update_Tooltip_Text();
        }
    }

    function notifyChange() {
        const snapshot = cloneBindings(activeBindings);
        updateUi(snapshot);
        changeListeners.forEach(function (cb) {
            try {
                cb(snapshot);
            } catch (err) {
                console.error('KeyboardSettings listener failed', err);
            }
        });
    }

    function init(options) {
        options = options || {};
        stateRef = options.state || null;

        const stored = getStoredBindings();
        if (stored && stored.bindings) {
            try {
                activeBindings = sanitizeBindings(stored.bindings);
            } catch (err) {
                console.warn('Stored keyboard bindings invalid, resetting to defaults', err);
                activeBindings = Object.assign({}, DEFAULT_BINDINGS);
            }
        }
        applyBindings();
        clearAllBindingErrors();
        notifyChange();
    }

    function getBindings() {
        return cloneBindings(activeBindings);
    }

    function setBinding(action, code) {
        if (!BINDING_META[action]) {
            return { success: false, reason: 'unknown-action' };
        }
        if (typeof code !== 'string' || !code.trim()) {
            return { success: false, reason: 'invalid-code' };
        }
        code = code.trim();
        const conflict = getActionForCode(code);
        if (conflict && conflict !== action) {
            return { success: false, reason: 'conflict', conflict: conflict };
        }
        activeBindings[action] = code;
        applyBindings();
        persistBindings();
        clearBindingError(action);
        notifyChange();
        return { success: true };
    }

    function reset() {
        activeBindings = Object.assign({}, DEFAULT_BINDINGS);
        applyBindings();
        persistBindings();
        clearAllBindingErrors();
        notifyChange();
    }

    function toJSON() {
        return {
            version: 1,
            bindings: cloneBindings(activeBindings)
        };
    }

    function fromJSON(payload) {
        if (!payload) {
            throw new Error('Missing payload');
        }
        const source = payload.bindings ? payload.bindings : payload;
        const sanitized = sanitizeBindings(source);
        activeBindings = sanitized;
        applyBindings();
        persistBindings();
        clearAllBindingErrors();
        notifyChange();
    }

    function loadFromFile(file) {
        return new Promise(function (resolve, reject) {
            if (!file) {
                reject(new Error('No file provided'));
                return;
            }
            const reader = new FileReader();
            reader.onerror = function () {
                reject(reader.error);
            };
            reader.onload = function () {
                try {
                    const payload = JSON.parse(reader.result);
                    fromJSON(payload);
                    resolve(cloneBindings(activeBindings));
                } catch (err) {
                    reject(err);
                }
            };
            reader.readAsText(file);
        });
    }

    function downloadBindings(filename) {
        filename = filename || 'pixelpaint-keyboard.json';
        const data = JSON.stringify(toJSON(), null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    function onChange(callback) {
        if (typeof callback === 'function') {
            changeListeners.push(callback);
        }
    }

    function getDisplayLabel(code) {
        if (!code) {
            return '';
        }
        if (code.indexOf('Key') === 0 && code.length > 3) {
            return code.slice(3);
        }
        if (code.indexOf('Digit') === 0 && code.length > 5) {
            return code.slice(5);
        }
        if (code.indexOf('Numpad') === 0 && code.length > 6) {
            return 'Num ' + code.slice(6);
        }
        return CODE_LABEL_OVERRIDES[code] || code;
    }

    global.KeyboardSettings = {
        init: init,
        getBindings: getBindings,
        setBinding: setBinding,
        reset: reset,
        toJSON: toJSON,
        fromJSON: fromJSON,
        loadFromFile: loadFromFile,
        downloadBindings: downloadBindings,
        getDisplayLabel: getDisplayLabel,
        onChange: onChange,
        DEFAULT_BINDINGS: cloneBindings(DEFAULT_BINDINGS),
        BINDING_META: cloneBindings(BINDING_META)
    };
})(window);
