import * as attributes from '../../../../src/client/config/attributes';
import { createTest } from './common/boolean';

createTest('useIntelliSenseInDebugging', attributes.useIntelliSenseInDebugging.defaultValue, attributes.useIntelliSenseInDebugging.validator);
