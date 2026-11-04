import { test } from "node:test";
import assert from "node:assert/strict";
import {
  HOME_SECTION_LINKS,
  PAGE_LINKS,
  PRIMARY_ACTION,
  availableLinks,
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
