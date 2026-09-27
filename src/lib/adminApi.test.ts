// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { adminApi, clearAdminSession, isAdminSession, loginAdmin } from "./adminApi";

const { invokeMock } = vi.hoisted(() => ({
  invokeMock: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: {
      invoke: invokeMock,
    },
  },
}));

beforeEach(() => {
  sessionStorage.clear();
  invokeMock.mockReset();
});

describe("adminApi token authentication", () => {
  it("sends the password only to login and stores the returned session token", async () => {
    invokeMock.mockResolvedValueOnce({
      data: { token: "signed-admin-token", expiresAt: Date.now() + 60_000 },
      error: null,
    });

    await loginAdmin("replacement-password");

    expect(invokeMock).toHaveBeenCalledWith("admin-api", {
      body: { action: "login", payload: { password: "replacement-password" } },
    });
    expect(sessionStorage.getItem("e2_admin_token")).toBe("signed-admin-token");
    expect(sessionStorage.getItem("e2_admin_pwd")).toBeNull();
    expect(JSON.stringify(sessionStorage)).not.toContain("replacement-password");
    expect(isAdminSession()).toBe(true);
  });

  it("uses x-admin-token for later requests without resending the password", async () => {
    invokeMock
      .mockResolvedValueOnce({
        data: { token: "signed-admin-token", expiresAt: Date.now() + 60_000 },
        error: null,
      })
      .mockResolvedValueOnce({ data: { ok: true }, error: null });

    await loginAdmin("replacement-password");
    await adminApi("verify");

    expect(invokeMock).toHaveBeenLastCalledWith("admin-api", {
      body: { action: "verify", payload: undefined },
      headers: { "x-admin-token": "signed-admin-token" },
    });
    expect(JSON.stringify(invokeMock.mock.calls[1])).not.toContain("replacement-password");
    expect(JSON.stringify(invokeMock.mock.calls[1])).not.toContain("x-admin-password");
  });

  it("rejects expired sessions before making a privileged request", async () => {
    sessionStorage.setItem("e2_admin_token", "expired-token");
    sessionStorage.setItem("e2_admin_token_expires_at", String(Date.now() - 1));

    await expect(adminApi("verify")).rejects.toThrow("Not authenticated");

    expect(invokeMock).not.toHaveBeenCalled();
    expect(sessionStorage.getItem("e2_admin_token")).toBeNull();
  });

  it("clears the session when the function returns 401", async () => {
    invokeMock
      .mockResolvedValueOnce({
        data: { token: "signed-admin-token", expiresAt: Date.now() + 60_000 },
        error: null,
      })
      .mockResolvedValueOnce({
        data: null,
        error: { message: "Unauthorized", context: { status: 401 } },
      });

    await loginAdmin("replacement-password");
    await expect(adminApi("verify")).rejects.toThrow("Unauthorized");

    expect(isAdminSession()).toBe(false);
  });

  it("removes legacy raw-password storage when clearing a session", () => {
    sessionStorage.setItem("e2_admin_pwd", "legacy-password");

    clearAdminSession();

    expect(sessionStorage.getItem("e2_admin_pwd")).toBeNull();
  });
});
