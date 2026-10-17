import { readFileSync } from "node:fs";
import path from "node:path";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CLIPPING_CLASSES, longLabels } from "../test-support/long-labels";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "./table";

const source = readFileSync(path.join(import.meta.dirname, "table.tsx"), "utf8");

function SizeGuide(props: { head?: string; cell?: string; caption?: string }) {
  return (
    <Table>
      <TableCaption>{props.caption ?? "Size guide"}</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>{props.head ?? "Size"}</TableHead>
          <TableHead>Chest</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell>{props.cell ?? "S"}</TableCell>
          <TableCell>92 cm</TableCell>
        </TableRow>
        <TableRow data-state="selected">
          <TableCell>M</TableCell>
          <TableCell>100 cm</TableCell>
        </TableRow>
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell>Total</TableCell>
          <TableCell>2</TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  );
}

describe("Table", () => {
  it("is a server component: no state and no events, so no 'use client'", () => {
    expect(source).not.toMatch(/^\s*["']use client["']/m);
  });

  it("is a table with named column headers, a caption and rows", () => {
    render(<SizeGuide />);
    const table = screen.getByRole("table", { name: "Size guide" });
    expect(
      within(table)
        .getAllByRole("columnheader")
        .map((cell) => cell.textContent),
    ).toEqual(["Size", "Chest"]);
    expect(within(table).getAllByRole("row")).toHaveLength(4);
    expect(within(table).getByRole("cell", { name: "92 cm" })).toBeTruthy();
  });

  it("scrolls sideways in its own container instead of widening the page", () => {
    render(<SizeGuide />);
    const container = document.querySelector("[data-slot=table-container]");
    expect(container?.className).toContain("overflow-x-auto");
    expect(container?.className).toContain("w-full");
    expect(container?.querySelector("table")).toBe(screen.getByRole("table"));
  });

  it("aligns headers to the inline start and keeps its padding logical", () => {
    render(<SizeGuide />);
    const head = screen.getAllByRole("columnheader")[0];
    expect(head?.className).toContain("text-start");
    expect(head?.className).toContain("[&:has([role=checkbox])]:pe-0");
    const cell = screen.getAllByRole("cell")[0];
    expect(cell?.className).toContain("[&:has([role=checkbox])]:pe-0");
    const html = document.body.innerHTML;
    expect(html).not.toMatch(
      /(?:^|[\s"])(?:text-left|pl-\d|pr-\d|\[&:has\(\[role=checkbox\]\)\]:pr-0)/,
    );
  });

  it("marks a selected row with the muted token", () => {
    render(<SizeGuide />);
    const selected = screen.getAllByRole("row")[2];
    expect(selected?.getAttribute("data-state")).toBe("selected");
    expect(selected?.className).toContain("data-[state=selected]:bg-muted");
  });

  it.each(longLabels)(
    "lets a long %s header and cell wrap: no clipping class",
    (_locale, strings) => {
      render(
        <SizeGuide
          head={strings.fieldLabel}
          cell={strings.productName}
          caption={strings.helpText}
        />,
      );
      expect(screen.getByRole("columnheader", { name: strings.fieldLabel }).className).not.toMatch(
        CLIPPING_CLASSES,
      );
      expect(screen.getByRole("cell", { name: strings.productName }).className).not.toMatch(
        CLIPPING_CLASSES,
      );
      for (const element of document.querySelectorAll("[data-slot^=table]")) {
        expect(element.className).not.toMatch(CLIPPING_CLASSES);
      }
    },
  );
});
