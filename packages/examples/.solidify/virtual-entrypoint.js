const sharedConfig = {};

function setHydrateContext(context) {
  sharedConfig.context = context;
}

function nextHydrateContext() {
  return { ...sharedConfig.context,
    id: `${sharedConfig.context.id}${sharedConfig.context.count++}.`,
    count: 0
  };
}

const equalFn = (a, b) => a === b;
const signalOptions = {
  equals: equalFn
};
let runEffects = runQueue;
const NOTPENDING = {};
const STALE = 1;
const PENDING = 2;
const UNOWNED = {
  owned: null,
  cleanups: null,
  context: null,
  owner: null
};
const [transPending, setTransPending] = /*@__PURE__*/createSignal(false);
var Owner = null;
let Transition = null;
let Listener = null;
let Pending = null;
let Updates = null;
let Effects = null;
let ExecCount = 0;

function createRoot(fn, detachedOwner) {
  detachedOwner && (Owner = detachedOwner);
  const listener = Listener,
        owner = Owner,
        root = fn.length === 0 && !false ? UNOWNED : {
    owned: null,
    cleanups: null,
    context: null,
    owner
  };
  Owner = root;
  Listener = null;

  try {
    return runUpdates(() => fn(() => cleanNode(root)), true);
  } finally {
    Listener = listener;
    Owner = owner;
  }
}

function createSignal(value, options) {
  options = options ? Object.assign({}, signalOptions, options) : signalOptions;
  const s = {
    value,
    observers: null,
    observerSlots: null,
    pending: NOTPENDING,
    comparator: options.equals || undefined
  };

  const setter = value => {
    if (typeof value === "function") {
      value = value(s.pending !== NOTPENDING ? s.pending : s.value);
    }

    return writeSignal(s, value);
  };

  return [readSignal.bind(s), setter];
}

function createComputed(fn, value, options) {
  const c = createComputation(fn, value, true, STALE);
  updateComputation(c);
}

function createRenderEffect(fn, value, options) {
  const c = createComputation(fn, value, false, STALE);
  updateComputation(c);
}

function createMemo(fn, value, options) {
  options = options ? Object.assign({}, signalOptions, options) : signalOptions;
  const c = createComputation(fn, value, true, 0);
  c.pending = NOTPENDING;
  c.observers = null;
  c.observerSlots = null;
  c.comparator = options.equals || undefined;

  updateComputation(c);

  return readSignal.bind(c);
}

function createResource(source, fetcher, options) {
  if (arguments.length === 2) {
    if (typeof fetcher === "object") {
      options = fetcher;
      fetcher = source;
      source = true;
    }
  } else if (arguments.length === 1) {
    fetcher = source;
    source = true;
  }

  options || (options = {});

  if (options.globalRefetch !== false) {
    Resources || (Resources = new Set());
    Resources.add(load);
    Owner && onCleanup(() => Resources.delete(load));
  }

  const contexts = new Set(),
        [s, set] = createSignal(options.initialValue),
        [track, trigger] = createSignal(undefined, {
    equals: false
  }),
        [loading, setLoading] = createSignal(false),
        [error, setError] = createSignal();
  let err = undefined,
      pr = null,
      initP = null,
      id = null,
      dynamic = typeof source === "function";

  if (sharedConfig.context) {
    id = `${sharedConfig.context.id}${sharedConfig.context.count++}`;
    if (sharedConfig.load) initP = sharedConfig.load(id);
  }

  function loadEnd(p, v, e, key) {
    if (pr === p) {
      pr = null;
      if (initP && p === initP && options.onHydrated) options.onHydrated(key, {
        value: v
      });
      initP = null;
      setError(err = e);

      completeLoad(v);
    }

    return v;
  }

  function completeLoad(v) {
    batch(() => {
      set(() => v);
      setLoading(false);

      for (const c of contexts.keys()) c.decrement();

      contexts.clear();
    });
  }

  function read() {
    const c = SuspenseContext ,
          v = s();
    if (err) throw err;

    if (Listener && !Listener.user && c) {
      createComputed(() => {
        track();

        if (pr) {
          if (c.resolved ) ;else if (!contexts.has(c)) {
            c.increment();
            contexts.add(c);
          }
        }
      });
    }

    return v;
  }

  function load(refetching = true) {
    setError(err = undefined);
    const lookup = dynamic ? source() : source;

    if (lookup == null || lookup === false) {
      loadEnd(pr, untrack(s));
      return;
    }
    const p = initP || untrack(() => fetcher(lookup, {
      value: s(),
      refetching
    }));

    if (typeof p !== "object" || !("then" in p)) {
      loadEnd(pr, p);
      return p;
    }

    pr = p;
    batch(() => {
      setLoading(true);
      trigger();
    });
    return p.then(v => loadEnd(p, v, undefined, lookup), e => loadEnd(p, e, e));
  }

  Object.defineProperties(read, {
    loading: {
      get() {
        return loading();
      }

    },
    error: {
      get() {
        return error();
      }

    }
  });
  if (dynamic) createComputed(() => load(false));else load(false);
  return [read, {
    refetch: load,
    mutate: set
  }];
}

