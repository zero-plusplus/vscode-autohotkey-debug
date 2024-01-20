import { FeatureGetResponse } from '../../../../types/dbgp/ExtendAutoHotkeyDebugger';
import { FeatureGetName } from '../../../dbgpSession';

export const sendBreakpointGetCommand = async(featureName: FeatureGetName): Promise<FeatureGetResponse> => {
  return new FeatureGetResponse(await this.sendCommand('feature_get', `-n ${featureName}`));
};
