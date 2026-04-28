import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { Client } from 'pg';

const app = new Hono();
const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY || '', baseURL: process.env.OPENAI_BASE_URL || undefined });

function dbClient() {
  return new Client({ connectionString: process.env.DATABASE_URL });
}

app.get('/health', (c) => c.json({ status: 'ok' }));

app.get('/agent/conversations', async (c) => {
  const client = dbClient();
  await client.connect();
  const res = await client.query('SELECT id::text, title, mission_id, vehicle_id, execution_mode, created_at, updated_at FROM ai_conversations ORDER BY created_at DESC LIMIT 100');
  await client.end();
  return c.json(res.rows);
});

app.post('/agent/conversations', async (c) => {
  const body = await c.req.json();
  const id = crypto.randomUUID();
  const client = dbClient();
  await client.connect();
  const res = await client.query(
    `INSERT INTO ai_conversations (id, title, created_by, mission_id, vehicle_id, execution_mode, created_at, updated_at)
     VALUES ($1::uuid, $2, NULL, $3, $4, $5, now(), now())
     RETURNING id::text, title, mission_id, vehicle_id, execution_mode, created_at, updated_at`,
    [id, body.title || null, body.mission_id || null, body.vehicle_id || null, body.execution_mode || 'read_only']
  );
  await client.end();
  return c.json(res.rows[0]);
});

app.get('/agent/conversations/:conversationId', async (c) => {
  const id = c.req.param('conversationId');
  const client = dbClient();
  await client.connect();
  const convo = await client.query('SELECT id::text, title, mission_id, vehicle_id, execution_mode, created_at, updated_at FROM ai_conversations WHERE id = $1::uuid', [id]);
  if (!convo.rowCount) {
    await client.end();
    return c.json({ detail: 'conversation not found' }, 404);
  }
  const messages = await client.query('SELECT id::text, role, content, metadata_json, created_at FROM ai_conversation_messages WHERE conversation_id = $1::uuid ORDER BY created_at ASC', [id]);
  await client.end();
  return c.json({ ...convo.rows[0], messages: messages.rows });
});

app.post('/agent/chat', async (c) => {
  const body = await c.req.json();
  const conversationId = body.conversation_id;
  const executionMode = body.execution_mode || 'read_only';
  const userMessage = body.messages?.[body.messages.length - 1]?.content || '';
  const agentRunId = crypto.randomUUID();
  const requestId = crypto.randomUUID();

  const client = dbClient();
  await client.connect();
  const messageId = crypto.randomUUID();
  await client.query(
    `INSERT INTO ai_conversation_messages (id, conversation_id, role, content, metadata_json, created_at)
     VALUES ($1::uuid, $2::uuid, 'user', $3, '{}'::jsonb, now())`,
    [messageId, conversationId, userMessage]
  );
  await client.end();

  // Local-stack fallback when no model key is available.
  if (!process.env.OPENAI_API_KEY) {
    const fallback = [
      'Model API key is not configured in this environment.',
      'Running in local fallback mode.',
      '',
      'Your message was received and persisted.',
      `Preview: ${userMessage.slice(0, 300)}`,
    ].join('\n');
    return new Response(fallback, {
      status: 200,
      headers: {
        'content-type': 'text/plain; charset=utf-8',
        'x-agent-run-id': agentRunId,
        'x-request-id': requestId,
        'x-execution-mode': executionMode,
        'x-model-fallback': 'true',
      },
    });
  }

  // Local-stack fallback when no model key is available.
  if (!process.env.OPENAI_API_KEY) {
    const fallback = [
      'Model API key is not configured in this environment.',
      'Running in local fallback mode.',
      '',
      'Your message was received and persisted.',
      `Preview: ${userMessage.slice(0, 300)}`,
    ].join('\n');
    return new Response(fallback, {
      status: 200,
      headers: {
        'content-type': 'text/plain; charset=utf-8',
        'x-agent-run-id': agentRunId,
        'x-request-id': requestId,
        'x-execution-mode': executionMode,
        'x-model-fallback': 'true',
      },
    });
  }

  const result = streamText({
    model: openai('gpt-4o-mini'),
    system: 'You are the AI Engineer. Use platform tools and stay within execution constraints.',
    prompt: userMessage,
  });

  return result.toDataStreamResponse({
    headers: {
      'x-agent-run-id': agentRunId,
      'x-request-id': requestId,
      'x-execution-mode': executionMode,
    },
  });
});

serve({ fetch: app.fetch, port: 8080 });