let Resources;

function batch(fn) {
  if (Pending) return fn();
  let result;
  const q = Pending = [];

  try {
    result = fn();
  } finally {
    Pending = null;
  }

  runUpdates(() => {
    for (let i = 0; i < q.length; i += 1) {
      const data = q[i];

      if (data.pending !== NOTPENDING) {
        const pending = data.pending;
        data.pending = NOTPENDING;
        writeSignal(data, pending);
      }
    }
  }, false);
  return result;
}

function untrack(fn) {
  let result,
      listener = Listener;
  Listener = null;
  result = fn();
  Listener = listener;
  return result;
}

function on(deps, fn, options) {
  const isArray = Array.isArray(deps);
  let prevInput;
  let defer = options && options.defer;
  return prevValue => {
    let input;

    if (isArray) {
      input = [];

      for (let i = 0; i < deps.length; i++) input.push(deps[i]());
    } else input = deps();

    if (defer) {
      defer = false;
      return undefined;
    }

    const result = untrack(() => fn(input, prevInput, prevValue));
    prevInput = input;
    return result;
  };
}

function onCleanup(fn) {
  if (Owner === null) ;else if (Owner.cleanups === null) Owner.cleanups = [fn];else Owner.cleanups.push(fn);
  return fn;
}

function getOwner() {
  return Owner;
}

function runWithOwner(o, fn) {
  const prev = Owner;
  Owner = o;

  try {
    return runUpdates(fn, true);
  } finally {
    Owner = prev;
  }
}

function startTransition(fn) {

  const l = Listener;
  const o = Owner;
  return Promise.resolve().then(() => {
    Listener = l;
    Owner = o;
    let t;

    batch(fn);
    return t ? t.done : undefined;
  });
}

function useTransition() {
  return [transPending, startTransition];
}

function createContext(defaultValue) {
  const id = Symbol("context");
  return {
    id,
    Provider: createProvider(id),
    defaultValue
  };
}

function useContext(context) {
  return lookup(Owner, context.id) || context.defaultValue;
}

function children(fn) {
  const children = createMemo(fn);
  return createMemo(() => resolveChildren(children()));
}

let SuspenseContext;

function readSignal() {
  const runningTransition = Transition ;

  if (this.sources && (this.state || runningTransition )) {
    const updates = Updates;
    Updates = null;
    this.state === STALE || runningTransition  ? updateComputation(this) : lookDownstream(this);
    Updates = updates;
  }

  if (Listener) {
    const sSlot = this.observers ? this.observers.length : 0;

    if (!Listener.sources) {
      Listener.sources = [this];
      Listener.sourceSlots = [sSlot];
    } else {
      Listener.sources.push(this);
      Listener.sourceSlots.push(sSlot);
    }

    if (!this.observers) {
      this.observers = [Listener];
      this.observerSlots = [Listener.sources.length - 1];
    } else {
      this.observers.push(Listener);
      this.observerSlots.push(Listener.sources.length - 1);
    }
  }
  return this.value;
}

function writeSignal(node, value, isComp) {
  if (node.comparator) {
    if (node.comparator(node.value, value)) return value;
  }

  if (Pending) {
    if (node.pending === NOTPENDING) Pending.push(node);
    node.pending = value;
    return value;
  }

  let TransitionRunning = false;

  node.value = value;

  if (node.observers && node.observers.length) {
    runUpdates(() => {
      for (let i = 0; i < node.observers.length; i += 1) {
        const o = node.observers[i];
        if (TransitionRunning && Transition.disposed.has(o)) ;
        if (o.pure) Updates.push(o);else Effects.push(o);
        if (o.observers && (TransitionRunning && !o.tState || !TransitionRunning && !o.state)) markUpstream(o);
        if (TransitionRunning) ;else o.state = STALE;
      }

      if (Updates.length > 10e5) {
        Updates = [];
        if (false) ;
        throw new Error();
      }
    }, false);
  }

  return value;
}

function updateComputation(node) {
  if (!node.fn) return;
  cleanNode(node);
  const owner = Owner,
        listener = Listener,
        time = ExecCount;
  Listener = Owner = node;
  runComputation(node, node.value, time);

  Listener = listener;
  Owner = owner;
}

function runComputation(node, value, time) {
  let nextValue;

  try {
    nextValue = node.fn(value);
  } catch (err) {
    handleError(err);
  }

  if (!node.updatedAt || node.updatedAt <= time) {
    if (node.observers && node.observers.length) {
      writeSignal(node, nextValue);
    } else node.value = nextValue;

    node.updatedAt = time;
  }
}

function createComputation(fn, init, pure, state = STALE, options) {
  const c = {
    fn,
    state: state,
    updatedAt: null,
    owned: null,
    sources: null,
    sourceSlots: null,
    cleanups: null,
    value: init,
    owner: Owner,
    context: null,
    pure
  };

  if (Owner === null) ;else if (Owner !== UNOWNED) {
    {
      if (!Owner.owned) Owner.owned = [c];else Owner.owned.push(c);
    }
  }

  return c;
}

