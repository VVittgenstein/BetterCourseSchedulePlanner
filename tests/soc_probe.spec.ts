import { afterEach, beforeEach, describe, expect, it } from "vitest";
import nock from "nock";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { runProbe, type RunOptions } from "../scripts/soc_probe";

describe("soc_probe", () => {
  let tmpDir: string;
  let runOptions: RunOptions;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "soc-probe-"));
    runOptions = { cwd: tmpDir };
  });

  afterEach(async () => {
    nock.cleanAll();
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("writes aggregated snapshots and logs per request metadata", async () => {
    const config = {
      baseUrl: "http://soc.test/api",
      endpoint: "courses.json",
      outputDir: "raw",
      logFile: "logs/soc_probe.log",
      queryDefaults: {
        level: "U"
      },
      requestIntervalMs: 0,
      timeoutMs: 2000,
      combinations: [
        {
          term: "2024",
          campus: "NB",
          subjects: ["198", "640"]
        }
      ]
    };

    nock("http://soc.test")
      .get("/api/courses.json")
      .query({ level: "U", term: "2024", campus: "NB", subject: "198" })
      .reply(200, [{ code: "198:111" }, { code: "198:205" }]);

    nock("http://soc.test")
      .get("/api/courses.json")
      .query({ level: "U", term: "2024", campus: "NB", subject: "640" })
      .reply(200, [{ code: "640:211" }]);

    await runProbe(config, runOptions);

    const snapshotPath = path.join(tmpDir, "raw/2024-NB.json");
    const snapshotRaw = await fs.readFile(snapshotPath, "utf-8");
    const snapshot = JSON.parse(snapshotRaw);
    expect(snapshot.term).toBe("2024");
    expect(snapshot.campus).toBe("NB");
    expect(snapshot.subjects).toEqual(["198", "640"]);
    expect(snapshot.totalCourses).toBe(3);
    expect(snapshot.data).toHaveLength(3);

    const logContents = await fs.readFile(
      path.join(tmpDir, "logs/soc_probe.log"),
      "utf-8"
    );
    expect(logContents.split("\n").filter(Boolean)).toHaveLength(2);
  });

  it("propagates request failures and persists failure logs", async () => {
    const config = {
      baseUrl: "http://soc.test/api",
      endpoint: "courses.json",
      outputDir: "raw",
      logFile: "logs/soc_probe.log",
      queryDefaults: {
        level: "U"
      },
      requestIntervalMs: 0,
      timeoutMs: 2000,
      combinations: [
        {
          term: "2024",
          campus: "NB",
          subjects: ["198"]
        }
      ]
    };

    nock("http://soc.test")
      .get("/api/courses.json")
      .query({ level: "U", term: "2024", campus: "NB", subject: "198" })
      .reply(500, { error: "boom" });

    await expect(runProbe(config, runOptions)).rejects.toThrow();

    const logContents = await fs.readFile(
      path.join(tmpDir, "logs/soc_probe.log"),
      "utf-8"
    );
    expect(logContents).toContain("status=500");
  });
});
