describe("mail-identity", () => {
  const {
    PLATFORM_MAIL_FROM,
    PLATFORM_MAIL_REPLY_TO,
    resolveMailFrom,
    resolveMailReplyTo,
    formatMailFromHeader,
  } = require("../src/utils/mail-identity");

  it("defaults platform From and Reply-To", () => {
    expect(PLATFORM_MAIL_FROM).toBe("noreply@iips.app");
    expect(PLATFORM_MAIL_REPLY_TO).toBe("support@iips.app");
  });

  it("resolves From with env override then smtp user then default", () => {
    expect(resolveMailFrom({}, "vault@x")).toBe("vault@x");
    expect(resolveMailFrom({ MAIL_FROM: "a@b.c" }, "vault@x")).toBe("a@b.c");
    expect(resolveMailFrom({})).toBe("noreply@iips.app");
  });

  it("resolves Reply-To and formats From header", () => {
    expect(resolveMailReplyTo({})).toBe("support@iips.app");
    expect(resolveMailReplyTo({ MAIL_REPLY_TO: "ops@x" })).toBe("ops@x");
    expect(formatMailFromHeader('Invify', 'noreply@iips.app')).toBe('"Invify" <noreply@iips.app>');
  });
});