function runTop(node) {
  const runningTransition = Transition ;
  if (node.state !== STALE) return node.state = 0;
  if (node.suspense && untrack(node.suspense.inFallback)) return node.suspense.effects.push(node);
  const ancestors = [node];

  while ((node = node.owner) && (!node.updatedAt || node.updatedAt < ExecCount)) {
    if (node.state || runningTransition ) ancestors.push(node);
  }

  for (let i = ancestors.length - 1; i >= 0; i--) {
    node = ancestors[i];

    if (node.state === STALE || runningTransition ) {
      updateComputation(node);
    } else if (node.state === PENDING || runningTransition ) {
      const updates = Updates;
      Updates = null;
      lookDownstream(node, ancestors[0]);
      Updates = updates;
    }
  }
}

function runUpdates(fn, init) {
  if (Updates) return fn();
  let wait = false;
  if (!init) Updates = [];
  if (Effects) wait = true;else Effects = [];
  ExecCount++;

  try {
    return fn();
  } catch (err) {
    handleError(err);
  } finally {
    completeUpdates(wait);
  }
}

function completeUpdates(wait) {
  if (Updates) {
    runQueue(Updates);
    Updates = null;
  }

  if (wait) return;

  if (Effects.length) batch(() => {
    runEffects(Effects);
    Effects = null;
  });else {
    Effects = null;
  }
}

function runQueue(queue) {
  for (let i = 0; i < queue.length; i++) runTop(queue[i]);
}

function lookDownstream(node, ignore) {
  node.state = 0;
  const runningTransition = Transition ;

  for (let i = 0; i < node.sources.length; i += 1) {
    const source = node.sources[i];

    if (source.sources) {
      if (source.state === STALE || runningTransition ) {
        if (source !== ignore) runTop(source);
      } else if (source.state === PENDING || runningTransition ) lookDownstream(source, ignore);
    }
  }
}

function markUpstream(node) {
  const runningTransition = Transition ;

  for (let i = 0; i < node.observers.length; i += 1) {
    const o = node.observers[i];

    if (!o.state || runningTransition ) {
      o.state = PENDING;
      if (o.pure) Updates.push(o);else Effects.push(o);
      o.observers && markUpstream(o);
    }
  }
}

function cleanNode(node) {
  let i;

  if (node.sources) {
    while (node.sources.length) {
      const source = node.sources.pop(),
            index = node.sourceSlots.pop(),
            obs = source.observers;

      if (obs && obs.length) {
        const n = obs.pop(),
              s = source.observerSlots.pop();

        if (index < obs.length) {
          n.sourceSlots[s] = index;
          obs[index] = n;
          source.observerSlots[index] = s;
        }
      }
    }
  }

  if (node.owned) {
    for (i = 0; i < node.owned.length; i++) cleanNode(node.owned[i]);

    node.owned = null;
  }

  if (node.cleanups) {
    for (i = 0; i < node.cleanups.length; i++) node.cleanups[i]();

    node.cleanups = null;
  }

  node.state = 0;
  node.context = null;
}

function handleError(err) {
  throw err;
}

function lookup(owner, key) {
  return owner && (owner.context && owner.context[key] !== undefined ? owner.context[key] : owner.owner && lookup(owner.owner, key));
}

function resolveChildren(children) {
  if (typeof children === "function" && !children.length) return resolveChildren(children());

  if (Array.isArray(children)) {
    const results = [];

    for (let i = 0; i < children.length; i++) {
      const result = resolveChildren(children[i]);
      Array.isArray(result) ? results.push.apply(results, result) : results.push(result);
    }

    return results;
  }

  return children;
}

function createProvider(id) {
  return function provider(props) {
    let res;
    createComputed(() => res = untrack(() => {
      Owner.context = {
        [id]: props.value
      };
      return children(() => props.children);
    }));
    return res;
  };
}

let hydrationEnabled = false;

function enableHydration() {
  hydrationEnabled = true;
}

function createComponent(Comp, props) {
  if (hydrationEnabled) {
    if (sharedConfig.context) {
      const c = sharedConfig.context;
      setHydrateContext(nextHydrateContext());
      const r = untrack(() => Comp(props));
      setHydrateContext(c);
      return r;
    }
  }

  return untrack(() => Comp(props));
}

function lazy(fn) {
  let comp;
  let p;

  const wrap = props => {
    const ctx = sharedConfig.context;

    if (ctx) {
      ctx.count++;
      const [s, set] = createSignal();
      (p || (p = fn())).then(mod => {
        setHydrateContext(ctx);
        set(() => mod.default);
        setHydrateContext();
      });
      comp = s;
    } else if (!comp) {
      const [s] = createResource(() => (p || (p = fn())).then(mod => mod.default), {
        globalRefetch: false
      });
      comp = s;
    } else {
      const c = comp();
      if (c) return c(props);
    }

    let Comp;
    return createMemo(() => (Comp = comp()) && untrack(() => {
      if (!ctx) return Comp(props);
      const c = sharedConfig.context;
      setHydrateContext(ctx);
      const r = Comp(props);
      setHydrateContext(c);
      return r;
    }));
  };

  wrap.preload = () => p || ((p = fn()).then(mod => comp = () => mod.default), p);

  return wrap;
}

