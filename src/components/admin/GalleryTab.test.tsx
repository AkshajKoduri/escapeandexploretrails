import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import GalleryTab from "./GalleryTab";
const { api, upload, remove } = vi.hoisted(() => ({ api: vi.fn(), upload: vi.fn(), remove: vi.fn() }));
vi.mock("@/lib/adminApi", () => ({ adminApi: api, adminUpload: upload, adminRemove: remove }));
const row = { id: "image", image_url: "", storage_path: "gallery/old.webp", display_order: 0, alt_text: "Original", category: "General" };
beforeEach(() => {
  vi.clearAllMocks(); upload.mockResolvedValue({ path: "gallery/new.webp" }); remove.mockResolvedValue({ ok: true });
  api.mockImplementation(async (action: string) => {
    if (action === "listGalleryImages") return { data: [row] };
    if (action === "signImagePaths") return { urls: { "gallery/old.webp": "https://example.test/old.webp" } };
    if (action === "updateGalleryImage") throw new Error("Save failed");
    return { ok: true };
  });
});
describe("gallery replacement safety", () => {
  it("retains the original storage file when saving replacement metadata fails", async () => {
    render(<GalleryTab />);
    const input = await screen.findByLabelText("Replace photo 1");
    fireEvent.change(input, { target: { files: [new File(["picture"], "new.webp", { type: "image/webp" })] } });
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Save failed"));
    expect(remove).not.toHaveBeenCalledWith("gallery-images", "gallery/old.webp");
    expect(screen.getByRole("img", { name: "Original" })).toHaveAttribute("src", "https://example.test/old.webp");
  });
  it("rejects unsupported files before attempting upload", async () => {
    render(<GalleryTab />);
    const input = await screen.findByLabelText("Replace photo 1");
    fireEvent.change(input, { target: { files: [new File(["document"], "bad.pdf", { type: "application/pdf" })] } });
    expect(upload).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toBeVisible();
  });
});
