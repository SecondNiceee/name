import { parseFullName } from 'russian-name-extractor';

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: ['Expected a JSON body'] }, { status: 400 });
  }
  if (!body || typeof body.input !== 'string' || body.input.length > 10000) {
    return Response.json({ error: ['input must be a string of at most 10000 characters'] }, { status: 400 });
  }
  return Response.json(parseFullName(body.input));
}
