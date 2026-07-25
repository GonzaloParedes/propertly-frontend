import "@testing-library/jest-dom/vitest";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

type MockImageProps = {
  src: string;
  alt?: string;
  width?: number;
  height?: number;
  className?: string;
  style?: ComponentPropsWithoutRef<"img">["style"];
  [key: string]: unknown;
};

vi.mock("next/image", () => ({
  default: ({ src, alt, width, height, className, style }: MockImageProps) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt ?? ""} width={width} height={height} className={className} style={style} />;
  },
}));

type MockLinkProps = {
  href: string;
  children: ReactNode;
  className?: string;
  style?: ComponentPropsWithoutRef<"a">["style"];
  [key: string]: unknown;
};

vi.mock("next/link", () => ({
  default: ({ href, children, className, style }: MockLinkProps) => (
    <a href={href} className={className} style={style}>
      {children}
    </a>
  ),
}));
