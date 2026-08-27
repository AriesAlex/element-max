/*
Copyright 2026 AriesAlex

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
    applyStoredThemeOverrides,
    applyThemePreset,
    clearThemeColor,
    deleteThemePreset,
    exportThemeCollection,
    getThemePresets,
    importThemeCollection,
    resetThemeColors,
    saveThemePreset,
    setThemeColor,
} from "./elementMaxTheme";

describe("Element Max theme persistence", () => {
    beforeEach(() => {
        localStorage.clear();
        document.body.removeAttribute("style");
    });

    afterEach(() => {
        localStorage.clear();
        document.body.removeAttribute("style");
    });

    it("applies valid colors immediately and restores them", () => {
        setThemeColor("--cpd-color-test", "#123456");
        expect(document.body.style.getPropertyValue("--cpd-color-test")).toBe("#123456");

        document.body.style.removeProperty("--cpd-color-test");
        applyStoredThemeOverrides();
        expect(document.body.style.getPropertyValue("--cpd-color-test")).toBe("#123456");

        clearThemeColor("--cpd-color-test");
        expect(document.body.style.getPropertyValue("--cpd-color-test")).toBe("");
    });

    it("rejects unsafe variable names and non-colors", () => {
        expect(() => setThemeColor("background", "red")).toThrow();
        expect(() => setThemeColor("--valid-name", "url(https://example.org/x)")).toThrow();
    });

    it("creates, applies, replaces, and deletes presets", () => {
        expect(saveThemePreset("Ocean", { "--accent": "#0055ff" })).toHaveLength(1);
        expect(saveThemePreset("Ocean", { "--accent": "#00aaff" })).toEqual([
            { name: "Ocean", colors: { "--accent": "#00aaff" } },
        ]);

        applyThemePreset(getThemePresets()[0]);
        expect(document.body.style.getPropertyValue("--accent")).toBe("#00aaff");

        expect(deleteThemePreset("Ocean")).toEqual([]);
        resetThemeColors();
        expect(document.body.style.getPropertyValue("--accent")).toBe("");
    });

    it("round-trips the portable collection and merges presets", () => {
        saveThemePreset("Local", { "--local": "red" });
        const serialized = exportThemeCollection({ "--active": "rgb(1, 2, 3)" });

        localStorage.clear();
        const presets = importThemeCollection(serialized);

        expect(presets).toEqual([{ name: "Local", colors: { "--local": "red" } }]);
        expect(document.body.style.getPropertyValue("--active")).toBe("rgb(1, 2, 3)");
    });
});
