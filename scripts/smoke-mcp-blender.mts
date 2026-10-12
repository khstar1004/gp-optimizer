/**
 * Repeatable smoke test for the Blender-pipeline MCP server. Spawns it as a
 * child process over stdio, lists its tools, and confirms the expected ones
 * are registered. Does NOT invoke run_build — that spawns Blender for real
 * and can take minutes / overwrite assets/models GLBs.
 *
 * Usage: npm run smoke:mcp-blender
 */
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';

const EXPECTED_TOOLS = ['list_builds', 'run_build', 'list_qa_renders', 'get_qa_render'];

const client = new Client({ name: 'smoke-mcp-blender', version: '1.0.0' });
const transport = new StdioClientTransport({
  command: 'npx',
  args: ['tsx', 'scripts/mcp-blender-pipeline.mts'],
});

try {
  await client.connect(transport);
  const { tools } = await client.listTools();
  const names = new Set(tools.map((t) => t.name));
  for (const expected of EXPECTED_TOOLS) {
    if (!names.has(expected)) throw new Error(`missing tool: ${expected}`);
  }
  console.log(`gp-digital-twin MCP blender-pipeline smoke passed: ${tools.length} tools (${[...names].join(', ')})`);
} finally {
  await client.close();
}
