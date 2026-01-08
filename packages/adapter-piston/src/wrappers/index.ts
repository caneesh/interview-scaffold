import type { SupportedLanguage, CodeWrapper } from '../types.js';
import { javascriptWrapper } from './javascript.js';
import { pythonWrapper } from './python.js';
import { javaWrapper } from './java.js';
import { cppWrapper } from './cpp.js';

const WRAPPERS: Record<SupportedLanguage, CodeWrapper> = {
  javascript: javascriptWrapper,
  python: pythonWrapper,
  java: javaWrapper,
  cpp: cppWrapper,
};

export function getWrapper(language: SupportedLanguage): CodeWrapper {
  return WRAPPERS[language];
}

export { javascriptWrapper, pythonWrapper, javaWrapper, cppWrapper };