function Show(props) {
  let strictEqual = false;
  const condition = createMemo(() => props.when, undefined, {
    equals: (a, b) => strictEqual ? a === b : !a === !b
  });
  return createMemo(() => {
    const c = condition();

    if (c) {
      const child = props.children;
      return (strictEqual = typeof child === "function" && child.length > 0) ? untrack(() => child(c)) : child;
    }

    return props.fallback;
  });
}

function reconcileArrays(parentNode, a, b) {
  let bLength = b.length,
      aEnd = a.length,
      bEnd = bLength,
      aStart = 0,
      bStart = 0,
      after = a[aEnd - 1].nextSibling,
      map = null;

  while (aStart < aEnd || bStart < bEnd) {
    if (a[aStart] === b[bStart]) {
      aStart++;
      bStart++;
      continue;
    }

    while (a[aEnd - 1] === b[bEnd - 1]) {
      aEnd--;
      bEnd--;
    }

    if (aEnd === aStart) {
      const node = bEnd < bLength ? bStart ? b[bStart - 1].nextSibling : b[bEnd - bStart] : after;

      while (bStart < bEnd) parentNode.insertBefore(b[bStart++], node);
    } else if (bEnd === bStart) {
      while (aStart < aEnd) {
        if (!map || !map.has(a[aStart])) a[aStart].remove();
        aStart++;
      }
    } else if (a[aStart] === b[bEnd - 1] && b[bStart] === a[aEnd - 1]) {
      const node = a[--aEnd].nextSibling;
      parentNode.insertBefore(b[bStart++], a[aStart++].nextSibling);
      parentNode.insertBefore(b[--bEnd], node);
      a[aEnd] = b[bEnd];
    } else {
      if (!map) {
        map = new Map();
        let i = bStart;

        while (i < bEnd) map.set(b[i], i++);
      }

      const index = map.get(a[aStart]);

      if (index != null) {
        if (bStart < index && index < bEnd) {
          let i = aStart,
              sequence = 1,
              t;

          while (++i < aEnd && i < bEnd) {
            if ((t = map.get(a[i])) == null || t !== index + sequence) break;
            sequence++;
          }

          if (sequence > index - bStart) {
            const node = a[aStart];

            while (bStart < index) parentNode.insertBefore(b[bStart++], node);
          } else parentNode.replaceChild(b[bStart++], a[aStart++]);
        } else aStart++;
      } else a[aStart++].remove();
    }
  }
}

const $$EVENTS = "_$DX_DELEGATE";

function render(code, element, init) {
  let disposer;
  createRoot(dispose => {
    disposer = dispose;
    element === document ? code() : insert(element, code(), element.firstChild ? null : undefined, init);
  });
  return () => {
    disposer();
    element.textContent = "";
  };
}

function template(html, check, isSVG) {
  const t = document.createElement("template");
  t.innerHTML = html;
  let node = t.content.firstChild;
  if (isSVG) node = node.firstChild;
  return node;
}

function delegateEvents(eventNames, document = window.document) {
  const e = document[$$EVENTS] || (document[$$EVENTS] = new Set());

  for (let i = 0, l = eventNames.length; i < l; i++) {
    const name = eventNames[i];

    if (!e.has(name)) {
      e.add(name);
      document.addEventListener(name, eventHandler);
    }
  }
}

function insert(parent, accessor, marker, initial) {
  if (marker !== undefined && !initial) initial = [];
  if (typeof accessor !== "function") return insertExpression(parent, accessor, initial, marker);
  createRenderEffect(current => insertExpression(parent, accessor(), current, marker), initial);
}

function hydrate$1(code, element, options = {}) {
  sharedConfig.completed = globalThis._$HY.completed;
  sharedConfig.events = globalThis._$HY.events;
  sharedConfig.load = globalThis._$HY.load;

  sharedConfig.gather = root => gatherHydratable(element, root);

  sharedConfig.registry = new Map();
  sharedConfig.context = {
    id: options.renderId || "",
    count: 0
  };
  gatherHydratable(element, options.renderId);
  const dispose = render(code, element, [...element.childNodes]);
  sharedConfig.context = null;
  return dispose;
}

function getNextElement(template) {
  let node, key;

  if (!sharedConfig.context || !(node = sharedConfig.registry.get(key = getHydrationKey()))) {
    return template.cloneNode(true);
  }

  if (sharedConfig.completed) sharedConfig.completed.add(node);
  sharedConfig.registry.delete(key);
  return node;
}

