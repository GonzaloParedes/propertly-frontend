import { render, screen } from "@testing-library/react";
import SentryExampleLayout from "@/app/sentry-example-page/layout";

const notFound = vi.hoisted(() =>
  vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
);

vi.mock("next/navigation", () => ({
  notFound,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/sentry-example-page",
  useSearchParams: () => new URLSearchParams(),
}));

describe("/sentry-example-page", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    notFound.mockClear();
  });

  it("en producción no muestra la UI de ejemplo", () => {
    vi.stubEnv("NODE_ENV", "production");

    expect(() =>
      render(
        <SentryExampleLayout>
          <h1>sentry-example-page</h1>
        </SentryExampleLayout>,
      ),
    ).toThrow(/NEXT_NOT_FOUND/);

    expect(notFound).toHaveBeenCalled();
    expect(screen.queryByRole("heading", { name: "sentry-example-page" })).not.toBeInTheDocument();
  });

  it("fuera de producción muestra la página", () => {
    vi.stubEnv("NODE_ENV", "test");

    render(
      <SentryExampleLayout>
        <h1>sentry-example-page</h1>
      </SentryExampleLayout>,
    );

    expect(notFound).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: "sentry-example-page" })).toBeInTheDocument();
  });
});
