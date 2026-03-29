import { getAccountTypeFromRole } from "@/lib/auth";

describe("auth role to account-type mapping", () => {
  it("maps Sender role to Sender account type", () => {
    expect(getAccountTypeFromRole("Sender")).toBe("Sender");
  });

  it("maps Recipient role to Recipient account type", () => {
    expect(getAccountTypeFromRole("Recipient")).toBe("Recipient");
  });

  it("maps lowercase role values", () => {
    expect(getAccountTypeFromRole("sender")).toBe("Sender");
    expect(getAccountTypeFromRole("recipient")).toBe("Recipient");
  });

  it("returns null for unsupported roles", () => {
    expect(getAccountTypeFromRole("Admin")).toBeNull();
    expect(getAccountTypeFromRole("user")).toBeNull();
  });

  it("returns null when role is empty", () => {
    expect(getAccountTypeFromRole(undefined)).toBeNull();
    expect(getAccountTypeFromRole(null)).toBeNull();
    expect(getAccountTypeFromRole("")).toBeNull();
  });
});
