import { JSDOM } from 'jsdom';
import { QUnit } from 'qunit';
import './numbas-runtime.js';
import './locales.js';
import './jme/jme-tests.mjs';
import './parts/part-tests.mjs';

const { window } = (new JSDOM(''));
global.window = window;
global.document = window.document;
global.QUnit = QUnit;
QUnit.config.notrycatch = true;

Numbas.queueScript('base',[],function() {});
Numbas.queueScript('qunit',[],function() {});
