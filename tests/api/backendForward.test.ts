import { describe, it, expect } from "@jest/globals";
import {
  buildBackendUrl,
  BACKEND_LEGACY_CONSENT_PATH,
  BACKEND_STANDARD_CONSENT_PATH,
} from "~/utils/backendForward";

describe("buildBackendUrl", () => {
  it("targets the Legacy callback with the uid carried over", () => {
    expect(
      buildBackendUrl("http://localhost:5000", BACKEND_LEGACY_CONSENT_PATH, "?uid=123a45"),
    ).toBe("http://localhost:5000/api/user-consent?uid=123a45");
  });

  it("targets the Standard callback with userId/brokerId carried over", () => {
    expect(
      buildBackendUrl(
        "http://localhost:5000",
        BACKEND_STANDARD_CONSENT_PATH,
        "?userId=1&brokerId=2",
      ),
    ).toBe("http://localhost:5000/api/user/consent/accept?userId=1&brokerId=2");
  });

  it("does not double the slash when the root ends with one", () => {
    expect(buildBackendUrl("http://host:5000/ ", "/api/user-consent", "")).toBe(
      "http://host:5000/api/user-consent",
    );
  });

  it("keeps a path prefix on the root", () => {
    expect(buildBackendUrl("https://gw.example/ctm", "api/user-consent", "?uid=1a2")).toBe(
      "https://gw.example/ctm/api/user-consent?uid=1a2",
    );
  });

  it("passes a malformed query through untouched for the backend to judge", () => {
    expect(buildBackendUrl("http://h", "api/user-consent", "?uid=garbage")).toBe(
      "http://h/api/user-consent?uid=garbage",
    );
  });

  it("drops an empty query marker", () => {
    expect(buildBackendUrl("http://h", "api/user-consent", "?")).toBe(
      "http://h/api/user-consent",
    );
  });
});
