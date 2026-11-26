import { describe, expect, it } from "vitest";
import { dayBounds, parseLocal } from "./time";

describe("parseLocal", () => {
  it("reads wall time in Yekaterinburg (UTC+5)", () => {
    expect(parseLocal("2026-11-26T18:00", "Asia/Yekaterinburg")?.toISOString()).toBe("2026-11-26T13:00:00.000Z");
  });
  it("reads wall time in Moscow (UTC+3)", () => {
    expect(parseLocal("2026-11-26T18:00", "Europe/Moscow")?.toISOString()).toBe("2026-11-26T15:00:00.000Z");
  });
  it("rejects bad input", () => expect(parseLocal("26.11.2026 18:00")).toBeNull());
});

describe("dayBounds", () => {
  it("returns the local calendar day", () => {
    const { start, end } = dayBounds(new Date("2026-11-26T20:30:00Z"), "Asia/Yekaterinburg");
    expect(start.toISOString()).toBe("2026-11-26T19:00:00.000Z");
    expect(end.toISOString()).toBe("2026-11-27T19:00:00.000Z");
  });
});
