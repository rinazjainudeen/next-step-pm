import { test } from "node:test";
import assert from "node:assert/strict";
import {
  HOME_SECTION_LINKS,
  PAGE_LINKS,
  PRIMARY_ACTION,
  availableLinks,
  blockHref,
  planReturnHref,
  isCurrentPage,
} from "./navigation";

test("every link points to a page or a section on this site", () => {
  for (const link of [...PAGE_LINKS, ...HOME_SECTION_LINKS, PRIMARY_ACTION]) {
    assert.ok(link.href.startsWith("/"), `${link.label} should start with /`);
  }
});

test("no two page links share an address", () => {
  const hrefs = PAGE_LINKS.map((link) => link.href);
  assert.equal(new Set(hrefs).size, hrefs.length);
});

test("links to pages that don't exist yet are hidden", () => {
  const shown = availableLinks([
    { label: "Real", href: "/real", description: "", available: true },
    { label: "Soon", href: "/soon", description: "", available: false },
  ]);
  assert.deepEqual(shown.map((link) => link.label), ["Real"]);
});

test("the current page is recognised, ignoring #sections", () => {
  assert.equal(isCurrentPage("/", "/"), true);
  assert.equal(isCurrentPage("/", "/#how-it-works"), true);
  assert.equal(isCurrentPage("/library", "/"), false);
  assert.equal(isCurrentPage("/library", "/library"), true);
});

test("a block opened from a plan carries the plan, so Back returns to it", () => {
  assert.equal(blockHref("define-problem"), "/library/define-problem");
  const plan = "/plan?work=product&level=director#define-problem";
  const href = blockHref("define-problem", plan);
  assert.equal(planReturnHref(new URL(href, "https://example.test").searchParams.get("from")), plan);
});

test("only a plan on this site counts as somewhere to go back to", () => {
  assert.equal(planReturnHref("/plan?work=product"), "/plan?work=product");
  assert.equal(planReturnHref("/plan"), "/plan");
  for (const bad of [null, "", "https://example.com/plan?x", "//example.com/plan", "/planet", "/library", "/plan\\@example.com"]) {
    assert.equal(planReturnHref(bad), null, String(bad));
  }
});
