import { AssetStore } from "./storage";
import { IdentityManager } from "../identity/manager";
import { ContinuityEngine } from "../continuity/engine";
import { ASMRScriptGenerator } from "../scene/generator";
import { IrodoriTtsEngine } from "./tts";
import { VideoComposer } from "./composer";
import { SemanticValidator } from "../validation/semantic";
import { ASRValidator } from "../validation/asr";
import { type EmotionalState, type SceneState, type ScriptLine } from "./types";
import { PulseManager } from "./pulse";
import * as path from "node:path";

export class Orchestrator {
  constructor(
    private store: AssetStore,
    private identityData: any,
    private initialEmotion: EmotionalState,
    private initialScene: SceneState
  ) {}

  async run() {
    console.log(`[RESONANCE] Starting Production Loop...`);

    const identityManager = new IdentityManager();
    const contract = identityManager.load(this.identityData);
    const continuity = new ContinuityEngine(contract);
    const generator = new ASMRScriptGenerator(contract);
    const tts = new IrodoriTtsEngine();
    const composer = new VideoComposer();
    const semanticValidator = new SemanticValidator();
    const asrValidator = new ASRValidator();
    const pulseManager = new PulseManager();

    // 1. Daily Pulse Observation
    const pulseState = await pulseManager.observe();
    this.initialEmotion = { ...this.initialEmotion, ...pulseState };

    // 2. Script Generation (Continuity-Aware)
    const lines = await generator.generate("midnight rain", this.initialEmotion);
    console.log(`[GEN] Script ready: ${lines.length} lines.`);

    // Smooth emotional transitions and enforce invariants
    let currentEmotion = this.initialEmotion;
    const continuousScript: ScriptLine[] = lines.map((line, i) => {
      let targetEmotion = line.emotion || currentEmotion;
      const smoothed = continuity.smoothTransition(currentEmotion, targetEmotion);
      
      // Enforce Invariants
      if (!identityManager.validateInvariants(smoothed, this.initialScene, currentEmotion)) {
        throw new Error(`[IDENTITY] Invariant violation at line ${i}: Emotion drift detected.`);
      }

      currentEmotion = smoothed;
      return { ...line, emotion: currentEmotion };
    });

    // 2. Semantic Validation
    continuousScript.forEach((line, i) => {
       const result = semanticValidator.validate(line.text, line.emotion!, this.initialScene);
       if (!result.is_valid) {
         console.warn(`[VALIDATION] Semantic warning at line ${i}: ${result.reason}`);
       }
    });

    // 3. Continuous TTS & Repair Loop
    let audioPath = "";
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      attempts++;
      console.log(`[TTS] Attempt ${attempts}/${maxAttempts}...`);
      
      const currentAudioPath = this.store.getPath(`session_audio_v${attempts}.wav`);
      const fullText = continuousScript.map(l => l.text).join(" ");
      
      await tts.synthesize({
        text: fullText,
        caption: contract.preferred_atmosphere,
        outputPath: currentAudioPath,
        seed: 2306 + attempts // Vary the seed for each attempt
      });

      // 4. ASR Reverse Validation & Damage Detection
      console.log(`[VALIDATION] Running ASR reverse validation...`);
      const report = await asrValidator.validate(currentAudioPath, continuousScript);
      
      if (!report.is_damaged) {
        audioPath = currentAudioPath;
        break;
      }

      if (attempts === maxAttempts) {
        console.error(`[CRITICAL] Max retries reached. Last damage: ${report.mismatched_lines}`);
        throw new Error("Failed to generate clean audio after max retries");
      }

      console.warn(`[REPAIR] Damage detected in lines ${report.mismatched_lines}. Retrying...`);
    }

    // 6. Final Render
    const videoPath = this.store.getPath("final_video.mp4");
    const thumbnailPath = path.join(process.cwd(), "assets/thumbnail.png");
    
    console.log(`[VIDEO] Composing final render...`);
    await composer.compose({
      audioPath: audioPath,
      imagePath: thumbnailPath,
      outputPath: videoPath
    });

    console.log(`[SUCCESS] Production cycle complete: ${videoPath}`);
  }
}
