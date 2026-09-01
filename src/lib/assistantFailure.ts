import type { Reason } from './assistantReply';

export function assistantFailureMessage(reason: Reason): string {
  switch (reason.kind) {
    case 'unknownKind':
      return "The AI answered in a way I couldn't read. Say it again.";
    case 'shapeMismatch':
      return "The AI's answer didn't hold together. Say it again.";
    case 'badChangeCount':
      return `It tried to make ${reason.count} changes at once. Ask for a smaller piece.`;
    case 'unknownHandle':
      return "It pointed at a task that isn't on your list. Say it again.";
    case 'emptyTitle':
      return 'It left the name blank. Tell me what to call it.';
    case 'badDate':
      return `It gave me the date "${reason.value}", which I couldn't read. Try naming the date plainly.`;
    case 'badTime':
      return `It gave me the time "${reason.value}", which I couldn't read. Try naming the time plainly.`;
    case 'yearOutOfRange':
      return `It gave me the year ${reason.year} — that looks like a typo. Say the date again.`;
    case 'unknownCategory':
      return `There's no category called ${reason.name}. Pick one you have, or leave it out.`;
    case 'duplicateHandle':
      return 'It tried to change the same task twice in one go. Say it again.';
    case 'formRejection':
      return reason.message;
    case 'unconfigured':
      return "The assistant isn't switched on yet.";
    case 'quota':
      return 'Out of AI replies for today. Try again tomorrow.';
    case 'offline':
      return "You're offline. The assistant needs a connection — your board still works.";
    case 'timeout':
      return 'The AI took too long. Try again.';
    case 'serverError':
      return 'Something broke on the way to the AI. Try again in a moment.';
  }
}

export function reasonForStatus(status: number): Reason {
  if (status === 503) return { kind: 'unconfigured' };
  if (status === 429) return { kind: 'quota' };
  return { kind: 'serverError' };
}
