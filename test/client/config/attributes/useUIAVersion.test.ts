import * as attributes from '../../../../src/client/config/attributes';
import { createTest } from './common/boolean';

createTest('useUIAVersion', attributes.useUIAVersion.defaultValue, attributes.useUIAVersion.validator);
