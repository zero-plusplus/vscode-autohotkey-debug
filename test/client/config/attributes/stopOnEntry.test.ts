import * as attributes from '../../../../src/client/config/attributes';
import { createTest } from './common/boolean';

createTest('stopOnEntry', attributes.stopOnEntry.defaultValue, attributes.stopOnEntry.validator);