function getNextMatch(el, nodeName) {
  while (el && el.localName !== nodeName) el = el.nextSibling;

  return el;
}

function eventHandler(e) {
  const key = `$$${e.type}`;
  let node = e.composedPath && e.composedPath()[0] || e.target;

  if (e.target !== node) {
    Object.defineProperty(e, "target", {
      configurable: true,
      value: node
    });
  }

  Object.defineProperty(e, "currentTarget", {
    configurable: true,

    get() {
      return node || document;
    }

  });

  while (node !== null) {
    const handler = node[key];

    if (handler && !node.disabled) {
      const data = node[`${key}Data`];
      data !== undefined ? handler(data, e) : handler(e);
      if (e.cancelBubble) return;
    }

    node = node.host && node.host !== node && node.host instanceof Node ? node.host : node.parentNode;
  }
}

function insertExpression(parent, value, current, marker, unwrapArray) {
  if (sharedConfig.context && !current) current = [...parent.childNodes];

  while (typeof current === "function") current = current();

  if (value === current) return current;
  const t = typeof value,
        multi = marker !== undefined;
  parent = multi && current[0] && current[0].parentNode || parent;

  if (t === "string" || t === "number") {
    if (t === "number") value = value.toString();

    if (multi) {
      let node = current[0];

      if (node && node.nodeType === 3) {
        node.data = value;
      } else node = document.createTextNode(value);

      current = cleanChildren(parent, current, marker, node);
    } else {
      if (current !== "" && typeof current === "string") {
        current = parent.firstChild.data = value;
      } else current = parent.textContent = value;
    }
  } else if (value == null || t === "boolean") {
    if (sharedConfig.context) return current;
    current = cleanChildren(parent, current, marker);
  } else if (t === "function") {
    createRenderEffect(() => {
      let v = value();

      while (typeof v === "function") v = v();

      current = insertExpression(parent, v, current, marker);
    });
    return () => current;
  } else if (Array.isArray(value)) {
    const array = [];

    if (normalizeIncomingArray(array, value, unwrapArray)) {
      createRenderEffect(() => current = insertExpression(parent, array, current, marker, true));
      return () => current;
    }

    if (sharedConfig.context && current && current.length) {
      for (let i = 0; i < array.length; i++) {
        if (array[i].parentNode) return current = array;
      }

      return current;
    }

    if (array.length === 0) {
      current = cleanChildren(parent, current, marker);
      if (multi) return current;
    } else {
      if (Array.isArray(current)) {
        if (current.length === 0) {
          appendNodes(parent, array, marker);
        } else reconcileArrays(parent, current, array);
      } else if (current == null || current === "") {
        appendNodes(parent, array);
      } else {
        reconcileArrays(parent, multi && current || [parent.firstChild], array);
      }
    }

    current = array;
  } else if (value instanceof Node) {
    if (sharedConfig.context) return current = value.parentNode ? multi ? [value] : value : current;

    if (Array.isArray(current)) {
      if (multi) return current = cleanChildren(parent, current, marker, value);
      cleanChildren(parent, current, null, value);
    } else if (current == null || current === "" || !parent.firstChild) {
      parent.appendChild(value);
    } else parent.replaceChild(value, parent.firstChild);

    current = value;
  } else ;

  return current;
}

function normalizeIncomingArray(normalized, array, unwrap) {
  let dynamic = false;

  for (let i = 0, len = array.length; i < len; i++) {
    let item = array[i],
        t;

    if (item instanceof Node) {
      normalized.push(item);
    } else if (item == null || item === true || item === false) ;else if (Array.isArray(item)) {
      dynamic = normalizeIncomingArray(normalized, item) || dynamic;
    } else if ((t = typeof item) === "string") {
      normalized.push(document.createTextNode(item));
    } else if (t === "function") {
      if (unwrap) {
        while (typeof item === "function") item = item();

        dynamic = normalizeIncomingArray(normalized, Array.isArray(item) ? item : [item]) || dynamic;
      } else {
        normalized.push(item);
        dynamic = true;
      }
    } else normalized.push(document.createTextNode(item.toString()));
  }

  return dynamic;
}

function appendNodes(parent, array, marker) {
  for (let i = 0, len = array.length; i < len; i++) parent.insertBefore(array[i], marker);
}

function cleanChildren(parent, current, marker, replacement) {
  if (marker === undefined) return parent.textContent = "";
  const node = replacement || document.createTextNode("");

  if (current.length) {
    let inserted = false;

    for (let i = current.length - 1; i >= 0; i--) {
      const el = current[i];

      if (node !== el) {
        const isParent = el.parentNode === parent;
        if (!inserted && !i) isParent ? parent.replaceChild(node, el) : parent.insertBefore(node, marker);else isParent && el.remove();
      } else inserted = true;
    }
  } else parent.insertBefore(node, marker);

  return [node];
}

function gatherHydratable(element, root) {
  const templates = element.querySelectorAll(`*[data-hk]`);

  for (let i = 0; i < templates.length; i++) {
    const node = templates[i];
    const key = node.getAttribute("data-hk");
    if (!root || key.startsWith(root)) sharedConfig.registry.set(key, node);
  }
}

