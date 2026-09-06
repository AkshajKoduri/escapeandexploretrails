// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import ErrorBoundary from "./ErrorBoundary";

function Bomb({ blow }: { blow: boolean }) {
  if (blow) throw new Error("boom");
  return <p>fine</p>;
}

describe("ErrorBoundary", () => {
  it("renders children normally when nothing throws", () => {
    render(
      <ErrorBoundary>
        <Bomb blow={false} />
      </ErrorBoundary>,
    );
    expect(screen.getByText("fine")).toBeInTheDocument();
  });

  it("shows the branded fallback with Try again and home link on error", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <Bomb blow={true} />
      </ErrorBoundary>,
    );
    expect(screen.getByRole("heading", { name: /something went wrong/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /return to homepage/i })).toHaveAttribute("href", "/");
    // The thrown message must never be shown to the user.
    expect(screen.queryByText(/boom/)).not.toBeInTheDocument();
    spy.mockRestore();
  });

  it("recovers when Try again is clicked after the child stops throwing", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { rerender } = render(
      <ErrorBoundary>
        <Bomb blow={true} />
      </ErrorBoundary>,
    );
    expect(screen.getByRole("heading", { name: /something went wrong/i })).toBeInTheDocument();

    // Same boundary instance, child now healthy — reset must remount the tree.
    rerender(
      <ErrorBoundary>
        <Bomb blow={false} />
      </ErrorBoundary>,
    );
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(screen.getByText("fine")).toBeInTheDocument();
    spy.mockRestore();
  });
});
