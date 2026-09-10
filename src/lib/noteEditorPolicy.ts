export function clipboardAction(
  collapsed: boolean,
  kind: 'copy' | 'cut',
): 'let-native' | 'write' | 'write-and-delete' {
  if (collapsed) {
    return 'let-native';
  }
  return kind === 'cut' ? 'write-and-delete' : 'write';
}

export function shouldCommitFromInput(composing: boolean): boolean {
  return !composing;
}

export function shouldRestoreCaretAfterTextCommit(composing: boolean): boolean {
  return !composing;
}

export function beforeInputAction(
  inputType: string,
  collapsed: boolean,
  hasInsertData: boolean,
): 'enter' | 'type-over' | 'delete' | 'ignore' {
  if (inputType === 'insertLineBreak' || inputType === 'insertParagraph') {
    return 'enter';
  }
  if (collapsed) {
    return 'ignore';
  }
  if (inputType === 'insertText' && hasInsertData) {
    return 'type-over';
  }
  if (inputType.startsWith('delete')) {
    return 'delete';
  }
  return 'ignore';
}

export function shouldReplaceEditorBody(
  incoming: string,
  encodedCurrent: string,
): boolean {
  return incoming !== encodedCurrent;
}
