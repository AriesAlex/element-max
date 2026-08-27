/*
Copyright 2026 Element Creations Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import {
  type Participant,
  type ScreenShareCaptureOptions,
  Track,
  type TrackPublishOptions,
  type VideoCodec,
} from "livekit-client";

import { Setting } from "../settings/settings";

export interface ScreenShareConfiguration {
  width: number | null;
  height: number | null;
  frameRate: number | null;
  maxBitrateMbps: number | null;
  videoCodec: VideoCodec;
}

export const defaultScreenShareConfiguration: ScreenShareConfiguration = {
  width: 2560,
  height: 1440,
  frameRate: 165,
  maxBitrateMbps: 35,
  videoCodec: "vp9",
};

export const screenShareConfiguration = new Setting<ScreenShareConfiguration>(
  "screen-share-configuration",
  defaultScreenShareConfiguration,
);

export const screenShareSystemAudio = new Setting<boolean>(
  "screen-share-system-audio",
  true,
);

export interface ScreenShareStatus {
  width: number | null;
  height: number | null;
  frameRate: number | null;
  audio: boolean;
}

export function getScreenShareOptions(): {
  capture: ScreenShareCaptureOptions;
  publish: TrackPublishOptions;
} {
  const configuration = {
    ...defaultScreenShareConfiguration,
    ...screenShareConfiguration.getValue(),
  };
  const shareSystemAudio = screenShareSystemAudio.getValue();
  const resolution =
    configuration.width !== null && configuration.height !== null
      ? {
          width: configuration.width,
          height: configuration.height,
          ...(configuration.frameRate === null
            ? {}
            : { frameRate: configuration.frameRate }),
        }
      : undefined;
  const screenShareEncoding =
    configuration.maxBitrateMbps === null
      ? undefined
      : {
          maxBitrate: Math.round(configuration.maxBitrateMbps * 1_000_000),
          ...(configuration.frameRate === null
            ? {}
            : { maxFramerate: configuration.frameRate }),
        };

  return {
    capture: {
      // Screen share audio shouldn't have any filtering. Echo cancellation is
      // deliberately omitted because disabling it can echo incoming voices.
      audio: shareSystemAudio
        ? {
            autoGainControl: false,
            noiseSuppression: false,
            // Keep Element's own call audio out of the Windows loopback track.
            restrictOwnAudio: true,
            voiceIsolation: false,
          }
        : false,
      selfBrowserSurface: "include",
      surfaceSwitching: "include",
      systemAudio: shareSystemAudio ? "include" : "exclude",
      ...(resolution === undefined ? {} : { resolution }),
    },
    publish: {
      ...(screenShareEncoding === undefined ? {} : { screenShareEncoding }),
      videoCodec: configuration.videoCodec,
    },
  };
}

export function getScreenShareStatus(
  participant: Participant,
): ScreenShareStatus | null {
  const videoTrack = participant.getTrackPublication(
    Track.Source.ScreenShare,
  )?.track;
  if (!videoTrack) return null;

  const { width, height, frameRate } =
    videoTrack.mediaStreamTrack.getSettings();
  const audio = Boolean(
    participant.getTrackPublication(Track.Source.ScreenShareAudio)?.track,
  );

  return {
    width: width ?? null,
    height: height ?? null,
    frameRate: frameRate ?? null,
    audio,
  };
}
