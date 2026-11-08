import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import "./eager-islands";

afterEach(() => {
  cleanup();
});
