const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "https://checkthisone.vercel.app",
];

// Only exact, fully-qualified browser origins are permitted. Wildcards and
// domain suffix matching would expose credentialed requests to other sites.
export const getAllowedOrigins = (additionalOrigins?: string): Set<string> => {
  const values = [
    ...DEFAULT_ALLOWED_ORIGINS,
    ...(additionalOrigins?.split(",") || []),
  ];

  const origins = values.map((item) => item.trim()).filter(Boolean);
  for (const origin of origins) {
    let parsed: URL;
    try {
      parsed = new URL(origin);
    } catch {
      throw new Error(`Invalid CORS origin: ${origin}`);
    }

    if (!["http:", "https:"].includes(parsed.protocol) || parsed.origin !== origin) {
      throw new Error(`CORS origins must be exact http(s) origins: ${origin}`);
    }
  }

  return new Set(origins);
};
