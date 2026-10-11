import { extractName } from 'russian-name-extractor';

// Copy into your Next.js App Router project after installing the local package.
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Expected a JSON body' }, { status: 400 });
  }
  if (!body || typeof body.input !== 'string') {
    return Response.json({ error: 'input must be a string' }, { status: 400 });
  }
  if (body.input.length > 10000) {
    return Response.json({ error: 'input must be at most 10000 characters' }, { status: 400 });
  }
  return Response.json(extractName(body.input));
}
