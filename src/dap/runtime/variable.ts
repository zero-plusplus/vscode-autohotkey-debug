export const createVariable = (): void => {

};

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const createVariableManager = () => {
  const getVariablesReference = createVariablesReferenceGetter();
  getVariablesReference;

  return {

  };

  function createVariablesReferenceGetter(): () => number {
    let variablesReference = 0;
    return (): number => variablesReference++;
  }
};
