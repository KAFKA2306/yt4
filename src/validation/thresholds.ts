import * as fs from "node:fs";
import * as path from "node:path";
import * as yaml from "yaml";

type ValidationThresholds = {
	validation?: {
		asr_threshold?: number;
		speaker_threshold?: number;
		silence_threshold?: number;
	};
};

const configPath = path.join(process.cwd(), "config/default.yaml");
const defaultConfig = yaml.parse(
	fs.readFileSync(configPath, "utf-8"),
) as ValidationThresholds;

export const ASR_THRESHOLD = defaultConfig.validation?.asr_threshold ?? 0.95;
export const SPEAKER_THRESHOLD =
	defaultConfig.validation?.speaker_threshold ?? 0.8;
export const SILENCE_THRESHOLD =
	defaultConfig.validation?.silence_threshold ?? 0.5;
