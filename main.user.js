// ==UserScript==
// @name         main.user.js
// @namespace    gh
// @version      v01
// @description  Helper script for ITSM
// @author       ...
// @match        Paste the ITSM URL here.
// @icon         https://www.google.com/s2/favicons?sz=64&domain=79.60
// @resource     itsmHelperCss https://cdn.jsdelivr.net/gh/omurbilgin/ItsmHelper@latest/style.css
// @grant        GM_addStyle
// @grant        GM_getResourceText
// @grant        unsafeWindow
// ==/UserScript==

(function() {
    'use strict';

    const STORAGE_KEY = 'itsm-helper-window-state';
    const ROSTER_STORAGE_KEY = 'itsm-helper-roster';

    const defaultState = {
        collapsed: false,
        x: null,
        y: null
    };

    const TEAM_OPTIONS = [
        'GHCloud Backup Team',
        'Cloud Systems Support Team',
        'FI Cloud',
        'Network&Security',
        'CyberSec',
        'SAP',
        'Infrastructure',
        'Linux',
        'Microsoft',
        'Database'
    ];

    const TEAM_PRESETS = {
        'GHCloud Backup Team': {
            group: 'GHCloud Backup Team',
            category: 'Backup (Maas)',
            serviceCategory: 'MaaS (Backup)',
            level: 'L1',
            requestType: 'Event'
        },
        'Cloud Systems Support Team': {
            group: 'Cloud Systems Support Team',
            category: 'Cloud Services',
            serviceCategory: 'GlassHouse Cloud Services',
            level: 'L1',
            requestType: 'Event'
        },
        'FI Cloud': {
            group: 'FI Cloud Team',
            category: 'FI Cloud - Cloud Services',
            serviceCategory: 'FI Cloud Services',
            level: 'L1',
            requestType: 'Event'
        },
        'Network&Security': {
            group: 'Network&Security Team',
            category: 'NWS - Network Services',
            serviceCategory: 'NWS - Network & Security Services',
            level: 'L1',
            requestType: 'Event'
        },
        'CyberSec': {
            group: 'Cyber Security Team',
            category: 'NWS - Security Services',
            serviceCategory: 'NWS - Network & Security Services',
            level: 'L1',
            requestType: 'Event'
        },
        'SAP': {
            group: 'SAP Operations Team',
            category: 'SAP - Basis',
            serviceCategory: 'SAP Maintenance Services',
            level: 'L1',
            requestType: 'Event'
        },
        'Infrastructure': {
            group: 'Virtualization & Infrastructure Team',
            category: 'Sanallaştırma ve Alt Yapı Sanallaştırma',
            serviceCategory: 'Sanallaştırma ve Alt Yapı Hizmetleri',
            level: 'L1',
            requestType: 'Event'
        },
        'Linux': {
            group: 'Linux Platforms Team',
            category: 'Linux Platform Sorunları',
            serviceCategory: 'Linux',
            level: 'L1',
            requestType: 'Event'
        },
        'Microsoft': {
            group: 'Microsoft Platform Team',
            category: 'ManagedOS',
            serviceCategory: 'Microsoft Platform Hizmetleri',
            level: 'L1',
            requestType: 'Event'
        },
        'Database': {
            group: 'Database Team',
            category: 'Database Services',
            serviceCategory: 'Database Management',
            level: 'L1',
            requestType: 'Event'
        }
    };

    const STATUS_OPTIONS = [
        'Open',
        'Pending Planing',
        'In Progress',
        'Assigned',
        'Pending Approval',
        'Pending Assignment',
        'Pending Change',
        'Pending',
        'Customer',
        'Pending Partner',
        'Closed',
        'Pending Portal',
        'Resolved',
        'Succes'
    ];

    const SCOPE_OPTIONS = [
        'Kapsam İçi',
        'Kapsam Dışı'
    ];

    const REQUEST_TYPE_OPTIONS = [
        'Event',
        'Incident',
        'Information Request',
        'Maintenance',
        'Major Incident',
        'Request',
        'Security'
    ];

    const VALUE_ALIASES = {
        'pending planing': ['Pending Planing', 'Pending Planning']
    };

    const FIELD_CONFIG = {
        group: { label: 'Group', name: 'group', required: true },
        scope: { label: 'Kapsam Bilgisi', name: 'udf_fields.udf_pick_4203' },
        category: { label: 'Category', name: 'category' },
        serviceCategory: { label: 'Service Category', name: 'service_category' },
        technician: { label: 'Technician', name: 'technician' },
        level: { label: 'Level', name: 'level' },
        requestType: { label: 'Request Type', name: 'request_type' },
        status: { label: 'Status', name: 'status' }
    };

    function loadCss() {
        try {
            const css = GM_getResourceText('itsmHelperCss');
            if (css) {
                GM_addStyle(css);
            }
        } catch (error) {
            void error;
        }
    }

    function readState() {
        try {
            return Object.assign({}, defaultState, JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'));
        } catch (error) {
            return Object.assign({}, defaultState);
        }
    }

    function saveState(nextState) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
    }

    function readRoster() {
        try {
            return JSON.parse(localStorage.getItem(ROSTER_STORAGE_KEY) || '{}');
        } catch (error) {
            return {};
        }
    }

    function saveRoster(roster) {
        localStorage.setItem(ROSTER_STORAGE_KEY, JSON.stringify(roster));
    }

    function clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    function createWindow() {
        if (document.getElementById('itsmh-window')) {
            return;
        }

        const state = readState();
        const roster = readRoster();
        const panel = document.createElement('section');
        panel.id = 'itsmh-window';
        panel.className = 'itsmh-window';
        panel.setAttribute('aria-label', 'ITSM Helper');
        panel.innerHTML = `
            <header class="itsmh-titlebar">
                <div class="itsmh-brand">
                    <span class="itsmh-mark" aria-hidden="true">IH</span>
                    <span class="itsmh-title">ITSM Helper</span>
                </div>
                <button class="itsmh-icon-button" type="button" data-itsmh-toggle aria-label="Paneli kapat">
                    <span aria-hidden="true">-</span>
                </button>
            </header>
            <div class="itsmh-body">
                <div class="itsmh-status">
                    <span class="itsmh-status-dot" aria-hidden="true"></span>
                    <span>Hazır</span>
                </div>
                <label class="itsmh-field">
                    <span>Group</span>
                    <select class="itsmh-select" data-itsmh-team>
                        ${TEAM_OPTIONS.map((team) => `<option value="${escapeAttribute(team)}">${escapeHtml(team)}</option>`).join('')}
                    </select>
                </label>
                <label class="itsmh-field">
                    <span>Kapsam Bilgisi</span>
                    <select class="itsmh-select" data-itsmh-scope>
                        ${SCOPE_OPTIONS.map((scope) => `<option value="${escapeAttribute(scope)}">${escapeHtml(scope)}</option>`).join('')}
                    </select>
                </label>
                <label class="itsmh-field">
                    <span>Request Type</span>
                    <select class="itsmh-select" data-itsmh-request-type>
                        ${REQUEST_TYPE_OPTIONS.map((requestType) => `<option value="${escapeAttribute(requestType)}">${escapeHtml(requestType)}</option>`).join('')}
                    </select>
                </label>
                <label class="itsmh-field">
                    <span>Status</span>
                    <select class="itsmh-select" data-itsmh-status>
                        ${STATUS_OPTIONS.map((status) => `<option value="${escapeAttribute(status)}">${escapeHtml(status)}</option>`).join('')}
                    </select>
                </label>
                <div class="itsmh-roster">
                    <div class="itsmh-roster-title">Nobetciler</div>
                    ${TEAM_OPTIONS.map((team) => `
                        <label class="itsmh-roster-row">
                            <span>${escapeHtml(team)}</span>
                            <input class="itsmh-input" type="text" value="${escapeAttribute(roster[team] || '')}" data-itsmh-roster="${escapeAttribute(team)}">
                        </label>
                    `).join('')}
                </div>
                <button class="itsmh-primary" type="button" data-itsmh-update>Update</button>
            </div>
        `;

        document.body.appendChild(panel);

        const toggleButton = panel.querySelector('[data-itsmh-toggle]');
        const titlebar = panel.querySelector('.itsmh-titlebar');
        const statusText = panel.querySelector('.itsmh-status span:last-child');
        const updateButton = panel.querySelector('[data-itsmh-update]');
        const rosterInputs = Array.from(panel.querySelectorAll('[data-itsmh-roster]'));

        function applyState() {
            panel.classList.toggle('is-collapsed', state.collapsed);
            toggleButton.setAttribute('aria-label', state.collapsed ? 'Paneli ac' : 'Paneli kapat');
            toggleButton.querySelector('span').textContent = state.collapsed ? '+' : '-';

            if (typeof state.x === 'number' && typeof state.y === 'number') {
                panel.style.left = `${state.x}px`;
                panel.style.top = `${state.y}px`;
                panel.style.right = 'auto';
            }
        }

        toggleButton.addEventListener('click', () => {
            state.collapsed = !state.collapsed;
            applyState();
            saveState(state);
        });

        updateButton.addEventListener('click', async () => {
            updateButton.disabled = true;
            statusText.textContent = 'Uygulanıyor...';

            try {
                const selectedTeam = panel.querySelector('[data-itsmh-team]').value;
                const selectedScope = panel.querySelector('[data-itsmh-scope]').value;
                const selectedRequestType = panel.querySelector('[data-itsmh-request-type]').value;
                const selectedStatus = panel.querySelector('[data-itsmh-status]').value;
                const technicianInput = rosterInputs.find((input) => input.getAttribute('data-itsmh-roster') === selectedTeam);
                const technician = technicianInput ? technicianInput.value : '';
                const result = await withTimeout(applyRequestPreset(selectedTeam, selectedScope, selectedRequestType, selectedStatus, technician.trim(), statusText), 90000);

                statusText.textContent = result.missing.length
                    ? `Eksik: ${result.missing.join(', ')}`
                    : 'Tamamlandı';
            } catch (error) {
                console.error('ITSM Helper update failed.', error);
                statusText.textContent = 'Hata: console kontrol et';
            } finally {
                updateButton.disabled = false;
            }
        });

        rosterInputs.forEach((input) => {
            input.addEventListener('input', () => {
                const nextRoster = readRoster();
                nextRoster[input.getAttribute('data-itsmh-roster')] = input.value;
                saveRoster(nextRoster);
            });
        });

        titlebar.addEventListener('pointerdown', (event) => {
            if (event.target.closest('button')) {
                return;
            }

            const rect = panel.getBoundingClientRect();
            const offsetX = event.clientX - rect.left;
            const offsetY = event.clientY - rect.top;

            panel.setPointerCapture(event.pointerId);
            panel.classList.add('is-dragging');

            function onPointerMove(moveEvent) {
                const width = panel.offsetWidth;
                const height = panel.offsetHeight;
                const nextX = clamp(moveEvent.clientX - offsetX, 8, window.innerWidth - width - 8);
                const nextY = clamp(moveEvent.clientY - offsetY, 8, window.innerHeight - height - 8);

                panel.style.left = `${nextX}px`;
                panel.style.top = `${nextY}px`;
                panel.style.right = 'auto';
                state.x = nextX;
                state.y = nextY;
            }

            function onPointerUp(upEvent) {
                panel.releasePointerCapture(upEvent.pointerId);
                panel.classList.remove('is-dragging');
                panel.removeEventListener('pointermove', onPointerMove);
                panel.removeEventListener('pointerup', onPointerUp);
                saveState(state);
            }

            panel.addEventListener('pointermove', onPointerMove);
            panel.addEventListener('pointerup', onPointerUp);
        });

        window.addEventListener('resize', () => {
            const rect = panel.getBoundingClientRect();
            state.x = clamp(rect.left, 8, window.innerWidth - panel.offsetWidth - 8);
            state.y = clamp(rect.top, 8, window.innerHeight - panel.offsetHeight - 8);
            applyState();
            saveState(state);
        });

        applyState();
    }

    function escapeHtml(value) {
        return String(value).replace(/[&<>"']/g, (char) => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        })[char]);
    }

    function escapeAttribute(value) {
        return escapeHtml(value);
    }

    function normalizeText(value) {
        return String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
    }

    function getValueAliases(value) {
        const normalized = normalizeText(value);
        return (VALUE_ALIASES[normalized] || [value]).map(normalizeText);
    }

    function textMatchesValue(text, value) {
        const normalizedText = normalizeText(text);
        return getValueAliases(value).some((candidate) => normalizedText === candidate);
    }

    function optionMatchesValue(text, value) {
        const normalizedText = normalizeText(text);
        const candidates = getValueAliases(value);

        return candidates.some((candidate) => (
            normalizedText === candidate
            || normalizedText.startsWith(candidate)
            || normalizedText.includes(candidate)
        ));
    }

    function isVisible(element) {
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
    }

    function sleep(ms) {
        return new Promise((resolve) => window.setTimeout(resolve, ms));
    }

    function withTimeout(promise, ms) {
        return Promise.race([
            promise,
            new Promise((_, reject) => {
                window.setTimeout(() => reject(new Error(`Operation timed out after ${ms}ms`)), ms);
            })
        ]);
    }

    function getPageJQuery() {
        try {
            return (typeof unsafeWindow !== 'undefined' && unsafeWindow.jQuery) || window.jQuery || null;
        } catch (error) {
            return window.jQuery || null;
        }
    }

    function dispatchValueEvents(element) {
        ['input', 'change', 'blur'].forEach((eventName) => {
            element.dispatchEvent(new Event(eventName, { bubbles: true }));
        });

        const pageJQuery = getPageJQuery();
        if (pageJQuery) {
            try {
                pageJQuery(element).trigger('input').trigger('change').trigger('blur');
            } catch (error) {
                void error;
            }
        }
    }

    function getFieldControl(field) {
        return document.querySelector(`input[name="${field.name}"], select[name="${field.name}"], textarea[name="${field.name}"]`);
    }

    function setNativeSelect(control, value) {
        const select = control && control.tagName === 'SELECT' ? control : null;
        if (!select) {
            return false;
        }

        const option = Array.from(select.options).find((item) => textMatchesValue(item.textContent, value));
        if (!option) {
            return false;
        }

        select.value = option.value;
        dispatchValueEvents(select);
        return true;
    }

    function clearInputValue(input) {
        input.focus();
        input.value = '';
        dispatchValueEvents(input);
        fireKeyboardEvent(input, 'keydown', 'Backspace');
        fireKeyboardEvent(input, 'keyup', 'Backspace');
    }

    function typeSearchValue(input, value) {
        input.focus();
        input.value = value;
        dispatchValueEvents(input);
        fireKeyboardEvent(input, 'keydown', value.slice(-1) || 'a');
        fireKeyboardEvent(input, 'keyup', value.slice(-1) || 'a');

        const pageJQuery = getPageJQuery();
        if (pageJQuery) {
            pageJQuery(input).trigger('keyup').trigger('input').trigger('change');
        }
    }

    function fireKeyboardEvent(element, eventName, key) {
        const view = getElementView(element);
        const event = new view.KeyboardEvent(eventName, { bubbles: true, cancelable: true, key });
        try {
            const code = key === 'Backspace' ? 8 : key === 'Enter' ? 13 : key.toUpperCase().charCodeAt(0);
            Object.defineProperty(event, 'keyCode', { get: () => code });
            Object.defineProperty(event, 'which', { get: () => code });
        } catch (error) {
            void error;
        }
        element.dispatchEvent(event);
    }

    function getElementView(element) {
        return element.ownerDocument && element.ownerDocument.defaultView
            ? element.ownerDocument.defaultView
            : window;
    }

    function openSelect2(control) {
        const pageJQuery = getPageJQuery();
        if (!pageJQuery || !control) {
            return false;
        }

        try {
            const $control = pageJQuery(control);
            if (typeof $control.select2 === 'function' && $control.data('select2')) {
                $control.select2('open');
                return true;
            }
            return false;
        } catch (error) {
            void error;
            return false;
        }
    }

    async function setSelect2Field(control, value) {
        closeOpenDropdown();
        await sleep(60);

        if (!openSelect2(control)) {
            clickSelect2Sibling(control);
        }

        const searchInput = await waitForSelect2SearchInput(3000);
        if (!searchInput) {
            return false;
        }

        clearInputValue(searchInput);
        await sleep(40);
        typeSearchValue(searchInput, value);

        const option = await waitForOption(value, 8000);
        if (!option) {
            closeOpenDropdown();
            return false;
        }

        clickElement(option);
        await sleep(250);
        return true;
    }

    function clickSelect2Sibling(control) {
        const container = getSelect2Container(control);
        if (container) {
            clickElement(container);
        }
    }

    function getSelect2Container(control) {
        const directId = control.id ? document.querySelector(`#s2id_${cssEscape(control.id)}`) : null;
        if (directId) {
            return directId;
        }

        let current = control.previousElementSibling;
        while (current) {
            if (current.classList && current.classList.contains('select2-container')) {
                return current;
            }
            current = current.previousElementSibling;
        }

        current = control.nextElementSibling;
        while (current) {
            if (current.classList && current.classList.contains('select2-container')) {
                return current;
            }
            current = current.nextElementSibling;
        }

        return control.parentElement && control.parentElement.querySelector('.select2-container, [id^="s2id_"]');
    }

    function cssEscape(value) {
        if (window.CSS && typeof window.CSS.escape === 'function') {
            return window.CSS.escape(value);
        }

        return String(value).replace(/["\\]/g, '\\$&');
    }

    async function waitForSelect2SearchInput(timeoutMs) {
        const startedAt = Date.now();

        while (Date.now() - startedAt < timeoutMs) {
            const input = Array.from(document.querySelectorAll([
                '.select2-drop-active input.select2-input',
                '.select2-drop-active input[type="text"]',
                '.select2-dropdown-open input.select2-input',
                '.select2-search input',
                'input.select2-input'
            ].join(','))).find((item) => isVisible(item) && !item.disabled);

            if (input) {
                return input;
            }

            await sleep(100);
        }

        return null;
    }

    async function waitForOption(value, timeoutMs) {
        const startedAt = Date.now();

        while (Date.now() - startedAt < timeoutMs) {
            const options = getVisibleOptions();
            const exact = options.find((item) => textMatchesValue(item.textContent, value));
            const loose = options.find((item) => optionMatchesValue(item.textContent, value));
            const option = exact || loose;

            if (option) {
                return option;
            }

            await sleep(150);
        }

        return null;
    }

    function getVisibleOptions() {
        return Array.from(document.querySelectorAll([
            '.select2-drop-active .select2-result-selectable',
            '.select2-drop-active .select2-result-label',
            '.select2-results .select2-result-selectable',
            '.select2-results .select2-result-label',
            '[role="option"]',
            '.dropdown-menu li',
            '.ui-menu-item'
        ].join(','))).filter(isVisible);
    }

    function clickElement(element) {
        const view = getElementView(element);
        ['mousedown', 'mouseup', 'click'].forEach((eventName) => {
            element.dispatchEvent(new view.MouseEvent(eventName, { bubbles: true, cancelable: true, view }));
        });
    }

    function closeOpenDropdown() {
        const activeElement = document.activeElement;
        if (activeElement) {
            fireKeyboardEvent(activeElement, 'keydown', 'Escape');
            fireKeyboardEvent(activeElement, 'keyup', 'Escape');
            activeElement.blur();
        }

        const pageJQuery = getPageJQuery();
        if (pageJQuery) {
            try {
                pageJQuery(document).trigger('mousedown').trigger('mouseup').trigger('click');
            } catch (error) {
                void error;
            }
        }
    }

    async function setRequestField(field, value) {
        const control = getFieldControl(field);

        if (!control) {
            return false;
        }

        if (setNativeSelect(control, value)) {
            await sleep(125);
            return true;
        }

        return setSelect2Field(control, value);
    }

    async function applyRequestPreset(group, scope, requestType, status, technician, statusText) {
        const preset = TEAM_PRESETS[group] || TEAM_PRESETS['Cloud Systems Support Team'];
        const fields = [
            [FIELD_CONFIG.group, preset.group],
            [FIELD_CONFIG.scope, scope],
            [FIELD_CONFIG.category, preset.category],
            [FIELD_CONFIG.serviceCategory, preset.serviceCategory],
            ...(technician ? [[FIELD_CONFIG.technician, technician]] : []),
            [FIELD_CONFIG.level, preset.level],
            [FIELD_CONFIG.requestType, requestType],
            [FIELD_CONFIG.status, status]
        ];

        const missing = [];

        for (const [field, value] of fields) {
            if (statusText) {
                statusText.textContent = `${field.label} seçiliyor...`;
            }

            const applied = await setRequestField(field, value);
            if (!applied) {
                missing.push(field.label);
                closeOpenDropdown();
                if (field.required) {
                    break;
                }
            } else if (statusText) {
                statusText.textContent = `${field.label} tamam`;
            }
            await sleep(field.required ? 450 : 300);
        }

        return { missing };
    }

    function waitForRequestForm() {
        return new Promise((resolve) => {
            const existingForm = document.querySelector('#req-form, #form-container');
            if (existingForm) {
                resolve(existingForm);
                return;
            }

            const observer = new MutationObserver(() => {
                const form = document.querySelector('#req-form, #form-container');
                if (form) {
                    observer.disconnect();
                    resolve(form);
                }
            });

            observer.observe(document.documentElement, { childList: true, subtree: true });
            window.setTimeout(() => {
                observer.disconnect();
                resolve(document.body);
            }, 10000);
        });
    }

    async function init() {
        loadCss();
        await waitForRequestForm();
        createWindow();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();
