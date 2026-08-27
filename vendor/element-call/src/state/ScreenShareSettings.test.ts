/*
Copyright 2026 Element Creations Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import { afterEach, describe, expect, it, vi } from "vitest";
import { type Participant, Track } from "livekit-client";

import {
  defaultScreenShareConfiguration,
  getScreenShareOptions,
  getScreenShareStatus,
  screenShareConfiguration,
  screenShareSystemAudio,
} from "./ScreenShareSettings";

afterEach(() => {
  screenShareConfiguration.setValue(defaultScreenShareConfiguration);
  screenShareSystemAudio.setValue(true);
});

describe("getScreenShareOptions", () => {
  it("uses the editable high-quality defaults", () => {
    screenShareConfiguration.setValue(defaultScreenShareConfiguration);
    screenShareSystemAudio.setValue(true);

    expect(getScreenShareOptions()).toEqual({
      capture: {
        audio: {
          autoGainControl: false,
          noiseSuppression: false,
          restrictOwnAudio: true,
          voiceIsolation: false,
        },
        selfBrowserSurface: "include",
        surfaceSwitching: "include",
        systemAudio: "include",
        resolution: { width: 2560, height: 1440, frameRate: 165 },
      },
      publish: {
        screenShareEncoding: {
          maxBitrate: 35_000_000,
          maxFramerate: 165,
        },
        videoCodec: "vp9",
      },
    });
  });

  it("applies arbitrary manually entered capture settings", () => {
    screenShareConfiguration.setValue({
      width: 3840,
      height: 2160,
      frameRate: 120,
      maxBitrateMbps: 52.5,
      videoCodec: "av1",
    });

    expect(getScreenShareOptions()).toMatchObject({
      capture: {
        resolution: { width: 3840, height: 2160, frameRate: 120 },
      },
      publish: {
        screenShareEncoding: {
          maxBitrate: 52_500_000,
          maxFramerate: 120,
        },
        videoCodec: "av1",
      },
    });
  });

  it("allows automatic capture and publish limits", () => {
    screenShareConfiguration.setValue({
      width: null,
      height: null,
      frameRate: null,
      maxBitrateMbps: null,
      videoCodec: "h264",
    });
    screenShareSystemAudio.setValue(false);

    expect(getScreenShareOptions()).toEqual({
      capture: {
        audio: false,
        selfBrowserSurface: "include",
        surfaceSwitching: "include",
        systemAudio: "exclude",
      },
      publish: {
        videoCodec: "h264",
      },
    });
  });
});

describe("getScreenShareStatus", () => {
  it("reads the actual capture track settings and audio publication", () => {
    const participant = {
      getTrackPublication: vi.fn((source: Track.Source) => {
        if (source === Track.Source.ScreenShare) {
          return {
            track: {
              mediaStreamTrack: {
                getSettings: () => ({
                  width: 2560,
                  height: 1440,
                  frameRate: 164.8,
                }),
              },
            },
          };
        }
        if (source === Track.Source.ScreenShareAudio) return { track: {} };
        return undefined;
      }),
    } as unknown as Participant;

    expect(getScreenShareStatus(participant)).toEqual({
      width: 2560,
      height: 1440,
      frameRate: 164.8,
      audio: true,
    });
  });

  it("returns null without an active screen capture track", () => {
    const participant = {
      getTrackPublication: () => undefined,
    } as unknown as Participant;

    expect(getScreenShareStatus(participant)).toBeNull();
  });
});
