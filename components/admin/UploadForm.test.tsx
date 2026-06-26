import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { UploadForm } from "@/components/admin/UploadForm";

// ── Hoisted mocks ──────────────────────────────────────────────────────────
const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  createElement: document.createElement.bind(document),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }),
}));

vi.mock("sonner", () => ({
  toast: { success: mocks.toastSuccess, error: mocks.toastError },
}));

vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => {
    const { src, alt, ...rest } = props;
    return <img src={src as string} alt={alt as string} {...rest} />;
  },
}));

vi.mock("@/lib/utils/cn", () => ({
  cn: (...classes: unknown[]) => classes.filter(Boolean).join(" "),
}));

vi.mock("@/components/icons", () => ({
  UploadIcon: () => <span data-testid="upload-icon" />,
  CloseIcon: () => <span data-testid="close-icon" />,
  LoaderIcon: () => <span data-testid="loader-icon" />,
  EyeIcon: () => <span data-testid="eye-icon" />,
}));

vi.mock("./CardPreview", () => ({
  CardPreview: () => <div data-testid="card-preview" />,
}));

vi.mock("./ModelCombobox", () => ({
  ModelCombobox: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <input data-testid="model-combobox" value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}));

vi.mock("./TagCombobox", () => ({
  TagCombobox: ({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) => (
    <input
      data-testid="tag-combobox"
      value={value.join(",")}
      onChange={(e) => onChange(e.target.value ? e.target.value.split(",") : [])}
    />
  ),
}));

// ── Helpers ─────────────────────────────────────────────────────────────────
function createMockFile(name = "test.png", type = "image/png"): File {
  return new File(["fake-image-bytes"], name, { type });
}

function setupFileMock() {
  vi.stubGlobal("URL", {
    createObjectURL: vi.fn(() => "blob:mock-preview"),
    revokeObjectURL: vi.fn(),
  });

  // Replace the src setter on the prototype to fire onload synchronously
  // with fake dimensions. Done via Object.defineProperty (not vi.spyOn)
  // to avoid infinite recursion through Vitest's spy interceptor.
  const origDescriptor = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, "src")!;
  const origSet = origDescriptor.set!;
  Object.defineProperty(HTMLImageElement.prototype, "src", {
    set(this: HTMLImageElement, url: string) {
      origSet.call(this, url);
      Object.defineProperty(this, "naturalWidth", { get: () => 1024, configurable: true });
      Object.defineProperty(this, "naturalHeight", { get: () => 768, configurable: true });
      this.onload?.(new Event("load"));
    },
    configurable: true,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Initial render ─────────────────────────────────────────────────────────
describe("initial render", () => {
  it("shows the upload prompt and submit button", () => {
    render(<UploadForm />);
    expect(screen.getByText("Drop an image or click to browse")).toBeInTheDocument();
    expect(screen.getByText("Publish")).toBeInTheDocument();
  });

  it("does NOT show a preview image initially", () => {
    render(<UploadForm />);
    expect(screen.queryByAltText("Preview")).not.toBeInTheDocument();
  });

  it("shows the prompt textarea", () => {
    render(<UploadForm />);
    expect(screen.getByPlaceholderText(/cinematic photograph/i)).toBeInTheDocument();
  });

  it("shows the model and tag comboboxes", () => {
    render(<UploadForm />);
    expect(screen.getByTestId("model-combobox")).toBeInTheDocument();
    expect(screen.getByTestId("tag-combobox")).toBeInTheDocument();
  });
});

// ── File selection & preview ────────────────────────────────────────────────
describe("file selection & preview", () => {
  function selectFile(container: HTMLElement) {
    const fileInput = container.querySelector('input[type="file"]')!;
    fireEvent.change(fileInput, { target: { files: [createMockFile()] } });
  }

  it("shows an image preview after a file is selected", async () => {
    setupFileMock();
    const { container } = render(<UploadForm />);

    await act(async () => { selectFile(container); });

    await waitFor(() => expect(screen.getByAltText("Preview")).toBeInTheDocument());
    expect(screen.getByText("1024 × 768 px")).toBeInTheDocument();
  });

  it("generates a blob URL for the selected file", async () => {
    setupFileMock();
    const { container } = render(<UploadForm />);

    await act(async () => { selectFile(container); });

    await waitFor(() => {
      expect(screen.getByAltText("Preview")).toHaveAttribute("src", "blob:mock-preview");
    });
  });

  it("clears the preview when remove is clicked", async () => {
    setupFileMock();
    const { container } = render(<UploadForm />);

    await act(async () => { selectFile(container); });
    await waitFor(() => expect(screen.getByAltText("Preview")).toBeInTheDocument());

    await act(async () => { fireEvent.click(screen.getByLabelText("Remove image")); });

    expect(screen.queryByAltText("Preview")).not.toBeInTheDocument();
    expect(screen.getByText("Drop an image or click to browse")).toBeInTheDocument();
  });
});

// ── Validation ─────────────────────────────────────────────────────────────
describe("validation", () => {
  it("shows an error toast when submitting without a file", async () => {
    const { container } = render(<UploadForm />);

    const form = container.querySelector("form")!;
    await act(async () => { fireEvent.submit(form); });

    expect(mocks.toastError).toHaveBeenCalledWith("Please provide an image and prompt.");
  });

  it("shows an error toast when submitting without a prompt", async () => {
    setupFileMock();
    const { container } = render(<UploadForm />);

    // Select a file
    const fileInput = container.querySelector('input[type="file"]')!;
    await act(async () => { fireEvent.change(fileInput, { target: { files: [createMockFile()] } }); });
    await waitFor(() => expect(screen.getByAltText("Preview")).toBeInTheDocument());

    // Submit without filling prompt
    const form = container.querySelector("form")!;
    await act(async () => { fireEvent.submit(form); });

    expect(mocks.toastError).toHaveBeenCalledWith("Please provide an image and prompt.");
  });
});

// ── Successful submission ──────────────────────────────────────────────────
describe("successful submission", () => {
  const signatureResponse = {
    uploadUrl: "https://storage.example.com/upload",
    method: "PUT",
    storageKey: "mock-key",
    publicUrl: "https://cdn.example.com/img.jpg",
  };

  function fillForm(container: HTMLElement) {
    const fileInput = container.querySelector('input[type="file"]')!;
    fireEvent.change(fileInput, { target: { files: [createMockFile()] } });

    const promptArea = screen.getByPlaceholderText(/cinematic photograph/i);
    fireEvent.change(promptArea, { target: { value: "A test image" } });
  }

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => signatureResponse })
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: true }),
    );
  });

  it("completes the full upload flow", async () => {
    setupFileMock();
    const { container } = render(<UploadForm />);

    await act(async () => { fillForm(container); });
    await waitFor(() => expect(screen.getByAltText("Preview")).toBeInTheDocument());

    const form = container.querySelector("form")!;
    await act(async () => { fireEvent.submit(form); });

    // Signature endpoint
    expect(fetch).toHaveBeenNthCalledWith(1, "/api/admin/upload-signature", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: "test.png" }),
    });

    // Storage upload
    expect(fetch).toHaveBeenNthCalledWith(2, "https://storage.example.com/upload", expect.objectContaining({
      method: "PUT",
    }));

    // Image creation
    expect(fetch).toHaveBeenNthCalledWith(3, "/api/images", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        storageKey: "mock-key",
        storageProvider: "supabase",
        imageUrl: "https://cdn.example.com/img.jpg",
        width: 1024, height: 768,
        prompt: "A test image",
        description: null,
        model: null,
        tags: [],
        isPublished: true,
      }),
    });

    await waitFor(() => {
      expect(mocks.toastSuccess).toHaveBeenCalledWith("Image uploaded successfully");
    });
    expect(mocks.push).toHaveBeenCalledWith("/admin/manage");
    expect(mocks.refresh).toHaveBeenCalled();
  });

  it("shows loading state on the submit button during upload", async () => {
    // Never-resolving fetch so we can inspect loading state
    vi.stubGlobal("fetch", vi.fn().mockReturnValueOnce(new Promise(() => {})));

    setupFileMock();
    const { container } = render(<UploadForm />);

    await act(async () => { fillForm(container); });
    await waitFor(() => expect(screen.getByAltText("Preview")).toBeInTheDocument());

    const form = container.querySelector("form")!;
    await act(async () => { fireEvent.submit(form); });

    expect(screen.getByText("Uploading")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Uploading/i })).toBeDisabled();
  });
});

