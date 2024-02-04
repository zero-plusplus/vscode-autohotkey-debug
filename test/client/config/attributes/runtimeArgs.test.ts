import * as attributes from '../../../../src/client/config/attributes';
import { createTest } from './common/strings';

createTest('runtimeArgs', attributes.runtimeArgs.defaultValue, attributes.runtimeArgs.validator);