function getHydrationKey() {
  const hydrate = sharedConfig.context;
  return `${hydrate.id}${hydrate.count++}`;
}

const hydrate = (...args) => {
  enableHydration();
  return hydrate$1(...args);
};

function bindEvent(target, type, handler) {
  target.addEventListener(type, handler);
  return () => target.removeEventListener(type, handler);
}

function intercept([value, setValue], get, set) {
  return [get ? () => get(value()) : value, set ? v => setValue(set(v)) : setValue];
}

function createIntegration(get, set, init, utils) {
  let ignore = false;

  const wrap = value => typeof value === "string" ? {
    value
  } : value;

  const signal = intercept(createSignal(wrap(get()), {
    equals: (a, b) => a.value === b.value
  }), undefined, next => {
    !ignore && set(next);
    return next;
  });
  init && onCleanup(init((value = get()) => {
    ignore = true;
    signal[1](wrap(value));
    ignore = false;
  }));
  return {
    signal,
    utils
  };
}
function normalizeIntegration(integration) {
  if (!integration) {
    return {
      signal: createSignal({
        value: ""
      })
    };
  } else if (Array.isArray(integration)) {
    return {
      signal: integration
    };
  }

  return integration;
}
function pathIntegration() {
  return createIntegration(() => ({
    value: window.location.pathname + window.location.search + window.location.hash,
    state: history.state
  }), ({
    value,
    replace,
    scroll,
    state
  }) => {
    if (replace) {
      window.history.replaceState(state, "", value);
    } else {
      window.history.pushState(state, "", value);
    }

    if (scroll) {
      window.scrollTo(0, 0);
    }
  }, notify => bindEvent(window, "popstate", () => notify()), {
    go: delta => window.history.go(delta)
  });
}

const hasSchemeRegex = /^(?:[a-z0-9]+:)?\/\//i;
const trimPathRegex = /^\/+|\/+$|\s+/g;

function normalize(path) {
  const s = path.replace(trimPathRegex, "");
  return s ? s.startsWith("?") ? s : "/" + s : "";
}

