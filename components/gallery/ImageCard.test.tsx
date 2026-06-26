import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { ImageCard } from "@/components/gallery/ImageCard";
import type { Image as ImageType } from "@/lib/db/schema";

// ── Hoisted mocks ──────────────────────────────────────────────────────────
const mocks = vi.hoisted(() => ({
  useModelLabel: vi.fn(),
}));

// ── Module mocks ───────────────────────────────────────────────────────────
vi.mock("next/image", () => ({
  default: function MockImage(props: Record<string, unknown>) {
    const { fill, priority, placeholder, blurDataURL, alt, src, ...rest } = props;
    return (
      <img
        alt={alt as string}
        src={src as string}
        data-priority={priority ? "true" : undefined}
        data-placeholder={placeholder as string}
        {...rest}
      />
    );
  },
}));

vi.mock("@/lib/utils/cn", () => ({
  cn: (...classes: unknown[]) => classes.filter(Boolean).join(" "),
}));

vi.mock("@/lib/constants/timing", () => ({
  TIMING: { TOAST_RESET_MS: 2000 },
}));

vi.mock("@/lib/hooks/useModels", () => ({
  useModelLabel: (...args: unknown[]) => mocks.useModelLabel(...args),
}));

vi.mock("@/components/icons", () => ({
  CopyIcon: () => <span data-testid="icon-copy" />,
  CheckIcon: () => <span data-testid="icon-check" />,
  HeartIcon: ({ filled }: { filled?: boolean }) => (
    <span data-testid="icon-heart" data-filled={filled ? "true" : "false"} />
  ),
}));

// ── Helpers ─────────────────────────────────────────────────────────────────
function createImage(overrides: Partial<ImageType> = {}): ImageType {
  return {
    id: "00000000-0000-0000-0000-000000000001" as ImageType["id"],
    slug: "test-image",
    storageKey: "test-key",
    storageProvider: "supabase",
    imageUrl: "https://example.com/img.jpg",
    width: 1024,
    height: 768,
    prompt: "A beautiful test image with details",
    description: null,
    model: "flux",
    isPublished: true,
    isFeatured: false,
    displayOrder: 0,
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
    ...overrides,
  };
}

