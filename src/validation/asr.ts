import { spawn } from "node:child_process";
import * as path from "node:path";
import { type ScriptLine } from "../runtime/types";

export interface DamageReport {
  is_damaged: boolean;
  critical: boolean;
  mismatched_lines: number[];
  transcription?: string;
}

export class ASRValidator {
  async validate(audioPath: string, script: ScriptLine[]): Promise<DamageReport> {
    const bridgePath = path.join(process.cwd(), "src/validation/asr_bridge.py");
    const expectedLines = script.map(l => l.text);
    
    const config = JSON.stringify({
      audio_path: audioPath,
      expected_lines: expectedLines,
    });

    return new Promise((resolve) => {
      const proc = spawn("uv", ["run", bridgePath, config]);
      let reportData = "";

      proc.stdout.on("data", (data) => {
        const out = data.toString();
        if (out.includes("REPORT:")) {
          reportData = out.split("REPORT:")[1].split("DONE")[0].trim();
        }
      });

      proc.on("close", (code) => {
        if (code !== 0 || !reportData) {
          resolve({ is_damaged: true, critical: true, mismatched_lines: [] });
          return;
        }

        const report = JSON.parse(reportData);
        const threshold = 0.8;
        const criticalThreshold = 0.5;

        const mismatched_lines: number[] = [];
        report.line_scores.forEach((item: any, index: number) => {
           if (item.score < threshold) {
             mismatched_lines.push(index);
           }
        });

        const isDamaged = mismatched_lines.length > 0;
        const isCritical = report.line_scores.some((item: any) => item.score < criticalThreshold);
        
        resolve({
          is_damaged: isDamaged,
          critical: isCritical,
          mismatched_lines,
          transcription: report.transcription
        });
      });
    });
  }
}
