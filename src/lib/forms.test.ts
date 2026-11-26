import { describe, expect, it } from "vitest";
import { normalizeLogin } from "./forms";

describe("normalizeLogin", () => {
  it("lowercases e-mail", () => expect(normalizeLogin(" Ali@Mail.RU ")).toEqual({ email: "ali@mail.ru" }));
  it("normalizes Russian phone formats to the same value", () => {
    expect(normalizeLogin("8 (912) 345-67-89")).toEqual({ phone: "+79123456789" });
    expect(normalizeLogin("+7 912 345 67 89")).toEqual({ phone: "+79123456789" });
  });
  it("returns nothing for junk", () => expect(normalizeLogin("abc")).toEqual({}));
});
