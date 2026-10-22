import { describe, expect, it } from "vitest";
import { parseEnv, schemas } from "@/lib/env";

describe("parseEnv", () => {
  it("returns the validated variables", () => {
    const env = parseEnv(schemas.databaseSchema, {
      DATABASE_URL: "postgresql://user:pw@host.neon.tech/db",
    });
    expect(env.DATABASE_URL).toBe("postgresql://user:pw@host.neon.tech/db");
  });

  it("names missing variables without leaking values", () => {
    const secret = "secret-value-should-not-appear";
    const parse = () =>
      parseEnv(schemas.storageSchema, {
        AWS_ENDPOINT_URL_S3: secret,
        AWS_SECRET_ACCESS_KEY: secret,
      });

    expect(parse).toThrowError(/AWS_ENDPOINT_URL_S3.*AWS_REGION.*AWS_ACCESS_KEY_ID/);
    expect(parse).not.toThrowError(secret);
  });
});
