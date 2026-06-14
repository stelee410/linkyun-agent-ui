/**
 * TDD compliance layer for the agent edit page's visibility toggles.
 *
 * client-web-ui has no runtime test framework (no vitest/jest), so — exactly
 * like src/lib/api.test.ts — this file uses TypeScript's type system as the
 * assertion engine. The contracts below must hold or `tsc -b` (run by
 * `next build`) fails, giving real RED -> GREEN feedback without dragging
 * jsdom + a runner into a project that has never had a runtime test setup.
 *
 * Contract tracked here (task B「向用户展示思考过程 / 工具调用」):
 *   1. AgentConfig carries optional booleans show_reasoning / show_tools,
 *      which the edit page reads to drive the two new toggles.
 *   2. updateAgent accepts show_reasoning / show_tools in its `data` arg, so
 *      the toggles can persist via PUT /agents/{id}.
 *
 * Semantics (asserted by usage, enforced in page.tsx): visibility defaults ON
 * — a flag is hidden ONLY when explicitly false (undefined | true => shown),
 * encoded by the toggles as `agent.config?.show_x !== false`.
 */
import type { AgentConfig } from "@/lib/api";
import { updateAgent } from "@/lib/api";

// 1. Fields exist on AgentConfig and are optional booleans.
//    If either field is missing or retyped, these lines fail to compile.
const _showReasoning: AgentConfig["show_reasoning"] = undefined as
  | boolean
  | undefined;
const _showTools: AgentConfig["show_tools"] = undefined as boolean | undefined;
void _showReasoning;
void _showTools;

// 2. updateAgent forwards both flags. Never executed — type-checked only.
//    If the `data` param drops these keys, the project build goes RED.
async function _updateAgentAcceptsVisibilityFlags() {
  await updateAgent("api-key", 1, { show_reasoning: false });
  await updateAgent("api-key", 1, { show_tools: false });
}
void _updateAgentAcceptsVisibilityFlags;