// ── Globals setup / teardown ───────────────────────────────────────────────
beforeEach(() => {
  localStorage.clear();
  mocks.useModelLabel.mockReturnValue("Flux");

  // Mock clipboard
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
    configurable: true,
    writable: true,
  });

  // Mock fetch
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// ── Rendering ──────────────────────────────────────────────────────────────
describe("rendering", () => {
  it("renders the image with correct src and alt text", () => {
    const img = createImage();
    render(<ImageCard image={img} />);

    const el = screen.getByAltText(img.prompt.slice(0, 100));
    expect(el).toBeInTheDocument();
    expect(el).toHaveAttribute("src", img.imageUrl);
  });

  it("shows model label when image.model is set", () => {
    render(<ImageCard image={createImage()} />);

    expect(screen.getByText("Flux")).toBeInTheDocument();
  });

  it("does NOT show model label when image.model is null", () => {
    render(<ImageCard image={createImage({ model: null })} />);

    expect(screen.queryByText("Flux")).not.toBeInTheDocument();
  });

  it("renders copy button with 'Copy prompt' text", () => {
    render(<ImageCard image={createImage()} />);

    expect(screen.getByText("Copy prompt")).toBeInTheDocument();
  });

  it("renders like button with the given count", () => {
    render(<ImageCard image={createImage()} likeCount={5} />);

    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("renders with default likeCount = 0 when not provided", () => {
    render(<ImageCard image={createImage()} />);

    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("applies animation delay as inline style", () => {
    render(<ImageCard image={createImage()} animationDelay={150} />);

    const outer = screen.getByRole("button", { name: /View prompt/ }).parentElement;
    expect(outer).toHaveStyle("animation-delay: 150ms");
  });

  it("forwards priority prop to the Image component", () => {
    render(<ImageCard image={createImage()} priority />);

    const img = screen.getByAltText(createImage().prompt.slice(0, 100));
    expect(img).toHaveAttribute("data-priority", "true");
  });

  it("renders the card with the correct aria-label", () => {
    const img = createImage();
    render(<ImageCard image={img} />);

    const card = screen.getByRole("button", { name: `View prompt: ${img.prompt.slice(0, 80)}` });
    expect(card).toBeInTheDocument();
  });
});

// ── Card interaction ───────────────────────────────────────────────────────
describe("card interaction", () => {
  it("calls onOpen when the card is clicked", () => {
    const onOpen = vi.fn();
    render(<ImageCard image={createImage()} onOpen={onOpen} />);

    const card = screen.getByRole("button", { name: /View prompt/ });
    fireEvent.click(card);

    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onOpen).toHaveBeenCalledWith(createImage());
  });

  it("does NOT call onOpen when the like button is clicked", () => {
    const onOpen = vi.fn();
    render(<ImageCard image={createImage()} onOpen={onOpen} />);

    const likeBtn = screen.getByLabelText("Like this prompt");
    fireEvent.click(likeBtn);

    expect(onOpen).not.toHaveBeenCalled();
  });

  it("does NOT call onOpen when the copy button is clicked", async () => {
    const onOpen = vi.fn();
    render(<ImageCard image={createImage()} onOpen={onOpen} />);

    const copyBtn = screen.getByText("Copy prompt");
    await act(async () => {
      fireEvent.click(copyBtn);
    });

    expect(onOpen).not.toHaveBeenCalled();
  });

  it("calls onOpen on Enter key press", () => {
    const onOpen = vi.fn();
    render(<ImageCard image={createImage()} onOpen={onOpen} />);

    const card = screen.getByRole("button", { name: /View prompt/ });
    fireEvent.keyDown(card, { key: "Enter" });

    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onOpen).toHaveBeenCalledWith(createImage());
  });

  it("calls onOpen on Space key press", () => {
    const onOpen = vi.fn();
    render(<ImageCard image={createImage()} onOpen={onOpen} />);

    const card = screen.getByRole("button", { name: /View prompt/ });
    fireEvent.keyDown(card, { key: " " });

    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("does NOT call onOpen for other key presses", () => {
    const onOpen = vi.fn();
    render(<ImageCard image={createImage()} onOpen={onOpen} />);

    const card = screen.getByRole("button", { name: /View prompt/ });
    fireEvent.keyDown(card, { key: "Tab" });

    expect(onOpen).not.toHaveBeenCalled();
  });
});

// ── Copy flow ──────────────────────────────────────────────────────────────
describe("copy flow", () => {
  it("copies the prompt to clipboard on click", async () => {
    const img = createImage();
    render(<ImageCard image={img} />);

    fireEvent.click(screen.getByText("Copy prompt"));

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(img.prompt);
    });
  });

  it("shows 'Copied' text after copying", async () => {
    render(<ImageCard image={createImage()} />);

    fireEvent.click(screen.getByText("Copy prompt"));

    // Flush microtasks so the mocked clipboard promise resolves and setCopied(true) runs
    await act(() => Promise.resolve());

    expect(screen.getByText("Copied")).toBeInTheDocument();
  });

  it("reverts back to 'Copy prompt' after the timeout", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    render(<ImageCard image={createImage()} />);

    fireEvent.click(screen.getByText("Copy prompt"));

    // Flush microtasks so clipboard mock resolves and setCopied(true) runs
    await act(() => Promise.resolve());
    expect(screen.getByText("Copied")).toBeInTheDocument();

    // Advance the faked setTimeout — triggers the revert
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.getByText("Copy prompt")).toBeInTheDocument();
  });
});

