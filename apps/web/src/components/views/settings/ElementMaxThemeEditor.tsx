/*
Copyright 2026 AriesAlex

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React, { type ChangeEvent, type JSX, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { saveAs } from "file-saver";

import { _t } from "../../../languageHandler";
import AccessibleButton from "../elements/AccessibleButton";
import Field from "../elements/Field";
import { SettingsSubsection } from "./shared/SettingsSubsection";
import { useTheme } from "../../../hooks/useTheme";
import {
    applyThemePreset,
    clearThemeColor,
    collectThemeColorVariables,
    deleteThemePreset,
    exportThemeCollection,
    getThemePresets,
    importThemeCollection,
    MAX_THEME_IMPORT_SIZE,
    resetThemeColors,
    saveThemePreset,
    setThemeColor,
    type ElementMaxThemePreset,
    type ThemeColorVariable,
} from "../../../utils/elementMaxTheme";

function colorsFromVariables(variables: ThemeColorVariable[]): Record<string, string> {
    return Object.fromEntries(variables.map(({ name, value }) => [name, value]));
}

export function ElementMaxThemeEditor(): JSX.Element {
    const { theme } = useTheme();
    const fileInput = useRef<HTMLInputElement>(null);
    const [variables, setVariables] = useState<ThemeColorVariable[]>([]);
    const [presets, setPresets] = useState<ElementMaxThemePreset[]>(getThemePresets);
    const [presetName, setPresetName] = useState("");
    const [query, setQuery] = useState("");
    const [message, setMessage] = useState<string>();

    const refresh = useCallback(() => setVariables(collectThemeColorVariables()), []);

    useEffect(() => {
        refresh();
    }, [refresh, theme]);

    const filteredVariables = useMemo(() => {
        const normalizedQuery = query.trim().toLocaleLowerCase();
        if (!normalizedQuery) return variables;
        return variables.filter(({ name }) => name.toLocaleLowerCase().includes(normalizedQuery));
    }, [query, variables]);

    const changeColor = (name: string, color: string): void => {
        setVariables((current) =>
            current.map((variable) =>
                variable.name === name
                    ? {
                          ...variable,
                          value: color,
                          pickerValue: color.startsWith("#") ? color.slice(0, 7) : variable.pickerValue,
                      }
                    : variable,
            ),
        );
        try {
            setThemeColor(name, color);
            setMessage(undefined);
        } catch {
            setMessage(_t("settings|appearance|element_max_theme_invalid_color"));
        }
    };

    const resetColor = (name: string): void => {
        clearThemeColor(name);
        refresh();
    };

    const savePreset = (): void => {
        try {
            setPresets(saveThemePreset(presetName, colorsFromVariables(variables)));
            setPresetName("");
            setMessage(_t("settings|appearance|element_max_theme_preset_saved"));
        } catch {
            setMessage(_t("settings|appearance|element_max_theme_preset_name_required"));
        }
    };

    const applyPreset = (preset: ElementMaxThemePreset): void => {
        applyThemePreset(preset);
        refresh();
        setMessage(_t("settings|appearance|element_max_theme_preset_applied", { name: preset.name }));
    };

    const exportThemes = (): void => {
        const contents = exportThemeCollection(colorsFromVariables(variables));
        saveAs(new Blob([contents], { type: "application/json;charset=utf-8" }), "element-max-theme.json");
    };

    const importThemes = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) return;
        try {
            if (file.size > MAX_THEME_IMPORT_SIZE) throw new Error("Theme file is too large");
            setPresets(importThemeCollection(await file.text()));
            refresh();
            setMessage(_t("settings|appearance|element_max_theme_imported"));
        } catch {
            setMessage(_t("settings|appearance|element_max_theme_import_error"));
        }
    };

    return (
        <SettingsSubsection
            heading={_t("settings|appearance|element_max_theme_title")}
            description={_t("settings|appearance|element_max_theme_description", { count: variables.length })}
            stretchContent
        >
            <div className="mx_ElementMaxThemeEditor">
                <div className="mx_ElementMaxThemeEditor_toolbar">
                    <Field
                        label={_t("settings|appearance|element_max_theme_search")}
                        value={query}
                        onChange={(event: ChangeEvent<HTMLInputElement>) => setQuery(event.target.value)}
                        autoComplete="off"
                    />
                    <AccessibleButton kind="primary_outline" onClick={exportThemes}>
                        {_t("action|export")}
                    </AccessibleButton>
                    <AccessibleButton kind="primary_outline" onClick={() => fileInput.current?.click()}>
                        {_t("action|import")}
                    </AccessibleButton>
                    <AccessibleButton
                        kind="danger_outline"
                        onClick={() => {
                            resetThemeColors();
                            refresh();
                            setMessage(_t("settings|appearance|element_max_theme_reset_done"));
                        }}
                    >
                        {_t("settings|appearance|element_max_theme_reset")}
                    </AccessibleButton>
                    <input ref={fileInput} type="file" accept=".json,application/json" hidden onChange={importThemes} />
                </div>

                <div className="mx_ElementMaxThemeEditor_presetCreator">
                    <Field
                        label={_t("settings|appearance|element_max_theme_preset_name")}
                        value={presetName}
                        onChange={(event: ChangeEvent<HTMLInputElement>) => setPresetName(event.target.value)}
                        autoComplete="off"
                    />
                    <AccessibleButton kind="primary" onClick={savePreset} disabled={!presetName.trim()}>
                        {_t("settings|appearance|element_max_theme_save_preset")}
                    </AccessibleButton>
                </div>

                {presets.length > 0 && (
                    <div
                        className="mx_ElementMaxThemeEditor_presets"
                        aria-label={_t("settings|appearance|element_max_theme_presets")}
                    >
                        {presets.map((preset) => (
                            <div className="mx_ElementMaxThemeEditor_preset" key={preset.name}>
                                <span>{preset.name}</span>
                                <AccessibleButton kind="link" onClick={() => applyPreset(preset)}>
                                    {_t("action|apply")}
                                </AccessibleButton>
                                <AccessibleButton
                                    kind="link"
                                    onClick={() => setPresets(deleteThemePreset(preset.name))}
                                >
                                    {_t("action|delete")}
                                </AccessibleButton>
                            </div>
                        ))}
                    </div>
                )}

                {message && <p className="mx_ElementMaxThemeEditor_message">{message}</p>}

                <div className="mx_ElementMaxThemeEditor_colors" role="list">
                    {filteredVariables.map((variable) => (
                        <div className="mx_ElementMaxThemeEditor_color" role="listitem" key={variable.name}>
                            <input
                                className="mx_ElementMaxThemeEditor_picker"
                                type="color"
                                value={variable.pickerValue}
                                aria-label={_t("settings|appearance|element_max_theme_pick_color", {
                                    name: variable.name,
                                })}
                                onChange={(event) => changeColor(variable.name, event.target.value)}
                            />
                            <code title={variable.name}>{variable.name}</code>
                            <input
                                className="mx_ElementMaxThemeEditor_value"
                                value={variable.value}
                                aria-label={_t("settings|appearance|element_max_theme_color_value", {
                                    name: variable.name,
                                })}
                                onChange={(event) => changeColor(variable.name, event.target.value)}
                                spellCheck={false}
                            />
                            <AccessibleButton kind="link" onClick={() => resetColor(variable.name)}>
                                {_t("action|reset")}
                            </AccessibleButton>
                        </div>
                    ))}
                </div>
            </div>
        </SettingsSubsection>
    );
}
