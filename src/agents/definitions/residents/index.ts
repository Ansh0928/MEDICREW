import { ResidentRole } from "@/agents/swarm-types";
import { ResidentDefinition, conservativeResident } from "./conservative";
import { pharmacologicalResident } from "./pharmacological";
import { investigativeResident } from "./investigative";
import { redFlagResident } from "./red-flag";

export type { ResidentDefinition };

export const residentDefinitions: Record<ResidentRole, ResidentDefinition> = {
  conservative: conservativeResident,
  pharmacological: pharmacologicalResident,
  investigative: investigativeResident,
  "red-flag": redFlagResident,
};
