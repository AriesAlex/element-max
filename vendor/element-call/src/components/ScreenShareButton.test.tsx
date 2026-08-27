/*
Copyright 2026 Element Creations Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TooltipProvider } from "@vector-im/compound-web";

import { ScreenShareButton } from "./ScreenShareButton";
import {
  defaultScreenShareConfiguration,
  screenShareConfiguration,
  screenShareSystemAudio,
} from "../state/ScreenShareSettings";

beforeEach(() => {
  screenShareConfiguration.setValue(defaultScreenShareConfiguration);
  screenShareSystemAudio.setValue(true);
});

describe("ScreenShareButton", () => {
  it("keeps screen sharing on the main button", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <TooltipProvider>
        <ScreenShareButton
          size="lg"
          enabled={false}
          onClick={onClick}
          status={null}
        />
      </TooltipProvider>,
    );

    await user.click(screen.getByRole("switch", { name: "Share screen" }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("applies resolution and frame-rate presets with the recommended codec", async () => {
    const user = userEvent.setup();
    render(
      <TooltipProvider>
        <ScreenShareButton
          size="lg"
          enabled={false}
          onClick={() => {}}
          status={null}
        />
      </TooltipProvider>,
    );

    await user.click(
      screen.getByRole("button", { name: "Screen sharing settings" }),
    );

    expect(screen.getByRole("status")).toHaveTextContent("Not sharing");
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Resolution" }),
      "2160p",
    );
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Frame rate (FPS)" }),
      "120",
    );

    const bitrate = screen.getByRole("spinbutton", {
      name: "Maximum bitrate (Mbps)",
    });
    await user.clear(bitrate);
    await user.type(bitrate, "52.5");
    await user.tab();

    expect(screenShareConfiguration.getValue()).toEqual({
      width: 3840,
      height: 2160,
      frameRate: 120,
      maxBitrateMbps: 52.5,
      videoCodec: "vp9",
    });
    expect(
      screen.getByText(
        /best default for a sharp high-resolution screen share/i,
      ),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("menuitemcheckbox", { name: "Share system audio" }),
    );
    expect(screenShareSystemAudio.getValue()).toBe(false);
  });

  it("shows numeric inputs only for custom resolution and frame rate", async () => {
    const user = userEvent.setup();
    render(
      <TooltipProvider>
        <ScreenShareButton
          size="lg"
          enabled={false}
          onClick={() => {}}
          status={null}
        />
      </TooltipProvider>,
    );

    await user.click(
      screen.getByRole("button", { name: "Screen sharing settings" }),
    );
    expect(
      screen.queryByRole("spinbutton", { name: "Width (px)" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("spinbutton", { name: "Custom frame rate (FPS)" }),
    ).not.toBeInTheDocument();

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Resolution" }),
      "custom",
    );
    const width = screen.getByRole("spinbutton", { name: "Width (px)" });
    await user.clear(width);
    await user.type(width, "3440");
    await user.tab();
    const height = screen.getByRole("spinbutton", { name: "Height (px)" });
    await user.clear(height);
    await user.type(height, "1440");
    await user.tab();

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Frame rate (FPS)" }),
      "custom",
    );
    const frameRate = screen.getByRole("spinbutton", {
      name: "Custom frame rate (FPS)",
    });
    await user.clear(frameRate);
    await user.type(frameRate, "144");
    await user.tab();

    expect(screenShareConfiguration.getValue()).toMatchObject({
      width: 3440,
      height: 1440,
      frameRate: 144,
    });
  });

  it("shows the actual active capture settings", async () => {
    const user = userEvent.setup();
    render(
      <TooltipProvider>
        <ScreenShareButton
          size="lg"
          enabled
          onClick={() => {}}
          status={{
            width: 2560,
            height: 1440,
            frameRate: 164.8,
            audio: true,
          }}
        />
      </TooltipProvider>,
    );

    await user.click(
      screen.getByRole("button", { name: "Screen sharing settings" }),
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "2560×1440 · 164.8 FPS · audio on",
    );
  });
});
