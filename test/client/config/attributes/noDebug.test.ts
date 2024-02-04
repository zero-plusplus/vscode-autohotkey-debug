import * as attributes from '../../../../src/client/config/attributes';
import { createTest } from './common/boolean';

createTest('noDebug', attributes.noDebug.defaultValue, attributes.noDebug.validator);
