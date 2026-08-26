/*
Copyright 2026 Element Creations Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import { describe, expect, it } from "vitest";
import type { Streams } from "electron";

import { withWindowsSystemAudio } from "./displayMediaCallback.js";

const videoOnlyStreams = { video: { id: "screen:0:0", name: "Screen 1" } } as Streams;

describe("withWindowsSystemAudio", () => {
    it("adds loopback audio to an audio-enabled Windows request", () => {
        expect(withWindowsSystemAudio(videoOnlyStreams, true, "win32")).toStrictEqual({
            ...videoOnlyStreams,
            audio: "loopback",
        });
    });

    it("leaves video-only and non-Windows requests unchanged", () => {
        expect(withWindowsSystemAudio(videoOnlyStreams, false, "win32")).toBe(videoOnlyStreams);
        expect(withWindowsSystemAudio(videoOnlyStreams, true, "linux")).toBe(videoOnlyStreams);
    });
});
