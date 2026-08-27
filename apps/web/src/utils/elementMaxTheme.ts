/*
Copyright 2026 AriesAlex

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

const STORAGE_KEY = "element_max_theme_editor";
const SCHEMA = "element-max-theme";
const VERSION = 1;
const MAX_COLORS = 2000;
const MAX_PRESETS = 100;
export const MAX_THEME_IMPORT_SIZE = 1024 * 1024;
const CSS_VARIABLE = /^--[a-z0-9_-]{1,126}$/i;

export interface ThemeColors {
    [variable: string]: string;
}

export interface ElementMaxThemePreset {
    name: string;
    colors: ThemeColors;
}

interface StoredThemeState {
    version: 1;
    active: ThemeColors;
    presets: ElementMaxThemePreset[];
}

interface ThemeFile extends StoredThemeState {
    schema: typeof SCHEMA;
}

export interface ThemeColorVariable {
    name: string;
    value: string;
    pickerValue: string;
}

function emptyState(): StoredThemeState {
    return { version: VERSION, active: {}, presets: [] };
}

function isColor(value: string): boolean {
    if (!value || value.length > 128) return false;
    const probe = document.createElement("span");
    probe.style.color = "";
    probe.style.color = value;
    return probe.style.color !== "";
}

function resolveThemeColor(name: string): string | undefined {
    const resolved = getComputedStyle(document.body).getPropertyValue(name).trim();
    return isColor(resolved) ? resolved : undefined;
}

function sanitizeColors(value: unknown): ThemeColors {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        throw new Error("Theme colors must be an object");
    }

    const entries = Object.entries(value);
    if (entries.length > MAX_COLORS) throw new Error("Theme contains too many colors");

    const colors: ThemeColors = {};
    for (const [name, color] of entries) {
        if (!CSS_VARIABLE.test(name) || typeof color !== "string" || !isColor(color)) {
            throw new Error(`Invalid theme color: ${name}`);
        }
        if (!resolveThemeColor(name)) {
            throw new Error(`Unknown theme color variable: ${name}`);
        }
        colors[name] = color.trim();
    }
    return colors;
}

function sanitizePresets(value: unknown): ElementMaxThemePreset[] {
    if (!Array.isArray(value) || value.length > MAX_PRESETS) throw new Error("Invalid theme presets");
    return value.map((preset) => {
        if (!preset || typeof preset !== "object" || Array.isArray(preset)) {
            throw new Error("Invalid theme preset");
        }
        const name = "name" in preset && typeof preset.name === "string" ? preset.name.trim() : "";
        if (!name || name.length > 80) throw new Error("Invalid theme preset name");
        return { name, colors: sanitizeColors("colors" in preset ? preset.colors : undefined) };
    });
}

function loadState(): StoredThemeState {
    try {
        const value = localStorage.getItem(STORAGE_KEY);
        if (!value) return emptyState();
        const parsed = JSON.parse(value) as Partial<StoredThemeState>;
        if (parsed.version !== VERSION) return emptyState();
        return {
            version: VERSION,
            active: sanitizeColors(parsed.active ?? {}),
            presets: sanitizePresets(parsed.presets ?? []),
        };
    } catch {
        localStorage.removeItem(STORAGE_KEY);
        return emptyState();
    }
}

function saveState(state: StoredThemeState): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function applyColors(colors: ThemeColors): void {
    for (const [name, color] of Object.entries(colors)) {
        document.body.style.setProperty(name, color);
    }
}

export function applyStoredThemeOverrides(): void {
    applyColors(loadState().active);
}

export function getThemePresets(): ElementMaxThemePreset[] {
    return loadState().presets;
}

export function setThemeColor(name: string, color: string): void {
    const sanitized = sanitizeColors({ [name]: color });
    const state = loadState();
    state.active[name] = sanitized[name];
    saveState(state);
    document.body.style.setProperty(name, sanitized[name]);
}

export function clearThemeColor(name: string): void {
    if (!CSS_VARIABLE.test(name)) return;
    const state = loadState();
    delete state.active[name];
    saveState(state);
    document.body.style.removeProperty(name);
}

export function resetThemeColors(): void {
    const state = loadState();
    for (const name of Object.keys(state.active)) document.body.style.removeProperty(name);
    state.active = {};
    saveState(state);
}

export function saveThemePreset(name: string, colors: ThemeColors): ElementMaxThemePreset[] {
    const trimmedName = name.trim();
    if (!trimmedName || trimmedName.length > 80) throw new Error("Invalid theme preset name");
    const preset = { name: trimmedName, colors: sanitizeColors(colors) };
    const state = loadState();
    const existingIndex = state.presets.findIndex(
        (item) => item.name.localeCompare(trimmedName, undefined, { sensitivity: "accent" }) === 0,
    );
    if (existingIndex === -1) state.presets.push(preset);
    else state.presets[existingIndex] = preset;
    state.presets.sort((a, b) => a.name.localeCompare(b.name));
    saveState(state);
    return state.presets;
}

export function deleteThemePreset(name: string): ElementMaxThemePreset[] {
    const state = loadState();
    state.presets = state.presets.filter((preset) => preset.name !== name);
    saveState(state);
    return state.presets;
}

export function applyThemePreset(preset: ElementMaxThemePreset): void {
    const colors = sanitizeColors(preset.colors);
    resetThemeColors();
    const state = loadState();
    state.active = colors;
    saveState(state);
    applyColors(colors);
}

export function exportThemeCollection(active: ThemeColors): string {
    const themeFile: ThemeFile = {
        schema: SCHEMA,
        version: VERSION,
        active: sanitizeColors(active),
        presets: getThemePresets(),
    };
    return JSON.stringify(themeFile, null, 2);
}

export function importThemeCollection(serialized: string): ElementMaxThemePreset[] {
    if (serialized.length > MAX_THEME_IMPORT_SIZE) throw new Error("Theme file is too large");
    const parsed = JSON.parse(serialized) as Partial<ThemeFile>;
    if (parsed.schema !== SCHEMA || parsed.version !== VERSION) throw new Error("Unsupported theme file");

    const active = sanitizeColors(parsed.active ?? {});
    const importedPresets = sanitizePresets(parsed.presets ?? []);
    const state = loadState();
    for (const preset of importedPresets) {
        const existing = state.presets.findIndex((item) => item.name === preset.name);
        if (existing === -1) state.presets.push(preset);
        else state.presets[existing] = preset;
    }
    state.presets.sort((a, b) => a.name.localeCompare(b.name));

    for (const name of Object.keys(state.active)) document.body.style.removeProperty(name);
    state.active = active;
    saveState(state);
    applyColors(active);
    return state.presets;
}

function collectVariableNames(): Set<string> {
    const names = new Set<string>();

    const visitRules = (rules: CSSRuleList): void => {
        for (const rule of rules) {
            if (rule instanceof CSSStyleRule) {
                for (const property of rule.style) {
                    if (property.startsWith("--")) names.add(property);
                }
            }
            const nestedRules = "cssRules" in rule ? (rule as CSSGroupingRule).cssRules : undefined;
            if (nestedRules) visitRules(nestedRules);
        }
    };

    for (const styleSheet of document.styleSheets) {
        try {
            if (styleSheet.cssRules) visitRules(styleSheet.cssRules);
        } catch {
            // Cross-origin stylesheets cannot be inspected. Their inherited variables can still
            // be included when a same-origin stylesheet references or redeclares them.
        }
    }
    return names;
}

function rgbToHex(color: string): string {
    const channels = color
        .match(/[\d.]+/g)
        ?.slice(0, 3)
        .map(Number);
    if (!channels || channels.length !== 3) return "#000000";
    return `#${channels.map((channel) => Math.round(channel).toString(16).padStart(2, "0")).join("")}`;
}

export function collectThemeColorVariables(): ThemeColorVariable[] {
    const names = collectVariableNames();
    for (const name of Object.keys(loadState().active)) names.add(name);

    const colors: ThemeColorVariable[] = [];
    for (const name of names) {
        const resolved = resolveThemeColor(name);
        if (!resolved) continue;
        colors.push({ name, value: resolved, pickerValue: rgbToHex(resolved) });
    }
    return colors.sort((a, b) => a.name.localeCompare(b.name));
}
