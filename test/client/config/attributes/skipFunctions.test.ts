import * as attributes from '../../../../src/client/config/attributes';
import { createTest } from './common/strings';

createTest('skipFunctions', attributes.skipFunctions.defaultValue, attributes.skipFunctions.validator);