function resolvePath(base, path, from) {
  if (hasSchemeRegex.test(path)) {
    return undefined;
  }

  const basePath = normalize(base);
  const fromPath = from && normalize(from);
  let result = "";

  if (!fromPath || path.charAt(0) === "/") {
    result = basePath;
  } else if (fromPath.toLowerCase().indexOf(basePath.toLowerCase()) !== 0) {
    result = basePath + fromPath;
  } else {
    result = fromPath;
  }

  return result + normalize(path) || "/";
}
function invariant(value, message) {
  if (value == null) {
    throw new Error(message);
  }

  return value;
}
function joinPaths(from, to) {
  const t = normalize(to);

  if (t) {
    const f = from.replace(/^\/+|\/*(\*.*)?$/g, "");
    return f ? `/${f}${t}` : t;
  }

  return normalize(from);
}
function extractSearchParams(url) {
  const params = {};
  url.searchParams.forEach((value, key) => {
    params[key] = value;
  });
  return params;
}
function createMatcher(path, partial) {
  const [pattern, splat] = path.split("/*", 2);
  const segments = pattern.split("/").filter(Boolean);
  const len = segments.length;
  return location => {
    const locSegments = location.split("/").filter(Boolean);
    const lenDiff = locSegments.length - len;

    if (lenDiff < 0 || lenDiff > 0 && splat === undefined && !partial) {
      return null;
    }

    const match = {
      path: len ? "" : "/",
      params: {}
    };

    for (let i = 0; i < len; i++) {
      const segment = segments[i];
      const locSegment = locSegments[i];

      if (segment[0] === ":") {
        match.params[segment.slice(1)] = locSegment;
      } else if (segment.localeCompare(locSegment, undefined, {
        sensitivity: "base"
      }) !== 0) {
        return null;
      }

      match.path += `/${locSegment}`;
    }

    if (splat) {
      match.params[splat] = lenDiff ? locSegments.slice(-lenDiff).join("/") : "";
    }

    return match;
  };
}
function scoreRoute(route) {
  const [pattern, splat] = route.pattern.split("/*", 2);
  const segments = pattern.split("/").filter(Boolean);
  return segments.reduce((score, segment) => score + (segment.startsWith(":") ? 2 : 3), segments.length - (splat === undefined ? 0 : 1));
}
function createMemoObject(fn) {
  const map = new Map();
  const owner = getOwner();
  return new Proxy({}, {
    get(_, property) {
      if (!map.has(property)) {
        runWithOwner(owner, () => map.set(property, createMemo(() => fn()[property])));
      }

      return map.get(property)();
    },

    getOwnPropertyDescriptor() {
      return {
        enumerable: true,
        configurable: true
      };
    },

    ownKeys() {
      return Reflect.ownKeys(fn());
    }

  });
}

const MAX_REDIRECTS = 100;
const RouterContextObj = createContext();
const RouteContextObj = createContext();
const useRouter = () => invariant(useContext(RouterContextObj), "Make sure your app is wrapped in a <Router />");
const useRoute = () => useContext(RouteContextObj) || useRouter().base;
function createRoute(routeDef, base = "", fallback) {
  const {
    path: originalPath,
    component,
    data,
    children
  } = routeDef;
  const isLeaf = !children || Array.isArray(children) && !children.length;
  const path = joinPaths(base, originalPath);
  const pattern = isLeaf ? path : path.split("/*", 1)[0];
  return {
    originalPath,
    pattern,
    element: component ? () => createComponent(component, {}) : () => {
      const {
        element
      } = routeDef;
      return element === undefined && fallback ? createComponent(fallback, {}) : element;
    },
    preload: routeDef.component ? component.preload : routeDef.preload,
    data,
    matcher: createMatcher(pattern, !isLeaf)
  };
}
function createBranch(routes, index = 0) {
  return {
    routes,
    score: scoreRoute(routes[routes.length - 1]) * 10000 - index,

    matcher(location) {
      const matches = [];

      for (let i = routes.length - 1; i >= 0; i--) {
        const route = routes[i];
        const match = route.matcher(location);

        if (!match) {
          return null;
        }

        matches.unshift({ ...match,
          route
        });
      }

      return matches;
    }

  };
}
function createBranches(routeDef, base = "", fallback, stack = [], branches = []) {
  const routeDefs = Array.isArray(routeDef) ? routeDef : [routeDef];

  for (let i = 0, len = routeDefs.length; i < len; i++) {
    const def = routeDefs[i];

    if (def && typeof def === 'object' && def.hasOwnProperty('path')) {
      const route = createRoute(def, base, fallback);
      stack.push(route);

      if (def.children) {
        createBranches(def.children, route.pattern, fallback, stack, branches);
      } else {
        const branch = createBranch([...stack], branches.length);
        branches.push(branch);
      }

      stack.pop();
    }
  } // Stack will be empty on final return


  return stack.length ? branches : branches.sort((a, b) => b.score - a.score);
}
function getRouteMatches(branches, location) {
  for (let i = 0, len = branches.length; i < len; i++) {
    const match = branches[i].matcher(location);

    if (match) {
      return match;
    }
  }

  return [];
}
function createLocation(path, state) {
  const origin = new URL("http://sar");
  const url = createMemo(prev => {
    const path_ = path();

    try {
      return new URL(path_, origin);
    } catch (err) {
      console.error(`Invalid path ${path_}`);
      return prev;
    }
  }, origin, {
    equals: (a, b) => a.href === b.href
  });
  const pathname = createMemo(() => url().pathname);
  const search = createMemo(() => url().search.slice(1));
  const hash = createMemo(() => url().hash.slice(1));
  const key = createMemo(() => "");
  return {
    get pathname() {
      return pathname();
    },

    get search() {
      return search();
    },

    get hash() {
      return hash();
    },

    get state() {
      return state();
    },

    get key() {
      return key();
    },

    query: createMemoObject(on(search, () => extractSearchParams(url())))
  };
}
function createRouterContext(integration, base = "", data, out) {
  const {
    signal: [source, setSource],
    utils = {}
  } = normalizeIntegration(integration);
  const basePath = resolvePath("", base);
  const output = undefined;

  if (basePath === undefined) {
    throw new Error(`${basePath} is not a valid base path`);
  } else if (basePath && !source().value) {
    setSource({
      value: basePath,
      replace: true,
      scroll: false
    });
  }

  const [isRouting, start] = useTransition();
  const [reference, setReference] = createSignal(source().value);
  const [state, setState] = createSignal(source().state);
  const location = createLocation(reference, state);
  const referrers = [];
  const baseRoute = {
    pattern: basePath,
    params: {},
    path: () => basePath,
    outlet: () => null,

    resolvePath(to) {
      return resolvePath(basePath, to);
    }

  };

  if (data) {
    baseRoute.data = data({
      params: {},
      location,
      navigate: navigatorFactory(baseRoute)
    });
  }

  function navigateFromRoute(route, to, options) {
    // Untrack in case someone navigates in an effect - don't want to track `reference` or route paths
    untrack(() => {
      if (typeof to === "number") {
        if (!to) ; else if (utils.go) {
          utils.go(to);
        } else {
          console.warn("Router integration does not support relative routing");
        }

        return;
      }

      const {
        replace,
        resolve,
        scroll,
        state: nextState
      } = {
        replace: false,
        resolve: true,
        scroll: true,
        ...options
      };
      const resolvedTo = resolve ? route.resolvePath(to) : resolvePath("", to);

      if (resolvedTo === undefined) {
        throw new Error(`Path '${to}' is not a routable path`);
      } else if (referrers.length >= MAX_REDIRECTS) {
        throw new Error("Too many redirects");
      }

      const current = reference();

      if (resolvedTo !== current || nextState !== state()) {
        {
          const len = referrers.push({
            value: current,
            replace,
            scroll,
            state
          });
          start(() => {
            setReference(resolvedTo);
            setState(nextState);
          }).then(() => {
            if (referrers.length === len) {
              navigateEnd({
                value: resolvedTo,
                state: nextState
              });
            }
          });
        }
      }
    });
  }

  function navigatorFactory(route) {
    // Workaround for vite issue (https://github.com/vitejs/vite/issues/3803)
    route = route || useContext(RouteContextObj) || baseRoute;
    return (to, options) => navigateFromRoute(route, to, options);
  }

  function navigateEnd(next) {
    const first = referrers[0];

    if (first) {
      if (next.value !== first.value || next.state !== first.state) {
        setSource({ ...next,
          replace: first.replace,
          scroll: first.scroll
        });
      }

      referrers.length = 0;
    }
  }

  createRenderEffect(() => {
    const {
      value,
      state
    } = source();

    if (value !== untrack(reference)) {
      start(() => {
        setReference(value);
        setState(state);
      });
    }
  });
  return {
    base: baseRoute,
    out: output,
    location,
    isRouting,
    renderPath: utils.renderPath || (path => path),
    navigatorFactory
  };
}
function createRouteContext(router, parent, child, match) {
  const {
    base,
    location,
    navigatorFactory
  } = router;
  const {
    pattern,
    element: outlet,
    preload,
    data
  } = match().route;
  const path = createMemo(() => match().path);
  const params = createMemoObject(() => match().params);
  preload && preload();
  const route = {
    parent,
    pattern,

    get child() {
      return child();
    },

    path,
    params,
    outlet,

    resolvePath(to) {
      return resolvePath(base.path(), to, path());
    }

  };

  if (data) {
    route.data = data({
      params,
      location,
      navigate: navigatorFactory(route)
    });
  }

  return route;
}

template(`<a></a>`);
const Router = props => {
  const {
    source,
    url,
    base,
    data,
    out
  } = props;
  const integration = source || (pathIntegration());
  const routerState = createRouterContext(integration, base, data);
  return createComponent(RouterContextObj.Provider, {
    value: routerState,

    get children() {
      return props.children;
    }

  });
};
const Routes = props => {
  const router = useRouter();
  const parentRoute = useRoute();
  const branches = createMemo(() => createBranches(props.children, joinPaths(parentRoute.pattern, props.base || ""), Outlet));
  const matches = createMemo(() => getRouteMatches(branches(), router.location.pathname));

  if (router.out) {
    router.out.matches.push(matches().map(({
      route,
      path,
      params
    }) => ({
      originalPath: route.originalPath,
      pattern: route.pattern,
      path,
      params
    })));
  }

  const disposers = [];
  let root;
  const routeStates = createMemo(on(matches, (nextMatches, prevMatches, prev) => {
    let equal = prevMatches && nextMatches.length === prevMatches.length;
    const next = [];

    for (let i = 0, len = nextMatches.length; i < len; i++) {
      const prevMatch = prevMatches && prevMatches[i];
      const nextMatch = nextMatches[i];

      if (prev && prevMatch && nextMatch.route.pattern === prevMatch.route.pattern) {
        next[i] = prev[i];
      } else {
        equal = false;

        if (disposers[i]) {
          disposers[i]();
        }

        createRoot(dispose => {
          disposers[i] = dispose;
          next[i] = createRouteContext(router, next[i - 1] || parentRoute, () => routeStates()[i + 1], () => matches()[i]);
        });
      }
    }

    disposers.splice(nextMatches.length).forEach(dispose => dispose());

    if (prev && equal) {
      return prev;
    }

    root = next[0];
    return next;
  }));
  return createComponent(Show, {
    get when() {
      return routeStates() && root;
    },

    children: route => createComponent(RouteContextObj.Provider, {
      value: route,

      get children() {
        return route.outlet();
      }

    })
  });
};
const useRoutes = (routes, base) => {
  return () => createComponent(Routes, {
    base: base,
    children: routes
  });
};
const Outlet = () => {
  const route = useRoute();
  return createComponent(Show, {
    get when() {
      return route.child;
    },

    children: child => createComponent(RouteContextObj.Provider, {
      value: child,

      get children() {
        return child.outlet();
      }

    })
  });
};

delegateEvents(["click"]);

const routes = [{
  path: "about",
  component: lazy(() => import('./about-d4e84d32.js'))
}, {
  path: "/",
  component: lazy(() => import('./index-566af971.js'))
}];

const Document = () => {
  const Routes = useRoutes(routes);
  return (() => {
    const _el$ = getNextElement(),
          _el$3 = getNextMatch(_el$.firstChild, "body"),
          _el$4 = _el$3.firstChild;

    insert(_el$4, createComponent(Router, {
      get children() {
        return createComponent(Routes, {});
      }

    }));

    return _el$;
  })();
};

hydrate(() => createComponent(Document, {}), document);

export { getNextElement as g, template as t };
