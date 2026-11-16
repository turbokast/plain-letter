// Prompts and response shapes, shared by the real Firebase AI Logic provider
// and the mock. Plain JSON Schema: Chrome's on-device model takes it as a
// responseConstraint, and the cloud model takes the same shape as a responseSchema.

export const EXTRACT_SCHEMA = {
  type: 'object',
  properties: {
    letter_type: { type: 'string' },
    sender: { type: 'string' },
    amount: { type: 'string' },
    deadline: { type: 'string' },
    personal_details: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          kind: { type: 'string', enum: ['NAME', 'ADDRESS', 'POSTCODE', 'DATE_OF_BIRTH', 'PHONE', 'EMAIL', 'NI_NUMBER', 'TAX_REFERENCE', 'BANK_ACCOUNT', 'REFERENCE', 'OTHER'] },
          text: { type: 'string' },
        },
        required: ['kind', 'text'],
      },
    },
  },
  required: ['letter_type', 'sender', 'amount', 'deadline', 'personal_details'],
};

export function extractPrompt(letter) {
  return [
    'You are a privacy filter running on the user\'s own device. Read the official letter below.',
    'List every detail that identifies the person the letter is addressed to, copied exactly as written in the letter:',
    'their name (every form used), each line of their address, postcode, date of birth, phone, email,',
    'National Insurance number, tax reference, bank details and every reference, account, claim or case number.',
    'Do not list the organisation that sent the letter, its address or its phone number.',
    'Also give: letter_type (a few words, for example "late filing penalty"), sender (the organisation),',
    'amount (the main sum of money, as written, or "" if none) and deadline (the main date to act by, as written, or "" if none).',
    '',
    'LETTER:',
    letter,
  ].join('\n');
}

// Reading a photo of a letter, on the device. Plain text out: the result goes
// into the letter box for the person to check against the paper.
export const TRANSCRIBE_PROMPT = [
  'This is a photo or scan of a printed letter. Copy out all of the text in it, exactly as printed, line by line, from top to bottom.',
  'Keep every number, reference, date and amount character for character. Do not summarise, correct, explain or leave anything out.',
  'Return only the text of the letter.',
].join('\n');

export const EXPLAIN_SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    what_it_means: { type: 'array', items: { type: 'string' } },
    if_ignored: { type: 'string' },
    options: {
      type: 'array',
      items: {
        type: 'object',
        properties: { title: { type: 'string' }, detail: { type: 'string' } },
        required: ['title', 'detail'],
      },
    },
    reply_draft: { type: 'string' },
    check_first: { type: 'array', items: { type: 'string' } },
  },
  required: ['summary', 'what_it_means', 'if_ignored', 'options', 'reply_draft', 'check_first'],
};

export const EXPLAIN_SYSTEM = [
  'You explain official UK letters (HMRC, councils, landlords, courts, the DWP, the NHS) in plain English for the person who received one.',
  'The letter you get has had personal details replaced by placeholders in square brackets such as [NAME_1] or [REFERENCE_2].',
  'Rules:',
  '- Never guess what a placeholder stands for. Copy a placeholder exactly, brackets included, wherever that detail belongs.',
  '- Use only what the letter says. If the letter does not say something, say that it does not.',
  '- Short sentences. No jargon; if a term from the letter must be used, explain it in a few words.',
  '- You are not giving legal, tax or debt advice. Where the stakes are high, say who gives free advice in the UK (Citizens Advice, TaxAid, Shelter, StepChange) if it fits the letter.',
  'Return: summary (two sentences at most); what_it_means (3 to 5 points); if_ignored (what the letter says happens if nothing is done);',
  'options (the realistic choices, each with a title and one or two sentences); reply_draft (a polite, firm reply the person could send,',
  'using the placeholders for their details and the sender\'s references, ending with their name placeholder if there is one);',
  'check_first (facts the person should check before replying).',
].join('\n');

export function explainPrompt(redacted, placeholders = []) {
  return [
    placeholders.length ? `Placeholders used in this letter: ${placeholders.join(', ')}` : 'This letter has no placeholders.',
    '',
    'LETTER (personal details already removed):',
    redacted,
  ].join('\n');
}

export function rewritePrompt(replyDraft, instruction) {
  return [
    'Rewrite the reply below. Instruction: ' + instruction,
    'Keep every placeholder in square brackets exactly as it is. Keep every fact, date and amount. Return only the rewritten reply.',
    '',
    'REPLY:',
    replyDraft,
  ].join('\n');
}

export const REWRITE_INSTRUCTIONS = {
  shorter: 'make it shorter, about half the length.',
  firmer: 'make it firmer, still polite.',
  simpler: 'use simpler words and shorter sentences.',
};
