// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import Navbar from "./Navbar";

const setScrollY = (value: number) => {
  Object.defineProperty(window, "scrollY", {
    configurable: true,
    value,
  });
};

beforeEach(() => {
  setScrollY(0);
});

describe("Navbar scroll state", () => {
  it("renders the scrolled treatment immediately at a restored scroll position", () => {
    setScrollY(96);

    render(
      <MemoryRouter initialEntries={["/"]}>
        <Navbar />
      </MemoryRouter>,
    );

    const header = screen.getByRole("banner");
    expect(header).toHaveClass("bg-charcoal/95");
    expect(within(header).getByText("TRAILS")).toHaveClass("text-accent-light");
  });

  it("keeps an opaque charcoal baseline while changing from hero to scrolled", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Navbar />
      </MemoryRouter>,
    );

    const header = screen.getByRole("banner");
    expect(header).toHaveClass("bg-charcoal/70");

    setScrollY(96);
    fireEvent.scroll(window);

    expect(header).toHaveClass("bg-charcoal/95");
  });
});

describe("Navbar mobile dialog", () => {
  it("renders in a viewport-level portal and restores trigger focus on Escape", async () => {
    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>,
    );

    const trigger = screen.getByRole("button", { name: "Open menu" });
    fireEvent.click(trigger);

    const dialog = await screen.findByRole("dialog", { name: /E2 Trails/i });
    expect(document.body).toContainElement(dialog);
    expect(dialog).toHaveClass("fixed", "inset-y-0", "h-[100dvh]");
    expect(screen.getByRole("link", { name: /All Adventures/i })).toBeVisible();
    expect(screen.getByRole("link", { name: /Book a trip/i })).toBeVisible();
    await waitFor(() => expect(screen.getByRole("button", { name: "Close menu" })).toHaveFocus());

    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  it("closes the desktop adventures menu on Escape", () => {
    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>,
    );

    const trigger = screen.getByRole("button", { name: "Adventures" });
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveFocus();
  });
});
