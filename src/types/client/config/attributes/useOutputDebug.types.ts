import { MessageCategory } from '../../../dap/adapter/adapter.types';

export interface OutputDebugConfig {
  category: MessageCategory;
  useTrailingLinebreak: boolean;
}
