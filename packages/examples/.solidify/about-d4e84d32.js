import { t as template, g as getNextElement } from './virtual-entrypoint.js';

const _tmpl$ = template(`<div>About Page</div>`);

const About = () => {
  return getNextElement(_tmpl$);
};

export { About as default };
