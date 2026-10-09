import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import HomepageTab from "./HomepageTab";

const { api } = vi.hoisted(() => ({ api: vi.fn() }));
vi.mock("@/lib/adminApi", () => ({ adminApi: api, adminUpload: vi.fn(), adminRemove: vi.fn() }));
afterEach(cleanup);
describe("homepage icon configuration", () => {
  it("loads a hidden setting, saves a changed setting and restores it on remount", async () => {
    let saved = { id: "homepage", hero_image_path: null, hero_alt_text: "", show_trip_icons: false };
    api.mockImplementation(async (action, payload) => {
      if (action === "updateHomepageSettings") saved = { ...saved, ...payload.patch };
      return { data: saved };
    });
    const first = render(<HomepageTab />);
    const checkbox = await screen.findByRole("checkbox", { name: /Show trip icons/ });
    expect(checkbox).not.toBeChecked();
    fireEvent.click(checkbox);
    fireEvent.click(screen.getByRole("button", { name: "Save homepage settings" }));
    await waitFor(() => expect(api).toHaveBeenCalledWith("updateHomepageSettings", { patch: { hero_image_path: null, hero_alt_text: "", show_trip_icons: true } }));
    first.unmount();
    render(<HomepageTab />);
    expect(await screen.findByRole("checkbox", { name: /Show trip icons/ })).toBeChecked();
  });
});
