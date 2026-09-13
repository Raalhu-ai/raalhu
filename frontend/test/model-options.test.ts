import { describe, expect, test } from "bun:test";
import { groupModels, preferredOption } from "../src/lib/model-options";

describe("model and effort selection", () => {
  test("orders only available effort levels and removes duplicate IDs", () => {
    const groups = groupModels(["gemini-3.8-flash-high", "gemini-3.8-flash-low", "gemini-3.8-flash-high"]);
    expect(groups).toHaveLength(1);
    expect(groups[0].label).toBe("ޖެމިނީ 3.8 ފްލޭޝް");
    expect(groups[0].options.map((o) => o.effort)).toEqual(["low", "high"]);
  });
  test("keeps tiered, lite, image, thinking, agent and unsuffixed models independent", () => {
    const ids = ["gemini-3.8-flash-low", "gemini-3.8-flash-tiered", "gemini-3.5-flash-lite",
      "gemini-3.1-flash-image", "gemini-2.5-flash-thinking", "gemini-3-flash-agent", "gemini-3-flash"];
    const groups = groupModels(ids);
    expect(groups).toHaveLength(ids.length);
    const tiered = groups.find((g) => g.key === "gemini-3.8-flash-tiered")!;
    expect(tiered.label).toBe("ޖެމިނީ 3.8 ފްލޭޝް ޓިއަރޑް");
    expect(tiered.options[0].effort).toBeUndefined();
    expect(groups.flatMap((g) => g.options.map((o) => o.id)).sort()).toEqual([...ids].sort());
  });
  test("restores valid remembered effort and falls back when it disappears", () => {
    const group = groupModels(["gemini-3.7-flash-high", "gemini-3.7-flash-medium", "gemini-3.7-flash-low"])[0];
    expect(preferredOption(group, "gemini-3.7-flash-high").id).toBe("gemini-3.7-flash-high");
    expect(preferredOption(group, "removed-model").effort).toBe("medium");
    expect(preferredOption(group).effort).toBe("medium");
  });
  test("supports two-stop and single-stop families without inventing medium", () => {
    const group = groupModels(["gemini-3.5-flash-low", "gemini-3.5-flash-extra-low"])[0];
    expect(group.options.map((o) => o.effort)).toEqual(["extra-low", "low"]);
    expect(preferredOption(group).effort).toBe("extra-low");
    expect(groupModels(["gemini-3.1-pro-high"])[0].options).toHaveLength(1);
    expect(groupModels([])).toEqual([]);
  });
});
