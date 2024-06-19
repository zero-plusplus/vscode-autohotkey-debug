const errorMssages = {
  '1': 'parse error in command',
  '3': 'invalid options (ie, missing a required option, invalid value for a passed option, not supported feature)',
  '4': 'Unimplemented command',
  '5': 'Command not available (Is used for async commands. For instance if the engine is in state "run" then only "break" and "status" are available).',
  '100': `can not open file (as a reply to a "source" command if the requested source file can't be opened)`,
  '200': 'breakpoint could not be set (for some reason the breakpoint could not be set due to problems registering it)',
  '201': `breakpoint type not supported (for example I don't support 'watch' yet and thus return this error)`,
  '202': 'invalid breakpoint (the IDE tried to set a breakpoint on a line that does not exist in the file (ie "line 0" or lines past the end of the file)',
  '203': 'no code on breakpoint line (the IDE tried to set a breakpoint on a line which does not have any executable code. The debugger engine is NOT required to return this type if it is impossible to determine if there is code on a given location. (For example, in the PHP debugger backend this will only be returned in some special cases where the current scope falls into the scope of the breakpoint to be set)).',
  '204': 'Invalid breakpoint state (using an unsupported breakpoint state was attempted)',
  '205': 'No such breakpoint (used in breakpoint_get etc. to show that there is no breakpoint with the given ID)',
  '300': 'Can not get property (when the requested property to get did not exist, this is NOT used for an existing but uninitialized property, which just gets the type "uninitialised" (See: PreferredTypeNames)).',
  '301': 'Stack depth invalid (the -d stack depth parameter did not exist (ie, there were less stack elements than the number requested) or the parameter was < 0)',
  '302': 'Context invalid (an non existing context was requested)',
  '998': 'An internal exception in the debugger occurred',
};
export class DbgpError extends Error {
  public code: number;
  constructor(code: number) {
    const message = String(errorMssages[code]);
    super(message);

    this.name = 'DbgpError';
    this.code = code;
  }
}
