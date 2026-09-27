// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { MemoryRouter } from "react-router-dom";
import AdminRoute from "./AdminRoute";

const authMocks = vi.hoisted(() => ({
  adminApi: vi.fn(),
  clearAdminSession: vi.fn(),
  isAdminSession: vi.fn(),
  loginAdmin: vi.fn(),
}));

vi.mock("@/lib/adminApi", () => authMocks);
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

beforeEach(() => {
  vi.clearAllMocks();
  authMocks.isAdminSession.mockReturnValue(false);
  authMocks.loginAdmin.mockResolvedValue(undefined);
  authMocks.adminApi.mockResolvedValue({ ok: true });
});

describe("AdminRoute", () => {
  it("exchanges the password for a session before rendering admin content", async () => {
    render(
      <MemoryRouter>
        <AdminRoute>
          <p>Private admin content</p>
        </AdminRoute>
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText("Admin password"), {
      target: { value: "replacement-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Enter admin" }));

    await waitFor(() => expect(authMocks.loginAdmin).toHaveBeenCalledWith("replacement-password"));
    expect(await screen.findByText("Private admin content")).toBeInTheDocument();
  });

  it("verifies a stored token before rendering admin content", async () => {
    authMocks.isAdminSession.mockReturnValue(true);

    render(
      <MemoryRouter>
        <AdminRoute>
          <p>Private admin content</p>
        </AdminRoute>
      </MemoryRouter>,
    );

    expect(screen.getByRole("status")).toHaveTextContent("Verifying admin session");
    await waitFor(() => expect(authMocks.adminApi).toHaveBeenCalledWith("verify"));
    expect(await screen.findByText("Private admin content")).toBeInTheDocument();
  });
});
