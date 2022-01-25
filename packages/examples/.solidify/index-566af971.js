import { t as template, g as getNextElement } from './virtual-entrypoint.js';

const _tmpl$ = template(`<div>Main Page</div>`);

const Index = () => {
  return getNextElement(_tmpl$);
};

export { Index as default };
