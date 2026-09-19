import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  resolve(__dirname, "../../scripts/generate-static-pages.mjs"),
  "utf8"
);
const start = source.indexOf('route: "/boka"');
const next = source.indexOf('route: "/tjanster"');
const bokaBlock = source.slice(start, next);

describe("/boka first-byte honesty", () => {
  it("keeps the existing /boka route only", () => {
    expect(start).toBeGreaterThan(-1);
    expect(next).toBeGreaterThan(start);
    expect(source).not.toMatch(/route:\s*"\/boka-demo"/);
  });

  it("does not say customers can book a transport with Aurora hauliers", () => {
    expect(bokaBlock).not.toMatch(/hos våra åkerier/i);
    expect(bokaBlock).not.toMatch(/matchar vi ditt uppdrag/i);
    expect(bokaBlock).not.toMatch(/Boka en transport/i);
    expect(bokaBlock).not.toMatch(/title:\s*"Boka transport \|/);
  });

  it("frames 449 as TMS software price, not freight booking", () => {
    expect(bokaBlock).toMatch(/449/);
    expect(bokaBlock).toMatch(/transportledningssystem/i);
    expect(bokaBlock).toMatch(/inte ett fraktpris/i);
    expect(bokaBlock).toMatch(/15-minuters demo/i);
  });
});
