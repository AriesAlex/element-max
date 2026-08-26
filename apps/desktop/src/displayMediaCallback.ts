/*
Copyright 2023, 2024 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import type { Streams } from "electron";

type DisplayMediaCallback = (streams: Streams) => void;

let displayMediaCallback: DisplayMediaCallback | null;

export const getDisplayMediaCallback = (): DisplayMediaCallback | null => {
    return displayMediaCallback;
};

export const setDisplayMediaCallback = (callback: DisplayMediaCallback | null): void => {
    displayMediaCallback = callback;
};

export const withWindowsSystemAudio = (
    streams: Streams,
    audioRequested: boolean,
    platform: NodeJS.Platform = process.platform,
): Streams => {
    if (platform !== "win32" || !audioRequested) return streams;

    return { ...streams, audio: "loopback" };
};
