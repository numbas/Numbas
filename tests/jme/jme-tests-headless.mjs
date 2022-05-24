import { JSDOM } from 'jsdom';

const { window } = (new JSDOM(''));
global.window = window;
global.document = window.document;

import './jme-tests.mjs';