// ── Network rejection ─────────────────────────────────────────────────────
describe("network rejection", () => {
  const signatureResponse = {
    uploadUrl: "https://storage.example.com/upload",
    method: "PUT",
    storageKey: "mock-key",
    publicUrl: "https://cdn.example.com/img.jpg",
  };

  function fillForm(container: HTMLElement) {
    const fileInput = container.querySelector('input[type="file"]')!;
    fireEvent.change(fileInput, { target: { files: [createMockFile()] } });
    const promptArea = screen.getByPlaceholderText(/cinematic photograph/i);
    fireEvent.change(promptArea, { target: { value: "A test" } });
  }

  it("shows error toast and clears loading state on signature failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce({ ok: false, status: 500 }));

    setupFileMock();
    const { container } = render(<UploadForm />);

    await act(async () => { fillForm(container); });
    await waitFor(() => expect(screen.getByAltText("Preview")).toBeInTheDocument());

    const form = container.querySelector("form")!;
    await act(async () => { fireEvent.submit(form); });

    await waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledWith("Failed to get upload signature");
    });
    expect(screen.getByText("Publish")).toBeInTheDocument();
  });

  it("shows error toast on invalid signature response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({}) }));

    setupFileMock();
    const { container } = render(<UploadForm />);

    await act(async () => { fillForm(container); });
    await waitFor(() => expect(screen.getByAltText("Preview")).toBeInTheDocument());

    const form = container.querySelector("form")!;
    await act(async () => { fireEvent.submit(form); });

    await waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledWith("Invalid signature response from server");
    });
  });

  it("shows error toast and resets loading on image creation failure", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => signatureResponse })
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: false, status: 500 }),
    );

    setupFileMock();
    const { container } = render(<UploadForm />);

    await act(async () => { fillForm(container); });
    await waitFor(() => expect(screen.getByAltText("Preview")).toBeInTheDocument());

    const form = container.querySelector("form")!;
    await act(async () => { fireEvent.submit(form); });

    await waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledWith("Failed to save image metadata");
    });
    expect(screen.getByText("Publish")).toBeInTheDocument();
  });
});