// ── Like flow (optimistic UI) ──────────────────────────────────────────────
describe("like flow", () => {
  it("increments the like count optimistically before the API responds", async () => {
    const img = createImage();
    render(<ImageCard image={img} likeCount={3} />);

    fireEvent.click(screen.getByLabelText("Like this prompt"));

    expect(screen.getByText("4")).toBeInTheDocument();
  });

  it("calls onLike with +1 on click", () => {
    const onLike = vi.fn();
    const img = createImage();
    render(<ImageCard image={img} onLike={onLike} />);

    fireEvent.click(screen.getByLabelText("Like this prompt"));

    expect(onLike).toHaveBeenCalledWith(img.id, 1);
  });

  it("stores the like in localStorage on click", () => {
    const img = createImage();
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    render(<ImageCard image={img} />);

    fireEvent.click(screen.getByLabelText("Like this prompt"));

    expect(setItem).toHaveBeenCalledWith(`liked:${img.id}`, "1");
  });

  it("sends a POST request to the like API endpoint", async () => {
    const img = createImage();
    render(<ImageCard image={img} />);

    fireEvent.click(screen.getByLabelText("Like this prompt"));

    // fetch is called synchronously inside handleLike before the await
    expect(fetch).toHaveBeenCalledWith(`/api/like/${img.id}`, { method: "POST" });
  });

  it("does NOT call onLike or fetch when already liked", () => {
    const onLike = vi.fn();
    const img = createImage();
    // Pre-set localStorage so the effect marks hasLiked on mount
    vi.spyOn(Storage.prototype, "getItem").mockReturnValue("1");

    render(<ImageCard image={img} onLike={onLike} />);

    const likeBtn = screen.getByLabelText("Liked");
    fireEvent.click(likeBtn);

    expect(onLike).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("retains the optimistic state after API success", async () => {
    render(<ImageCard image={createImage()} likeCount={3} />);

    fireEvent.click(screen.getByLabelText("Like this prompt"));

    await act(() => Promise.resolve());
    expect(screen.getByText("4")).toBeInTheDocument();
  });

  it("reverts the like count on HTTP error response", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false, status: 429 });

    render(<ImageCard image={createImage()} likeCount={3} />);

    fireEvent.click(screen.getByLabelText("Like this prompt"));

    // Optimistic increment first
    expect(screen.getByText("4")).toBeInTheDocument();

    // Flush microtasks so fetch promise resolves and rollback runs
    await act(() => Promise.resolve());

    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("reverts the like count on network error", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Network error"));

    render(<ImageCard image={createImage()} likeCount={3} />);

    fireEvent.click(screen.getByLabelText("Like this prompt"));

    // Optimistic increment
    expect(screen.getByText("4")).toBeInTheDocument();

    // Flush microtasks so fetch rejection triggers rollback
    await act(() => Promise.resolve());

    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("resets hasLiked on HTTP error and removes localStorage", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false, status: 429 });
    const removeItem = vi.spyOn(Storage.prototype, "removeItem");
    const img = createImage();

    render(<ImageCard image={img} />);

    fireEvent.click(screen.getByLabelText("Like this prompt"));

    await act(() => Promise.resolve());

    expect(removeItem).toHaveBeenCalledWith(`liked:${img.id}`);
    expect(screen.getByLabelText("Like this prompt")).toBeInTheDocument();
  });

  it("calls onLike with -1 on HTTP error rollback", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false, status: 429 });
    const onLike = vi.fn();
    const img = createImage();

    render(<ImageCard image={img} onLike={onLike} />);

    fireEvent.click(screen.getByLabelText("Like this prompt"));

    await act(() => Promise.resolve());

    expect(onLike).toHaveBeenLastCalledWith(img.id, -1);
  });

  it("calls onLike with -1 on network error rollback", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Network error"));
    const onLike = vi.fn();
    const img = createImage();

    render(<ImageCard image={img} onLike={onLike} />);

    fireEvent.click(screen.getByLabelText("Like this prompt"));

    await act(() => Promise.resolve());

    expect(onLike).toHaveBeenLastCalledWith(img.id, -1);
  });
});

// ── Effect sync ────────────────────────────────────────────────────────────
describe("effect sync", () => {
  it("updates optimisticLikes when likeCount prop changes", () => {
    const img = createImage();
    const { rerender } = render(<ImageCard image={img} likeCount={0} />);

    expect(screen.getByText("0")).toBeInTheDocument();

    rerender(<ImageCard image={img} likeCount={10} />);

    expect(screen.getByText("10")).toBeInTheDocument();
  });

  it("marks as liked on mount when localStorage has the key", () => {
    vi.spyOn(Storage.prototype, "getItem").mockReturnValue("1");

    render(<ImageCard image={createImage()} />);

    expect(screen.getByLabelText("Liked")).toBeInTheDocument();
  });

  it("marks as not liked on mount when localStorage is empty", () => {
    render(<ImageCard image={createImage()} />);

    expect(screen.getByLabelText("Like this prompt")).toBeInTheDocument();
  });

  it("resets hasLiked when image.id changes and no localStorage entry", () => {
    vi.spyOn(Storage.prototype, "getItem").mockReturnValueOnce("1").mockReturnValue(null);

    const first = createImage({ id: "00000000-0000-0000-0000-000000000001" as ImageType["id"] });
    const second = createImage({ id: "00000000-0000-0000-0000-000000000002" as ImageType["id"] });

    const { rerender } = render(<ImageCard image={first} />);
    expect(screen.getByLabelText("Liked")).toBeInTheDocument();

    rerender(<ImageCard image={second} />);
    expect(screen.getByLabelText("Like this prompt")).toBeInTheDocument();
  });
});
