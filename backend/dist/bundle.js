var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// node_modules/.pnpm/hono@4.12.27/node_modules/hono/dist/compose.js
var compose = (middleware, onError, onNotFound) => {
  return (context, next) => {
    let index2 = -1;
    return dispatch(0);
    async function dispatch(i) {
      if (i <= index2) {
        throw new Error("next() called multiple times");
      }
      index2 = i;
      let res;
      let isError = false;
      let handler;
      if (middleware[i]) {
        handler = middleware[i][0][0];
        context.req.routeIndex = i;
      } else {
        handler = i === middleware.length && next || void 0;
      }
      if (handler) {
        try {
          res = await handler(context, () => dispatch(i + 1));
        } catch (err) {
          if (err instanceof Error && onError) {
            context.error = err;
            res = await onError(err, context);
            isError = true;
          } else {
            throw err;
          }
        }
      } else {
        if (context.finalized === false && onNotFound) {
          res = await onNotFound(context);
        }
      }
      if (res && (context.finalized === false || isError)) {
        context.res = res;
      }
      return context;
    }
  };
};

// node_modules/.pnpm/hono@4.12.27/node_modules/hono/dist/request/constants.js
var GET_MATCH_RESULT = /* @__PURE__ */ Symbol();

// node_modules/.pnpm/hono@4.12.27/node_modules/hono/dist/utils/body.js
var parseBody = async (request, options = /* @__PURE__ */ Object.create(null)) => {
  const { all = false, dot = false } = options;
  const headers = request instanceof HonoRequest ? request.raw.headers : request.headers;
  const contentType = headers.get("Content-Type");
  if (contentType?.startsWith("multipart/form-data") || contentType?.startsWith("application/x-www-form-urlencoded")) {
    return parseFormData(request, { all, dot });
  }
  return {};
};
async function parseFormData(request, options) {
  const formData = await request.formData();
  if (formData) {
    return convertFormDataToBodyData(formData, options);
  }
  return {};
}
function convertFormDataToBodyData(formData, options) {
  const form = /* @__PURE__ */ Object.create(null);
  formData.forEach((value, key) => {
    const shouldParseAllValues = options.all || key.endsWith("[]");
    if (!shouldParseAllValues) {
      form[key] = value;
    } else {
      handleParsingAllValues(form, key, value);
    }
  });
  if (options.dot) {
    Object.entries(form).forEach(([key, value]) => {
      const shouldParseDotValues = key.includes(".");
      if (shouldParseDotValues) {
        handleParsingNestedValues(form, key, value);
        delete form[key];
      }
    });
  }
  return form;
}
var handleParsingAllValues = (form, key, value) => {
  if (form[key] !== void 0) {
    if (Array.isArray(form[key])) {
      ;
      form[key].push(value);
    } else {
      form[key] = [form[key], value];
    }
  } else {
    if (!key.endsWith("[]")) {
      form[key] = value;
    } else {
      form[key] = [value];
    }
  }
};
var handleParsingNestedValues = (form, key, value) => {
  if (/(?:^|\.)__proto__\./.test(key)) {
    return;
  }
  let nestedForm = form;
  const keys = key.split(".");
  keys.forEach((key2, index2) => {
    if (index2 === keys.length - 1) {
      nestedForm[key2] = value;
    } else {
      if (!nestedForm[key2] || typeof nestedForm[key2] !== "object" || Array.isArray(nestedForm[key2]) || nestedForm[key2] instanceof File) {
        nestedForm[key2] = /* @__PURE__ */ Object.create(null);
      }
      nestedForm = nestedForm[key2];
    }
  });
};

// node_modules/.pnpm/hono@4.12.27/node_modules/hono/dist/utils/url.js
var splitPath = (path) => {
  const paths = path.split("/");
  if (paths[0] === "") {
    paths.shift();
  }
  return paths;
};
var splitRoutingPath = (routePath) => {
  const { groups, path } = extractGroupsFromPath(routePath);
  const paths = splitPath(path);
  return replaceGroupMarks(paths, groups);
};
var extractGroupsFromPath = (path) => {
  const groups = [];
  path = path.replace(/\{[^}]+\}/g, (match2, index2) => {
    const mark = `@${index2}`;
    groups.push([mark, match2]);
    return mark;
  });
  return { groups, path };
};
var replaceGroupMarks = (paths, groups) => {
  for (let i = groups.length - 1; i >= 0; i--) {
    const [mark] = groups[i];
    for (let j = paths.length - 1; j >= 0; j--) {
      if (paths[j].includes(mark)) {
        paths[j] = paths[j].replace(mark, groups[i][1]);
        break;
      }
    }
  }
  return paths;
};
var patternCache = {};
var getPattern = (label, next) => {
  if (label === "*") {
    return "*";
  }
  const match2 = label.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
  if (match2) {
    const cacheKey = `${label}#${next}`;
    if (!patternCache[cacheKey]) {
      if (match2[2]) {
        patternCache[cacheKey] = next && next[0] !== ":" && next[0] !== "*" ? [cacheKey, match2[1], new RegExp(`^${match2[2]}(?=/${next})`)] : [label, match2[1], new RegExp(`^${match2[2]}$`)];
      } else {
        patternCache[cacheKey] = [label, match2[1], true];
      }
    }
    return patternCache[cacheKey];
  }
  return null;
};
var tryDecode = (str, decoder) => {
  try {
    return decoder(str);
  } catch {
    return str.replace(/(?:%[0-9A-Fa-f]{2})+/g, (match2) => {
      try {
        return decoder(match2);
      } catch {
        return match2;
      }
    });
  }
};
var tryDecodeURI = (str) => tryDecode(str, decodeURI);
var getPath = (request) => {
  const url = request.url;
  const start = url.indexOf("/", url.indexOf(":") + 4);
  let i = start;
  for (; i < url.length; i++) {
    const charCode = url.charCodeAt(i);
    if (charCode === 37) {
      const queryIndex = url.indexOf("?", i);
      const hashIndex = url.indexOf("#", i);
      const end = queryIndex === -1 ? hashIndex === -1 ? void 0 : hashIndex : hashIndex === -1 ? queryIndex : Math.min(queryIndex, hashIndex);
      const path = url.slice(start, end);
      return tryDecodeURI(path.includes("%25") ? path.replace(/%25/g, "%2525") : path);
    } else if (charCode === 63 || charCode === 35) {
      break;
    }
  }
  return url.slice(start, i);
};
var getPathNoStrict = (request) => {
  const result = getPath(request);
  return result.length > 1 && result.at(-1) === "/" ? result.slice(0, -1) : result;
};
var mergePath = (base, sub, ...rest) => {
  if (rest.length) {
    sub = mergePath(sub, ...rest);
  }
  return `${base?.[0] === "/" ? "" : "/"}${base}${sub === "/" ? "" : `${base?.at(-1) === "/" ? "" : "/"}${sub?.[0] === "/" ? sub.slice(1) : sub}`}`;
};
var checkOptionalParameter = (path) => {
  if (path.charCodeAt(path.length - 1) !== 63 || !path.includes(":")) {
    return null;
  }
  const segments = path.split("/");
  const results = [];
  let basePath = "";
  segments.forEach((segment) => {
    if (segment !== "" && !/\:/.test(segment)) {
      basePath += "/" + segment;
    } else if (/\:/.test(segment)) {
      if (/\?/.test(segment)) {
        if (results.length === 0 && basePath === "") {
          results.push("/");
        } else {
          results.push(basePath);
        }
        const optionalSegment = segment.replace("?", "");
        basePath += "/" + optionalSegment;
        results.push(basePath);
      } else {
        basePath += "/" + segment;
      }
    }
  });
  return results.filter((v, i, a) => a.indexOf(v) === i);
};
var _decodeURI = (value) => {
  if (!/[%+]/.test(value)) {
    return value;
  }
  if (value.indexOf("+") !== -1) {
    value = value.replace(/\+/g, " ");
  }
  return value.indexOf("%") !== -1 ? tryDecode(value, decodeURIComponent_) : value;
};
var _getQueryParam = (url, key, multiple) => {
  let encoded;
  if (!multiple && key && !/[%+]/.test(key)) {
    let keyIndex2 = url.indexOf("?", 8);
    if (keyIndex2 === -1) {
      return void 0;
    }
    if (!url.startsWith(key, keyIndex2 + 1)) {
      keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
    }
    while (keyIndex2 !== -1) {
      const trailingKeyCode = url.charCodeAt(keyIndex2 + key.length + 1);
      if (trailingKeyCode === 61) {
        const valueIndex = keyIndex2 + key.length + 2;
        const endIndex = url.indexOf("&", valueIndex);
        return _decodeURI(url.slice(valueIndex, endIndex === -1 ? void 0 : endIndex));
      } else if (trailingKeyCode == 38 || isNaN(trailingKeyCode)) {
        return "";
      }
      keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
    }
    encoded = /[%+]/.test(url);
    if (!encoded) {
      return void 0;
    }
  }
  const results = {};
  encoded ??= /[%+]/.test(url);
  let keyIndex = url.indexOf("?", 8);
  while (keyIndex !== -1) {
    const nextKeyIndex = url.indexOf("&", keyIndex + 1);
    let valueIndex = url.indexOf("=", keyIndex);
    if (valueIndex > nextKeyIndex && nextKeyIndex !== -1) {
      valueIndex = -1;
    }
    let name = url.slice(
      keyIndex + 1,
      valueIndex === -1 ? nextKeyIndex === -1 ? void 0 : nextKeyIndex : valueIndex
    );
    if (encoded) {
      name = _decodeURI(name);
    }
    keyIndex = nextKeyIndex;
    if (name === "") {
      continue;
    }
    let value;
    if (valueIndex === -1) {
      value = "";
    } else {
      value = url.slice(valueIndex + 1, nextKeyIndex === -1 ? void 0 : nextKeyIndex);
      if (encoded) {
        value = _decodeURI(value);
      }
    }
    if (multiple) {
      if (!(results[name] && Array.isArray(results[name]))) {
        results[name] = [];
      }
      ;
      results[name].push(value);
    } else {
      results[name] ??= value;
    }
  }
  return key ? results[key] : results;
};
var getQueryParam = _getQueryParam;
var getQueryParams = (url, key) => {
  return _getQueryParam(url, key, true);
};
var decodeURIComponent_ = decodeURIComponent;

// node_modules/.pnpm/hono@4.12.27/node_modules/hono/dist/request.js
var tryDecodeURIComponent = (str) => tryDecode(str, decodeURIComponent_);
var HonoRequest = class {
  /**
   * `.raw` can get the raw Request object.
   *
   * @see {@link https://hono.dev/docs/api/request#raw}
   *
   * @example
   * ```ts
   * // For Cloudflare Workers
   * app.post('/', async (c) => {
   *   const metadata = c.req.raw.cf?.hostMetadata?
   *   ...
   * })
   * ```
   */
  raw;
  #validatedData;
  // Short name of validatedData
  #matchResult;
  routeIndex = 0;
  /**
   * `.path` can get the pathname of the request.
   *
   * @see {@link https://hono.dev/docs/api/request#path}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const pathname = c.req.path // `/about/me`
   * })
   * ```
   */
  path;
  bodyCache = {};
  constructor(request, path = "/", matchResult = [[]]) {
    this.raw = request;
    this.path = path;
    this.#matchResult = matchResult;
    this.#validatedData = {};
  }
  param(key) {
    return key ? this.#getDecodedParam(key) : this.#getAllDecodedParams();
  }
  #getDecodedParam(key) {
    const paramKey = this.#matchResult[0][this.routeIndex][1][key];
    const param = this.#getParamValue(paramKey);
    return param && /\%/.test(param) ? tryDecodeURIComponent(param) : param;
  }
  #getAllDecodedParams() {
    const decoded = {};
    const keys = Object.keys(this.#matchResult[0][this.routeIndex][1]);
    for (const key of keys) {
      const value = this.#getParamValue(this.#matchResult[0][this.routeIndex][1][key]);
      if (value !== void 0) {
        decoded[key] = /\%/.test(value) ? tryDecodeURIComponent(value) : value;
      }
    }
    return decoded;
  }
  #getParamValue(paramKey) {
    return this.#matchResult[1] ? this.#matchResult[1][paramKey] : paramKey;
  }
  query(key) {
    return getQueryParam(this.url, key);
  }
  queries(key) {
    return getQueryParams(this.url, key);
  }
  header(name) {
    if (name) {
      return this.raw.headers.get(name) ?? void 0;
    }
    const headerData = {};
    this.raw.headers.forEach((value, key) => {
      headerData[key] = value;
    });
    return headerData;
  }
  async parseBody(options) {
    return parseBody(this, options);
  }
  #cachedBody = (key) => {
    const { bodyCache, raw: raw2 } = this;
    const cachedBody = bodyCache[key];
    if (cachedBody) {
      return cachedBody;
    }
    const anyCachedKey = Object.keys(bodyCache)[0];
    if (anyCachedKey) {
      return bodyCache[anyCachedKey].then((body) => {
        if (anyCachedKey === "json") {
          body = JSON.stringify(body);
        }
        return new Response(body)[key]();
      });
    }
    return bodyCache[key] = raw2[key]();
  };
  /**
   * `.json()` can parse Request body of type `application/json`
   *
   * @see {@link https://hono.dev/docs/api/request#json}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.json()
   * })
   * ```
   */
  json() {
    return this.#cachedBody("text").then((text2) => JSON.parse(text2));
  }
  /**
   * `.text()` can parse Request body of type `text/plain`
   *
   * @see {@link https://hono.dev/docs/api/request#text}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.text()
   * })
   * ```
   */
  text() {
    return this.#cachedBody("text");
  }
  /**
   * `.arrayBuffer()` parse Request body as an `ArrayBuffer`
   *
   * @see {@link https://hono.dev/docs/api/request#arraybuffer}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.arrayBuffer()
   * })
   * ```
   */
  arrayBuffer() {
    return this.#cachedBody("arrayBuffer");
  }
  /**
   * `.bytes()` parses the request body as a `Uint8Array`.
   *
   * @see {@link https://hono.dev/docs/api/request#bytes}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.bytes()
   * })
   * ```
   */
  bytes() {
    return this.#cachedBody("arrayBuffer").then((buffer) => new Uint8Array(buffer));
  }
  /**
   * Parses the request body as a `Blob`.
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.blob();
   * });
   * ```
   * @see https://hono.dev/docs/api/request#blob
   */
  blob() {
    return this.#cachedBody("blob");
  }
  /**
   * Parses the request body as `FormData`.
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.formData();
   * });
   * ```
   * @see https://hono.dev/docs/api/request#formdata
   */
  formData() {
    return this.#cachedBody("formData");
  }
  /**
   * Adds validated data to the request.
   *
   * @param target - The target of the validation.
   * @param data - The validated data to add.
   */
  addValidatedData(target, data) {
    this.#validatedData[target] = data;
  }
  valid(target) {
    return this.#validatedData[target];
  }
  /**
   * `.url()` can get the request url strings.
   *
   * @see {@link https://hono.dev/docs/api/request#url}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const url = c.req.url // `http://localhost:8787/about/me`
   *   ...
   * })
   * ```
   */
  get url() {
    return this.raw.url;
  }
  /**
   * `.method()` can get the method name of the request.
   *
   * @see {@link https://hono.dev/docs/api/request#method}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const method = c.req.method // `GET`
   * })
   * ```
   */
  get method() {
    return this.raw.method;
  }
  get [GET_MATCH_RESULT]() {
    return this.#matchResult;
  }
  /**
   * `.matchedRoutes()` can return a matched route in the handler
   *
   * @deprecated
   *
   * Use matchedRoutes helper defined in "hono/route" instead.
   *
   * @see {@link https://hono.dev/docs/api/request#matchedroutes}
   *
   * @example
   * ```ts
   * app.use('*', async function logger(c, next) {
   *   await next()
   *   c.req.matchedRoutes.forEach(({ handler, method, path }, i) => {
   *     const name = handler.name || (handler.length < 2 ? '[handler]' : '[middleware]')
   *     console.log(
   *       method,
   *       ' ',
   *       path,
   *       ' '.repeat(Math.max(10 - path.length, 0)),
   *       name,
   *       i === c.req.routeIndex ? '<- respond from here' : ''
   *     )
   *   })
   * })
   * ```
   */
  get matchedRoutes() {
    return this.#matchResult[0].map(([[, route]]) => route);
  }
  /**
   * `routePath()` can retrieve the path registered within the handler
   *
   * @deprecated
   *
   * Use routePath helper defined in "hono/route" instead.
   *
   * @see {@link https://hono.dev/docs/api/request#routepath}
   *
   * @example
   * ```ts
   * app.get('/posts/:id', (c) => {
   *   return c.json({ path: c.req.routePath })
   * })
   * ```
   */
  get routePath() {
    return this.#matchResult[0].map(([[, route]]) => route)[this.routeIndex].path;
  }
};

// node_modules/.pnpm/hono@4.12.27/node_modules/hono/dist/utils/html.js
var HtmlEscapedCallbackPhase = {
  Stringify: 1,
  BeforeStream: 2,
  Stream: 3
};
var raw = (value, callbacks) => {
  const escapedString = new String(value);
  escapedString.isEscaped = true;
  escapedString.callbacks = callbacks;
  return escapedString;
};
var resolveCallback = async (str, phase, preserveCallbacks, context, buffer) => {
  if (typeof str === "object" && !(str instanceof String)) {
    if (!(str instanceof Promise)) {
      str = str.toString();
    }
    if (str instanceof Promise) {
      str = await str;
    }
  }
  const callbacks = str.callbacks;
  if (!callbacks?.length) {
    return Promise.resolve(str);
  }
  if (buffer) {
    buffer[0] += str;
  } else {
    buffer = [str];
  }
  const resStr = Promise.all(callbacks.map((c) => c({ phase, buffer, context }))).then(
    (res) => Promise.all(
      res.filter(Boolean).map((str2) => resolveCallback(str2, phase, false, context, buffer))
    ).then(() => buffer[0])
  );
  if (preserveCallbacks) {
    return raw(await resStr, callbacks);
  } else {
    return resStr;
  }
};

// node_modules/.pnpm/hono@4.12.27/node_modules/hono/dist/context.js
var TEXT_PLAIN = "text/plain; charset=UTF-8";
var setDefaultContentType = (contentType, headers) => {
  return {
    "Content-Type": contentType,
    ...headers
  };
};
var createResponseInstance = (body, init) => new Response(body, init);
var Context = class {
  #rawRequest;
  #req;
  /**
   * `.env` can get bindings (environment variables, secrets, KV namespaces, D1 database, R2 bucket etc.) in Cloudflare Workers.
   *
   * @see {@link https://hono.dev/docs/api/context#env}
   *
   * @example
   * ```ts
   * // Environment object for Cloudflare Workers
   * app.get('*', async c => {
   *   const counter = c.env.COUNTER
   * })
   * ```
   */
  env = {};
  #var;
  finalized = false;
  /**
   * `.error` can get the error object from the middleware if the Handler throws an error.
   *
   * @see {@link https://hono.dev/docs/api/context#error}
   *
   * @example
   * ```ts
   * app.use('*', async (c, next) => {
   *   await next()
   *   if (c.error) {
   *     // do something...
   *   }
   * })
   * ```
   */
  error;
  #status;
  #executionCtx;
  #res;
  #layout;
  #renderer;
  #notFoundHandler;
  #preparedHeaders;
  #matchResult;
  #path;
  /**
   * Creates an instance of the Context class.
   *
   * @param req - The Request object.
   * @param options - Optional configuration options for the context.
   */
  constructor(req, options) {
    this.#rawRequest = req;
    if (options) {
      this.#executionCtx = options.executionCtx;
      this.env = options.env;
      this.#notFoundHandler = options.notFoundHandler;
      this.#path = options.path;
      this.#matchResult = options.matchResult;
    }
  }
  /**
   * `.req` is the instance of {@link HonoRequest}.
   */
  get req() {
    this.#req ??= new HonoRequest(this.#rawRequest, this.#path, this.#matchResult);
    return this.#req;
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#event}
   * The FetchEvent associated with the current request.
   *
   * @throws Will throw an error if the context does not have a FetchEvent.
   */
  get event() {
    if (this.#executionCtx && "respondWith" in this.#executionCtx) {
      return this.#executionCtx;
    } else {
      throw Error("This context has no FetchEvent");
    }
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#executionctx}
   * The ExecutionContext associated with the current request.
   *
   * @throws Will throw an error if the context does not have an ExecutionContext.
   */
  get executionCtx() {
    if (this.#executionCtx) {
      return this.#executionCtx;
    } else {
      throw Error("This context has no ExecutionContext");
    }
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#res}
   * The Response object for the current request.
   */
  get res() {
    return this.#res ||= createResponseInstance(null, {
      headers: this.#preparedHeaders ??= new Headers()
    });
  }
  /**
   * Sets the Response object for the current request.
   *
   * @param _res - The Response object to set.
   */
  set res(_res) {
    if (this.#res && _res) {
      _res = createResponseInstance(_res.body, _res);
      for (const [k, v] of this.#res.headers.entries()) {
        if (k === "content-type") {
          continue;
        }
        if (k === "set-cookie") {
          const cookies = this.#res.headers.getSetCookie();
          _res.headers.delete("set-cookie");
          for (const cookie of cookies) {
            _res.headers.append("set-cookie", cookie);
          }
        } else {
          _res.headers.set(k, v);
        }
      }
    }
    this.#res = _res;
    this.finalized = true;
  }
  /**
   * `.render()` can create a response within a layout.
   *
   * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
   *
   * @example
   * ```ts
   * app.get('/', (c) => {
   *   return c.render('Hello!')
   * })
   * ```
   */
  render = (...args) => {
    this.#renderer ??= (content) => this.html(content);
    return this.#renderer(...args);
  };
  /**
   * Sets the layout for the response.
   *
   * @param layout - The layout to set.
   * @returns The layout function.
   */
  setLayout = (layout) => this.#layout = layout;
  /**
   * Gets the current layout for the response.
   *
   * @returns The current layout function.
   */
  getLayout = () => this.#layout;
  /**
   * `.setRenderer()` can set the layout in the custom middleware.
   *
   * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
   *
   * @example
   * ```tsx
   * app.use('*', async (c, next) => {
   *   c.setRenderer((content) => {
   *     return c.html(
   *       <html>
   *         <body>
   *           <p>{content}</p>
   *         </body>
   *       </html>
   *     )
   *   })
   *   await next()
   * })
   * ```
   */
  setRenderer = (renderer) => {
    this.#renderer = renderer;
  };
  /**
   * `.header()` can set headers.
   *
   * @see {@link https://hono.dev/docs/api/context#header}
   *
   * @example
   * ```ts
   * app.get('/welcome', (c) => {
   *   // Set headers
   *   c.header('X-Message', 'Hello!')
   *   c.header('Content-Type', 'text/plain')
   *
   *   return c.body('Thank you for coming')
   * })
   * ```
   */
  header = (name, value, options) => {
    if (this.finalized) {
      this.#res = createResponseInstance(this.#res.body, this.#res);
    }
    const headers = this.#res ? this.#res.headers : this.#preparedHeaders ??= new Headers();
    if (value === void 0) {
      headers.delete(name);
    } else if (options?.append) {
      headers.append(name, value);
    } else {
      headers.set(name, value);
    }
  };
  status = (status) => {
    this.#status = status;
  };
  /**
   * `.set()` can set the value specified by the key.
   *
   * @see {@link https://hono.dev/docs/api/context#set-get}
   *
   * @example
   * ```ts
   * app.use('*', async (c, next) => {
   *   c.set('message', 'Hono is hot!!')
   *   await next()
   * })
   * ```
   */
  set = (key, value) => {
    this.#var ??= /* @__PURE__ */ new Map();
    this.#var.set(key, value);
  };
  /**
   * `.get()` can use the value specified by the key.
   *
   * @see {@link https://hono.dev/docs/api/context#set-get}
   *
   * @example
   * ```ts
   * app.get('/', (c) => {
   *   const message = c.get('message')
   *   return c.text(`The message is "${message}"`)
   * })
   * ```
   */
  get = (key) => {
    return this.#var ? this.#var.get(key) : void 0;
  };
  /**
   * `.var` can access the value of a variable.
   *
   * @see {@link https://hono.dev/docs/api/context#var}
   *
   * @example
   * ```ts
   * const result = c.var.client.oneMethod()
   * ```
   */
  // c.var.propName is a read-only
  get var() {
    if (!this.#var) {
      return {};
    }
    return Object.fromEntries(this.#var);
  }
  #newResponse(data, arg, headers) {
    const responseHeaders = this.#res ? new Headers(this.#res.headers) : this.#preparedHeaders ?? new Headers();
    if (typeof arg === "object" && "headers" in arg) {
      const argHeaders = arg.headers instanceof Headers ? arg.headers : new Headers(arg.headers);
      for (const [key, value] of argHeaders) {
        if (key.toLowerCase() === "set-cookie") {
          responseHeaders.append(key, value);
        } else {
          responseHeaders.set(key, value);
        }
      }
    }
    if (headers) {
      for (const [k, v] of Object.entries(headers)) {
        if (typeof v === "string") {
          responseHeaders.set(k, v);
        } else {
          responseHeaders.delete(k);
          for (const v2 of v) {
            responseHeaders.append(k, v2);
          }
        }
      }
    }
    const status = typeof arg === "number" ? arg : arg?.status ?? this.#status;
    return createResponseInstance(data, { status, headers: responseHeaders });
  }
  newResponse = (...args) => this.#newResponse(...args);
  /**
   * `.body()` can return the HTTP response.
   * You can set headers with `.header()` and set HTTP status code with `.status`.
   * This can also be set in `.text()`, `.json()` and so on.
   *
   * @see {@link https://hono.dev/docs/api/context#body}
   *
   * @example
   * ```ts
   * app.get('/welcome', (c) => {
   *   // Set headers
   *   c.header('X-Message', 'Hello!')
   *   c.header('Content-Type', 'text/plain')
   *   // Set HTTP status code
   *   c.status(201)
   *
   *   // Return the response body
   *   return c.body('Thank you for coming')
   * })
   * ```
   */
  body = (data, arg, headers) => this.#newResponse(data, arg, headers);
  /**
   * `.text()` can render text as `Content-Type:text/plain`.
   *
   * @see {@link https://hono.dev/docs/api/context#text}
   *
   * @example
   * ```ts
   * app.get('/say', (c) => {
   *   return c.text('Hello!')
   * })
   * ```
   */
  text = (text2, arg, headers) => {
    return !this.#preparedHeaders && !this.#status && !arg && !headers && !this.finalized ? new Response(text2) : this.#newResponse(
      text2,
      arg,
      setDefaultContentType(TEXT_PLAIN, headers)
    );
  };
  /**
   * `.json()` can render JSON as `Content-Type:application/json`.
   *
   * @see {@link https://hono.dev/docs/api/context#json}
   *
   * @example
   * ```ts
   * app.get('/api', (c) => {
   *   return c.json({ message: 'Hello!' })
   * })
   * ```
   */
  json = (object, arg, headers) => {
    return this.#newResponse(
      JSON.stringify(object),
      arg,
      setDefaultContentType("application/json", headers)
    );
  };
  html = (html, arg, headers) => {
    const res = (html2) => this.#newResponse(html2, arg, setDefaultContentType("text/html; charset=UTF-8", headers));
    return typeof html === "object" ? resolveCallback(html, HtmlEscapedCallbackPhase.Stringify, false, {}).then(res) : res(html);
  };
  /**
   * `.redirect()` can Redirect, default status code is 302.
   *
   * @see {@link https://hono.dev/docs/api/context#redirect}
   *
   * @example
   * ```ts
   * app.get('/redirect', (c) => {
   *   return c.redirect('/')
   * })
   * app.get('/redirect-permanently', (c) => {
   *   return c.redirect('/', 301)
   * })
   * ```
   */
  redirect = (location, status) => {
    const locationString = String(location);
    this.header(
      "Location",
      // Multibyes should be encoded
      // eslint-disable-next-line no-control-regex
      !/[^\x00-\xFF]/.test(locationString) ? locationString : encodeURI(locationString)
    );
    return this.newResponse(null, status ?? 302);
  };
  /**
   * `.notFound()` can return the Not Found Response.
   *
   * @see {@link https://hono.dev/docs/api/context#notfound}
   *
   * @example
   * ```ts
   * app.get('/notfound', (c) => {
   *   return c.notFound()
   * })
   * ```
   */
  notFound = () => {
    this.#notFoundHandler ??= () => createResponseInstance();
    return this.#notFoundHandler(this);
  };
};

// node_modules/.pnpm/hono@4.12.27/node_modules/hono/dist/router.js
var METHOD_NAME_ALL = "ALL";
var METHOD_NAME_ALL_LOWERCASE = "all";
var METHODS = ["get", "post", "put", "delete", "options", "patch"];
var MESSAGE_MATCHER_IS_ALREADY_BUILT = "Can not add a route since the matcher is already built.";
var UnsupportedPathError = class extends Error {
};

// node_modules/.pnpm/hono@4.12.27/node_modules/hono/dist/utils/constants.js
var COMPOSED_HANDLER = "__COMPOSED_HANDLER";

// node_modules/.pnpm/hono@4.12.27/node_modules/hono/dist/hono-base.js
var notFoundHandler = (c) => {
  return c.text("404 Not Found", 404);
};
var errorHandler = (err, c) => {
  if ("getResponse" in err) {
    const res = err.getResponse();
    return c.newResponse(res.body, res);
  }
  console.error(err);
  return c.text("Internal Server Error", 500);
};
var Hono = class _Hono {
  get;
  post;
  put;
  delete;
  options;
  patch;
  all;
  on;
  use;
  /*
    This class is like an abstract class and does not have a router.
    To use it, inherit the class and implement router in the constructor.
  */
  router;
  getPath;
  // Cannot use `#` because it requires visibility at JavaScript runtime.
  _basePath = "/";
  #path = "/";
  routes = [];
  constructor(options = {}) {
    const allMethods = [...METHODS, METHOD_NAME_ALL_LOWERCASE];
    allMethods.forEach((method) => {
      this[method] = (args1, ...args) => {
        if (typeof args1 === "string") {
          this.#path = args1;
        } else {
          this.#addRoute(method, this.#path, args1);
        }
        args.forEach((handler) => {
          this.#addRoute(method, this.#path, handler);
        });
        return this;
      };
    });
    this.on = (method, path, ...handlers) => {
      for (const p of [path].flat()) {
        this.#path = p;
        for (const m of [method].flat()) {
          handlers.map((handler) => {
            this.#addRoute(m.toUpperCase(), this.#path, handler);
          });
        }
      }
      return this;
    };
    this.use = (arg1, ...handlers) => {
      if (typeof arg1 === "string") {
        this.#path = arg1;
      } else {
        this.#path = "*";
        handlers.unshift(arg1);
      }
      handlers.forEach((handler) => {
        this.#addRoute(METHOD_NAME_ALL, this.#path, handler);
      });
      return this;
    };
    const { strict, ...optionsWithoutStrict } = options;
    Object.assign(this, optionsWithoutStrict);
    this.getPath = strict ?? true ? options.getPath ?? getPath : getPathNoStrict;
  }
  #clone() {
    const clone = new _Hono({
      router: this.router,
      getPath: this.getPath
    });
    clone.errorHandler = this.errorHandler;
    clone.#notFoundHandler = this.#notFoundHandler;
    clone.routes = this.routes;
    return clone;
  }
  #notFoundHandler = notFoundHandler;
  // Cannot use `#` because it requires visibility at JavaScript runtime.
  errorHandler = errorHandler;
  /**
   * `.route()` allows grouping other Hono instance in routes.
   *
   * @see {@link https://hono.dev/docs/api/routing#grouping}
   *
   * @param {string} path - base Path
   * @param {Hono} app - other Hono instance
   * @returns {Hono} routed Hono instance
   *
   * @example
   * ```ts
   * const app = new Hono()
   * const app2 = new Hono()
   *
   * app2.get("/user", (c) => c.text("user"))
   * app.route("/api", app2) // GET /api/user
   * ```
   */
  route(path, app) {
    const subApp = this.basePath(path);
    app.routes.map((r) => {
      let handler;
      if (app.errorHandler === errorHandler) {
        handler = r.handler;
      } else {
        handler = async (c, next) => (await compose([], app.errorHandler)(c, () => r.handler(c, next))).res;
        handler[COMPOSED_HANDLER] = r.handler;
      }
      subApp.#addRoute(r.method, r.path, handler, r.basePath);
    });
    return this;
  }
  /**
   * `.basePath()` allows base paths to be specified.
   *
   * @see {@link https://hono.dev/docs/api/routing#base-path}
   *
   * @param {string} path - base Path
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * const api = new Hono().basePath('/api')
   * ```
   */
  basePath(path) {
    const subApp = this.#clone();
    subApp._basePath = mergePath(this._basePath, path);
    return subApp;
  }
  /**
   * `.onError()` handles an error and returns a customized Response.
   *
   * @see {@link https://hono.dev/docs/api/hono#error-handling}
   *
   * @param {ErrorHandler} handler - request Handler for error
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * app.onError((err, c) => {
   *   console.error(`${err}`)
   *   return c.text('Custom Error Message', 500)
   * })
   * ```
   */
  onError = (handler) => {
    this.errorHandler = handler;
    return this;
  };
  /**
   * `.notFound()` allows you to customize a Not Found Response.
   *
   * @see {@link https://hono.dev/docs/api/hono#not-found}
   *
   * @param {NotFoundHandler} handler - request handler for not-found
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * app.notFound((c) => {
   *   return c.text('Custom 404 Message', 404)
   * })
   * ```
   */
  notFound = (handler) => {
    this.#notFoundHandler = handler;
    return this;
  };
  /**
   * `.mount()` allows you to mount applications built with other frameworks into your Hono application.
   *
   * @see {@link https://hono.dev/docs/api/hono#mount}
   *
   * @param {string} path - base Path
   * @param {Function} applicationHandler - other Request Handler
   * @param {MountOptions} [options] - options of `.mount()`
   * @returns {Hono} mounted Hono instance
   *
   * @example
   * ```ts
   * import { Router as IttyRouter } from 'itty-router'
   * import { Hono } from 'hono'
   * // Create itty-router application
   * const ittyRouter = IttyRouter()
   * // GET /itty-router/hello
   * ittyRouter.get('/hello', () => new Response('Hello from itty-router'))
   *
   * const app = new Hono()
   * app.mount('/itty-router', ittyRouter.handle)
   * ```
   *
   * @example
   * ```ts
   * const app = new Hono()
   * // Send the request to another application without modification.
   * app.mount('/app', anotherApp, {
   *   replaceRequest: (req) => req,
   * })
   * ```
   */
  mount(path, applicationHandler, options) {
    let replaceRequest;
    let optionHandler;
    if (options) {
      if (typeof options === "function") {
        optionHandler = options;
      } else {
        optionHandler = options.optionHandler;
        if (options.replaceRequest === false) {
          replaceRequest = (request) => request;
        } else {
          replaceRequest = options.replaceRequest;
        }
      }
    }
    const getOptions = optionHandler ? (c) => {
      const options2 = optionHandler(c);
      return Array.isArray(options2) ? options2 : [options2];
    } : (c) => {
      let executionContext = void 0;
      try {
        executionContext = c.executionCtx;
      } catch {
      }
      return [c.env, executionContext];
    };
    replaceRequest ||= (() => {
      const mergedPath = mergePath(this._basePath, path);
      const pathPrefixLength = mergedPath === "/" ? 0 : mergedPath.length;
      return (request) => {
        const url = new URL(request.url);
        url.pathname = this.getPath(request).slice(pathPrefixLength) || "/";
        return new Request(url, request);
      };
    })();
    const handler = async (c, next) => {
      const res = await applicationHandler(replaceRequest(c.req.raw), ...getOptions(c));
      if (res) {
        return res;
      }
      await next();
    };
    this.#addRoute(METHOD_NAME_ALL, mergePath(path, "*"), handler);
    return this;
  }
  #addRoute(method, path, handler, baseRoutePath) {
    method = method.toUpperCase();
    path = mergePath(this._basePath, path);
    const r = {
      basePath: baseRoutePath !== void 0 ? mergePath(this._basePath, baseRoutePath) : this._basePath,
      path,
      method,
      handler
    };
    this.router.add(method, path, [handler, r]);
    this.routes.push(r);
  }
  #handleError(err, c) {
    if (err instanceof Error) {
      return this.errorHandler(err, c);
    }
    throw err;
  }
  #dispatch(request, executionCtx, env, method) {
    if (method === "HEAD") {
      return (async () => new Response(null, await this.#dispatch(request, executionCtx, env, "GET")))();
    }
    const path = this.getPath(request, { env });
    const matchResult = this.router.match(method, path);
    const c = new Context(request, {
      path,
      matchResult,
      env,
      executionCtx,
      notFoundHandler: this.#notFoundHandler
    });
    if (matchResult[0].length === 1) {
      let res;
      try {
        res = matchResult[0][0][0][0](c, async () => {
          c.res = await this.#notFoundHandler(c);
        });
      } catch (err) {
        return this.#handleError(err, c);
      }
      return res instanceof Promise ? res.then(
        (resolved) => resolved || (c.finalized ? c.res : this.#notFoundHandler(c))
      ).catch((err) => this.#handleError(err, c)) : res ?? this.#notFoundHandler(c);
    }
    const composed = compose(matchResult[0], this.errorHandler, this.#notFoundHandler);
    return (async () => {
      try {
        const context = await composed(c);
        if (!context.finalized) {
          throw new Error(
            "Context is not finalized. Did you forget to return a Response object or `await next()`?"
          );
        }
        return context.res;
      } catch (err) {
        return this.#handleError(err, c);
      }
    })();
  }
  /**
   * `.fetch()` will be entry point of your app.
   *
   * @see {@link https://hono.dev/docs/api/hono#fetch}
   *
   * @param {Request} request - request Object of request
   * @param {Env} Env - env Object
   * @param {ExecutionContext} - context of execution
   * @returns {Response | Promise<Response>} response of request
   *
   */
  fetch = (request, ...rest) => {
    return this.#dispatch(request, rest[1], rest[0], request.method);
  };
  /**
   * `.request()` is a useful method for testing.
   * You can pass a URL or pathname to send a GET request.
   * app will return a Response object.
   * ```ts
   * test('GET /hello is ok', async () => {
   *   const res = await app.request('/hello')
   *   expect(res.status).toBe(200)
   * })
   * ```
   * @see https://hono.dev/docs/api/hono#request
   */
  request = (input, requestInit, Env, executionCtx) => {
    if (input instanceof Request) {
      return this.fetch(requestInit ? new Request(input, requestInit) : input, Env, executionCtx);
    }
    input = input.toString();
    return this.fetch(
      new Request(
        /^https?:\/\//.test(input) ? input : `http://localhost${mergePath("/", input)}`,
        requestInit
      ),
      Env,
      executionCtx
    );
  };
  /**
   * `.fire()` automatically adds a global fetch event listener.
   * This can be useful for environments that adhere to the Service Worker API, such as non-ES module Cloudflare Workers.
   * @deprecated
   * Use `fire` from `hono/service-worker` instead.
   * ```ts
   * import { Hono } from 'hono'
   * import { fire } from 'hono/service-worker'
   *
   * const app = new Hono()
   * // ...
   * fire(app)
   * ```
   * @see https://hono.dev/docs/api/hono#fire
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
   * @see https://developers.cloudflare.com/workers/reference/migrate-to-module-workers/
   */
  fire = () => {
    addEventListener("fetch", (event) => {
      event.respondWith(this.#dispatch(event.request, event, void 0, event.request.method));
    });
  };
};

// node_modules/.pnpm/hono@4.12.27/node_modules/hono/dist/router/reg-exp-router/matcher.js
var emptyParam = [];
function match(method, path) {
  const matchers = this.buildAllMatchers();
  const match2 = ((method2, path2) => {
    const matcher = matchers[method2] || matchers[METHOD_NAME_ALL];
    const staticMatch = matcher[2][path2];
    if (staticMatch) {
      return staticMatch;
    }
    const match3 = path2.match(matcher[0]);
    if (!match3) {
      return [[], emptyParam];
    }
    const index2 = match3.indexOf("", 1);
    return [matcher[1][index2], match3];
  });
  this.match = match2;
  return match2(method, path);
}

// node_modules/.pnpm/hono@4.12.27/node_modules/hono/dist/router/reg-exp-router/node.js
var LABEL_REG_EXP_STR = "[^/]+";
var ONLY_WILDCARD_REG_EXP_STR = ".*";
var TAIL_WILDCARD_REG_EXP_STR = "(?:|/.*)";
var PATH_ERROR = /* @__PURE__ */ Symbol();
var regExpMetaChars = new Set(".\\+*[^]$()");
function compareKey(a, b) {
  if (a.length === 1) {
    return b.length === 1 ? a < b ? -1 : 1 : -1;
  }
  if (b.length === 1) {
    return 1;
  }
  if (a === ONLY_WILDCARD_REG_EXP_STR || a === TAIL_WILDCARD_REG_EXP_STR) {
    return 1;
  } else if (b === ONLY_WILDCARD_REG_EXP_STR || b === TAIL_WILDCARD_REG_EXP_STR) {
    return -1;
  }
  if (a === LABEL_REG_EXP_STR) {
    return 1;
  } else if (b === LABEL_REG_EXP_STR) {
    return -1;
  }
  return a.length === b.length ? a < b ? -1 : 1 : b.length - a.length;
}
var Node = class _Node {
  #index;
  #varIndex;
  #children = /* @__PURE__ */ Object.create(null);
  insert(tokens, index2, paramMap, context, pathErrorCheckOnly) {
    if (tokens.length === 0) {
      if (this.#index !== void 0) {
        throw PATH_ERROR;
      }
      if (pathErrorCheckOnly) {
        return;
      }
      this.#index = index2;
      return;
    }
    const [token, ...restTokens] = tokens;
    const pattern = token === "*" ? restTokens.length === 0 ? ["", "", ONLY_WILDCARD_REG_EXP_STR] : ["", "", LABEL_REG_EXP_STR] : token === "/*" ? ["", "", TAIL_WILDCARD_REG_EXP_STR] : token.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
    let node;
    if (pattern) {
      const name = pattern[1];
      let regexpStr = pattern[2] || LABEL_REG_EXP_STR;
      if (name && pattern[2]) {
        if (regexpStr === ".*") {
          throw PATH_ERROR;
        }
        regexpStr = regexpStr.replace(/^\((?!\?:)(?=[^)]+\)$)/, "(?:");
        if (/\((?!\?:)/.test(regexpStr)) {
          throw PATH_ERROR;
        }
      }
      node = this.#children[regexpStr];
      if (!node) {
        if (Object.keys(this.#children).some(
          (k) => k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR
        )) {
          throw PATH_ERROR;
        }
        if (pathErrorCheckOnly) {
          return;
        }
        node = this.#children[regexpStr] = new _Node();
        if (name !== "") {
          node.#varIndex = context.varIndex++;
        }
      }
      if (!pathErrorCheckOnly && name !== "") {
        paramMap.push([name, node.#varIndex]);
      }
    } else {
      node = this.#children[token];
      if (!node) {
        if (Object.keys(this.#children).some(
          (k) => k.length > 1 && k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR
        )) {
          throw PATH_ERROR;
        }
        if (pathErrorCheckOnly) {
          return;
        }
        node = this.#children[token] = new _Node();
      }
    }
    node.insert(restTokens, index2, paramMap, context, pathErrorCheckOnly);
  }
  buildRegExpStr() {
    const childKeys = Object.keys(this.#children).sort(compareKey);
    const strList = childKeys.map((k) => {
      const c = this.#children[k];
      return (typeof c.#varIndex === "number" ? `(${k})@${c.#varIndex}` : regExpMetaChars.has(k) ? `\\${k}` : k) + c.buildRegExpStr();
    });
    if (typeof this.#index === "number") {
      strList.unshift(`#${this.#index}`);
    }
    if (strList.length === 0) {
      return "";
    }
    if (strList.length === 1) {
      return strList[0];
    }
    return "(?:" + strList.join("|") + ")";
  }
};

// node_modules/.pnpm/hono@4.12.27/node_modules/hono/dist/router/reg-exp-router/trie.js
var Trie = class {
  #context = { varIndex: 0 };
  #root = new Node();
  insert(path, index2, pathErrorCheckOnly) {
    const paramAssoc = [];
    const groups = [];
    for (let i = 0; ; ) {
      let replaced = false;
      path = path.replace(/\{[^}]+\}/g, (m) => {
        const mark = `@\\${i}`;
        groups[i] = [mark, m];
        i++;
        replaced = true;
        return mark;
      });
      if (!replaced) {
        break;
      }
    }
    const tokens = path.match(/(?::[^\/]+)|(?:\/\*$)|./g) || [];
    for (let i = groups.length - 1; i >= 0; i--) {
      const [mark] = groups[i];
      for (let j = tokens.length - 1; j >= 0; j--) {
        if (tokens[j].indexOf(mark) !== -1) {
          tokens[j] = tokens[j].replace(mark, groups[i][1]);
          break;
        }
      }
    }
    this.#root.insert(tokens, index2, paramAssoc, this.#context, pathErrorCheckOnly);
    return paramAssoc;
  }
  buildRegExp() {
    let regexp = this.#root.buildRegExpStr();
    if (regexp === "") {
      return [/^$/, [], []];
    }
    let captureIndex = 0;
    const indexReplacementMap = [];
    const paramReplacementMap = [];
    regexp = regexp.replace(/#(\d+)|@(\d+)|\.\*\$/g, (_, handlerIndex, paramIndex) => {
      if (handlerIndex !== void 0) {
        indexReplacementMap[++captureIndex] = Number(handlerIndex);
        return "$()";
      }
      if (paramIndex !== void 0) {
        paramReplacementMap[Number(paramIndex)] = ++captureIndex;
        return "";
      }
      return "";
    });
    return [new RegExp(`^${regexp}`), indexReplacementMap, paramReplacementMap];
  }
};

// node_modules/.pnpm/hono@4.12.27/node_modules/hono/dist/router/reg-exp-router/router.js
var nullMatcher = [/^$/, [], /* @__PURE__ */ Object.create(null)];
var wildcardRegExpCache = /* @__PURE__ */ Object.create(null);
function buildWildcardRegExp(path) {
  return wildcardRegExpCache[path] ??= new RegExp(
    path === "*" ? "" : `^${path.replace(
      /\/\*$|([.\\+*[^\]$()])/g,
      (_, metaChar) => metaChar ? `\\${metaChar}` : "(?:|/.*)"
    )}$`
  );
}
function clearWildcardRegExpCache() {
  wildcardRegExpCache = /* @__PURE__ */ Object.create(null);
}
function buildMatcherFromPreprocessedRoutes(routes) {
  const trie = new Trie();
  const handlerData = [];
  if (routes.length === 0) {
    return nullMatcher;
  }
  const routesWithStaticPathFlag = routes.map(
    (route) => [!/\*|\/:/.test(route[0]), ...route]
  ).sort(
    ([isStaticA, pathA], [isStaticB, pathB]) => isStaticA ? 1 : isStaticB ? -1 : pathA.length - pathB.length
  );
  const staticMap = /* @__PURE__ */ Object.create(null);
  for (let i = 0, j = -1, len = routesWithStaticPathFlag.length; i < len; i++) {
    const [pathErrorCheckOnly, path, handlers] = routesWithStaticPathFlag[i];
    if (pathErrorCheckOnly) {
      staticMap[path] = [handlers.map(([h]) => [h, /* @__PURE__ */ Object.create(null)]), emptyParam];
    } else {
      j++;
    }
    let paramAssoc;
    try {
      paramAssoc = trie.insert(path, j, pathErrorCheckOnly);
    } catch (e) {
      throw e === PATH_ERROR ? new UnsupportedPathError(path) : e;
    }
    if (pathErrorCheckOnly) {
      continue;
    }
    handlerData[j] = handlers.map(([h, paramCount]) => {
      const paramIndexMap = /* @__PURE__ */ Object.create(null);
      paramCount -= 1;
      for (; paramCount >= 0; paramCount--) {
        const [key, value] = paramAssoc[paramCount];
        paramIndexMap[key] = value;
      }
      return [h, paramIndexMap];
    });
  }
  const [regexp, indexReplacementMap, paramReplacementMap] = trie.buildRegExp();
  for (let i = 0, len = handlerData.length; i < len; i++) {
    for (let j = 0, len2 = handlerData[i].length; j < len2; j++) {
      const map = handlerData[i][j]?.[1];
      if (!map) {
        continue;
      }
      const keys = Object.keys(map);
      for (let k = 0, len3 = keys.length; k < len3; k++) {
        map[keys[k]] = paramReplacementMap[map[keys[k]]];
      }
    }
  }
  const handlerMap = [];
  for (const i in indexReplacementMap) {
    handlerMap[i] = handlerData[indexReplacementMap[i]];
  }
  return [regexp, handlerMap, staticMap];
}
function findMiddleware(middleware, path) {
  if (!middleware) {
    return void 0;
  }
  for (const k of Object.keys(middleware).sort((a, b) => b.length - a.length)) {
    if (buildWildcardRegExp(k).test(path)) {
      return [...middleware[k]];
    }
  }
  return void 0;
}
var RegExpRouter = class {
  name = "RegExpRouter";
  #middleware;
  #routes;
  constructor() {
    this.#middleware = { [METHOD_NAME_ALL]: /* @__PURE__ */ Object.create(null) };
    this.#routes = { [METHOD_NAME_ALL]: /* @__PURE__ */ Object.create(null) };
  }
  add(method, path, handler) {
    const middleware = this.#middleware;
    const routes = this.#routes;
    if (!middleware || !routes) {
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    }
    if (!middleware[method]) {
      ;
      [middleware, routes].forEach((handlerMap) => {
        handlerMap[method] = /* @__PURE__ */ Object.create(null);
        Object.keys(handlerMap[METHOD_NAME_ALL]).forEach((p) => {
          handlerMap[method][p] = [...handlerMap[METHOD_NAME_ALL][p]];
        });
      });
    }
    if (path === "/*") {
      path = "*";
    }
    const paramCount = (path.match(/\/:/g) || []).length;
    if (/\*$/.test(path)) {
      const re = buildWildcardRegExp(path);
      if (method === METHOD_NAME_ALL) {
        Object.keys(middleware).forEach((m) => {
          middleware[m][path] ||= findMiddleware(middleware[m], path) || findMiddleware(middleware[METHOD_NAME_ALL], path) || [];
        });
      } else {
        middleware[method][path] ||= findMiddleware(middleware[method], path) || findMiddleware(middleware[METHOD_NAME_ALL], path) || [];
      }
      Object.keys(middleware).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          Object.keys(middleware[m]).forEach((p) => {
            re.test(p) && middleware[m][p].push([handler, paramCount]);
          });
        }
      });
      Object.keys(routes).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          Object.keys(routes[m]).forEach(
            (p) => re.test(p) && routes[m][p].push([handler, paramCount])
          );
        }
      });
      return;
    }
    const paths = checkOptionalParameter(path) || [path];
    for (let i = 0, len = paths.length; i < len; i++) {
      const path2 = paths[i];
      Object.keys(routes).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          routes[m][path2] ||= [
            ...findMiddleware(middleware[m], path2) || findMiddleware(middleware[METHOD_NAME_ALL], path2) || []
          ];
          routes[m][path2].push([handler, paramCount - len + i + 1]);
        }
      });
    }
  }
  match = match;
  buildAllMatchers() {
    const matchers = /* @__PURE__ */ Object.create(null);
    Object.keys(this.#routes).concat(Object.keys(this.#middleware)).forEach((method) => {
      matchers[method] ||= this.#buildMatcher(method);
    });
    this.#middleware = this.#routes = void 0;
    clearWildcardRegExpCache();
    return matchers;
  }
  #buildMatcher(method) {
    const routes = [];
    let hasOwnRoute = method === METHOD_NAME_ALL;
    [this.#middleware, this.#routes].forEach((r) => {
      const ownRoute = r[method] ? Object.keys(r[method]).map((path) => [path, r[method][path]]) : [];
      if (ownRoute.length !== 0) {
        hasOwnRoute ||= true;
        routes.push(...ownRoute);
      } else if (method !== METHOD_NAME_ALL) {
        routes.push(
          ...Object.keys(r[METHOD_NAME_ALL]).map((path) => [path, r[METHOD_NAME_ALL][path]])
        );
      }
    });
    if (!hasOwnRoute) {
      return null;
    } else {
      return buildMatcherFromPreprocessedRoutes(routes);
    }
  }
};

// node_modules/.pnpm/hono@4.12.27/node_modules/hono/dist/router/smart-router/router.js
var SmartRouter = class {
  name = "SmartRouter";
  #routers = [];
  #routes = [];
  constructor(init) {
    this.#routers = init.routers;
  }
  add(method, path, handler) {
    if (!this.#routes) {
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    }
    this.#routes.push([method, path, handler]);
  }
  match(method, path) {
    if (!this.#routes) {
      throw new Error("Fatal error");
    }
    const routers = this.#routers;
    const routes = this.#routes;
    const len = routers.length;
    let i = 0;
    let res;
    for (; i < len; i++) {
      const router = routers[i];
      try {
        for (let i2 = 0, len2 = routes.length; i2 < len2; i2++) {
          router.add(...routes[i2]);
        }
        res = router.match(method, path);
      } catch (e) {
        if (e instanceof UnsupportedPathError) {
          continue;
        }
        throw e;
      }
      this.match = router.match.bind(router);
      this.#routers = [router];
      this.#routes = void 0;
      break;
    }
    if (i === len) {
      throw new Error("Fatal error");
    }
    this.name = `SmartRouter + ${this.activeRouter.name}`;
    return res;
  }
  get activeRouter() {
    if (this.#routes || this.#routers.length !== 1) {
      throw new Error("No active router has been determined yet.");
    }
    return this.#routers[0];
  }
};

// node_modules/.pnpm/hono@4.12.27/node_modules/hono/dist/router/trie-router/node.js
var emptyParams = /* @__PURE__ */ Object.create(null);
var hasChildren = (children) => {
  for (const _ in children) {
    return true;
  }
  return false;
};
var Node2 = class _Node2 {
  #methods;
  #children;
  #patterns;
  #order = 0;
  #params = emptyParams;
  constructor(method, handler, children) {
    this.#children = children || /* @__PURE__ */ Object.create(null);
    this.#methods = [];
    if (method && handler) {
      const m = /* @__PURE__ */ Object.create(null);
      m[method] = { handler, possibleKeys: [], score: 0 };
      this.#methods = [m];
    }
    this.#patterns = [];
  }
  insert(method, path, handler) {
    this.#order = ++this.#order;
    let curNode = this;
    const parts = splitRoutingPath(path);
    const possibleKeys = [];
    for (let i = 0, len = parts.length; i < len; i++) {
      const p = parts[i];
      const nextP = parts[i + 1];
      const pattern = getPattern(p, nextP);
      const key = Array.isArray(pattern) ? pattern[0] : p;
      if (key in curNode.#children) {
        curNode = curNode.#children[key];
        if (pattern) {
          possibleKeys.push(pattern[1]);
        }
        continue;
      }
      curNode.#children[key] = new _Node2();
      if (pattern) {
        curNode.#patterns.push(pattern);
        possibleKeys.push(pattern[1]);
      }
      curNode = curNode.#children[key];
    }
    curNode.#methods.push({
      [method]: {
        handler,
        possibleKeys: possibleKeys.filter((v, i, a) => a.indexOf(v) === i),
        score: this.#order
      }
    });
    return curNode;
  }
  #pushHandlerSets(handlerSets, node, method, nodeParams, params) {
    for (let i = 0, len = node.#methods.length; i < len; i++) {
      const m = node.#methods[i];
      const handlerSet = m[method] || m[METHOD_NAME_ALL];
      const processedSet = {};
      if (handlerSet !== void 0) {
        handlerSet.params = /* @__PURE__ */ Object.create(null);
        handlerSets.push(handlerSet);
        if (nodeParams !== emptyParams || params && params !== emptyParams) {
          for (let i2 = 0, len2 = handlerSet.possibleKeys.length; i2 < len2; i2++) {
            const key = handlerSet.possibleKeys[i2];
            const processed = processedSet[handlerSet.score];
            handlerSet.params[key] = params?.[key] && !processed ? params[key] : nodeParams[key] ?? params?.[key];
            processedSet[handlerSet.score] = true;
          }
        }
      }
    }
  }
  search(method, path) {
    const handlerSets = [];
    this.#params = emptyParams;
    const curNode = this;
    let curNodes = [curNode];
    const parts = splitPath(path);
    const curNodesQueue = [];
    const len = parts.length;
    let partOffsets = null;
    for (let i = 0; i < len; i++) {
      const part = parts[i];
      const isLast = i === len - 1;
      const tempNodes = [];
      for (let j = 0, len2 = curNodes.length; j < len2; j++) {
        const node = curNodes[j];
        const nextNode = node.#children[part];
        if (nextNode) {
          nextNode.#params = node.#params;
          if (isLast) {
            if (nextNode.#children["*"]) {
              this.#pushHandlerSets(handlerSets, nextNode.#children["*"], method, node.#params);
            }
            this.#pushHandlerSets(handlerSets, nextNode, method, node.#params);
          } else {
            tempNodes.push(nextNode);
          }
        }
        for (let k = 0, len3 = node.#patterns.length; k < len3; k++) {
          const pattern = node.#patterns[k];
          const params = node.#params === emptyParams ? {} : { ...node.#params };
          if (pattern === "*") {
            const astNode = node.#children["*"];
            if (astNode) {
              this.#pushHandlerSets(handlerSets, astNode, method, node.#params);
              astNode.#params = params;
              tempNodes.push(astNode);
            }
            continue;
          }
          const [key, name, matcher] = pattern;
          if (!part && !(matcher instanceof RegExp)) {
            continue;
          }
          const child = node.#children[key];
          if (matcher instanceof RegExp) {
            if (partOffsets === null) {
              partOffsets = new Array(len);
              let offset = path[0] === "/" ? 1 : 0;
              for (let p = 0; p < len; p++) {
                partOffsets[p] = offset;
                offset += parts[p].length + 1;
              }
            }
            const restPathString = path.substring(partOffsets[i]);
            const m = matcher.exec(restPathString);
            if (m) {
              params[name] = m[0];
              this.#pushHandlerSets(handlerSets, child, method, node.#params, params);
              if (hasChildren(child.#children)) {
                child.#params = params;
                const componentCount = m[0].match(/\//)?.length ?? 0;
                const targetCurNodes = curNodesQueue[componentCount] ||= [];
                targetCurNodes.push(child);
              }
              continue;
            }
          }
          if (matcher === true || matcher.test(part)) {
            params[name] = part;
            if (isLast) {
              this.#pushHandlerSets(handlerSets, child, method, params, node.#params);
              if (child.#children["*"]) {
                this.#pushHandlerSets(
                  handlerSets,
                  child.#children["*"],
                  method,
                  params,
                  node.#params
                );
              }
            } else {
              child.#params = params;
              tempNodes.push(child);
            }
          }
        }
      }
      const shifted = curNodesQueue.shift();
      curNodes = shifted ? tempNodes.concat(shifted) : tempNodes;
    }
    if (handlerSets.length > 1) {
      handlerSets.sort((a, b) => {
        return a.score - b.score;
      });
    }
    return [handlerSets.map(({ handler, params }) => [handler, params])];
  }
};

// node_modules/.pnpm/hono@4.12.27/node_modules/hono/dist/router/trie-router/router.js
var TrieRouter = class {
  name = "TrieRouter";
  #node;
  constructor() {
    this.#node = new Node2();
  }
  add(method, path, handler) {
    const results = checkOptionalParameter(path);
    if (results) {
      for (let i = 0, len = results.length; i < len; i++) {
        this.#node.insert(method, results[i], handler);
      }
      return;
    }
    this.#node.insert(method, path, handler);
  }
  match(method, path) {
    return this.#node.search(method, path);
  }
};

// node_modules/.pnpm/hono@4.12.27/node_modules/hono/dist/hono.js
var Hono2 = class extends Hono {
  /**
   * Creates an instance of the Hono class.
   *
   * @param options - Optional configuration options for the Hono instance.
   */
  constructor(options = {}) {
    super(options);
    this.router = options.router ?? new SmartRouter({
      routers: [new RegExpRouter(), new TrieRouter()]
    });
  }
};

// src/__generated__/db_schema.ts
var db_schema_exports = {};
__export(db_schema_exports, {
  esSystemAuthUser: () => esSystemAuthUser,
  inspections: () => inspections,
  items: () => items,
  orders: () => orders,
  parties: () => parties,
  paymentPrices: () => paymentPrices,
  payments: () => payments,
  photos: () => photos,
  propertyDetails: () => propertyDetails,
  rooms: () => rooms,
  signatures: () => signatures,
  tenancyDetails: () => tenancyDetails,
  userProfiles: () => userProfiles,
  users: () => users
});
import { sqliteTable, uniqueIndex, text, integer, index, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
var esSystemAuthUser = sqliteTable(
  "es_system__auth_user",
  {
    id: text().primaryKey().notNull(),
    name: text().notNull(),
    email: text().notNull(),
    emailVerified: integer("email_verified").default(0).notNull(),
    image: text(),
    createdAt: integer("created_at").default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`).notNull(),
    updatedAt: integer("updated_at").default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`).notNull(),
    isAnonymous: integer("is_anonymous").default(0),
    internalA: text("__internal_a"),
    banned: integer().default(0),
    banReason: text("ban_reason"),
    banExpires: integer("ban_expires"),
    lastLoginAt: integer("last_login_at")
  },
  (table) => [
    uniqueIndex("es_system__auth_user_email_unique").on(table.email)
  ]
);
var inspections = sqliteTable(
  "inspections",
  {
    id: text().primaryKey(),
    userId: text("user_id").notNull(),
    propertyType: text("property_type").default("apartment").notNull(),
    status: text().default("draft").notNull(),
    generalNotes: text("general_notes").default(""),
    propertyData: text("property_data").default("{}"),
    tenantData: text("tenant_data").default("{}"),
    landlordData: text("landlord_data").default("{}"),
    agentData: text("agent_data").default("{}"),
    tenancyData: text("tenancy_data").default("{}"),
    roomsData: text("rooms_data").default("[]"),
    propertyItems: text("property_items").default("[]"),
    signatures: text().default("[]"),
    overallPhotos: text("overall_photos").default("[]"),
    paymentData: text("payment_data").default("{}"),
    reportGenerated: integer("report_generated").default(0),
    createdAt: text("created_at").default("sql`(datetime('now'))`").notNull(),
    updatedAt: text("updated_at").default("sql`(datetime('now'))`").notNull(),
    completedAt: text("completed_at"),
    pdfUrl: text("pdf_url").default("")
  },
  (table) => [
    index("idx_inspections_created_at").on(table.createdAt),
    index("idx_inspections_status").on(table.status),
    index("idx_inspections_user_id").on(table.userId)
  ]
);
var users = sqliteTable(
  "users",
  {
    id: text().primaryKey(),
    email: text().notNull(),
    name: text().notNull(),
    phone: text().default(""),
    location: text().default(""),
    createdAt: text("created_at").default("sql`(datetime('now'))`").notNull(),
    updatedAt: text("updated_at").default("sql`(datetime('now'))`").notNull(),
    passwordHash: text("password_hash").default(""),
    isTester: integer("is_tester").default(0),
    freeInspections: integer("free_inspections").default(0)
  },
  (table) => [
    index("idx_users_email").on(table.email)
  ]
);
var parties = sqliteTable(
  "parties",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    inspectionId: text("inspection_id").notNull().references(() => inspections.id, { onDelete: "cascade" }),
    role: text().notNull(),
    name: text().default(""),
    phone: text().default(""),
    email: text().default(""),
    companyName: text("company_name").default(""),
    tradeLicense: text("trade_license").default(""),
    createdAt: text("created_at").default("sql`(datetime('now'))`").notNull()
  },
  (table) => [
    index("idx_parties_inspection").on(table.inspectionId)
  ]
);
var tenancyDetails = sqliteTable(
  "tenancy_details",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    inspectionId: text("inspection_id").notNull().references(() => inspections.id, { onDelete: "cascade" }),
    leaseStart: text("lease_start").default(""),
    leaseEnd: text("lease_end").default(""),
    contractNumber: text("contract_number").default(""),
    createdAt: text("created_at").default("sql`(datetime('now'))`").notNull()
  },
  (table) => [
    index("idx_tenancy_inspection").on(table.inspectionId)
  ]
);
var paymentPrices = sqliteTable(
  "payment_prices",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    environment: text().default("staging").notNull(),
    name: text().notNull(),
    description: text(),
    amount: integer().notNull(),
    currency: text().default("AED"),
    type: text().default("one_time"),
    interval: text(),
    provider: text().default("stripe").notNull(),
    providerProductId: text("provider_product_id"),
    providerPriceId: text("provider_price_id"),
    active: integer().default(1),
    metadata: text(),
    createdAt: integer("created_at").default(sql`(unixepoch())`)
  },
  (table) => [
    index("idx_prices_env").on(table.environment, table.provider, table.providerPriceId)
  ]
);
var orders = sqliteTable(
  "orders",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    environment: text().default("staging").notNull(),
    userId: text("user_id").notNull(),
    inspectionId: text("inspection_id"),
    priceId: integer("price_id").references(() => paymentPrices.id),
    amount: integer().notNull(),
    currency: text().default("AED"),
    status: text().default("pending"),
    type: text().default("one_time"),
    provider: text().default("stripe"),
    providerSessionId: text("provider_session_id"),
    providerPaymentId: text("provider_payment_id"),
    discountCode: text("discount_code"),
    discountAmount: integer("discount_amount").default(0),
    metadata: text(),
    paidAt: integer("paid_at"),
    createdAt: integer("created_at").default(sql`(unixepoch())`)
  },
  (table) => [
    index("idx_orders_env_status").on(table.environment, table.status),
    index("idx_orders_env_user").on(table.environment, table.userId)
  ]
);
var propertyDetails = sqliteTable("property_details", {
  id: integer().primaryKey({ autoIncrement: true }),
  inspectionId: text("inspection_id").notNull().references(() => inspections.id, { onDelete: "cascade" }),
  makaniNumber: text("makani_number").default(""),
  area: text().default(""),
  city: text().default("Dubai"),
  buildingName: text("building_name").default(""),
  unitNumber: text("unit_number").default(""),
  totalAreaSqft: integer("total_area_sqft"),
  bedrooms: integer().default(1),
  bathrooms: integer().default(1),
  furnished: integer().default(0),
  specialFeatures: text("special_features").default("[]")
});
var items = sqliteTable("items", {
  id: text().primaryKey(),
  roomId: text("room_id").notNull().references(() => rooms.id, { onDelete: "cascade" }),
  name: text().notNull(),
  category: text().default(""),
  condition: text(),
  comments: text().default(""),
  checked: integer().default(0),
  sortOrder: integer("sort_order").default(0)
});
var photos = sqliteTable("photos", {
  id: text().primaryKey(),
  itemId: text("item_id").references(() => items.id, { onDelete: "cascade" }),
  inspectionId: text("inspection_id").notNull().references(() => inspections.id, { onDelete: "cascade" }),
  photoType: text("photo_type").default("item").notNull(),
  url: text().notNull(),
  caption: text().default(""),
  timestamp: text().notNull(),
  gpsLat: real("gps_lat"),
  gpsLng: real("gps_lng"),
  sortOrder: integer("sort_order").default(0)
});
var signatures = sqliteTable("signatures", {
  id: integer().primaryKey({ autoIncrement: true }),
  inspectionId: text("inspection_id").notNull().references(() => inspections.id, { onDelete: "cascade" }),
  role: text().notNull(),
  name: text().notNull(),
  dataUrl: text("data_url").notNull(),
  signedAt: text("signed_at").notNull()
});
var rooms = sqliteTable("rooms", {
  id: text().primaryKey(),
  inspectionId: text("inspection_id").notNull().references(() => inspections.id, { onDelete: "cascade" }),
  name: text().notNull(),
  roomType: text("room_type").notNull(),
  icon: text().default("\u{1F3E0}"),
  overallComments: text("overall_comments").default(""),
  overallCondition: text("overall_condition"),
  sortOrder: integer("sort_order").default(0)
});
var payments = sqliteTable("payments", {
  id: integer().primaryKey({ autoIncrement: true }),
  inspectionId: text("inspection_id").notNull().references(() => inspections.id, { onDelete: "cascade" }),
  paid: integer().default(0),
  amount: integer().default(0),
  currency: text().default("AED"),
  method: text().default("card"),
  paidAt: text("paid_at"),
  transactionId: text("transaction_id")
});
var userProfiles = sqliteTable(
  "user_profiles",
  {
    id: text().primaryKey(),
    userId: text("user_id").notNull(),
    phone: text().default(""),
    location: text().default(""),
    inspectorName: text("inspector_name").default(""),
    inspectorEmail: text("inspector_email").default(""),
    createdAt: text("created_at").default("sql`(datetime('now'))`").notNull(),
    updatedAt: text("updated_at").default("sql`(datetime('now'))`").notNull()
  },
  (table) => [
    index("idx_user_profiles_user_id").on(table.userId)
  ]
);

// src/__generated__/storage_schema.ts
var storage_schema_exports = {};
__export(storage_schema_exports, {
  meinspect_reports: () => meinspect_reports
});
var meinspect_reports = {
  bucket_name: "meinspect-reports",
  description: "Inspection reports and photos"
};

// src/__generated__/db_relations.ts
var db_relations_exports = {};
__export(db_relations_exports, {
  inspectionsRelations: () => inspectionsRelations,
  itemsRelations: () => itemsRelations,
  ordersRelations: () => ordersRelations,
  partiesRelations: () => partiesRelations,
  paymentPricesRelations: () => paymentPricesRelations,
  paymentsRelations: () => paymentsRelations,
  photosRelations: () => photosRelations,
  propertyDetailsRelations: () => propertyDetailsRelations,
  roomsRelations: () => roomsRelations,
  signaturesRelations: () => signaturesRelations,
  tenancyDetailsRelations: () => tenancyDetailsRelations
});
import { relations } from "drizzle-orm/relations";
var partiesRelations = relations(parties, ({ one }) => ({
  inspection: one(inspections, {
    fields: [parties.inspectionId],
    references: [inspections.id]
  })
}));
var inspectionsRelations = relations(inspections, ({ many }) => ({
  parties: many(parties),
  tenancyDetails: many(tenancyDetails),
  propertyDetails: many(propertyDetails),
  photos: many(photos),
  signatures: many(signatures),
  rooms: many(rooms),
  payments: many(payments)
}));
var tenancyDetailsRelations = relations(tenancyDetails, ({ one }) => ({
  inspection: one(inspections, {
    fields: [tenancyDetails.inspectionId],
    references: [inspections.id]
  })
}));
var ordersRelations = relations(orders, ({ one }) => ({
  paymentPrice: one(paymentPrices, {
    fields: [orders.priceId],
    references: [paymentPrices.id]
  })
}));
var paymentPricesRelations = relations(paymentPrices, ({ many }) => ({
  orders: many(orders)
}));
var propertyDetailsRelations = relations(propertyDetails, ({ one }) => ({
  inspection: one(inspections, {
    fields: [propertyDetails.inspectionId],
    references: [inspections.id]
  })
}));
var itemsRelations = relations(items, ({ one, many }) => ({
  room: one(rooms, {
    fields: [items.roomId],
    references: [rooms.id]
  }),
  photos: many(photos)
}));
var roomsRelations = relations(rooms, ({ one, many }) => ({
  items: many(items),
  inspection: one(inspections, {
    fields: [rooms.inspectionId],
    references: [inspections.id]
  })
}));
var photosRelations = relations(photos, ({ one }) => ({
  inspection: one(inspections, {
    fields: [photos.inspectionId],
    references: [inspections.id]
  }),
  item: one(items, {
    fields: [photos.itemId],
    references: [items.id]
  })
}));
var signaturesRelations = relations(signatures, ({ one }) => ({
  inspection: one(inspections, {
    fields: [signatures.inspectionId],
    references: [inspections.id]
  })
}));
var paymentsRelations = relations(payments, ({ one }) => ({
  inspection: one(inspections, {
    fields: [payments.inspectionId],
    references: [inspections.id]
  })
}));

// src/__generated__/index.ts
var drizzleSchema = { ...db_schema_exports, ...db_relations_exports };

// src/index.ts
import { eq, and } from "drizzle-orm";

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/Types.js
var DEFAULT_BASE_ADDRESSES = {
  api: "api.stripe.com",
  files: "files.stripe.com",
  connect: "connect.stripe.com",
  meter_events: "meter-events.stripe.com"
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/utils.js
function queryStringifyRequestData(data) {
  return stringifyRequestData(data);
}
function encodeQueryValue(value) {
  return encodeURIComponent(value).replace(/!/g, "%21").replace(/\*/g, "%2A").replace(/\(/g, "%28").replace(/\)/g, "%29").replace(/'/g, "%27").replace(/%5B/g, "[").replace(/%5D/g, "]");
}
function valueToString(value) {
  if (value instanceof Date) {
    return Math.floor(value.getTime() / 1e3).toString();
  }
  if (value === null) {
    return "";
  }
  return String(value);
}
function stringifyRequestData(data) {
  const pairs = [];
  function encode(key, value) {
    if (value === void 0) {
      return;
    }
    if (value === null || typeof value !== "object" || value instanceof Date) {
      pairs.push(encodeQueryValue(key) + "=" + encodeQueryValue(valueToString(value)));
      return;
    }
    if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        if (value[i] !== void 0) {
          encode(key + "[" + i + "]", value[i]);
        }
      }
      return;
    }
    for (const k of Object.keys(value)) {
      encode(key + "[" + k + "]", value[k]);
    }
  }
  if (typeof data === "object" && data !== null) {
    for (const key of Object.keys(data)) {
      encode(key, data[key]);
    }
  }
  return pairs.join("&");
}
var makeURLInterpolator = /* @__PURE__ */ (() => {
  const rc = {
    "\n": "\\n",
    '"': '\\"',
    "\u2028": "\\u2028",
    "\u2029": "\\u2029"
  };
  return (str) => {
    const cleanString = str.replace(/["\n\r\u2028\u2029]/g, ($0) => rc[$0]);
    return (outputs) => {
      return cleanString.replace(/\{([\s\S]+?)\}/g, ($0, $1) => {
        const output = outputs[$1];
        if (isValidEncodeUriComponentType(output))
          return encodeURIComponent(output);
        return "";
      });
    };
  };
})();
function isValidEncodeUriComponentType(value) {
  return ["number", "string", "boolean"].includes(typeof value);
}
function processOptions(options) {
  const result = {
    authenticator: null,
    headers: {},
    settings: {},
    streaming: false,
    apiBase: null
  };
  if (!options) {
    return result;
  }
  if (options.apiKey) {
    result.authenticator = createApiKeyAuthenticator(options.apiKey);
  }
  if (options.idempotencyKey) {
    result.headers["Idempotency-Key"] = options.idempotencyKey;
  }
  if (options.stripeAccount) {
    result.headers["Stripe-Account"] = options.stripeAccount;
  }
  if (options.stripeContext) {
    if (result.headers["Stripe-Account"]) {
      throw new Error("Can't specify both stripeAccount and stripeContext.");
    }
    result.headers["Stripe-Context"] = options.stripeContext;
  }
  if (options.apiVersion) {
    result.headers["Stripe-Version"] = options.apiVersion;
  }
  if (Number.isInteger(options.maxNetworkRetries)) {
    result.settings.maxNetworkRetries = options.maxNetworkRetries;
  }
  if (Number.isInteger(options.timeout)) {
    result.settings.timeout = options.timeout;
  }
  if (options.authenticator) {
    if (options.apiKey) {
      throw new Error("Can't specify both apiKey and authenticator.");
    }
    if (typeof options.authenticator !== "function") {
      throw new Error("The authenticator must be a function receiving a request as the first parameter.");
    }
    result.authenticator = options.authenticator;
  }
  if (options.headers) {
    Object.assign(result.headers, options.headers);
  }
  if (options.streaming) {
    result.streaming = true;
  }
  return result;
}
function removeNullish(obj) {
  if (typeof obj !== "object") {
    throw new Error("Argument must be an object");
  }
  return Object.keys(obj).reduce((result, key) => {
    if (obj[key] != null) {
      result[key] = obj[key];
    }
    return result;
  }, {});
}
function normalizeHeaders(obj) {
  if (!(obj && typeof obj === "object")) {
    return obj;
  }
  return Object.keys(obj).reduce((result, header) => {
    result[normalizeHeader(header)] = obj[header];
    return result;
  }, {});
}
function normalizeHeader(header) {
  return header.split("-").map((text2) => text2.charAt(0).toUpperCase() + text2.substr(1).toLowerCase()).join("-");
}
function pascalToCamelCase(name) {
  if (name === "OAuth") {
    return "oauth";
  } else {
    return name[0].toLowerCase() + name.substring(1);
  }
}
function isObject(obj) {
  const type = typeof obj;
  return (type === "function" || type === "object") && !!obj;
}
function flattenAndStringify(data) {
  const result = {};
  const step = (obj, prevKey) => {
    Object.entries(obj).forEach(([key, value]) => {
      const newKey = prevKey ? `${prevKey}[${key}]` : key;
      if (isObject(value)) {
        if (!(value instanceof Uint8Array) && !Object.prototype.hasOwnProperty.call(value, "data")) {
          return step(value, newKey);
        } else {
          result[newKey] = value;
        }
      } else {
        result[newKey] = String(value);
      }
    });
  };
  step(data, null);
  return result;
}
function validateInteger(name, n, defaultVal) {
  if (!Number.isInteger(n)) {
    if (defaultVal !== void 0) {
      return defaultVal;
    } else {
      throw new Error(`${name} must be an integer`);
    }
  }
  return n;
}
var AI_AGENTS = [
  // The beginning of the section generated from our OpenAPI spec
  ["ANTIGRAVITY_CLI_ALIAS", "antigravity"],
  ["CLAUDECODE", "claude_code"],
  ["CLINE_ACTIVE", "cline"],
  ["CODEX_SANDBOX", "codex_cli"],
  ["CODEX_THREAD_ID", "codex_cli"],
  ["CODEX_SANDBOX_NETWORK_DISABLED", "codex_cli"],
  ["CODEX_CI", "codex_cli"],
  ["CURSOR_AGENT", "cursor"],
  ["GEMINI_CLI", "gemini_cli"],
  ["OPENCLAW_SHELL", "openclaw"],
  ["OPENCODE", "open_code"]
  // The end of the section generated from our OpenAPI spec
];
function detectAIAgent(env) {
  for (const [envVar, agentName] of AI_AGENTS) {
    if (env[envVar]) {
      return agentName;
    }
  }
  return "";
}
function createApiKeyAuthenticator(apiKey) {
  const authenticator = (request) => {
    request.headers.Authorization = "Bearer " + apiKey;
    return Promise.resolve();
  };
  authenticator._apiKey = apiKey;
  return authenticator;
}
function dateTimeReplacer(key, value) {
  if (this[key] instanceof Date) {
    return Math.floor(this[key].getTime() / 1e3).toString();
  }
  return value;
}
function jsonStringifyRequestData(data) {
  return JSON.stringify(data, dateTimeReplacer);
}
function getAPIMode(path) {
  if (!path) {
    return "v1";
  }
  return path.startsWith("/v2") ? "v2" : "v1";
}
function parseHttpHeaderAsString(header) {
  if (Array.isArray(header)) {
    return header.join(", ");
  }
  return String(header);
}
function parseHttpHeaderAsNumber(header) {
  const value = Array.isArray(header) ? header[0] : header;
  if (value == null) {
    return void 0;
  }
  const trimmed = String(value).trim();
  if (trimmed === "") {
    return void 0;
  }
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) {
    return void 0;
  }
  return parsed;
}
function parseHeadersForFetch(headers) {
  return Object.entries(headers).map(([key, value]) => {
    return [key, parseHttpHeaderAsString(value)];
  });
}
var CALL_SITE_MARKER = "\nOriginating from:";
function attachCallSiteToError(err, callSiteStack) {
  if (!err || !err.stack || !callSiteStack) {
    return;
  }
  const callerFrames = callSiteStack.substring(callSiteStack.indexOf("\n") + 1);
  const existingMarkerIdx = err.stack.indexOf(CALL_SITE_MARKER);
  const baseStack = existingMarkerIdx >= 0 ? err.stack.substring(0, existingMarkerIdx) : err.stack;
  err.stack = `${baseStack}${CALL_SITE_MARKER}
${callerFrames}`;
}

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/net/HttpClient.js
var HttpClient = class _HttpClient {
  /** The client name used for diagnostics. */
  getClientName() {
    throw new Error("getClientName not implemented.");
  }
  makeRequest(host, port, path, method, headers, requestData, protocol, timeout) {
    throw new Error("makeRequest not implemented.");
  }
  /** Helper to make a consistent timeout error across implementations. */
  static makeTimeoutError() {
    const timeoutErr = new TypeError(_HttpClient.TIMEOUT_ERROR_CODE);
    timeoutErr.code = _HttpClient.TIMEOUT_ERROR_CODE;
    return timeoutErr;
  }
};
HttpClient.CONNECTION_CLOSED_ERROR_CODES = ["ECONNRESET", "EPIPE"];
HttpClient.TIMEOUT_ERROR_CODE = "ETIMEDOUT";
var HttpClientResponse = class {
  constructor(statusCode, headers) {
    this._statusCode = statusCode;
    this._headers = headers;
  }
  getStatusCode() {
    return this._statusCode;
  }
  getHeaders() {
    return this._headers;
  }
  getRawResponse() {
    throw new Error("getRawResponse not implemented.");
  }
  toStream(streamCompleteCallback) {
    throw new Error("toStream not implemented.");
  }
  toJSON() {
    throw new Error("toJSON not implemented.");
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/net/FetchHttpClient.js
var FetchHttpClient = class _FetchHttpClient extends HttpClient {
  constructor(fetchFn) {
    super();
    if (!fetchFn) {
      if (!globalThis.fetch) {
        throw new Error("fetch() function not provided and is not defined in the global scope. You must provide a fetch implementation.");
      }
      fetchFn = globalThis.fetch;
    }
    if (globalThis.AbortController) {
      this._fetchFn = _FetchHttpClient.makeFetchWithAbortTimeout(fetchFn);
    } else {
      this._fetchFn = _FetchHttpClient.makeFetchWithRaceTimeout(fetchFn);
    }
  }
  static makeFetchWithRaceTimeout(fetchFn) {
    return (url, init, timeout) => {
      let pendingTimeoutId;
      const timeoutPromise = new Promise((_, reject) => {
        pendingTimeoutId = setTimeout(() => {
          pendingTimeoutId = null;
          reject(HttpClient.makeTimeoutError());
        }, timeout);
      });
      const fetchPromise = fetchFn(url, init);
      return Promise.race([fetchPromise, timeoutPromise]).finally(() => {
        if (pendingTimeoutId) {
          clearTimeout(pendingTimeoutId);
        }
      });
    };
  }
  static makeFetchWithAbortTimeout(fetchFn) {
    return async (url, init, timeout) => {
      const abort = new AbortController();
      let timeoutId = setTimeout(() => {
        timeoutId = null;
        abort.abort(HttpClient.makeTimeoutError());
      }, timeout);
      try {
        return await fetchFn(url, {
          ...init,
          signal: abort.signal
        });
      } catch (err) {
        if (err.name === "AbortError") {
          throw HttpClient.makeTimeoutError();
        } else {
          throw err;
        }
      } finally {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      }
    };
  }
  /** @override. */
  getClientName() {
    return "fetch";
  }
  async makeRequest(host, port, path, method, headers, requestData, protocol, timeout) {
    const isInsecureConnection = protocol === "http";
    if (!path.startsWith("/")) {
      throw new Error(`Only relative paths are supported, got: "${path}"`);
    }
    const url = new URL(`${isInsecureConnection ? "http" : "https"}://${host}${path}`);
    url.port = port;
    const methodHasPayload = method == "POST" || method == "PUT" || method == "PATCH";
    const body = requestData || (methodHasPayload ? "" : void 0);
    const res = await this._fetchFn(url.toString(), {
      method,
      headers: parseHeadersForFetch(headers),
      body
    }, timeout);
    return new FetchHttpClientResponse(res);
  }
};
var FetchHttpClientResponse = class _FetchHttpClientResponse extends HttpClientResponse {
  constructor(res) {
    super(res.status, _FetchHttpClientResponse._transformHeadersToObject(res.headers));
    this._res = res;
  }
  getRawResponse() {
    return this._res;
  }
  toStream(streamCompleteCallback) {
    streamCompleteCallback();
    return this._res.body;
  }
  toJSON() {
    return this._res.text().then((text2) => {
      try {
        return JSON.parse(text2);
      } catch (e) {
        if (e instanceof Error) {
          e.rawBody = text2;
        }
        throw e;
      }
    });
  }
  static _transformHeadersToObject(headers) {
    const headersObj = {};
    for (const entry of headers) {
      if (!Array.isArray(entry) || entry.length != 2) {
        throw new Error("Response objects produced by the fetch function given to FetchHttpClient do not have an iterable headers map. Response#headers should be an iterable object.");
      }
      headersObj[entry[0]] = entry[1];
    }
    return headersObj;
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/crypto/CryptoProvider.js
var CryptoProvider = class {
  /**
   * Computes a SHA-256 HMAC given a secret and a payload (encoded in UTF-8).
   * The output HMAC should be encoded in hexadecimal.
   *
   * Sample values for implementations:
   * - computeHMACSignature('', 'test_secret') => 'f7f9bd47fb987337b5796fdc1fdb9ba221d0d5396814bfcaf9521f43fd8927fd'
   * - computeHMACSignature('\ud83d\ude00', 'test_secret') => '837da296d05c4fe31f61d5d7ead035099d9585a5bcde87de952012a78f0b0c43
   */
  computeHMACSignature(payload, secret) {
    throw new Error("computeHMACSignature not implemented.");
  }
  /**
   * Asynchronous version of `computeHMACSignature`. Some implementations may
   * only allow support async signature computation.
   *
   * Computes a SHA-256 HMAC given a secret and a payload (encoded in UTF-8).
   * The output HMAC should be encoded in hexadecimal.
   *
   * Sample values for implementations:
   * - computeHMACSignature('', 'test_secret') => 'f7f9bd47fb987337b5796fdc1fdb9ba221d0d5396814bfcaf9521f43fd8927fd'
   * - computeHMACSignature('\ud83d\ude00', 'test_secret') => '837da296d05c4fe31f61d5d7ead035099d9585a5bcde87de952012a78f0b0c43
   */
  computeHMACSignatureAsync(payload, secret) {
    throw new Error("computeHMACSignatureAsync not implemented.");
  }
  /**
   * Computes a SHA-256 hash of the data.
   */
  computeSHA256Async(data) {
    throw new Error("computeSHA256 not implemented.");
  }
};
var CryptoProviderOnlySupportsAsyncError = class extends Error {
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/crypto/SubtleCryptoProvider.js
var SubtleCryptoProvider = class extends CryptoProvider {
  constructor(subtleCrypto) {
    super();
    this.subtleCrypto = subtleCrypto || crypto.subtle;
  }
  /** @override */
  computeHMACSignature(payload, secret) {
    throw new CryptoProviderOnlySupportsAsyncError("SubtleCryptoProvider cannot be used in a synchronous context.");
  }
  /** @override */
  async computeHMACSignatureAsync(payload, secret) {
    const encoder = new TextEncoder();
    const key = await this.subtleCrypto.importKey("raw", encoder.encode(secret), {
      name: "HMAC",
      hash: { name: "SHA-256" }
    }, false, ["sign"]);
    const signatureBuffer = await this.subtleCrypto.sign("hmac", key, encoder.encode(payload));
    const signatureBytes = new Uint8Array(signatureBuffer);
    const signatureHexCodes = new Array(signatureBytes.length);
    for (let i = 0; i < signatureBytes.length; i++) {
      signatureHexCodes[i] = byteHexMapping[signatureBytes[i]];
    }
    return signatureHexCodes.join("");
  }
  /** @override */
  async computeSHA256Async(data) {
    return new Uint8Array(await this.subtleCrypto.digest("SHA-256", data));
  }
};
var byteHexMapping = new Array(256);
for (let i = 0; i < byteHexMapping.length; i++) {
  byteHexMapping[i] = i.toString(16).padStart(2, "0");
}

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/platform/PlatformFunctions.js
var PlatformFunctions = class {
  constructor() {
    this._fetchFn = null;
    this._agent = null;
  }
  /**
   * Returns platform info string for telemetry, or null if unavailable.
   */
  getPlatformInfo() {
    return null;
  }
  getSourceHash() {
    return null;
  }
  /**
   * Emits a warning. Node.js uses process.emitWarning; other runtimes
   * fall back to console.warn.
   */
  emitWarning(warning) {
    console.warn(`Stripe: ${warning}`);
  }
  /**
   * Returns environment variables, or null if unavailable.
   */
  getEnv() {
    return null;
  }
  /**
   * Returns the runtime version string, or null if unavailable.
   */
  getRuntimeVersion() {
    return null;
  }
  /**
   * Generates a v4 UUID. See https://stackoverflow.com/a/2117523
   */
  uuid4() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === "x" ? r : r & 3 | 8;
      return v.toString(16);
    });
  }
  /**
   * Compares strings in constant time.
   */
  secureCompare(a, b) {
    if (a.length !== b.length) {
      return false;
    }
    const len = a.length;
    let result = 0;
    for (let i = 0; i < len; ++i) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
  }
  /**
   * Creates an event emitter.
   */
  createEmitter() {
    throw new Error("createEmitter not implemented.");
  }
  /**
   * Checks if the request data is a stream. If so, read the entire stream
   * to a buffer and return the buffer.
   */
  tryBufferData(data) {
    throw new Error("tryBufferData not implemented.");
  }
  /**
   * Creates an HTTP client which uses the Node `http` and `https` packages
   * to issue requests.
   */
  createNodeHttpClient(agent) {
    throw new Error("createNodeHttpClient not implemented.");
  }
  /**
   * Creates an HTTP client for issuing Stripe API requests which uses the Web
   * Fetch API.
   *
   * A fetch function can optionally be passed in as a parameter. If none is
   * passed, will default to the default `fetch` function in the global scope.
   */
  createFetchHttpClient(fetchFn) {
    return new FetchHttpClient(fetchFn);
  }
  /**
   * Creates an HTTP client using runtime-specific APIs.
   */
  createDefaultHttpClient() {
    throw new Error("createDefaultHttpClient not implemented.");
  }
  /**
   * Creates a CryptoProvider which uses the Node `crypto` package for its computations.
   */
  createNodeCryptoProvider() {
    throw new Error("createNodeCryptoProvider not implemented.");
  }
  /**
   * Creates a CryptoProvider which uses the SubtleCrypto interface of the Web Crypto API.
   */
  createSubtleCryptoProvider(subtleCrypto) {
    return new SubtleCryptoProvider(subtleCrypto);
  }
  createDefaultCryptoProvider() {
    throw new Error("createDefaultCryptoProvider not implemented.");
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/StripeEmitter.js
var _StripeEvent = class extends Event {
  constructor(eventName, data) {
    super(eventName);
    this.data = data;
  }
};
var StripeEmitter = class {
  constructor() {
    this.eventTarget = new EventTarget();
    this.listenerMapping = /* @__PURE__ */ new Map();
  }
  on(eventName, listener) {
    const listenerWrapper = (event) => {
      listener(event.data);
    };
    this.listenerMapping.set(listener, listenerWrapper);
    return this.eventTarget.addEventListener(eventName, listenerWrapper);
  }
  removeListener(eventName, listener) {
    const listenerWrapper = this.listenerMapping.get(listener);
    this.listenerMapping.delete(listener);
    return this.eventTarget.removeEventListener(eventName, listenerWrapper);
  }
  once(eventName, listener) {
    const listenerWrapper = (event) => {
      listener(event.data);
    };
    this.listenerMapping.set(listener, listenerWrapper);
    return this.eventTarget.addEventListener(eventName, listenerWrapper, {
      once: true
    });
  }
  emit(eventName, data) {
    return this.eventTarget.dispatchEvent(new _StripeEvent(eventName, data));
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/platform/WebPlatformFunctions.js
var WebPlatformFunctions = class extends PlatformFunctions {
  /** @override */
  createEmitter() {
    return new StripeEmitter();
  }
  /** @override */
  tryBufferData(data) {
    if (data.file.data instanceof ReadableStream) {
      throw new Error("Uploading a file as a stream is not supported in non-Node environments. Please open or upvote an issue at github.com/stripe/stripe-node if you use this, detailing your use-case.");
    }
    return Promise.resolve(data);
  }
  /** @override */
  createNodeHttpClient() {
    throw new Error("Stripe: `createNodeHttpClient()` is not available in non-Node environments. Please use `createFetchHttpClient()` instead.");
  }
  /** @override */
  createDefaultHttpClient() {
    return super.createFetchHttpClient();
  }
  /** @override */
  createNodeCryptoProvider() {
    throw new Error("Stripe: `createNodeCryptoProvider()` is not available in non-Node environments. Please use `createSubtleCryptoProvider()` instead.");
  }
  /** @override */
  createDefaultCryptoProvider() {
    return this.createSubtleCryptoProvider();
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/Decimal.js
var ROUNDING_PRESETS = {
  "ubb-usage-count": { mode: "significant-figures", value: 15 },
  "v1-api": { mode: "decimal-places", value: 12 }
};
var PLAIN_NOTATION_DIGIT_LIMIT = 30;
var MAX_EXPONENT = 1e6;
var DecimalImpl = class _DecimalImpl {
  /**
   * Construct and normalise a decimal value.
   *
   * @param coefficient - The unscaled integer value.
   * @param exponent - The power-of-ten scale factor.
   *
   * @internal
   */
  constructor(coefficient, exponent) {
    const [normalizedCoef, normalizedExp] = _DecimalImpl.normalize(coefficient, exponent);
    this._coefficient = normalizedCoef;
    this._exponent = normalizedExp;
    Object.freeze(this);
  }
  /**
   * Strip trailing zeros from `coefficient`, incrementing `exponent`
   * for each zero removed. Zero always normalises to `(0n, 0)`.
   *
   * @param coefficient - Raw coefficient before normalisation.
   * @param exponent - Raw exponent before normalisation.
   * @returns A `[coefficient, exponent]` tuple with trailing zeros removed.
   *
   * @internal
   */
  static normalize(coefficient, exponent) {
    if (coefficient === 0n) {
      return [0n, 0];
    }
    let coef = coefficient;
    let exp = exponent;
    while (coef !== 0n && coef % 10n === 0n) {
      coef /= 10n;
      exp += 1;
    }
    return [coef, exp];
  }
  /**
   * Apply rounding to the result of an integer division.
   *
   * @remarks
   * BigInt division truncates toward zero. This helper inspects the
   * `remainder` to decide whether to adjust the truncated `quotient`
   * by ±1 according to the chosen {@link RoundDirection}.
   *
   * The rounding direction is derived from the signs of `remainder`
   * and `divisor`: when they agree the exact fractional part is
   * positive (the truncation point is below the true value, so +1
   * rounds to nearest); when they disagree the fractional part is
   * negative (−1 rounds to nearest).
   *
   * @param quotient - Truncated integer quotient (`dividend / divisor`).
   * @param remainder - Division remainder (`dividend % divisor`).
   * @param divisor - The divisor used in the division.
   * @param direction - The rounding strategy to apply.
   * @returns The rounded quotient.
   *
   * @internal
   */
  static roundDivision(quotient, remainder, divisor, direction) {
    if (remainder === 0n) {
      return quotient;
    }
    if (direction === "round-down") {
      return quotient;
    }
    const roundDir = remainder > 0n === divisor > 0n ? 1n : -1n;
    if (direction === "round-up") {
      return quotient + roundDir;
    }
    if (direction === "ceil") {
      return roundDir === 1n ? quotient + 1n : quotient;
    }
    if (direction === "floor") {
      return roundDir === -1n ? quotient - 1n : quotient;
    }
    const absRemainder = remainder < 0n ? -remainder : remainder;
    const absDivisor = divisor < 0n ? -divisor : divisor;
    const doubled = absRemainder * 2n;
    let cmp;
    if (doubled === absDivisor) {
      cmp = 0;
    } else if (doubled < absDivisor) {
      cmp = -1;
    } else {
      cmp = 1;
    }
    if (cmp < 0) {
      return quotient;
    }
    if (cmp > 0) {
      return quotient + roundDir;
    }
    if (direction === "half-up") {
      return quotient + roundDir;
    }
    if (direction === "half-down") {
      return quotient;
    }
    if (quotient % 2n === 0n) {
      return quotient;
    } else {
      return quotient + roundDir;
    }
  }
  // -------------------------------------------------------------------
  // Arithmetic
  // -------------------------------------------------------------------
  /**
   * Return the sum of this value and `other`.
   *
   * @param other - The addend.
   * @returns A new {@link Decimal} equal to `this + other`.
   *
   * @public
   */
  add(other) {
    const otherImpl = other;
    if (this._exponent === otherImpl._exponent) {
      return new _DecimalImpl(this._coefficient + otherImpl._coefficient, this._exponent);
    }
    if (this._exponent < otherImpl._exponent) {
      const scale = 10n ** BigInt(otherImpl._exponent - this._exponent);
      return new _DecimalImpl(this._coefficient + otherImpl._coefficient * scale, this._exponent);
    } else {
      const scale = 10n ** BigInt(this._exponent - otherImpl._exponent);
      return new _DecimalImpl(this._coefficient * scale + otherImpl._coefficient, otherImpl._exponent);
    }
  }
  /**
   * Return the difference of this value and `other`.
   *
   * @param other - The subtrahend.
   * @returns A new {@link Decimal} equal to `this - other`.
   *
   * @public
   */
  sub(other) {
    const otherImpl = other;
    if (this._exponent === otherImpl._exponent) {
      return new _DecimalImpl(this._coefficient - otherImpl._coefficient, this._exponent);
    }
    if (this._exponent < otherImpl._exponent) {
      const scale = 10n ** BigInt(otherImpl._exponent - this._exponent);
      return new _DecimalImpl(this._coefficient - otherImpl._coefficient * scale, this._exponent);
    } else {
      const scale = 10n ** BigInt(this._exponent - otherImpl._exponent);
      return new _DecimalImpl(this._coefficient * scale - otherImpl._coefficient, otherImpl._exponent);
    }
  }
  /**
   * Return the product of this value and `other`.
   *
   * @param other - The multiplicand.
   * @returns A new {@link Decimal} equal to `this × other`.
   *
   * @public
   */
  mul(other) {
    const otherImpl = other;
    return new _DecimalImpl(this._coefficient * otherImpl._coefficient, this._exponent + otherImpl._exponent);
  }
  /**
   * Return the quotient of this value divided by `other`.
   *
   * @remarks
   * Division scales the dividend to produce `precision` decimal digits
   * in the result, then applies integer division and rounds the
   * remainder according to `direction`.
   *
   * Division requires explicit rounding control — no invisible defaults
   * in financial code. For full precision use {@link DEFAULT_DIV_PRECISION}
   * (34, matching the IEEE 754 decimal128 coefficient size).
   *
   * @example
   * ```ts
   * Decimal.from('1').div(Decimal.from('3'), 5, 'half-up');   // "0.33333"
   * Decimal.from('5').div(Decimal.from('2'), 0, 'half-up');   // "3"
   * Decimal.from('5').div(Decimal.from('2'), 0, 'half-even'); // "2"
   * ```
   *
   * @param other - The divisor. Must not be zero.
   * @param precision - Maximum number of decimal digits in the result.
   * @param direction - How to round when the exact quotient cannot
   *   be represented at the requested precision.
   * @returns A new {@link Decimal} equal to `this ÷ other`, rounded to
   *   `precision` decimal places.
   * @throws {@link Error} if `other` is zero.
   * @throws {@link Error} if `precision` is negative or non-integer.
   *
   * @public
   */
  div(other, precision, direction) {
    if (precision < 0 || !Number.isInteger(precision)) {
      throw new Error("precision must be a non-negative integer");
    }
    const otherImpl = other;
    if (otherImpl._coefficient === 0n) {
      throw new Error("Division by zero");
    }
    const scale = this._exponent - otherImpl._exponent + precision;
    let quotient;
    let remainder;
    let roundingDivisor;
    if (scale >= 0) {
      const scaledDividend = this._coefficient * 10n ** BigInt(scale);
      quotient = scaledDividend / otherImpl._coefficient;
      remainder = scaledDividend % otherImpl._coefficient;
      roundingDivisor = otherImpl._coefficient;
    } else {
      const scaledDivisor = otherImpl._coefficient * 10n ** BigInt(-scale);
      quotient = this._coefficient / scaledDivisor;
      remainder = this._coefficient % scaledDivisor;
      roundingDivisor = scaledDivisor;
    }
    const roundedQuotient = _DecimalImpl.roundDivision(quotient, remainder, roundingDivisor, direction);
    return new _DecimalImpl(roundedQuotient, -precision);
  }
  // -------------------------------------------------------------------
  // Comparison
  // -------------------------------------------------------------------
  /**
   * Three-way comparison of this value with `other`.
   *
   * @example
   * ```ts
   * const a = Decimal.from('1.5');
   * const b = Decimal.from('2');
   * a.cmp(b); // -1
   * b.cmp(a); //  1
   * a.cmp(a); //  0
   * ```
   *
   * @param other - The value to compare against.
   * @returns `-1` if `this \< other`, `0` if equal, `1` if `this \> other`.
   *
   * @public
   */
  cmp(other) {
    const otherImpl = other;
    if (this._exponent === otherImpl._exponent) {
      if (this._coefficient < otherImpl._coefficient)
        return -1;
      if (this._coefficient > otherImpl._coefficient)
        return 1;
      return 0;
    }
    if (this._exponent < otherImpl._exponent) {
      const scale = 10n ** BigInt(otherImpl._exponent - this._exponent);
      const scaledOther = otherImpl._coefficient * scale;
      if (this._coefficient < scaledOther)
        return -1;
      if (this._coefficient > scaledOther)
        return 1;
      return 0;
    } else {
      const scale = 10n ** BigInt(this._exponent - otherImpl._exponent);
      const scaledThis = this._coefficient * scale;
      if (scaledThis < otherImpl._coefficient)
        return -1;
      if (scaledThis > otherImpl._coefficient)
        return 1;
      return 0;
    }
  }
  /**
   * Return `true` if this value is numerically equal to `other`.
   *
   * @param other - The value to compare against.
   * @returns `true` if `this === other` in value, `false` otherwise.
   *
   * @public
   */
  eq(other) {
    return this.cmp(other) === 0;
  }
  /**
   * Return `true` if this value is strictly less than `other`.
   *
   * @param other - The value to compare against.
   * @returns `true` if `this \< other`, `false` otherwise.
   *
   * @public
   */
  lt(other) {
    return this.cmp(other) === -1;
  }
  /**
   * Return `true` if this value is less than or equal to `other`.
   *
   * @param other - The value to compare against.
   * @returns `true` if `this ≤ other`, `false` otherwise.
   *
   * @public
   */
  lte(other) {
    return this.cmp(other) <= 0;
  }
  /**
   * Return `true` if this value is strictly greater than `other`.
   *
   * @param other - The value to compare against.
   * @returns `true` if `this \> other`, `false` otherwise.
   *
   * @public
   */
  gt(other) {
    return this.cmp(other) === 1;
  }
  /**
   * Return `true` if this value is greater than or equal to `other`.
   *
   * @param other - The value to compare against.
   * @returns `true` if `this ≥ other`, `false` otherwise.
   *
   * @public
   */
  gte(other) {
    return this.cmp(other) >= 0;
  }
  // -------------------------------------------------------------------
  // Predicates
  // -------------------------------------------------------------------
  /**
   * Return `true` if this value is exactly zero.
   *
   * @returns `true` if the value is zero, `false` otherwise.
   *
   * @public
   */
  isZero() {
    return this._coefficient === 0n;
  }
  /**
   * Return `true` if this value is strictly less than zero.
   *
   * @returns `true` if negative, `false` if zero or positive.
   *
   * @public
   */
  isNegative() {
    return this._coefficient < 0n;
  }
  /**
   * Return `true` if this value is strictly greater than zero.
   *
   * @returns `true` if positive, `false` if zero or negative.
   *
   * @public
   */
  isPositive() {
    return this._coefficient > 0n;
  }
  // -------------------------------------------------------------------
  // Unary operations
  // -------------------------------------------------------------------
  /**
   * Return the additive inverse of this value.
   *
   * @returns A new {@link Decimal} equal to `-this`.
   *
   * @public
   */
  neg() {
    return new _DecimalImpl(-this._coefficient, this._exponent);
  }
  /**
   * Return the absolute value.
   *
   * @returns A new {@link Decimal} equal to `|this|`. If this value is
   *   already non-negative, returns `this` (no allocation).
   *
   * @public
   */
  abs() {
    if (this._coefficient < 0n) {
      return new _DecimalImpl(-this._coefficient, this._exponent);
    }
    return this;
  }
  // -------------------------------------------------------------------
  // Rounding
  // -------------------------------------------------------------------
  /**
   * Round this value to a specified precision.
   *
   * @remarks
   * **Rounding directions** (IEEE 754-2019 §4.3):
   *
   * | Direction      | Behavior                                       |
   * | -------------- | ---------------------------------------------- |
   * | `'ceil'`       |  1.1→2, -1.1→-1, 1.0→1 (toward +∞)             |
   * | `'floor'`      |  1.9→1, -1.1→-2, 1.0→1 (toward -∞)             |
   * | `'round-down'` |  1.9→1, -1.9→-1 (toward zero / truncate)       |
   * | `'round-up'`   |  1.1→2, -1.1→-2 (away from zero)               |
   * | `'half-up'`    |  0.5→1, 1.5→2, -0.5→-1 (ties away from zero)   |
   * | `'half-down'`  |  0.5→0, 1.5→1, -0.5→0 (ties toward zero)       |
   * | `'half-even'`  |  0.5→0, 1.5→2, 2.5→2, 3.5→4 (ties to even)     |
   *
   * **Precision** is specified as a {@link DecimalRoundingOptions} object
   * or a preset name from {@link DecimalRoundingPresets}:
   *
   * @example
   * ```ts
   * // Using a preset
   * amount.round('half-even', 'v1-api');
   *
   * // Using explicit options
   * amount.round('half-even', { mode: 'decimal-places', value: 2 });
   * amount.round('half-up', { mode: 'significant-figures', value: 4 });
   * ```
   *
   * @param direction - How to round.
   * @param options - A {@link DecimalRoundingOptions} object or key of {@link DecimalRoundingPresets}.
   * @returns A new {@link Decimal} rounded to the specified precision.
   * @throws {@link Error} if `options.value` is negative or non-integer.
   * @throws {@link Error} if the preset name is not recognized.
   *
   * @public
   */
  round(direction, options) {
    const resolved = typeof options === "string" ? (
      // Declaration merging allows consumers to add keys at compile time, but
      // ROUNDING_PRESETS only knows about built-in keys at runtime.  The double
      // cast through `unknown` is intentional: we want an undefined-safe lookup
      // so the runtime guard below can produce a clear error for unrecognised
      // (e.g. declaration-merged) preset names that were not also added to
      // ROUNDING_PRESETS.
      ROUNDING_PRESETS[options]
    ) : options;
    if (resolved === void 0) {
      throw new Error(`Unknown rounding preset: "${options}"`);
    }
    if (resolved.value < 0 || !Number.isInteger(resolved.value)) {
      throw new Error("DecimalRoundingOptions.value must be a non-negative integer");
    }
    if (resolved.mode === "decimal-places") {
      const fixed = this.toFixed(resolved.value, direction);
      return Decimal.from(fixed);
    }
    if (this._coefficient === 0n) {
      return this;
    }
    const coeffStr = this._coefficient < 0n ? (-this._coefficient).toString() : this._coefficient.toString();
    const currentSigFigs = coeffStr.length;
    if (resolved.value === 0) {
      return Decimal.zero;
    }
    if (currentSigFigs <= resolved.value) {
      return this;
    }
    const digitsToTrim = currentSigFigs - resolved.value;
    const divisor = 10n ** BigInt(digitsToTrim);
    const quotient = this._coefficient / divisor;
    const remainder = this._coefficient % divisor;
    const rounded = _DecimalImpl.roundDivision(quotient, remainder, divisor, direction);
    return new _DecimalImpl(rounded, this._exponent + digitsToTrim);
  }
  // -------------------------------------------------------------------
  // Conversion / serialisation
  // -------------------------------------------------------------------
  /**
   * Return a human-readable string representation.
   *
   * @remarks
   * Plain notation for values whose digit count is at most 30, and
   * scientific notation (`1.23E+40`) for larger values. Trailing zeros
   * are never present because the internal representation is normalised.
   *
   * @public
   */
  toString() {
    if (this._coefficient === 0n) {
      return "0";
    }
    const coeffStr = this._coefficient.toString();
    const isNeg = coeffStr.startsWith("-");
    const absCoeffStr = isNeg ? coeffStr.slice(1) : coeffStr;
    if (this._exponent < 0) {
      const decimalPlaces = -this._exponent;
      const leadingZeroCount = decimalPlaces >= absCoeffStr.length ? decimalPlaces - absCoeffStr.length : 0;
      if (leadingZeroCount > PLAIN_NOTATION_DIGIT_LIMIT) {
        if (absCoeffStr.length === 1) {
          return `${coeffStr}E${String(this._exponent)}`;
        }
        const intPart = absCoeffStr[0] ?? "";
        const fracPart = absCoeffStr.slice(1);
        const adjustedExp = this._exponent + absCoeffStr.length - 1;
        return `${isNeg ? "-" : ""}${intPart}.${fracPart}E${String(adjustedExp)}`;
      }
      if (decimalPlaces >= absCoeffStr.length) {
        const leadingZeros = "0".repeat(decimalPlaces - absCoeffStr.length);
        return `${isNeg ? "-" : ""}0.${leadingZeros}${absCoeffStr}`;
      } else {
        const integerPart = absCoeffStr.slice(0, absCoeffStr.length - decimalPlaces);
        const fractionalPart = absCoeffStr.slice(absCoeffStr.length - decimalPlaces);
        return `${isNeg ? "-" : ""}${integerPart}.${fractionalPart}`;
      }
    }
    const plainLength = absCoeffStr.length + this._exponent;
    if (plainLength <= PLAIN_NOTATION_DIGIT_LIMIT) {
      if (this._exponent === 0) {
        return coeffStr;
      }
      const trailingZeros = "0".repeat(this._exponent);
      return `${isNeg ? "-" : ""}${absCoeffStr}${trailingZeros}`;
    } else {
      if (absCoeffStr.length === 1) {
        return `${coeffStr}E+${String(this._exponent)}`;
      }
      const integerPart = absCoeffStr[0] ?? "";
      const fractionalPart = absCoeffStr.slice(1);
      const adjustedExponent = this._exponent + absCoeffStr.length - 1;
      return `${isNeg ? "-" : ""}${integerPart}.${fractionalPart}E+${String(adjustedExponent)}`;
    }
  }
  /**
   * Return the JSON-serialisable representation.
   *
   * @remarks
   * Returns a plain string matching the Stripe API convention where
   * decimal values are serialised as strings in JSON. Called
   * automatically by `JSON.stringify`.
   *
   * @public
   */
  toJSON() {
    return this.toString();
  }
  /**
   * Convert to a JavaScript `number`.
   *
   * @remarks
   * This is an explicit, intentionally lossy conversion. Use it only
   * when you need a numeric value for display or interop with APIs
   * that require `number`. Prefer {@link Decimal.toString | toString}
   * or {@link Decimal.toFixed | toFixed} for lossless output.
   *
   * @public
   */
  toNumber() {
    return Number(this.toString());
  }
  /**
   * Format this value as a fixed-point string with exactly
   * `decimalPlaces` digits after the decimal point.
   *
   * @remarks
   * Values are rounded according to `direction` when the internal
   * precision exceeds the requested number of decimal places.
   * The rounding direction is always required — no invisible defaults
   * in financial code.
   *
   * @example
   * ```ts
   * Decimal.from('1.235').toFixed(2, 'half-up');   // "1.24"
   * Decimal.from('1.225').toFixed(2, 'half-even'); // "1.22"
   * Decimal.from('42').toFixed(3, 'half-up');      // "42.000"
   * ```
   *
   * @param decimalPlaces - Number of digits after the decimal point.
   *   Must be a non-negative integer.
   * @param direction - How to round when truncating excess digits.
   * @returns A string with exactly `decimalPlaces` fractional digits.
   * @throws {@link Error} if `decimalPlaces` is negative or non-integer.
   *
   * @public
   */
  toFixed(decimalPlaces, direction) {
    if (decimalPlaces < 0 || !Number.isInteger(decimalPlaces)) {
      throw new Error("decimalPlaces must be a non-negative integer");
    }
    const formatFixed = (coef) => {
      const coeffStr = coef.toString();
      const isNeg = coeffStr.startsWith("-");
      const absCoeffStr = isNeg ? coeffStr.slice(1) : coeffStr;
      if (decimalPlaces === 0) {
        return coeffStr;
      }
      if (decimalPlaces >= absCoeffStr.length) {
        const leadingZeros = "0".repeat(decimalPlaces - absCoeffStr.length);
        return `${isNeg ? "-" : ""}0.${leadingZeros}${absCoeffStr}`;
      } else {
        const integerPart = absCoeffStr.slice(0, absCoeffStr.length - decimalPlaces);
        const fractionalPart = absCoeffStr.slice(absCoeffStr.length - decimalPlaces);
        return `${isNeg ? "-" : ""}${integerPart}.${fractionalPart}`;
      }
    };
    const targetExponent = -decimalPlaces;
    if (this._exponent === targetExponent) {
      return formatFixed(this._coefficient);
    }
    if (this._exponent < targetExponent) {
      const scaleDiff = targetExponent - this._exponent;
      const divisor = 10n ** BigInt(scaleDiff);
      const quotient = this._coefficient / divisor;
      const remainder = this._coefficient % divisor;
      const rounded = _DecimalImpl.roundDivision(quotient, remainder, divisor, direction);
      return formatFixed(rounded);
    } else {
      const scaleDiff = this._exponent - targetExponent;
      const scaled = this._coefficient * 10n ** BigInt(scaleDiff);
      return formatFixed(scaled);
    }
  }
  /**
   * Return a string primitive when the runtime coerces the value.
   *
   * @remarks
   * Deliberately returns a `string` (not a `number`) to discourage
   * silent precision loss through implicit arithmetic coercion.
   * When used in a numeric context (for example, `+myDecimal`), the
   * JavaScript runtime will first call this method and then coerce
   * the resulting string to a `number`, which may lose precision.
   * Callers should prefer the explicit
   * {@link Decimal.toNumber | toNumber} method when an IEEE 754
   * `number` is required.
   *
   * @public
   */
  valueOf() {
    return this.toString();
  }
};
var Decimal = {
  /**
   * Create a {@link Decimal} from a string, number, or bigint.
   *
   * @remarks
   * - **string**: Parsed as a decimal literal. Accepts an optional sign,
   *   integer digits, an optional fractional part, and an optional `e`/`E`
   *   exponent. Leading/trailing whitespace is trimmed.
   * - **number**: Must be finite. Converted via `Number.prototype.toString()`
   *   then parsed, so `Decimal.from(0.1)` produces `"0.1"` (not the
   *   53-bit binary approximation).
   * - **bigint**: Treated as an integer with exponent 0.
   *
   * @example
   * ```ts
   * Decimal.from('1.23');   // string
   * Decimal.from(42);       // number
   * Decimal.from(100n);     // bigint
   * Decimal.from('1.5e3');  // scientific notation → 1500
   * ```
   *
   * @param value - The value to convert.
   * @returns A new frozen {@link Decimal} instance.
   * @throws {@link Error} if `value` is a non-finite number, an empty
   *   string, or a string that does not match the decimal literal grammar.
   *
   * @public
   */
  from(value) {
    if (typeof value === "bigint") {
      return new DecimalImpl(value, 0);
    }
    if (typeof value === "number") {
      if (!Number.isFinite(value)) {
        throw new Error("Number must be finite");
      }
      return Decimal.from(value.toString());
    }
    const trimmed = value.trim();
    if (trimmed === "") {
      throw new Error("Cannot parse empty string as Decimal");
    }
    const match2 = /^([+-]?)(\d+)(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/.exec(trimmed);
    if (!match2) {
      throw new Error(`Invalid decimal string: ${value}`);
    }
    const sign = match2[1] === "-" ? -1n : 1n;
    const integerPart = match2[2] ?? "";
    const fractionalPart = match2[3] ?? "";
    const exponentPart = match2[4] ? Number(match2[4]) : 0;
    if (!Number.isSafeInteger(exponentPart) || exponentPart > MAX_EXPONENT || exponentPart < -MAX_EXPONENT) {
      throw new Error(`Exponent out of range: ${String(match2[4])} exceeds safe integer bounds`);
    }
    const coefficientStr = integerPart + fractionalPart;
    const coefficient = sign * BigInt(coefficientStr);
    const exponent = exponentPart - fractionalPart.length;
    if (!Number.isSafeInteger(exponent) || exponent > MAX_EXPONENT || exponent < -MAX_EXPONENT) {
      throw new Error(`Computed exponent out of range: ${String(exponent)} exceeds safe integer bounds`);
    }
    return new DecimalImpl(coefficient, exponent);
  },
  /**
   * The {@link Decimal} value representing zero.
   *
   * @remarks
   * Pre-allocated singleton — prefer `Decimal.zero` over
   * `Decimal.from(0)` to avoid an unnecessary allocation.
   *
   * @public
   */
  zero: new DecimalImpl(0n, 0)
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/Error.js
var Error_exports = {};
__export(Error_exports, {
  RateLimitError: () => RateLimitError,
  StripeAPIError: () => StripeAPIError,
  StripeAuthenticationError: () => StripeAuthenticationError,
  StripeCardError: () => StripeCardError,
  StripeConnectionError: () => StripeConnectionError,
  StripeError: () => StripeError,
  StripeIdempotencyError: () => StripeIdempotencyError,
  StripeInvalidClientError: () => StripeInvalidClientError,
  StripeInvalidGrantError: () => StripeInvalidGrantError,
  StripeInvalidRequestError: () => StripeInvalidRequestError,
  StripeInvalidScopeError: () => StripeInvalidScopeError,
  StripeOAuthError: () => StripeOAuthError,
  StripeOAuthInvalidRequestError: () => StripeOAuthInvalidRequestError,
  StripePermissionError: () => StripePermissionError,
  StripeRateLimitError: () => StripeRateLimitError,
  StripeSignatureVerificationError: () => StripeSignatureVerificationError,
  StripeUnsupportedGrantTypeError: () => StripeUnsupportedGrantTypeError,
  StripeUnsupportedResponseTypeError: () => StripeUnsupportedResponseTypeError,
  TemporarySessionExpiredError: () => TemporarySessionExpiredError,
  generateOAuthError: () => generateOAuthError,
  generateV1Error: () => generateV1Error,
  generateV2Error: () => generateV2Error
});
var generateV1Error = (rawStripeError) => {
  const statusCode = rawStripeError.statusCode;
  if (statusCode === 429 || statusCode === 400 && rawStripeError.code === "rate_limit") {
    return new StripeRateLimitError(rawStripeError);
  }
  if (statusCode === 400 || statusCode === 404) {
    if (rawStripeError.type === "idempotency_error") {
      return new StripeIdempotencyError(rawStripeError);
    }
    return new StripeInvalidRequestError(rawStripeError);
  }
  if (statusCode === 401) {
    return new StripeAuthenticationError(rawStripeError);
  }
  if (statusCode === 402) {
    return new StripeCardError(rawStripeError);
  }
  if (statusCode === 403) {
    return new StripePermissionError(rawStripeError);
  }
  return new StripeAPIError(rawStripeError);
};
var generateOAuthError = (rawStripeError) => {
  const oauthType = rawStripeError.type;
  switch (oauthType) {
    case "invalid_grant":
      return new StripeInvalidGrantError(rawStripeError);
    case "invalid_client":
      return new StripeInvalidClientError(rawStripeError);
    case "invalid_request":
      return new StripeOAuthInvalidRequestError(rawStripeError);
    case "invalid_scope":
      return new StripeInvalidScopeError(rawStripeError);
    case "unsupported_grant_type":
      return new StripeUnsupportedGrantTypeError(rawStripeError);
    case "unsupported_response_type":
      return new StripeUnsupportedResponseTypeError(rawStripeError);
    default:
      return new StripeOAuthError(rawStripeError);
  }
};
var generateV2Error = (rawStripeError) => {
  switch (rawStripeError.type) {
    case "idempotency_error":
      return new StripeIdempotencyError(rawStripeError);
    // switchCases: The beginning of the section generated from our OpenAPI spec
    case "rate_limit":
      return new RateLimitError(rawStripeError);
    case "temporary_session_expired":
      return new TemporarySessionExpiredError(rawStripeError);
  }
  switch (rawStripeError.code) {
    case "invalid_fields":
      return new StripeInvalidRequestError(rawStripeError);
  }
  return generateV1Error(rawStripeError);
};
var StripeError = class extends Error {
  constructor(raw2 = {}, type = null) {
    super(raw2.message);
    this.type = type || this.constructor.name;
    this.raw = raw2;
    this.rawType = raw2.type;
    this.code = raw2.code;
    this.doc_url = raw2.doc_url;
    this.param = raw2.param;
    this.detail = raw2.detail;
    this.headers = raw2.headers;
    this.requestId = raw2.requestId;
    this.statusCode = raw2.statusCode;
    this.message = raw2.message ?? "";
    this.userMessage = raw2.user_message;
    this.charge = raw2.charge;
    this.decline_code = raw2.decline_code;
    this.payment_intent = raw2.payment_intent;
    this.payment_method = raw2.payment_method;
    this.payment_method_type = raw2.payment_method_type;
    this.setup_intent = raw2.setup_intent;
    this.source = raw2.source;
  }
};
StripeError.generate = generateV1Error;
var StripeCardError = class extends StripeError {
  constructor(raw2 = {}) {
    super(raw2, "StripeCardError");
    this.decline_code = raw2.decline_code ?? "";
  }
};
var StripeInvalidRequestError = class extends StripeError {
  constructor(raw2 = {}) {
    super(raw2, "StripeInvalidRequestError");
  }
};
var StripeAPIError = class extends StripeError {
  constructor(raw2 = {}) {
    super(raw2, "StripeAPIError");
  }
};
var StripeAuthenticationError = class extends StripeError {
  constructor(raw2 = {}) {
    super(raw2, "StripeAuthenticationError");
  }
};
var StripePermissionError = class extends StripeError {
  constructor(raw2 = {}) {
    super(raw2, "StripePermissionError");
  }
};
var StripeRateLimitError = class extends StripeError {
  constructor(raw2 = {}) {
    super(raw2, "StripeRateLimitError");
  }
};
var StripeConnectionError = class extends StripeError {
  constructor(raw2 = {}) {
    super(raw2, "StripeConnectionError");
  }
};
var StripeSignatureVerificationError = class extends StripeError {
  constructor(header, payload, raw2 = {}) {
    super(raw2, "StripeSignatureVerificationError");
    this.header = header;
    this.payload = payload;
  }
};
var StripeIdempotencyError = class extends StripeError {
  constructor(raw2 = {}) {
    super(raw2, "StripeIdempotencyError");
  }
};
var StripeOAuthError = class extends StripeError {
  constructor(raw2 = {}, type = "StripeOAuthError") {
    super(raw2, type);
  }
};
var StripeInvalidGrantError = class extends StripeOAuthError {
  constructor(raw2 = {}) {
    super(raw2, "StripeInvalidGrantError");
  }
};
var StripeInvalidClientError = class extends StripeOAuthError {
  constructor(raw2 = {}) {
    super(raw2, "StripeInvalidClientError");
  }
};
var StripeOAuthInvalidRequestError = class extends StripeOAuthError {
  constructor(raw2 = {}) {
    super(raw2, "StripeOAuthInvalidRequestError");
  }
};
var StripeInvalidScopeError = class extends StripeOAuthError {
  constructor(raw2 = {}) {
    super(raw2, "StripeInvalidScopeError");
  }
};
var StripeUnsupportedGrantTypeError = class extends StripeOAuthError {
  constructor(raw2 = {}) {
    super(raw2, "StripeUnsupportedGrantTypeError");
  }
};
var StripeUnsupportedResponseTypeError = class extends StripeOAuthError {
  constructor(raw2 = {}) {
    super(raw2, "StripeUnsupportedResponseTypeError");
  }
};
var RateLimitError = class extends StripeError {
  constructor(rawStripeError = {}) {
    super(rawStripeError, "RateLimitError");
  }
};
var TemporarySessionExpiredError = class extends StripeError {
  constructor(rawStripeError = {}) {
    super(rawStripeError, "TemporarySessionExpiredError");
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/RequestSender.js
var MAX_RETRY_AFTER_WAIT = 60;
var RequestSender = class _RequestSender {
  constructor(stripe, maxBufferedRequestMetric) {
    this._stripe = stripe;
    this._maxBufferedRequestMetric = maxBufferedRequestMetric;
  }
  _normalizeStripeContext(optsContext, clientContext) {
    if (optsContext) {
      return optsContext.toString() || null;
    }
    return clientContext?.toString() || null;
  }
  _addHeadersDirectlyToObject(obj, headers) {
    obj.requestId = headers["request-id"];
    obj.stripeAccount = obj.stripeAccount || headers["stripe-account"];
    obj.apiVersion = obj.apiVersion || headers["stripe-version"];
    obj.idempotencyKey = obj.idempotencyKey || headers["idempotency-key"];
  }
  _makeResponseEvent(requestEvent, statusCode, headers) {
    const requestEndTime = Date.now();
    const requestDurationMs = requestEndTime - requestEvent.request_start_time;
    return removeNullish({
      api_version: headers["stripe-version"],
      account: headers["stripe-account"],
      idempotency_key: headers["idempotency-key"],
      method: requestEvent.method,
      path: requestEvent.path,
      status: statusCode,
      request_id: this._getRequestId(headers),
      elapsed: requestDurationMs,
      request_start_time: requestEvent.request_start_time,
      request_end_time: requestEndTime
    });
  }
  _getRequestId(headers) {
    return headers["request-id"];
  }
  _emitStripeNotice(headers) {
    const notice = headers["stripe-notice"];
    if (notice) {
      this._stripe._platformFunctions.emitWarning(typeof notice === "string" ? notice : notice[0]);
    }
  }
  /**
   * Used by methods with spec.streaming === true. For these methods, we do not
   * buffer successful responses into memory or do parse them into stripe
   * objects, we delegate that all of that to the user and pass back the raw
   * http.Response object to the callback.
   *
   * (Unsuccessful responses shouldn't make it here, they should
   * still be buffered/parsed and handled by _jsonResponseHandler -- see
   * makeRequest)
   */
  _streamingResponseHandler(requestEvent, usage, callback) {
    return (res) => {
      const headers = res.getHeaders();
      this._emitStripeNotice(headers);
      const streamCompleteCallback = () => {
        const responseEvent = this._makeResponseEvent(requestEvent, res.getStatusCode(), headers);
        this._stripe._emitter.emit("response", responseEvent);
        this._recordRequestMetrics(this._getRequestId(headers), responseEvent.elapsed, usage);
      };
      const stream = res.toStream(streamCompleteCallback);
      this._addHeadersDirectlyToObject(stream, headers);
      return callback(null, stream);
    };
  }
  /**
   * Default handler for Stripe responses. Buffers the response into memory,
   * parses the JSON and returns it (i.e. passes it to the callback) if there
   * is no "error" field. Otherwise constructs/passes an appropriate Error.
   */
  _jsonResponseHandler(requestEvent, apiMode, usage, callback) {
    return (res) => {
      const headers = res.getHeaders();
      this._emitStripeNotice(headers);
      const requestId = this._getRequestId(headers);
      const statusCode = res.getStatusCode();
      const responseEvent = this._makeResponseEvent(requestEvent, statusCode, headers);
      res.toJSON().then((jsonResponse) => {
        if (this._stripe.getEmitEventBodiesEnabled()) {
          responseEvent.body = jsonResponse;
        }
        if (jsonResponse.error) {
          const isOAuth = typeof jsonResponse.error === "string";
          if (isOAuth) {
            jsonResponse.error = {
              type: jsonResponse.error,
              message: jsonResponse.error_description
            };
          }
          jsonResponse.error.headers = headers;
          jsonResponse.error.statusCode = statusCode;
          jsonResponse.error.requestId = requestId;
          let err;
          if (isOAuth) {
            err = generateOAuthError(jsonResponse.error);
          } else if (apiMode === "v2") {
            err = generateV2Error(jsonResponse.error);
          } else {
            err = generateV1Error(jsonResponse.error);
          }
          throw err;
        }
        return jsonResponse;
      }, (e) => {
        if (this._stripe.getEmitEventBodiesEnabled() && e.rawBody) {
          responseEvent.body = e.rawBody;
        }
        throw new StripeAPIError({
          message: "Invalid JSON received from the Stripe API",
          exception: e,
          requestId: headers["request-id"]
        });
      }).then((jsonResponse) => {
        this._stripe._emitter.emit("response", responseEvent);
        this._recordRequestMetrics(requestId, responseEvent.elapsed, usage);
        const rawResponse = res.getRawResponse();
        this._addHeadersDirectlyToObject(rawResponse, headers);
        Object.defineProperty(jsonResponse, "lastResponse", {
          enumerable: false,
          writable: false,
          value: rawResponse
        });
        callback(null, jsonResponse);
      }, (e) => {
        this._stripe._emitter.emit("response", responseEvent);
        callback(e, null);
      });
    };
  }
  static _generateConnectionErrorMessage(requestRetries) {
    return `An error occurred with our connection to Stripe.${requestRetries > 0 ? ` Request was retried ${requestRetries} times.` : ""}`;
  }
  // For more on when and how to retry API requests, see https://stripe.com/docs/error-handling#safely-retrying-requests-with-idempotency
  static _shouldRetry(res, numRetries, maxRetries, error) {
    if (error && numRetries === 0 && HttpClient.CONNECTION_CLOSED_ERROR_CODES.includes(error.code)) {
      return true;
    }
    if (numRetries >= maxRetries) {
      return false;
    }
    if (!res) {
      return true;
    }
    if (res.getHeaders()["stripe-should-retry"] === "false") {
      return false;
    }
    if (res.getHeaders()["stripe-should-retry"] === "true") {
      return true;
    }
    if (res.getStatusCode() === 409) {
      return true;
    }
    if (res.getStatusCode() >= 500) {
      return true;
    }
    return false;
  }
  _getSleepTimeInMS(numRetries, retryAfter) {
    const initialNetworkRetryDelay = this._stripe.getInitialNetworkRetryDelay();
    const maxNetworkRetryDelay = this._stripe.getMaxNetworkRetryDelay();
    let sleepSeconds = Math.min(initialNetworkRetryDelay * Math.pow(2, numRetries - 1), maxNetworkRetryDelay);
    sleepSeconds *= 0.5 * (1 + Math.random());
    sleepSeconds = Math.max(initialNetworkRetryDelay, sleepSeconds);
    if (Number.isInteger(retryAfter) && retryAfter <= MAX_RETRY_AFTER_WAIT) {
      sleepSeconds = Math.max(sleepSeconds, retryAfter);
    }
    return sleepSeconds * 1e3;
  }
  // Max retries can be set on a per request basis. Favor those over the global setting
  _getMaxNetworkRetries(settings = {}) {
    return settings.maxNetworkRetries !== void 0 && Number.isInteger(settings.maxNetworkRetries) ? settings.maxNetworkRetries : this._stripe.getMaxNetworkRetries();
  }
  _defaultIdempotencyKey(method, settings, apiMode) {
    const maxRetries = this._getMaxNetworkRetries(settings);
    const genKey = () => `stripe-node-retry-${this._stripe._platformFunctions.uuid4()}`;
    if (apiMode === "v2") {
      if (method === "POST" || method === "DELETE") {
        return genKey();
      }
    } else if (apiMode === "v1") {
      if (method === "POST" && maxRetries > 0) {
        return genKey();
      }
    }
    return null;
  }
  _makeHeaders({ contentType, contentLength, apiVersion, clientUserAgent, method, userSuppliedHeaders, userSuppliedSettings, stripeAccount, stripeContext, apiMode }) {
    const defaultHeaders = {
      Accept: "application/json",
      "Content-Type": contentType,
      "User-Agent": this._getUserAgentString(apiMode),
      "X-Stripe-Client-User-Agent": clientUserAgent,
      "X-Stripe-Client-Telemetry": this._getTelemetryHeader(),
      "Stripe-Version": apiVersion,
      "Stripe-Account": stripeAccount,
      "Stripe-Context": stripeContext,
      "Idempotency-Key": this._defaultIdempotencyKey(method, userSuppliedSettings, apiMode)
    };
    const methodHasPayload = method == "POST" || method == "PUT" || method == "PATCH";
    if (methodHasPayload || contentLength) {
      if (!methodHasPayload) {
        this._stripe._platformFunctions.emitWarning(`${method} method had non-zero contentLength but no payload is expected for this verb`);
      }
      defaultHeaders["Content-Length"] = contentLength;
    }
    return Object.assign(
      removeNullish(defaultHeaders),
      // If the user supplied, say 'idempotency-key', override instead of appending by ensuring caps are the same.
      normalizeHeaders(userSuppliedHeaders)
    );
  }
  _getUserAgentString(apiMode) {
    const packageVersion = this._stripe.getConstant("PACKAGE_VERSION");
    const appInfo = this._stripe._appInfo ? this._stripe.getAppInfoAsString() : "";
    const aiAgent = this._stripe.getConstant("AI_AGENT");
    let uaString = `Stripe/${apiMode} NodeBindings/${packageVersion}`;
    if (appInfo) {
      uaString += ` ${appInfo}`;
    }
    if (aiAgent) {
      uaString += ` AIAgent/${aiAgent}`;
    }
    return uaString;
  }
  _getTelemetryHeader() {
    if (this._stripe.getTelemetryEnabled() && this._stripe._prevRequestMetrics.length > 0) {
      const metrics = this._stripe._prevRequestMetrics.shift();
      return JSON.stringify({
        last_request_metrics: metrics
      });
    }
  }
  _recordRequestMetrics(requestId, requestDurationMs, usage) {
    if (this._stripe.getTelemetryEnabled() && requestId) {
      if (this._stripe._prevRequestMetrics.length > this._maxBufferedRequestMetric) {
        this._stripe._platformFunctions.emitWarning("Request metrics buffer is full, dropping telemetry message.");
      } else {
        const m = {
          request_id: requestId,
          request_duration_ms: requestDurationMs
        };
        if (usage && usage.length > 0) {
          m.usage = usage;
        }
        this._stripe._prevRequestMetrics.push(m);
      }
    }
  }
  _rawRequest(method, path, params, options, usage) {
    return new Promise((resolve, reject) => {
      try {
        const requestMethod = method.toUpperCase();
        if (requestMethod !== "POST" && params && Object.keys(params).length !== 0) {
          throw new Error("rawRequest only supports params on POST requests. Please pass null and add your parameters to path.");
        }
        const data = requestMethod === "POST" ? Object.assign({}, params) : null;
        const processed = processOptions(options);
        if (options?.additionalHeaders) {
          Object.assign(processed.headers, options.additionalHeaders);
        }
        const apiBase = processed.apiBase || (options?.apiBase ?? null);
        const host = apiBase ? this._stripe.resolveBaseAddress(apiBase) : null;
        this._request(requestMethod, host, path, data, processed.authenticator, {
          headers: processed.headers,
          settings: processed.settings,
          streaming: processed.streaming
        }, usage || ["raw_request"], (err, response) => {
          if (err) {
            reject(err);
          } else {
            resolve(response);
          }
        });
      } catch (err) {
        reject(err);
      }
    });
  }
  _getContentLength(data) {
    return typeof data === "string" ? new TextEncoder().encode(data).length : data.length;
  }
  /**
   * This is the main HTTP method that all resources eventually call
   */
  _request(method, host, path, data, authenticator, options, usage = [], callback, requestDataProcessor = null) {
    let requestData;
    authenticator = authenticator ?? this._stripe._authenticator;
    const apiMode = getAPIMode(path);
    const retryRequest = (requestFn, apiVersion, headers, requestRetries, retryAfter) => {
      return setTimeout(requestFn, this._getSleepTimeInMS(requestRetries, retryAfter), apiVersion, headers, requestRetries + 1);
    };
    const makeRequest = (apiVersion, headers, numRetries) => {
      const timeout = options.settings && options.settings.timeout && Number.isInteger(options.settings.timeout) && options.settings.timeout >= 0 ? options.settings.timeout : this._stripe.getApiField("timeout");
      const request = {
        host: host || this._stripe.getApiField("host"),
        port: this._stripe.getApiField("port"),
        path,
        method,
        headers: Object.assign({}, headers),
        body: requestData,
        protocol: this._stripe.getApiField("protocol")
      };
      if (!authenticator) {
        throw Error("Authenticator was't initialized. Please pass an API Key or an Authenticator when initializing StripeClient.");
      }
      authenticator(request).then(() => {
        const req = this._stripe.getApiField("httpClient").makeRequest(request.host, request.port, request.path, request.method, request.headers, request.body, request.protocol, timeout);
        const requestStartTime = Date.now();
        const requestEvent = removeNullish({
          api_version: apiVersion,
          account: parseHttpHeaderAsString(headers["Stripe-Account"]),
          idempotency_key: parseHttpHeaderAsString(headers["Idempotency-Key"]),
          method,
          path,
          body: this._stripe.getEmitEventBodiesEnabled() ? data ?? void 0 : void 0,
          request_start_time: requestStartTime
        });
        const requestRetries = numRetries || 0;
        const maxRetries = this._getMaxNetworkRetries(options.settings || {});
        this._stripe._emitter.emit("request", requestEvent);
        req.then((res) => {
          if (_RequestSender._shouldRetry(res, requestRetries, maxRetries)) {
            return retryRequest(makeRequest, apiVersion, headers, requestRetries, parseHttpHeaderAsNumber(res.getHeaders()["retry-after"]));
          } else if (options.streaming && res.getStatusCode() < 400) {
            return this._streamingResponseHandler(requestEvent, usage, callback)(res);
          } else {
            return this._jsonResponseHandler(requestEvent, apiMode, usage, callback)(res);
          }
        }).catch((error) => {
          if (_RequestSender._shouldRetry(null, requestRetries, maxRetries, error)) {
            return retryRequest(makeRequest, apiVersion, headers, requestRetries);
          } else {
            const isTimeoutError = error.code && error.code === HttpClient.TIMEOUT_ERROR_CODE;
            return callback(new StripeConnectionError({
              message: isTimeoutError ? `Request aborted due to timeout being reached (${timeout}ms)` : _RequestSender._generateConnectionErrorMessage(requestRetries),
              detail: error
            }));
          }
        });
      }).catch((e) => {
        throw new StripeError({
          message: "Unable to authenticate the request",
          exception: e
        });
      });
    };
    const prepareAndMakeRequest = (error, data2) => {
      if (error) {
        return callback(error);
      }
      requestData = data2;
      this._stripe.getClientUserAgent((clientUserAgent) => {
        const apiVersion = this._stripe.getApiField("version");
        const headers = this._makeHeaders({
          contentType: apiMode == "v2" ? "application/json" : "application/x-www-form-urlencoded",
          contentLength: this._getContentLength(data2),
          apiVersion,
          clientUserAgent,
          method,
          // other callers expect null, but .headers being optional means it's undefined if not supplied. So we normalize to null.
          userSuppliedHeaders: options.headers ?? null,
          userSuppliedSettings: options.settings ?? {},
          stripeAccount: options.stripeAccount ?? this._stripe.getApiField("stripeAccount"),
          stripeContext: this._normalizeStripeContext(options.stripeContext, this._stripe.getApiField("stripeContext")),
          apiMode
        });
        makeRequest(apiVersion, headers, 0);
      });
    };
    if (requestDataProcessor) {
      requestDataProcessor(method, data, options.headers, prepareAndMakeRequest);
    } else {
      let stringifiedData;
      if (apiMode == "v2") {
        stringifiedData = data ? jsonStringifyRequestData(data) : "";
      } else {
        stringifiedData = queryStringifyRequestData(data || {});
      }
      prepareAndMakeRequest(null, stringifiedData);
    }
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/V2Coercion.js
var coerceV2RequestData = (data, schema) => {
  if (data == null) {
    return data;
  }
  switch (schema.kind) {
    case "int64_string":
      return typeof data === "bigint" || typeof data === "number" ? String(data) : data;
    case "decimal_string":
      return typeof data.toFixed === "function" && typeof data.isZero === "function" ? data.toString() : data;
    case "object": {
      if (typeof data !== "object" || Array.isArray(data)) {
        return data;
      }
      const obj = data;
      const result = {};
      for (const key of Object.keys(obj)) {
        const fieldSchema = schema.fields[key];
        result[key] = fieldSchema ? coerceV2RequestData(obj[key], fieldSchema) : obj[key];
      }
      return result;
    }
    case "array": {
      if (!Array.isArray(data)) {
        return data;
      }
      return data.map((element) => coerceV2RequestData(element, schema.element));
    }
    case "nullable":
      return coerceV2RequestData(data, schema.inner);
  }
};
var coerceV2ResponseData = (data, schema) => {
  if (data == null) {
    return data;
  }
  switch (schema.kind) {
    case "int64_string":
      if (typeof data === "string") {
        try {
          return BigInt(data);
        } catch {
          throw new Error(`Failed to coerce int64_string value: expected an integer string, got '${data}'`);
        }
      }
      return data;
    case "decimal_string":
      if (typeof data === "string") {
        try {
          return Decimal.from(data);
        } catch {
          throw new Error(`Failed to coerce decimal_string value: expected a decimal string, got '${data}'`);
        }
      }
      return data;
    case "object": {
      if (typeof data !== "object" || Array.isArray(data)) {
        return data;
      }
      const obj = data;
      for (const key of Object.keys(schema.fields)) {
        if (key in obj) {
          obj[key] = coerceV2ResponseData(obj[key], schema.fields[key]);
        }
      }
      return obj;
    }
    case "array": {
      if (!Array.isArray(data)) {
        return data;
      }
      for (let i = 0; i < data.length; i++) {
        data[i] = coerceV2ResponseData(data[i], schema.element);
      }
      return data;
    }
    case "nullable":
      return coerceV2ResponseData(data, schema.inner);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/autoPagination.js
var V1Iterator = class {
  constructor(firstPagePromise, params, options, method, path, spec, stripeResource) {
    this.index = 0;
    this.pagePromise = firstPagePromise;
    this.promiseCache = { currentPromise: null };
    this.params = params;
    this.options = options;
    this.method = method;
    this.path = path;
    this.spec = spec;
    this.stripeResource = stripeResource;
  }
  async iterate(pageResult) {
    if (!(pageResult && pageResult.data && typeof pageResult.data.length === "number")) {
      throw Error("Unexpected: Stripe API response does not have a well-formed `data` array.");
    }
    const reverseIteration = !!this.params.ending_before;
    if (this.index < pageResult.data.length) {
      const idx = reverseIteration ? pageResult.data.length - 1 - this.index : this.index;
      const value = pageResult.data[idx];
      this.index += 1;
      return { value, done: false };
    } else if (pageResult.has_more) {
      this.index = 0;
      this.pagePromise = this.getNextPage(pageResult);
      const nextPageResult = await this.pagePromise;
      return this.iterate(nextPageResult);
    }
    return { done: true, value: void 0 };
  }
  /** @abstract */
  getNextPage(_pageResult) {
    throw new Error("Unimplemented");
  }
  async _next() {
    return this.iterate(await this.pagePromise);
  }
  next() {
    if (this.promiseCache.currentPromise) {
      return this.promiseCache.currentPromise;
    }
    const nextPromise = (async () => {
      const ret = await this._next();
      this.promiseCache.currentPromise = null;
      return ret;
    })();
    this.promiseCache.currentPromise = nextPromise;
    return nextPromise;
  }
};
var V1ListIterator = class extends V1Iterator {
  getNextPage(pageResult) {
    const reverseIteration = !!this.params.ending_before;
    const lastId = getLastId(pageResult, reverseIteration);
    const nextParams = {
      ...this.params,
      [reverseIteration ? "ending_before" : "starting_after"]: lastId
    };
    return this.stripeResource._makeRequest(this.method, this.path, nextParams, this.options, this.spec);
  }
};
var V1SearchIterator = class extends V1Iterator {
  getNextPage(pageResult) {
    if (!pageResult.next_page) {
      throw Error("Unexpected: Stripe API response does not have a well-formed `next_page` field, but `has_more` was true.");
    }
    const nextParams = {
      ...this.params,
      page: pageResult.next_page
    };
    return this.stripeResource._makeRequest(this.method, this.path, nextParams, this.options, this.spec);
  }
};
var V2ListIterator = class {
  constructor(firstPagePromise, options, spec, stripeResource) {
    this.firstPagePromise = firstPagePromise;
    this.currentPageIterator = null;
    this.nextPageUrl = null;
    this.promiseCache = { currentPromise: null };
    this.options = options;
    this.spec = spec;
    this.stripeResource = stripeResource;
  }
  async initFirstPage() {
    if (this.firstPagePromise) {
      const page = await this.firstPagePromise;
      this.firstPagePromise = null;
      this.currentPageIterator = page.data[Symbol.iterator]();
      this.nextPageUrl = page.next_page_url || null;
    }
  }
  async turnPage() {
    if (!this.nextPageUrl)
      return null;
    const page = await this.stripeResource._makeRequest("GET", this.nextPageUrl, void 0, this.options, this.spec);
    this.nextPageUrl = page.next_page_url || null;
    this.currentPageIterator = page.data[Symbol.iterator]();
    return this.currentPageIterator;
  }
  async _next() {
    await this.initFirstPage();
    if (this.currentPageIterator) {
      const result = this.currentPageIterator.next();
      if (!result.done)
        return { done: false, value: result.value };
    }
    return this.nextFromNewPage();
  }
  async nextFromNewPage() {
    const nextPageIterator = await this.turnPage();
    if (!nextPageIterator) {
      return { done: true, value: void 0 };
    }
    const result = nextPageIterator.next();
    if (!result.done)
      return { done: false, value: result.value };
    return this.nextFromNewPage();
  }
  next() {
    if (this.promiseCache.currentPromise) {
      return this.promiseCache.currentPromise;
    }
    const nextPromise = (async () => {
      try {
        return await this._next();
      } finally {
        this.promiseCache.currentPromise = null;
      }
    })();
    this.promiseCache.currentPromise = nextPromise;
    return nextPromise;
  }
};
var makeAutoPaginationMethods = (stripeResource, params, options, method, path, spec, firstPagePromise) => {
  const apiMode = getAPIMode(path);
  const methodType = spec?.methodType;
  if (apiMode !== "v2" && methodType === "search") {
    return makeAutoPaginationMethodsFromIterator(new V1SearchIterator(firstPagePromise, params, options, method, path, spec, stripeResource));
  }
  if (apiMode !== "v2" && methodType === "list") {
    return makeAutoPaginationMethodsFromIterator(new V1ListIterator(firstPagePromise, params, options, method, path, spec, stripeResource));
  }
  if (apiMode === "v2" && methodType === "list") {
    return makeAutoPaginationMethodsFromIterator(new V2ListIterator(firstPagePromise, options, spec, stripeResource));
  }
  return null;
};
var makeAutoPaginationMethodsFromIterator = (iterator) => {
  const autoPagingEach = makeAutoPagingEach((...args) => iterator.next(...args));
  const autoPagingToArray = makeAutoPagingToArray(autoPagingEach);
  const autoPaginationMethods = {
    autoPagingEach,
    autoPagingToArray,
    // Async iterator functions:
    next: () => iterator.next(),
    return: () => {
      return {};
    },
    [getAsyncIteratorSymbol()]: () => {
      return autoPaginationMethods;
    }
  };
  return autoPaginationMethods;
};
function getAsyncIteratorSymbol() {
  if (typeof Symbol !== "undefined" && Symbol.asyncIterator) {
    return Symbol.asyncIterator;
  }
  return "@@asyncIterator";
}
function getDoneCallback(args) {
  if (args.length < 2) {
    return null;
  }
  const onDone = args[1];
  if (typeof onDone !== "function") {
    throw Error(`The second argument to autoPagingEach, if present, must be a callback function; received ${typeof onDone}`);
  }
  return onDone;
}
function getItemCallback(args) {
  if (args.length === 0) {
    return void 0;
  }
  const onItem = args[0];
  if (typeof onItem !== "function") {
    throw Error(`The first argument to autoPagingEach, if present, must be a callback function; received ${typeof onItem}`);
  }
  if (onItem.length === 2) {
    return onItem;
  }
  if (onItem.length > 2) {
    throw Error(`The \`onItem\` callback function passed to autoPagingEach must accept at most two arguments; got ${onItem}`);
  }
  return function _onItem(item, next) {
    const shouldContinue = onItem(item);
    next(shouldContinue);
  };
}
function getLastId(listResult, reverseIteration) {
  const lastIdx = reverseIteration ? 0 : listResult.data.length - 1;
  const lastItem = listResult.data[lastIdx];
  const lastId = lastItem && lastItem.id;
  if (!lastId) {
    throw Error("Unexpected: No `id` found on the last item while auto-paging a list.");
  }
  return lastId;
}
function makeAutoPagingEach(asyncIteratorNext) {
  return function autoPagingEach() {
    const callSiteStack = new Error().stack;
    const args = [].slice.call(arguments);
    const onItem = getItemCallback(args);
    const onDone = getDoneCallback(args);
    if (args.length > 2) {
      throw Error(`autoPagingEach takes up to two arguments; received ${args}`);
    }
    const autoPagePromise = wrapAsyncIteratorWithCallback(
      asyncIteratorNext,
      // @ts-ignore we might need a null check
      onItem
    ).catch((err) => {
      attachCallSiteToError(err, callSiteStack);
      throw err;
    });
    if (onDone) {
      autoPagePromise.then(() => onDone(), (err) => onDone(err));
    }
    return autoPagePromise;
  };
}
function makeAutoPagingToArray(autoPagingEach) {
  return function autoPagingToArray(opts, onDone) {
    const callSiteStack = new Error().stack;
    const limit = opts && opts.limit;
    if (!limit) {
      throw Error("You must pass a `limit` option to autoPagingToArray, e.g., `autoPagingToArray({limit: 1000});`.");
    }
    if (limit > 1e4) {
      throw Error("You cannot specify a limit of more than 10,000 items to fetch in `autoPagingToArray`; use `autoPagingEach` to iterate through longer lists.");
    }
    const promise = new Promise((resolve, reject) => {
      const items2 = [];
      autoPagingEach((item) => {
        items2.push(item);
        if (items2.length >= limit) {
          return false;
        }
      }).then(() => {
        resolve(items2);
      }).catch((err) => {
        attachCallSiteToError(err, callSiteStack);
        reject(err);
      });
    });
    if (onDone) {
      promise.then((items2) => onDone(null, items2), (err) => onDone(err));
    }
    return promise;
  };
}
function wrapAsyncIteratorWithCallback(asyncIteratorNext, onItem) {
  return new Promise((resolve, reject) => {
    function handleIteration(iterResult) {
      if (iterResult.done) {
        resolve();
        return;
      }
      const item = iterResult.value;
      return new Promise((next) => {
        onItem(item, next);
      }).then((shouldContinue) => {
        if (shouldContinue === false) {
          return handleIteration({ done: true, value: void 0 });
        } else {
          return asyncIteratorNext().then(handleIteration);
        }
      });
    }
    asyncIteratorNext().then(handleIteration).catch(reject);
  });
}

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/StripeResource.js
var StripeResource = class {
  constructor(stripe, deprecatedUrlData) {
    this.resourcePath = "";
    this.requestDataProcessor = null;
    this._stripe = stripe;
    if (deprecatedUrlData) {
      throw new Error("Support for curried url params was dropped in stripe-node v7.0.0. Instead, pass two ids.");
    }
    this.basePath = makeURLInterpolator(
      // @ts-expect-error changing type of basePath
      this.basePath || stripe.getApiField("basePath")
    );
    const rawPath = this.path || "";
    this.resourcePath = rawPath;
    this.path = makeURLInterpolator(rawPath);
    this.initialize(stripe, deprecatedUrlData);
  }
  initialize(_stripe, _deprecatedUrlData) {
  }
  _makeRequest(method, path, params, options, spec) {
    const requestMethod = method.toUpperCase();
    const encode = spec?.encode || ((data2) => data2);
    const data = encode(params ? { ...params } : {});
    const processed = processOptions(options);
    const apiBase = processed.apiBase || spec?.apiBase || null;
    const host = apiBase ? this._stripe.resolveBaseAddress(apiBase) : null;
    const streaming = processed.streaming || !!spec?.streaming;
    const headers = Object.assign(processed.headers, spec?.headers);
    const usage = spec?.usage || [];
    const dataInQuery = requestMethod === "GET" || requestMethod === "DELETE";
    let bodyData = dataInQuery ? null : data;
    const queryData = dataInQuery ? data : {};
    try {
      if (spec?.validator) {
        spec.validator(data, { headers });
      }
      if (spec?.requestSchema && bodyData) {
        bodyData = coerceV2RequestData(bodyData, spec.requestSchema);
      }
    } catch (err) {
      return Promise.reject(err);
    }
    const callSiteStack = new Error().stack;
    const innerPromise = new Promise((resolve, reject) => {
      function requestCallback(err, response) {
        if (err) {
          attachCallSiteToError(err, callSiteStack);
          reject(err);
        } else {
          try {
            if (spec?.responseSchema) {
              coerceV2ResponseData(response, spec.responseSchema);
            }
            resolve(spec?.transformResponseData ? spec.transformResponseData(response) : response);
          } catch (e) {
            reject(e);
          }
        }
      }
      const emptyQuery = Object.keys(queryData).length === 0;
      const fullPath = [
        path,
        emptyQuery ? "" : "?",
        queryStringifyRequestData(queryData)
      ].join("");
      this._stripe._requestSender._request(requestMethod, host, fullPath, bodyData, processed.authenticator, {
        headers,
        settings: processed.settings,
        streaming
      }, usage, requestCallback, this.requestDataProcessor?.bind(this));
    });
    if (spec?.methodType) {
      Object.assign(innerPromise, makeAutoPaginationMethods(this, params ? { ...params } : {}, options, requestMethod, path, spec, innerPromise));
    }
    return innerPromise;
  }
};
StripeResource.MAX_BUFFERED_REQUEST_METRICS = 100;

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/StripeContext.js
var StripeContext = class _StripeContext {
  /**
   * Creates a new StripeContext with the given segments.
   */
  constructor(segments = []) {
    this._segments = [...segments];
  }
  /**
   * Gets a copy of the segments of this Context.
   */
  get segments() {
    return [...this._segments];
  }
  /**
   * Creates a new StripeContext with an additional segment appended.
   */
  push(segment) {
    if (!segment) {
      throw new Error("Segment cannot be null or undefined");
    }
    return new _StripeContext([...this._segments, segment]);
  }
  /**
   * Creates a new StripeContext with the last segment removed.
   * If there are no segments, throws an error.
   */
  pop() {
    if (this._segments.length === 0) {
      throw new Error("Cannot pop from an empty context");
    }
    return new _StripeContext(this._segments.slice(0, -1));
  }
  /**
   * Converts this context to its string representation.
   */
  toString() {
    return this._segments.join("/");
  }
  /**
   * Parses a context string into a StripeContext instance.
   */
  static parse(contextStr) {
    if (!contextStr) {
      return new _StripeContext([]);
    }
    return new _StripeContext(contextStr.split("/"));
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/Webhooks.js
function createWebhooks(platformFunctions) {
  const Webhook = {
    DEFAULT_TOLERANCE: 300,
    signature: null,
    constructEvent(payload, header, secret, tolerance, cryptoProvider, receivedAt) {
      try {
        if (!this.signature) {
          throw new Error("ERR: missing signature helper, unable to verify");
        }
        cryptoProvider = cryptoProvider || getCryptoProvider();
        this.signature.verifyHeader(payload, header, secret, tolerance || Webhook.DEFAULT_TOLERANCE, cryptoProvider, receivedAt);
      } catch (e) {
        if (e instanceof CryptoProviderOnlySupportsAsyncError) {
          e.message += "\nUse `await constructEventAsync(...)` instead of `constructEvent(...)`";
        }
        throw e;
      }
      const jsonPayload = payload instanceof Uint8Array ? JSON.parse(new TextDecoder("utf8").decode(payload)) : JSON.parse(payload);
      if (jsonPayload && jsonPayload.object === "v2.core.event") {
        throw new Error("You passed an event notification to stripe.webhooks.constructEvent, which expects a webhook payload. Use stripe.parseEventNotification instead.");
      }
      return jsonPayload;
    },
    async constructEventAsync(payload, header, secret, tolerance, cryptoProvider, receivedAt) {
      if (!this.signature) {
        throw new Error("ERR: missing signature helper, unable to verify");
      }
      cryptoProvider = cryptoProvider || getCryptoProvider();
      await this.signature.verifyHeaderAsync(payload, header, secret, tolerance || Webhook.DEFAULT_TOLERANCE, cryptoProvider, receivedAt);
      const jsonPayload = payload instanceof Uint8Array ? JSON.parse(new TextDecoder("utf8").decode(payload)) : JSON.parse(payload);
      if (jsonPayload && jsonPayload.object === "v2.core.event") {
        throw new Error("You passed an event notification to stripe.webhooks.constructEvent, which expects a webhook payload. Use stripe.parseEventNotificationAsync instead.");
      }
      return jsonPayload;
    },
    /**
     * Generates a header to be used for webhook mocking
     *
     * @typedef {object} opts
     * @property {number} timestamp - Timestamp of the header. Defaults to Date.now()
     * @property {string} payload - JSON stringified payload object, containing the 'id' and 'object' parameters
     * @property {string} secret - Stripe webhook secret 'whsec_...'
     * @property {string} scheme - Version of API to hit. Defaults to 'v1'.
     * @property {string} signature - Computed webhook signature
     * @property {CryptoProvider} cryptoProvider - Crypto provider to use for computing the signature if none was provided. Defaults to NodeCryptoProvider.
     */
    generateTestHeaderString: function(opts) {
      const preparedOpts = prepareOptions(opts);
      const signature2 = preparedOpts.signature || preparedOpts.cryptoProvider.computeHMACSignature(preparedOpts.payloadString, preparedOpts.secret);
      return preparedOpts.generateHeaderString(signature2);
    },
    generateTestHeaderStringAsync: async function(opts) {
      const preparedOpts = prepareOptions(opts);
      const signature2 = preparedOpts.signature || await preparedOpts.cryptoProvider.computeHMACSignatureAsync(preparedOpts.payloadString, preparedOpts.secret);
      return preparedOpts.generateHeaderString(signature2);
    }
  };
  const signature = {
    EXPECTED_SCHEME: "v1",
    verifyHeader(encodedPayload, encodedHeader, secret, tolerance, cryptoProvider, receivedAt) {
      const { decodedHeader: header, decodedPayload: payload, details, suspectPayloadType } = parseEventDetails(encodedPayload, encodedHeader, this.EXPECTED_SCHEME);
      const secretContainsWhitespace = /\s/.test(secret);
      cryptoProvider = cryptoProvider || getCryptoProvider();
      const expectedSignature = cryptoProvider.computeHMACSignature(makeHMACContent(payload, details), secret);
      validateComputedSignature(payload, header, details, expectedSignature, tolerance || 0, suspectPayloadType, secretContainsWhitespace, receivedAt);
      return true;
    },
    async verifyHeaderAsync(encodedPayload, encodedHeader, secret, tolerance, cryptoProvider, receivedAt) {
      const { decodedHeader: header, decodedPayload: payload, details, suspectPayloadType } = parseEventDetails(encodedPayload, encodedHeader, this.EXPECTED_SCHEME);
      const secretContainsWhitespace = /\s/.test(secret);
      cryptoProvider = cryptoProvider || getCryptoProvider();
      const expectedSignature = await cryptoProvider.computeHMACSignatureAsync(makeHMACContent(payload, details), secret);
      return validateComputedSignature(payload, header, details, expectedSignature, tolerance || 0, suspectPayloadType, secretContainsWhitespace, receivedAt);
    }
  };
  function makeHMACContent(payload, details) {
    return `${details.timestamp}.${payload}`;
  }
  function parseEventDetails(encodedPayload, encodedHeader, expectedScheme) {
    if (Array.isArray(encodedHeader)) {
      throw new Error("Unexpected: An array was passed as a header, which should not be possible for the stripe-signature header.");
    }
    if (!encodedPayload) {
      throw new StripeSignatureVerificationError(encodedHeader, encodedPayload, {
        message: "No webhook payload was provided."
      });
    }
    const suspectPayloadType = typeof encodedPayload != "string" && !(encodedPayload instanceof Uint8Array);
    const textDecoder = new TextDecoder("utf8");
    const decodedPayload = encodedPayload instanceof Uint8Array ? textDecoder.decode(encodedPayload) : encodedPayload;
    if (encodedHeader == null || encodedHeader == "") {
      throw new StripeSignatureVerificationError(encodedHeader, encodedPayload, {
        message: "No stripe-signature header value was provided."
      });
    }
    const decodedHeader = encodedHeader instanceof Uint8Array ? textDecoder.decode(encodedHeader) : encodedHeader;
    const details = parseHeader(decodedHeader, expectedScheme);
    if (!details || details.timestamp === -1) {
      throw new StripeSignatureVerificationError(decodedHeader, decodedPayload, {
        message: "Unable to extract timestamp and signatures from header"
      });
    }
    if (!details.signatures.length) {
      throw new StripeSignatureVerificationError(decodedHeader, decodedPayload, {
        message: "No signatures found with expected scheme"
      });
    }
    return {
      decodedPayload,
      decodedHeader,
      details,
      suspectPayloadType
    };
  }
  function validateComputedSignature(payload, header, details, expectedSignature, tolerance, suspectPayloadType, secretContainsWhitespace, receivedAt) {
    const signatureFound = !!details.signatures.filter(platformFunctions.secureCompare.bind(platformFunctions, expectedSignature)).length;
    const docsLocation = "\nLearn more about webhook signing and explore webhook integration examples for various frameworks at https://docs.stripe.com/webhooks/signature";
    const whitespaceMessage = secretContainsWhitespace ? "\n\nNote: The provided signing secret contains whitespace. This often indicates an extra newline or space is in the value" : "";
    if (!signatureFound) {
      if (suspectPayloadType) {
        throw new StripeSignatureVerificationError(header, payload, {
          message: "Webhook payload must be provided as a string or a Buffer (https://nodejs.org/api/buffer.html) instance representing the _raw_ request body.Payload was provided as a parsed JavaScript object instead. \nSignature verification is impossible without access to the original signed material. \n" + docsLocation + "\n" + whitespaceMessage
        });
      }
      throw new StripeSignatureVerificationError(header, payload, {
        message: "No signatures found matching the expected signature for payload. Are you passing the raw request body you received from Stripe? \n If a webhook request is being forwarded by a third-party tool, ensure that the exact request body, including JSON formatting and new line style, is preserved.\n" + docsLocation + "\n" + whitespaceMessage
      });
    }
    const timestampAge = Math.floor((typeof receivedAt === "number" ? receivedAt : Date.now()) / 1e3) - details.timestamp;
    if (tolerance > 0 && timestampAge > tolerance) {
      throw new StripeSignatureVerificationError(header, payload, {
        message: "Timestamp outside the tolerance zone"
      });
    }
    return true;
  }
  function parseHeader(header, scheme) {
    if (typeof header !== "string") {
      return null;
    }
    scheme = scheme || signature.EXPECTED_SCHEME;
    return header.split(",").reduce((accum, item) => {
      const kv = item.split("=");
      if (kv[0] === "t") {
        accum.timestamp = parseInt(kv[1], 10);
      }
      if (kv[0] === scheme) {
        accum.signatures.push(kv[1]);
      }
      return accum;
    }, {
      timestamp: -1,
      signatures: []
    });
  }
  let webhooksCryptoProviderInstance = null;
  function getCryptoProvider() {
    if (!webhooksCryptoProviderInstance) {
      webhooksCryptoProviderInstance = platformFunctions.createDefaultCryptoProvider();
    }
    return webhooksCryptoProviderInstance;
  }
  function prepareOptions(opts) {
    if (!opts) {
      throw new StripeError({
        message: "Options are required"
      });
    }
    const timestamp = opts.timestamp && Math.floor(opts.timestamp) || Math.floor(Date.now() / 1e3);
    const scheme = opts.scheme || signature.EXPECTED_SCHEME;
    const cryptoProvider = opts.cryptoProvider || getCryptoProvider();
    const payloadString = `${timestamp}.${opts.payload}`;
    const generateHeaderString = (signature2) => {
      return `t=${timestamp},${scheme}=${signature2}`;
    };
    return {
      ...opts,
      timestamp,
      scheme,
      cryptoProvider,
      payloadString,
      generateHeaderString
    };
  }
  Webhook.signature = signature;
  return Webhook;
}

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/apiVersion.js
var ApiVersion = "2026-06-24.dahlia";

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources.js
var resources_exports = {};
__export(resources_exports, {
  Account: () => AccountResource3,
  AccountLinks: () => AccountLinkResource2,
  AccountSessions: () => AccountSessionResource,
  Accounts: () => AccountResource3,
  ApplePayDomains: () => ApplePayDomainResource,
  ApplicationFees: () => ApplicationFeeResource,
  Apps: () => Apps,
  Balance: () => BalanceResource,
  BalanceSettings: () => BalanceSettingResource,
  BalanceTransactions: () => BalanceTransactionResource,
  Balances: () => BalanceResource,
  Billing: () => Billing,
  BillingPortal: () => BillingPortal,
  Charges: () => ChargeResource,
  Checkout: () => Checkout,
  Climate: () => Climate,
  ConfirmationTokens: () => ConfirmationTokenResource2,
  CountrySpecs: () => CountrySpecResource,
  Coupons: () => CouponResource,
  CreditNotes: () => CreditNoteResource,
  CustomerSessions: () => CustomerSessionResource,
  Customers: () => CustomerResource2,
  Disputes: () => DisputeResource2,
  Entitlements: () => Entitlements,
  EphemeralKeys: () => EphemeralKeyResource,
  Events: () => EventResource2,
  ExchangeRates: () => ExchangeRateResource,
  FileLinks: () => FileLinkResource,
  Files: () => FileResource,
  FinancialConnections: () => FinancialConnections,
  Forwarding: () => Forwarding,
  Identity: () => Identity,
  InvoiceItems: () => InvoiceItemResource,
  InvoicePayments: () => InvoicePaymentResource,
  InvoiceRenderingTemplates: () => InvoiceRenderingTemplateResource,
  Invoices: () => InvoiceResource,
  Issuing: () => Issuing,
  Mandates: () => MandateResource,
  OAuthResource: () => OAuthResource,
  PaymentAttemptRecords: () => PaymentAttemptRecordResource,
  PaymentIntents: () => PaymentIntentResource,
  PaymentLinks: () => PaymentLinkResource,
  PaymentMethodConfigurations: () => PaymentMethodConfigurationResource,
  PaymentMethodDomains: () => PaymentMethodDomainResource,
  PaymentMethods: () => PaymentMethodResource,
  PaymentRecords: () => PaymentRecordResource,
  Payouts: () => PayoutResource,
  Plans: () => PlanResource,
  Prices: () => PriceResource,
  Products: () => ProductResource2,
  PromotionCodes: () => PromotionCodeResource,
  Quotes: () => QuoteResource,
  Radar: () => Radar,
  Refunds: () => RefundResource2,
  Reporting: () => Reporting,
  Reviews: () => ReviewResource,
  SetupAttempts: () => SetupAttemptResource,
  SetupIntents: () => SetupIntentResource,
  ShippingRates: () => ShippingRateResource,
  Sigma: () => Sigma,
  Sources: () => SourceResource,
  SubscriptionItems: () => SubscriptionItemResource,
  SubscriptionSchedules: () => SubscriptionScheduleResource,
  Subscriptions: () => SubscriptionResource,
  Tax: () => Tax,
  TaxCodes: () => TaxCodeResource,
  TaxIds: () => TaxIdResource,
  TaxRates: () => TaxRateResource,
  Terminal: () => Terminal,
  TestHelpers: () => TestHelpers,
  Tokens: () => TokenResource2,
  Topups: () => TopupResource,
  Transfers: () => TransferResource,
  Treasury: () => Treasury,
  V2: () => V2,
  WebhookEndpoints: () => WebhookEndpointResource
});

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/ResourceNamespace.js
function ResourceNamespace(stripe, resources) {
  for (const name in resources) {
    if (!Object.prototype.hasOwnProperty.call(resources, name)) {
      continue;
    }
    const camelCaseName = name[0].toLowerCase() + name.substring(1);
    const resource = new resources[name](stripe);
    this[camelCaseName] = resource;
  }
}
function resourceNamespace(namespace, resources) {
  return function(stripe) {
    return new ResourceNamespace(stripe, resources);
  };
}

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/V2/Core/AccountLinks.js
var AccountLinkResource = class extends StripeResource {
  /**
   * Creates an AccountLink object that includes a single-use URL that an account can use to access a Stripe-hosted flow for collecting or updating required information.
   * @throws Stripe.RateLimitError
   */
  create(params, options) {
    return this._makeRequest("POST", "/v2/core/account_links", params, options);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/V2/Core/AccountTokens.js
var AccountTokenResource = class extends StripeResource {
  /**
   * Create an account token with a publishable key and pass it to the Accounts v2 API to
   * create or update an account without its data touching your server.
   * Learn more about [account tokens](https://docs.stripe.com/connect/account-tokens).
   * In live mode, you can only create account tokens with your application's publishable key.
   * In test mode, you can create account tokens with your secret key or publishable key.
   * @throws Stripe.RateLimitError
   */
  create(params, options) {
    return this._makeRequest("POST", "/v2/core/account_tokens", params, options, {
      requestSchema: {
        kind: "object",
        fields: {
          identity: {
            kind: "object",
            fields: {
              individual: {
                kind: "object",
                fields: {
                  relationship: {
                    kind: "object",
                    fields: { percent_ownership: { kind: "decimal_string" } }
                  }
                }
              }
            }
          }
        }
      }
    });
  }
  /**
   * Retrieves an Account Token.
   * @throws Stripe.RateLimitError
   */
  retrieve(id, params, options) {
    return this._makeRequest("GET", `/v2/core/account_tokens/${encodeURIComponent(id)}`, params, options);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/FinancialConnections/Accounts.js
var AccountResource = class extends StripeResource {
  /**
   * Returns a list of Financial Connections Account objects.
   */
  list(params, options) {
    return this._makeRequest("GET", "/v1/financial_connections/accounts", params, options, {
      methodType: "list"
    });
  }
  /**
   * Retrieves the details of an Financial Connections Account.
   */
  retrieve(id, params, options) {
    return this._makeRequest("GET", `/v1/financial_connections/accounts/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * Disables your access to a Financial Connections Account. You will no longer be able to access data associated with the account (e.g. balances, transactions).
   */
  disconnect(id, params, options) {
    return this._makeRequest("POST", `/v1/financial_connections/accounts/${encodeURIComponent(id)}/disconnect`, params, options);
  }
  /**
   * Refreshes the data associated with a Financial Connections Account.
   */
  refresh(id, params, options) {
    return this._makeRequest("POST", `/v1/financial_connections/accounts/${encodeURIComponent(id)}/refresh`, params, options);
  }
  /**
   * Subscribes to periodic refreshes of data associated with a Financial Connections Account. When the account status is active, data is typically refreshed once a day.
   */
  subscribe(id, params, options) {
    return this._makeRequest("POST", `/v1/financial_connections/accounts/${encodeURIComponent(id)}/subscribe`, params, options);
  }
  /**
   * Unsubscribes from periodic refreshes of data associated with a Financial Connections Account.
   */
  unsubscribe(id, params, options) {
    return this._makeRequest("POST", `/v1/financial_connections/accounts/${encodeURIComponent(id)}/unsubscribe`, params, options);
  }
  /**
   * Lists all owners for a given Account
   */
  listOwners(id, params, options) {
    return this._makeRequest("GET", `/v1/financial_connections/accounts/${encodeURIComponent(id)}/owners`, params, options, {
      methodType: "list"
    });
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/V2/Core/Accounts/Persons.js
var PersonResource = class extends StripeResource {
  /**
   * Returns a paginated list of Persons associated with an Account.
   * @throws Stripe.RateLimitError
   */
  list(accountId, params, options) {
    return this._makeRequest("GET", `/v2/core/accounts/${encodeURIComponent(accountId)}/persons`, params, options, {
      methodType: "list",
      responseSchema: {
        kind: "object",
        fields: {
          data: {
            kind: "array",
            element: {
              kind: "object",
              fields: {
                relationship: {
                  kind: "object",
                  fields: { percent_ownership: { kind: "decimal_string" } }
                }
              }
            }
          }
        }
      }
    });
  }
  /**
   * Create a Person. Adds an individual to an Account's identity. You can set relationship attributes and identity information at creation.
   * @throws Stripe.RateLimitError
   */
  create(accountId, params, options) {
    return this._makeRequest("POST", `/v2/core/accounts/${encodeURIComponent(accountId)}/persons`, params, options, {
      requestSchema: {
        kind: "object",
        fields: {
          relationship: {
            kind: "object",
            fields: { percent_ownership: { kind: "decimal_string" } }
          }
        }
      },
      responseSchema: {
        kind: "object",
        fields: {
          relationship: {
            kind: "object",
            fields: { percent_ownership: { kind: "decimal_string" } }
          }
        }
      }
    });
  }
  /**
   * Delete a Person associated with an Account.
   * @throws Stripe.RateLimitError
   */
  del(accountId, id, params, options) {
    return this._makeRequest("DELETE", `/v2/core/accounts/${encodeURIComponent(accountId)}/persons/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * Retrieves a Person associated with an Account.
   * @throws Stripe.RateLimitError
   */
  retrieve(accountId, id, params, options) {
    return this._makeRequest("GET", `/v2/core/accounts/${encodeURIComponent(accountId)}/persons/${encodeURIComponent(id)}`, params, options, {
      responseSchema: {
        kind: "object",
        fields: {
          relationship: {
            kind: "object",
            fields: { percent_ownership: { kind: "decimal_string" } }
          }
        }
      }
    });
  }
  /**
   * Updates a Person associated with an Account.
   * @throws Stripe.RateLimitError
   */
  update(accountId, id, params, options) {
    return this._makeRequest("POST", `/v2/core/accounts/${encodeURIComponent(accountId)}/persons/${encodeURIComponent(id)}`, params, options, {
      requestSchema: {
        kind: "object",
        fields: {
          relationship: {
            kind: "object",
            fields: { percent_ownership: { kind: "decimal_string" } }
          }
        }
      },
      responseSchema: {
        kind: "object",
        fields: {
          relationship: {
            kind: "object",
            fields: { percent_ownership: { kind: "decimal_string" } }
          }
        }
      }
    });
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/V2/Core/Accounts/PersonTokens.js
var PersonTokenResource = class extends StripeResource {
  /**
   * Creates a single-use token that represents the details for a person. Use this when you create or update persons associated with an Account v2. Learn more about [account tokens](https://docs.stripe.com/connect/account-tokens).
   * You can only create person tokens with your application's publishable key and in live mode. You can use your application's secret key to create person tokens only in test mode.
   * @throws Stripe.RateLimitError
   */
  create(accountId, params, options) {
    return this._makeRequest("POST", `/v2/core/accounts/${encodeURIComponent(accountId)}/person_tokens`, params, options, {
      requestSchema: {
        kind: "object",
        fields: {
          relationship: {
            kind: "object",
            fields: { percent_ownership: { kind: "decimal_string" } }
          }
        }
      }
    });
  }
  /**
   * Retrieves a Person Token associated with an Account.
   * @throws Stripe.RateLimitError
   */
  retrieve(accountId, id, params, options) {
    return this._makeRequest("GET", `/v2/core/accounts/${encodeURIComponent(accountId)}/person_tokens/${encodeURIComponent(id)}`, params, options);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/V2/Core/Accounts.js
var AccountResource2 = class extends StripeResource {
  constructor(stripe) {
    super(stripe);
    this.stripe = stripe;
    this.persons = new PersonResource(stripe);
    this.personTokens = new PersonTokenResource(stripe);
  }
  /**
   * Returns a list of Accounts.
   * @throws Stripe.RateLimitError
   */
  list(params, options) {
    return this._makeRequest("GET", "/v2/core/accounts", params, options, {
      methodType: "list",
      responseSchema: {
        kind: "object",
        fields: {
          data: {
            kind: "array",
            element: {
              kind: "object",
              fields: {
                identity: {
                  kind: "object",
                  fields: {
                    individual: {
                      kind: "object",
                      fields: {
                        relationship: {
                          kind: "object",
                          fields: { percent_ownership: { kind: "decimal_string" } }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
  }
  /**
   * Create an Account that represents a company, individual, or other entity that your business interacts with. Accounts contain identifying information about the entity, and configurations that store the features an account has access to. An account can be configured as any or all of the following configurations: Customer, Merchant and/or Recipient.
   * @throws Stripe.RateLimitError
   */
  create(params, options) {
    return this._makeRequest("POST", "/v2/core/accounts", params, options, {
      requestSchema: {
        kind: "object",
        fields: {
          identity: {
            kind: "object",
            fields: {
              individual: {
                kind: "object",
                fields: {
                  relationship: {
                    kind: "object",
                    fields: { percent_ownership: { kind: "decimal_string" } }
                  }
                }
              }
            }
          }
        }
      },
      responseSchema: {
        kind: "object",
        fields: {
          identity: {
            kind: "object",
            fields: {
              individual: {
                kind: "object",
                fields: {
                  relationship: {
                    kind: "object",
                    fields: { percent_ownership: { kind: "decimal_string" } }
                  }
                }
              }
            }
          }
        }
      }
    });
  }
  /**
   * Retrieves the details of an Account.
   * @throws Stripe.RateLimitError
   */
  retrieve(id, params, options) {
    return this._makeRequest("GET", `/v2/core/accounts/${encodeURIComponent(id)}`, params, options, {
      responseSchema: {
        kind: "object",
        fields: {
          identity: {
            kind: "object",
            fields: {
              individual: {
                kind: "object",
                fields: {
                  relationship: {
                    kind: "object",
                    fields: { percent_ownership: { kind: "decimal_string" } }
                  }
                }
              }
            }
          }
        }
      }
    });
  }
  /**
   * Updates the details of an Account.
   * @throws Stripe.RateLimitError
   */
  update(id, params, options) {
    return this._makeRequest("POST", `/v2/core/accounts/${encodeURIComponent(id)}`, params, options, {
      requestSchema: {
        kind: "object",
        fields: {
          identity: {
            kind: "object",
            fields: {
              individual: {
                kind: "object",
                fields: {
                  relationship: {
                    kind: "object",
                    fields: { percent_ownership: { kind: "decimal_string" } }
                  }
                }
              }
            }
          }
        }
      },
      responseSchema: {
        kind: "object",
        fields: {
          identity: {
            kind: "object",
            fields: {
              individual: {
                kind: "object",
                fields: {
                  relationship: {
                    kind: "object",
                    fields: { percent_ownership: { kind: "decimal_string" } }
                  }
                }
              }
            }
          }
        }
      }
    });
  }
  /**
   * Removes access to the Account and its associated resources. Closed Accounts can no longer be operated on, but limited information can still be retrieved through the API in order to be able to track their history.
   * @throws Stripe.RateLimitError
   */
  close(id, params, options) {
    return this._makeRequest("POST", `/v2/core/accounts/${encodeURIComponent(id)}/close`, params, options, {
      responseSchema: {
        kind: "object",
        fields: {
          identity: {
            kind: "object",
            fields: {
              individual: {
                kind: "object",
                fields: {
                  relationship: {
                    kind: "object",
                    fields: { percent_ownership: { kind: "decimal_string" } }
                  }
                }
              }
            }
          }
        }
      }
    });
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/Entitlements/ActiveEntitlements.js
var ActiveEntitlementResource = class extends StripeResource {
  /**
   * Retrieve a list of active entitlements for a customer
   */
  list(params, options) {
    return this._makeRequest("GET", "/v1/entitlements/active_entitlements", params, options, {
      methodType: "list"
    });
  }
  /**
   * Retrieve an active entitlement
   */
  retrieve(id, params, options) {
    return this._makeRequest("GET", `/v1/entitlements/active_entitlements/${encodeURIComponent(id)}`, params, options);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/Billing/Alerts.js
var AlertResource = class extends StripeResource {
  /**
   * Lists billing active and inactive alerts
   */
  list(params, options) {
    return this._makeRequest("GET", "/v1/billing/alerts", params, options, {
      methodType: "list"
    });
  }
  /**
   * Creates a billing alert
   */
  create(params, options) {
    return this._makeRequest("POST", "/v1/billing/alerts", params, options);
  }
  /**
   * Retrieves a billing alert given an ID
   */
  retrieve(id, params, options) {
    return this._makeRequest("GET", `/v1/billing/alerts/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * Reactivates this alert, allowing it to trigger again.
   */
  activate(id, params, options) {
    return this._makeRequest("POST", `/v1/billing/alerts/${encodeURIComponent(id)}/activate`, params, options);
  }
  /**
   * Archives this alert, removing it from the list view and APIs. This is non-reversible.
   */
  archive(id, params, options) {
    return this._makeRequest("POST", `/v1/billing/alerts/${encodeURIComponent(id)}/archive`, params, options);
  }
  /**
   * Deactivates this alert, preventing it from triggering.
   */
  deactivate(id, params, options) {
    return this._makeRequest("POST", `/v1/billing/alerts/${encodeURIComponent(id)}/deactivate`, params, options);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/Tax/Associations.js
var AssociationResource = class extends StripeResource {
  /**
   * Finds a tax association object by PaymentIntent id.
   */
  find(params, options) {
    return this._makeRequest("GET", "/v1/tax/associations/find", params, options);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/Issuing/Authorizations.js
var AuthorizationResource = class extends StripeResource {
  /**
   * Returns a list of Issuing Authorization objects. The objects are sorted in descending order by creation date, with the most recently created object appearing first.
   */
  list(params, options) {
    return this._makeRequest("GET", "/v1/issuing/authorizations", params, options, {
      methodType: "list",
      responseSchema: {
        kind: "object",
        fields: {
          data: {
            kind: "array",
            element: {
              kind: "object",
              fields: {
                fleet: {
                  kind: "nullable",
                  inner: {
                    kind: "object",
                    fields: {
                      reported_breakdown: {
                        kind: "nullable",
                        inner: {
                          kind: "object",
                          fields: {
                            fuel: {
                              kind: "nullable",
                              inner: {
                                kind: "object",
                                fields: {
                                  gross_amount_decimal: {
                                    kind: "nullable",
                                    inner: { kind: "decimal_string" }
                                  }
                                }
                              }
                            },
                            non_fuel: {
                              kind: "nullable",
                              inner: {
                                kind: "object",
                                fields: {
                                  gross_amount_decimal: {
                                    kind: "nullable",
                                    inner: { kind: "decimal_string" }
                                  }
                                }
                              }
                            },
                            tax: {
                              kind: "nullable",
                              inner: {
                                kind: "object",
                                fields: {
                                  local_amount_decimal: {
                                    kind: "nullable",
                                    inner: { kind: "decimal_string" }
                                  },
                                  national_amount_decimal: {
                                    kind: "nullable",
                                    inner: { kind: "decimal_string" }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                },
                fuel: {
                  kind: "nullable",
                  inner: {
                    kind: "object",
                    fields: {
                      quantity_decimal: {
                        kind: "nullable",
                        inner: { kind: "decimal_string" }
                      },
                      unit_cost_decimal: {
                        kind: "nullable",
                        inner: { kind: "decimal_string" }
                      }
                    }
                  }
                },
                transactions: {
                  kind: "array",
                  element: {
                    kind: "object",
                    fields: {
                      purchase_details: {
                        kind: "nullable",
                        inner: {
                          kind: "object",
                          fields: {
                            fleet: {
                              kind: "nullable",
                              inner: {
                                kind: "object",
                                fields: {
                                  reported_breakdown: {
                                    kind: "nullable",
                                    inner: {
                                      kind: "object",
                                      fields: {
                                        fuel: {
                                          kind: "nullable",
                                          inner: {
                                            kind: "object",
                                            fields: {
                                              gross_amount_decimal: {
                                                kind: "nullable",
                                                inner: {
                                                  kind: "decimal_string"
                                                }
                                              }
                                            }
                                          }
                                        },
                                        non_fuel: {
                                          kind: "nullable",
                                          inner: {
                                            kind: "object",
                                            fields: {
                                              gross_amount_decimal: {
                                                kind: "nullable",
                                                inner: {
                                                  kind: "decimal_string"
                                                }
                                              }
                                            }
                                          }
                                        },
                                        tax: {
                                          kind: "nullable",
                                          inner: {
                                            kind: "object",
                                            fields: {
                                              local_amount_decimal: {
                                                kind: "nullable",
                                                inner: {
                                                  kind: "decimal_string"
                                                }
                                              },
                                              national_amount_decimal: {
                                                kind: "nullable",
                                                inner: {
                                                  kind: "decimal_string"
                                                }
                                              }
                                            }
                                          }
                                        }
                                      }
                                    }
                                  }
                                }
                              }
                            },
                            fuel: {
                              kind: "nullable",
                              inner: {
                                kind: "object",
                                fields: {
                                  quantity_decimal: {
                                    kind: "nullable",
                                    inner: { kind: "decimal_string" }
                                  },
                                  unit_cost_decimal: { kind: "decimal_string" }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
  }
  /**
   * Retrieves an Issuing Authorization object.
   */
  retrieve(id, params, options) {
    return this._makeRequest("GET", `/v1/issuing/authorizations/${encodeURIComponent(id)}`, params, options, {
      responseSchema: {
        kind: "object",
        fields: {
          fleet: {
            kind: "nullable",
            inner: {
              kind: "object",
              fields: {
                reported_breakdown: {
                  kind: "nullable",
                  inner: {
                    kind: "object",
                    fields: {
                      fuel: {
                        kind: "nullable",
                        inner: {
                          kind: "object",
                          fields: {
                            gross_amount_decimal: {
                              kind: "nullable",
                              inner: { kind: "decimal_string" }
                            }
                          }
                        }
                      },
                      non_fuel: {
                        kind: "nullable",
                        inner: {
                          kind: "object",
                          fields: {
                            gross_amount_decimal: {
                              kind: "nullable",
                              inner: { kind: "decimal_string" }
                            }
                          }
                        }
                      },
                      tax: {
                        kind: "nullable",
                        inner: {
                          kind: "object",
                          fields: {
                            local_amount_decimal: {
                              kind: "nullable",
                              inner: { kind: "decimal_string" }
                            },
                            national_amount_decimal: {
                              kind: "nullable",
                              inner: { kind: "decimal_string" }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          fuel: {
            kind: "nullable",
            inner: {
              kind: "object",
              fields: {
                quantity_decimal: {
                  kind: "nullable",
                  inner: { kind: "decimal_string" }
                },
                unit_cost_decimal: {
                  kind: "nullable",
                  inner: { kind: "decimal_string" }
                }
              }
            }
          },
          transactions: {
            kind: "array",
            element: {
              kind: "object",
              fields: {
                purchase_details: {
                  kind: "nullable",
                  inner: {
                    kind: "object",
                    fields: {
                      fleet: {
                        kind: "nullable",
                        inner: {
                          kind: "object",
                          fields: {
                            reported_breakdown: {
                              kind: "nullable",
                              inner: {
                                kind: "object",
                                fields: {
                                  fuel: {
                                    kind: "nullable",
                                    inner: {
                                      kind: "object",
                                      fields: {
                                        gross_amount_decimal: {
                                          kind: "nullable",
                                          inner: { kind: "decimal_string" }
                                        }
                                      }
                                    }
                                  },
                                  non_fuel: {
                                    kind: "nullable",
                                    inner: {
                                      kind: "object",
                                      fields: {
                                        gross_amount_decimal: {
                                          kind: "nullable",
                                          inner: { kind: "decimal_string" }
                                        }
                                      }
                                    }
                                  },
                                  tax: {
                                    kind: "nullable",
                                    inner: {
                                      kind: "object",
                                      fields: {
                                        local_amount_decimal: {
                                          kind: "nullable",
                                          inner: { kind: "decimal_string" }
                                        },
                                        national_amount_decimal: {
                                          kind: "nullable",
                                          inner: { kind: "decimal_string" }
                                        }
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      },
                      fuel: {
                        kind: "nullable",
                        inner: {
                          kind: "object",
                          fields: {
                            quantity_decimal: {
                              kind: "nullable",
                              inner: { kind: "decimal_string" }
                            },
                            unit_cost_decimal: { kind: "decimal_string" }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
  }
  /**
   * Updates the specified Issuing Authorization object by setting the values of the parameters passed. Any parameters not provided will be left unchanged.
   */
  update(id, params, options) {
    return this._makeRequest("POST", `/v1/issuing/authorizations/${encodeURIComponent(id)}`, params, options, {
      responseSchema: {
        kind: "object",
        fields: {
          fleet: {
            kind: "nullable",
            inner: {
              kind: "object",
              fields: {
                reported_breakdown: {
                  kind: "nullable",
                  inner: {
                    kind: "object",
                    fields: {
                      fuel: {
                        kind: "nullable",
                        inner: {
                          kind: "object",
                          fields: {
                            gross_amount_decimal: {
                              kind: "nullable",
                              inner: { kind: "decimal_string" }
                            }
                          }
                        }
                      },
                      non_fuel: {
                        kind: "nullable",
                        inner: {
                          kind: "object",
                          fields: {
                            gross_amount_decimal: {
                              kind: "nullable",
                              inner: { kind: "decimal_string" }
                            }
                          }
                        }
                      },
                      tax: {
                        kind: "nullable",
                        inner: {
                          kind: "object",
                          fields: {
                            local_amount_decimal: {
                              kind: "nullable",
                              inner: { kind: "decimal_string" }
                            },
                            national_amount_decimal: {
                              kind: "nullable",
                              inner: { kind: "decimal_string" }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          fuel: {
            kind: "nullable",
            inner: {
              kind: "object",
              fields: {
                quantity_decimal: {
                  kind: "nullable",
                  inner: { kind: "decimal_string" }
                },
                unit_cost_decimal: {
                  kind: "nullable",
                  inner: { kind: "decimal_string" }
                }
              }
            }
          },
          transactions: {
            kind: "array",
            element: {
              kind: "object",
              fields: {
                purchase_details: {
                  kind: "nullable",
                  inner: {
                    kind: "object",
                    fields: {
                      fleet: {
                        kind: "nullable",
                        inner: {
                          kind: "object",
                          fields: {
                            reported_breakdown: {
                              kind: "nullable",
                              inner: {
                                kind: "object",
                                fields: {
                                  fuel: {
                                    kind: "nullable",
                                    inner: {
                                      kind: "object",
                                      fields: {
                                        gross_amount_decimal: {
                                          kind: "nullable",
                                          inner: { kind: "decimal_string" }
                                        }
                                      }
                                    }
                                  },
                                  non_fuel: {
                                    kind: "nullable",
                                    inner: {
                                      kind: "object",
                                      fields: {
                                        gross_amount_decimal: {
                                          kind: "nullable",
                                          inner: { kind: "decimal_string" }
                                        }
                                      }
                                    }
                                  },
                                  tax: {
                                    kind: "nullable",
                                    inner: {
                                      kind: "object",
                                      fields: {
                                        local_amount_decimal: {
                                          kind: "nullable",
                                          inner: { kind: "decimal_string" }
                                        },
                                        national_amount_decimal: {
                                          kind: "nullable",
                                          inner: { kind: "decimal_string" }
                                        }
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      },
                      fuel: {
                        kind: "nullable",
                        inner: {
                          kind: "object",
                          fields: {
                            quantity_decimal: {
                              kind: "nullable",
                              inner: { kind: "decimal_string" }
                            },
                            unit_cost_decimal: { kind: "decimal_string" }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
  }
  /**
   * [Deprecated] Approves a pending Issuing Authorization object. This request should be made within the timeout window of the [real-time authorization](https://docs.stripe.com/docs/issuing/controls/real-time-authorizations) flow.
   * This method is deprecated. Instead, [respond directly to the webhook request to approve an authorization](https://docs.stripe.com/docs/issuing/controls/real-time-authorizations#authorization-handling).
   * @deprecated
   */
  approve(id, params, options) {
    return this._makeRequest("POST", `/v1/issuing/authorizations/${encodeURIComponent(id)}/approve`, params, options, {
      responseSchema: {
        kind: "object",
        fields: {
          fleet: {
            kind: "nullable",
            inner: {
              kind: "object",
              fields: {
                reported_breakdown: {
                  kind: "nullable",
                  inner: {
                    kind: "object",
                    fields: {
                      fuel: {
                        kind: "nullable",
                        inner: {
                          kind: "object",
                          fields: {
                            gross_amount_decimal: {
                              kind: "nullable",
                              inner: { kind: "decimal_string" }
                            }
                          }
                        }
                      },
                      non_fuel: {
                        kind: "nullable",
                        inner: {
                          kind: "object",
                          fields: {
                            gross_amount_decimal: {
                              kind: "nullable",
                              inner: { kind: "decimal_string" }
                            }
                          }
                        }
                      },
                      tax: {
                        kind: "nullable",
                        inner: {
                          kind: "object",
                          fields: {
                            local_amount_decimal: {
                              kind: "nullable",
                              inner: { kind: "decimal_string" }
                            },
                            national_amount_decimal: {
                              kind: "nullable",
                              inner: { kind: "decimal_string" }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          fuel: {
            kind: "nullable",
            inner: {
              kind: "object",
              fields: {
                quantity_decimal: {
                  kind: "nullable",
                  inner: { kind: "decimal_string" }
                },
                unit_cost_decimal: {
                  kind: "nullable",
                  inner: { kind: "decimal_string" }
                }
              }
            }
          },
          transactions: {
            kind: "array",
            element: {
              kind: "object",
              fields: {
                purchase_details: {
                  kind: "nullable",
                  inner: {
                    kind: "object",
                    fields: {
                      fleet: {
                        kind: "nullable",
                        inner: {
                          kind: "object",
                          fields: {
                            reported_breakdown: {
                              kind: "nullable",
                              inner: {
                                kind: "object",
                                fields: {
                                  fuel: {
                                    kind: "nullable",
                                    inner: {
                                      kind: "object",
                                      fields: {
                                        gross_amount_decimal: {
                                          kind: "nullable",
                                          inner: { kind: "decimal_string" }
                                        }
                                      }
                                    }
                                  },
                                  non_fuel: {
                                    kind: "nullable",
                                    inner: {
                                      kind: "object",
                                      fields: {
                                        gross_amount_decimal: {
                                          kind: "nullable",
                                          inner: { kind: "decimal_string" }
                                        }
                                      }
                                    }
                                  },
                                  tax: {
                                    kind: "nullable",
                                    inner: {
                                      kind: "object",
                                      fields: {
                                        local_amount_decimal: {
                                          kind: "nullable",
                                          inner: { kind: "decimal_string" }
                                        },
                                        national_amount_decimal: {
                                          kind: "nullable",
                                          inner: { kind: "decimal_string" }
                                        }
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      },
                      fuel: {
                        kind: "nullable",
                        inner: {
                          kind: "object",
                          fields: {
                            quantity_decimal: {
                              kind: "nullable",
                              inner: { kind: "decimal_string" }
                            },
                            unit_cost_decimal: { kind: "decimal_string" }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
  }
  /**
   * [Deprecated] Declines a pending Issuing Authorization object. This request should be made within the timeout window of the [real time authorization](https://docs.stripe.com/docs/issuing/controls/real-time-authorizations) flow.
   * This method is deprecated. Instead, [respond directly to the webhook request to decline an authorization](https://docs.stripe.com/docs/issuing/controls/real-time-authorizations#authorization-handling).
   * @deprecated
   */
  decline(id, params, options) {
    return this._makeRequest("POST", `/v1/issuing/authorizations/${encodeURIComponent(id)}/decline`, params, options, {
      responseSchema: {
        kind: "object",
        fields: {
          fleet: {
            kind: "nullable",
            inner: {
              kind: "object",
              fields: {
                reported_breakdown: {
                  kind: "nullable",
                  inner: {
                    kind: "object",
                    fields: {
                      fuel: {
                        kind: "nullable",
                        inner: {
                          kind: "object",
                          fields: {
                            gross_amount_decimal: {
                              kind: "nullable",
                              inner: { kind: "decimal_string" }
                            }
                          }
                        }
                      },
                      non_fuel: {
                        kind: "nullable",
                        inner: {
                          kind: "object",
                          fields: {
                            gross_amount_decimal: {
                              kind: "nullable",
                              inner: { kind: "decimal_string" }
                            }
                          }
                        }
                      },
                      tax: {
                        kind: "nullable",
                        inner: {
                          kind: "object",
                          fields: {
                            local_amount_decimal: {
                              kind: "nullable",
                              inner: { kind: "decimal_string" }
                            },
                            national_amount_decimal: {
                              kind: "nullable",
                              inner: { kind: "decimal_string" }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          fuel: {
            kind: "nullable",
            inner: {
              kind: "object",
              fields: {
                quantity_decimal: {
                  kind: "nullable",
                  inner: { kind: "decimal_string" }
                },
                unit_cost_decimal: {
                  kind: "nullable",
                  inner: { kind: "decimal_string" }
                }
              }
            }
          },
          transactions: {
            kind: "array",
            element: {
              kind: "object",
              fields: {
                purchase_details: {
                  kind: "nullable",
                  inner: {
                    kind: "object",
                    fields: {
                      fleet: {
                        kind: "nullable",
                        inner: {
                          kind: "object",
                          fields: {
                            reported_breakdown: {
                              kind: "nullable",
                              inner: {
                                kind: "object",
                                fields: {
                                  fuel: {
                                    kind: "nullable",
                                    inner: {
                                      kind: "object",
                                      fields: {
                                        gross_amount_decimal: {
                                          kind: "nullable",
                                          inner: { kind: "decimal_string" }
                                        }
                                      }
                                    }
                                  },
                                  non_fuel: {
                                    kind: "nullable",
                                    inner: {
                                      kind: "object",
                                      fields: {
                                        gross_amount_decimal: {
                                          kind: "nullable",
                                          inner: { kind: "decimal_string" }
                                        }
                                      }
                                    }
                                  },
                                  tax: {
                                    kind: "nullable",
                                    inner: {
                                      kind: "object",
                                      fields: {
                                        local_amount_decimal: {
                                          kind: "nullable",
                                          inner: { kind: "decimal_string" }
                                        },
                                        national_amount_decimal: {
                                          kind: "nullable",
                                          inner: { kind: "decimal_string" }
                                        }
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      },
                      fuel: {
                        kind: "nullable",
                        inner: {
                          kind: "object",
                          fields: {
                            quantity_decimal: {
                              kind: "nullable",
                              inner: { kind: "decimal_string" }
                            },
                            unit_cost_decimal: { kind: "decimal_string" }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/TestHelpers/Issuing/Authorizations.js
var AuthorizationResource2 = class extends StripeResource {
  /**
   * Create a test-mode authorization.
   */
  create(params, options) {
    return this._makeRequest("POST", "/v1/test_helpers/issuing/authorizations", params, options, {
      requestSchema: {
        kind: "object",
        fields: {
          fleet: {
            kind: "object",
            fields: {
              reported_breakdown: {
                kind: "object",
                fields: {
                  fuel: {
                    kind: "object",
                    fields: { gross_amount_decimal: { kind: "decimal_string" } }
                  },
                  non_fuel: {
                    kind: "object",
                    fields: { gross_amount_decimal: { kind: "decimal_string" } }
                  },
                  tax: {
                    kind: "object",
                    fields: {
                      local_amount_decimal: { kind: "decimal_string" },
                      national_amount_decimal: { kind: "decimal_string" }
                    }
                  }
                }
              }
            }
          },
          fuel: {
            kind: "object",
            fields: {
              quantity_decimal: { kind: "decimal_string" },
              unit_cost_decimal: { kind: "decimal_string" }
            }
          }
        }
      },
      responseSchema: {
        kind: "object",
        fields: {
          fleet: {
            kind: "nullable",
            inner: {
              kind: "object",
              fields: {
                reported_breakdown: {
                  kind: "nullable",
                  inner: {
                    kind: "object",
                    fields: {
                      fuel: {
                        kind: "nullable",
                        inner: {
                          kind: "object",
                          fields: {
                            gross_amount_decimal: {
                              kind: "nullable",
                              inner: { kind: "decimal_string" }
                            }
                          }
                        }
                      },
                      non_fuel: {
                        kind: "nullable",
                        inner: {
                          kind: "object",
                          fields: {
                            gross_amount_decimal: {
                              kind: "nullable",
                              inner: { kind: "decimal_string" }
                            }
                          }
                        }
                      },
                      tax: {
                        kind: "nullable",
                        inner: {
                          kind: "object",
                          fields: {
                            local_amount_decimal: {
                              kind: "nullable",
                              inner: { kind: "decimal_string" }
                            },
                            national_amount_decimal: {
                              kind: "nullable",
                              inner: { kind: "decimal_string" }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          fuel: {
            kind: "nullable",
            inner: {
              kind: "object",
              fields: {
                quantity_decimal: {
                  kind: "nullable",
                  inner: { kind: "decimal_string" }
                },
                unit_cost_decimal: {
                  kind: "nullable",
                  inner: { kind: "decimal_string" }
                }
              }
            }
          },
          transactions: {
            kind: "array",
            element: {
              kind: "object",
              fields: {
                purchase_details: {
                  kind: "nullable",
                  inner: {
                    kind: "object",
                    fields: {
                      fleet: {
                        kind: "nullable",
                        inner: {
                          kind: "object",
                          fields: {
                            reported_breakdown: {
                              kind: "nullable",
                              inner: {
                                kind: "object",
                                fields: {
                                  fuel: {
                                    kind: "nullable",
                                    inner: {
                                      kind: "object",
                                      fields: {
                                        gross_amount_decimal: {
                                          kind: "nullable",
                                          inner: { kind: "decimal_string" }
                                        }
                                      }
                                    }
                                  },
                                  non_fuel: {
                                    kind: "nullable",
                                    inner: {
                                      kind: "object",
                                      fields: {
                                        gross_amount_decimal: {
                                          kind: "nullable",
                                          inner: { kind: "decimal_string" }
                                        }
                                      }
                                    }
                                  },
                                  tax: {
                                    kind: "nullable",
                                    inner: {
                                      kind: "object",
                                      fields: {
                                        local_amount_decimal: {
                                          kind: "nullable",
                                          inner: { kind: "decimal_string" }
                                        },
                                        national_amount_decimal: {
                                          kind: "nullable",
                                          inner: { kind: "decimal_string" }
                                        }
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      },
                      fuel: {
                        kind: "nullable",
                        inner: {
                          kind: "object",
                          fields: {
                            quantity_decimal: {
                              kind: "nullable",
                              inner: { kind: "decimal_string" }
                            },
                            unit_cost_decimal: { kind: "decimal_string" }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
  }
  /**
   * Capture a test-mode authorization.
   */
  capture(id, params, options) {
    return this._makeRequest("POST", `/v1/test_helpers/issuing/authorizations/${encodeURIComponent(id)}/capture`, params, options, {
      requestSchema: {
        kind: "object",
        fields: {
          purchase_details: {
            kind: "object",
            fields: {
              fleet: {
                kind: "object",
                fields: {
                  reported_breakdown: {
                    kind: "object",
                    fields: {
                      fuel: {
                        kind: "object",
                        fields: {
                          gross_amount_decimal: { kind: "decimal_string" }
                        }
                      },
                      non_fuel: {
                        kind: "object",
                        fields: {
                          gross_amount_decimal: { kind: "decimal_string" }
                        }
                      },
                      tax: {
                        kind: "object",
                        fields: {
                          local_amount_decimal: { kind: "decimal_string" },
                          national_amount_decimal: { kind: "decimal_string" }
                        }
                      }
                    }
                  }
                }
              },
              fuel: {
                kind: "object",
                fields: {
                  quantity_decimal: { kind: "decimal_string" },
                  unit_cost_decimal: { kind: "decimal_string" }
                }
              },
              receipt: {
                kind: "array",
                element: {
                  kind: "object",
                  fields: { quantity: { kind: "decimal_string" } }
                }
              }
            }
          }
        }
      },
      responseSchema: {
        kind: "object",
        fields: {
          fleet: {
            kind: "nullable",
            inner: {
              kind: "object",
              fields: {
                reported_breakdown: {
                  kind: "nullable",
                  inner: {
                    kind: "object",
                    fields: {
                      fuel: {
                        kind: "nullable",
                        inner: {
                          kind: "object",
                          fields: {
                            gross_amount_decimal: {
                              kind: "nullable",
                              inner: { kind: "decimal_string" }
                            }
                          }
                        }
                      },
                      non_fuel: {
                        kind: "nullable",
                        inner: {
                          kind: "object",
                          fields: {
                            gross_amount_decimal: {
                              kind: "nullable",
                              inner: { kind: "decimal_string" }
                            }
                          }
                        }
                      },
                      tax: {
                        kind: "nullable",
                        inner: {
                          kind: "object",
                          fields: {
                            local_amount_decimal: {
                              kind: "nullable",
                              inner: { kind: "decimal_string" }
                            },
                            national_amount_decimal: {
                              kind: "nullable",
                              inner: { kind: "decimal_string" }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          fuel: {
            kind: "nullable",
            inner: {
              kind: "object",
              fields: {
                quantity_decimal: {
                  kind: "nullable",
                  inner: { kind: "decimal_string" }
                },
                unit_cost_decimal: {
                  kind: "nullable",
                  inner: { kind: "decimal_string" }
                }
              }
            }
          },
          transactions: {
            kind: "array",
            element: {
              kind: "object",
              fields: {
                purchase_details: {
                  kind: "nullable",
                  inner: {
                    kind: "object",
                    fields: {
                      fleet: {
                        kind: "nullable",
                        inner: {
                          kind: "object",
                          fields: {
                            reported_breakdown: {
                              kind: "nullable",
                              inner: {
                                kind: "object",
                                fields: {
                                  fuel: {
                                    kind: "nullable",
                                    inner: {
                                      kind: "object",
                                      fields: {
                                        gross_amount_decimal: {
                                          kind: "nullable",
                                          inner: { kind: "decimal_string" }
                                        }
                                      }
                                    }
                                  },
                                  non_fuel: {
                                    kind: "nullable",
                                    inner: {
                                      kind: "object",
                                      fields: {
                                        gross_amount_decimal: {
                                          kind: "nullable",
                                          inner: { kind: "decimal_string" }
                                        }
                                      }
                                    }
                                  },
                                  tax: {
                                    kind: "nullable",
                                    inner: {
                                      kind: "object",
                                      fields: {
                                        local_amount_decimal: {
                                          kind: "nullable",
                                          inner: { kind: "decimal_string" }
                                        },
                                        national_amount_decimal: {
                                          kind: "nullable",
                                          inner: { kind: "decimal_string" }
                                        }
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      },
                      fuel: {
                        kind: "nullable",
                        inner: {
                          kind: "object",
                          fields: {
                            quantity_decimal: {
                              kind: "nullable",
                              inner: { kind: "decimal_string" }
                            },
                            unit_cost_decimal: { kind: "decimal_string" }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
  }
  /**
   * Expire a test-mode Authorization.
   */
  expire(id, params, options) {
    return this._makeRequest("POST", `/v1/test_helpers/issuing/authorizations/${encodeURIComponent(id)}/expire`, params, options, {
      responseSchema: {
        kind: "object",
        fields: {
          fleet: {
            kind: "nullable",
            inner: {
              kind: "object",
              fields: {
                reported_breakdown: {
                  kind: "nullable",
                  inner: {
                    kind: "object",
                    fields: {
                      fuel: {
                        kind: "nullable",
                        inner: {
                          kind: "object",
                          fields: {
                            gross_amount_decimal: {
                              kind: "nullable",
                              inner: { kind: "decimal_string" }
                            }
                          }
                        }
                      },
                      non_fuel: {
                        kind: "nullable",
                        inner: {
                          kind: "object",
                          fields: {
                            gross_amount_decimal: {
                              kind: "nullable",
                              inner: { kind: "decimal_string" }
                            }
                          }
                        }
                      },
                      tax: {
                        kind: "nullable",
                        inner: {
                          kind: "object",
                          fields: {
                            local_amount_decimal: {
                              kind: "nullable",
                              inner: { kind: "decimal_string" }
                            },
                            national_amount_decimal: {
                              kind: "nullable",
                              inner: { kind: "decimal_string" }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          fuel: {
            kind: "nullable",
            inner: {
              kind: "object",
              fields: {
                quantity_decimal: {
                  kind: "nullable",
                  inner: { kind: "decimal_string" }
                },
                unit_cost_decimal: {
                  kind: "nullable",
                  inner: { kind: "decimal_string" }
                }
              }
            }
          },
          transactions: {
            kind: "array",
            element: {
              kind: "object",
              fields: {
                purchase_details: {
                  kind: "nullable",
                  inner: {
                    kind: "object",
                    fields: {
                      fleet: {
                        kind: "nullable",
                        inner: {
                          kind: "object",
                          fields: {
                            reported_breakdown: {
                              kind: "nullable",
                              inner: {
                                kind: "object",
                                fields: {
                                  fuel: {
                                    kind: "nullable",
                                    inner: {
                                      kind: "object",
                                      fields: {
                                        gross_amount_decimal: {
                                          kind: "nullable",
                                          inner: { kind: "decimal_string" }
                                        }
                                      }
                                    }
                                  },
                                  non_fuel: {
                                    kind: "nullable",
                                    inner: {
                                      kind: "object",
                                      fields: {
                                        gross_amount_decimal: {
                                          kind: "nullable",
                                          inner: { kind: "decimal_string" }
                                        }
                                      }
                                    }
                                  },
                                  tax: {
                                    kind: "nullable",
                                    inner: {
                                      kind: "object",
                                      fields: {
                                        local_amount_decimal: {
                                          kind: "nullable",
                                          inner: { kind: "decimal_string" }
                                        },
                                        national_amount_decimal: {
                                          kind: "nullable",
                                          inner: { kind: "decimal_string" }
                                        }
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      },
                      fuel: {
                        kind: "nullable",
                        inner: {
                          kind: "object",
                          fields: {
                            quantity_decimal: {
                              kind: "nullable",
                              inner: { kind: "decimal_string" }
                            },
                            unit_cost_decimal: { kind: "decimal_string" }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
  }
  /**
   * Finalize the amount on an Authorization prior to capture, when the initial authorization was for an estimated amount.
   */
  finalizeAmount(id, params, options) {
    return this._makeRequest("POST", `/v1/test_helpers/issuing/authorizations/${encodeURIComponent(id)}/finalize_amount`, params, options, {
      requestSchema: {
        kind: "object",
        fields: {
          fleet: {
            kind: "object",
            fields: {
              reported_breakdown: {
                kind: "object",
                fields: {
                  fuel: {
                    kind: "object",
                    fields: { gross_amount_decimal: { kind: "decimal_string" } }
                  },
                  non_fuel: {
                    kind: "object",
                    fields: { gross_amount_decimal: { kind: "decimal_string" } }
                  },
                  tax: {
                    kind: "object",
                    fields: {
                      local_amount_decimal: { kind: "decimal_string" },
                      national_amount_decimal: { kind: "decimal_string" }
                    }
                  }
                }
              }
            }
          },
          fuel: {
            kind: "object",
            fields: {
              quantity_decimal: { kind: "decimal_string" },
              unit_cost_decimal: { kind: "decimal_string" }
            }
          }
        }
      },
      responseSchema: {
        kind: "object",
        fields: {
          fleet: {
            kind: "nullable",
            inner: {
              kind: "object",
              fields: {
                reported_breakdown: {
                  kind: "nullable",
                  inner: {
                    kind: "object",
                    fields: {
                      fuel: {
                        kind: "nullable",
                        inner: {
                          kind: "object",
                          fields: {
                            gross_amount_decimal: {
                              kind: "nullable",
                              inner: { kind: "decimal_string" }
                            }
                          }
                        }
                      },
                      non_fuel: {
                        kind: "nullable",
                        inner: {
                          kind: "object",
                          fields: {
                            gross_amount_decimal: {
                              kind: "nullable",
                              inner: { kind: "decimal_string" }
                            }
                          }
                        }
                      },
                      tax: {
                        kind: "nullable",
                        inner: {
                          kind: "object",
                          fields: {
                            local_amount_decimal: {
                              kind: "nullable",
                              inner: { kind: "decimal_string" }
                            },
                            national_amount_decimal: {
                              kind: "nullable",
                              inner: { kind: "decimal_string" }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          fuel: {
            kind: "nullable",
            inner: {
              kind: "object",
              fields: {
                quantity_decimal: {
                  kind: "nullable",
                  inner: { kind: "decimal_string" }
                },
                unit_cost_decimal: {
                  kind: "nullable",
                  inner: { kind: "decimal_string" }
                }
              }
            }
          },
          transactions: {
            kind: "array",
            element: {
              kind: "object",
              fields: {
                purchase_details: {
                  kind: "nullable",
                  inner: {
                    kind: "object",
                    fields: {
                      fleet: {
                        kind: "nullable",
                        inner: {
                          kind: "object",
                          fields: {
                            reported_breakdown: {
                              kind: "nullable",
                              inner: {
                                kind: "object",
                                fields: {
                                  fuel: {
                                    kind: "nullable",
                                    inner: {
                                      kind: "object",
                                      fields: {
                                        gross_amount_decimal: {
                                          kind: "nullable",
                                          inner: { kind: "decimal_string" }
                                        }
                                      }
                                    }
                                  },
                                  non_fuel: {
                                    kind: "nullable",
                                    inner: {
                                      kind: "object",
                                      fields: {
                                        gross_amount_decimal: {
                                          kind: "nullable",
                                          inner: { kind: "decimal_string" }
                                        }
                                      }
                                    }
                                  },
                                  tax: {
                                    kind: "nullable",
                                    inner: {
                                      kind: "object",
                                      fields: {
                                        local_amount_decimal: {
                                          kind: "nullable",
                                          inner: { kind: "decimal_string" }
                                        },
                                        national_amount_decimal: {
                                          kind: "nullable",
                                          inner: { kind: "decimal_string" }
                                        }
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      },
                      fuel: {
                        kind: "nullable",
                        inner: {
                          kind: "object",
                          fields: {
                            quantity_decimal: {
                              kind: "nullable",
                              inner: { kind: "decimal_string" }
                            },
                            unit_cost_decimal: { kind: "decimal_string" }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
  }
  /**
   * Respond to a fraud challenge on a testmode Issuing authorization, simulating either a confirmation of fraud or a correction of legitimacy.
   */
  respond(id, params, options) {
    return this._makeRequest("POST", `/v1/test_helpers/issuing/authorizations/${encodeURIComponent(id)}/fraud_challenges/respond`, params, options, {
      responseSchema: {
        kind: "object",
        fields: {
          fleet: {
            kind: "nullable",
            inner: {
              kind: "object",
              fields: {
                reported_breakdown: {
                  kind: "nullable",
                  inner: {
                    kind: "object",
                    fields: {
                      fuel: {
                        kind: "nullable",
                        inner: {
                          kind: "object",
                          fields: {
                            gross_amount_decimal: {
                              kind: "nullable",
                              inner: { kind: "decimal_string" }
                            }
                          }
                        }
                      },
                      non_fuel: {
                        kind: "nullable",
                        inner: {
                          kind: "object",
                          fields: {
                            gross_amount_decimal: {
                              kind: "nullable",
                              inner: { kind: "decimal_string" }
                            }
                          }
                        }
                      },
                      tax: {
                        kind: "nullable",
                        inner: {
                          kind: "object",
                          fields: {
                            local_amount_decimal: {
                              kind: "nullable",
                              inner: { kind: "decimal_string" }
                            },
                            national_amount_decimal: {
                              kind: "nullable",
                              inner: { kind: "decimal_string" }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          fuel: {
            kind: "nullable",
            inner: {
              kind: "object",
              fields: {
                quantity_decimal: {
                  kind: "nullable",
                  inner: { kind: "decimal_string" }
                },
                unit_cost_decimal: {
                  kind: "nullable",
                  inner: { kind: "decimal_string" }
                }
              }
            }
          },
          transactions: {
            kind: "array",
            element: {
              kind: "object",
              fields: {
                purchase_details: {
                  kind: "nullable",
                  inner: {
                    kind: "object",
                    fields: {
                      fleet: {
                        kind: "nullable",
                        inner: {
                          kind: "object",
                          fields: {
                            reported_breakdown: {
                              kind: "nullable",
                              inner: {
                                kind: "object",
                                fields: {
                                  fuel: {
                                    kind: "nullable",
                                    inner: {
                                      kind: "object",
                                      fields: {
                                        gross_amount_decimal: {
                                          kind: "nullable",
                                          inner: { kind: "decimal_string" }
                                        }
                                      }
                                    }
                                  },
                                  non_fuel: {
                                    kind: "nullable",
                                    inner: {
                                      kind: "object",
                                      fields: {
                                        gross_amount_decimal: {
                                          kind: "nullable",
                                          inner: { kind: "decimal_string" }
                                        }
                                      }
                                    }
                                  },
                                  tax: {
                                    kind: "nullable",
                                    inner: {
                                      kind: "object",
                                      fields: {
                                        local_amount_decimal: {
                                          kind: "nullable",
                                          inner: { kind: "decimal_string" }
                                        },
                                        national_amount_decimal: {
                                          kind: "nullable",
                                          inner: { kind: "decimal_string" }
                                        }
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      },
                      fuel: {
                        kind: "nullable",
                        inner: {
                          kind: "object",
                          fields: {
                            quantity_decimal: {
                              kind: "nullable",
                              inner: { kind: "decimal_string" }
                            },
                            unit_cost_decimal: { kind: "decimal_string" }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
  }
  /**
   * Increment a test-mode Authorization.
   */
  increment(id, params, options) {
    return this._makeRequest("POST", `/v1/test_helpers/issuing/authorizations/${encodeURIComponent(id)}/increment`, params, options, {
      responseSchema: {
        kind: "object",
        fields: {
          fleet: {
            kind: "nullable",
            inner: {
              kind: "object",
              fields: {
                reported_breakdown: {
                  kind: "nullable",
                  inner: {
                    kind: "object",
                    fields: {
                      fuel: {
                        kind: "nullable",
                        inner: {
                          kind: "object",
                          fields: {
                            gross_amount_decimal: {
                              kind: "nullable",
                              inner: { kind: "decimal_string" }
                            }
                          }
                        }
                      },
                      non_fuel: {
                        kind: "nullable",
                        inner: {
                          kind: "object",
                          fields: {
                            gross_amount_decimal: {
                              kind: "nullable",
                              inner: { kind: "decimal_string" }
                            }
                          }
                        }
                      },
                      tax: {
                        kind: "nullable",
                        inner: {
                          kind: "object",
                          fields: {
                            local_amount_decimal: {
                              kind: "nullable",
                              inner: { kind: "decimal_string" }
                            },
                            national_amount_decimal: {
                              kind: "nullable",
                              inner: { kind: "decimal_string" }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          fuel: {
            kind: "nullable",
            inner: {
              kind: "object",
              fields: {
                quantity_decimal: {
                  kind: "nullable",
                  inner: { kind: "decimal_string" }
                },
                unit_cost_decimal: {
                  kind: "nullable",
                  inner: { kind: "decimal_string" }
                }
              }
            }
          },
          transactions: {
            kind: "array",
            element: {
              kind: "object",
              fields: {
                purchase_details: {
                  kind: "nullable",
                  inner: {
                    kind: "object",
                    fields: {
                      fleet: {
                        kind: "nullable",
                        inner: {
                          kind: "object",
                          fields: {
                            reported_breakdown: {
                              kind: "nullable",
                              inner: {
                                kind: "object",
                                fields: {
                                  fuel: {
                                    kind: "nullable",
                                    inner: {
                                      kind: "object",
                                      fields: {
                                        gross_amount_decimal: {
                                          kind: "nullable",
                                          inner: { kind: "decimal_string" }
                                        }
                                      }
                                    }
                                  },
                                  non_fuel: {
                                    kind: "nullable",
                                    inner: {
                                      kind: "object",
                                      fields: {
                                        gross_amount_decimal: {
                                          kind: "nullable",
                                          inner: { kind: "decimal_string" }
                                        }
                                      }
                                    }
                                  },
                                  tax: {
                                    kind: "nullable",
                                    inner: {
                                      kind: "object",
                                      fields: {
                                        local_amount_decimal: {
                                          kind: "nullable",
                                          inner: { kind: "decimal_string" }
                                        },
                                        national_amount_decimal: {
                                          kind: "nullable",
                                          inner: { kind: "decimal_string" }
                                        }
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      },
                      fuel: {
                        kind: "nullable",
                        inner: {
                          kind: "object",
                          fields: {
                            quantity_decimal: {
                              kind: "nullable",
                              inner: { kind: "decimal_string" }
                            },
                            unit_cost_decimal: { kind: "decimal_string" }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
  }
  /**
   * Reverse a test-mode Authorization.
   */
  reverse(id, params, options) {
    return this._makeRequest("POST", `/v1/test_helpers/issuing/authorizations/${encodeURIComponent(id)}/reverse`, params, options, {
      responseSchema: {
        kind: "object",
        fields: {
          fleet: {
            kind: "nullable",
            inner: {
              kind: "object",
              fields: {
                reported_breakdown: {
                  kind: "nullable",
                  inner: {
                    kind: "object",
                    fields: {
                      fuel: {
                        kind: "nullable",
                        inner: {
                          kind: "object",
                          fields: {
                            gross_amount_decimal: {
                              kind: "nullable",
                              inner: { kind: "decimal_string" }
                            }
                          }
                        }
                      },
                      non_fuel: {
                        kind: "nullable",
                        inner: {
                          kind: "object",
                          fields: {
                            gross_amount_decimal: {
                              kind: "nullable",
                              inner: { kind: "decimal_string" }
                            }
                          }
                        }
                      },
                      tax: {
                        kind: "nullable",
                        inner: {
                          kind: "object",
                          fields: {
                            local_amount_decimal: {
                              kind: "nullable",
                              inner: { kind: "decimal_string" }
                            },
                            national_amount_decimal: {
                              kind: "nullable",
                              inner: { kind: "decimal_string" }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          fuel: {
            kind: "nullable",
            inner: {
              kind: "object",
              fields: {
                quantity_decimal: {
                  kind: "nullable",
                  inner: { kind: "decimal_string" }
                },
                unit_cost_decimal: {
                  kind: "nullable",
                  inner: { kind: "decimal_string" }
                }
              }
            }
          },
          transactions: {
            kind: "array",
            element: {
              kind: "object",
              fields: {
                purchase_details: {
                  kind: "nullable",
                  inner: {
                    kind: "object",
                    fields: {
                      fleet: {
                        kind: "nullable",
                        inner: {
                          kind: "object",
                          fields: {
                            reported_breakdown: {
                              kind: "nullable",
                              inner: {
                                kind: "object",
                                fields: {
                                  fuel: {
                                    kind: "nullable",
                                    inner: {
                                      kind: "object",
                                      fields: {
                                        gross_amount_decimal: {
                                          kind: "nullable",
                                          inner: { kind: "decimal_string" }
                                        }
                                      }
                                    }
                                  },
                                  non_fuel: {
                                    kind: "nullable",
                                    inner: {
                                      kind: "object",
                                      fields: {
                                        gross_amount_decimal: {
                                          kind: "nullable",
                                          inner: { kind: "decimal_string" }
                                        }
                                      }
                                    }
                                  },
                                  tax: {
                                    kind: "nullable",
                                    inner: {
                                      kind: "object",
                                      fields: {
                                        local_amount_decimal: {
                                          kind: "nullable",
                                          inner: { kind: "decimal_string" }
                                        },
                                        national_amount_decimal: {
                                          kind: "nullable",
                                          inner: { kind: "decimal_string" }
                                        }
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      },
                      fuel: {
                        kind: "nullable",
                        inner: {
                          kind: "object",
                          fields: {
                            quantity_decimal: {
                              kind: "nullable",
                              inner: { kind: "decimal_string" }
                            },
                            unit_cost_decimal: { kind: "decimal_string" }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/Tax/Calculations.js
var CalculationResource = class extends StripeResource {
  /**
   * Retrieves a Tax Calculation object, if the calculation hasn't expired.
   */
  retrieve(id, params, options) {
    return this._makeRequest("GET", `/v1/tax/calculations/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * Calculates tax based on the input and returns a Tax Calculation object.
   */
  create(params, options) {
    return this._makeRequest("POST", "/v1/tax/calculations", params, options);
  }
  /**
   * Retrieves the line items of a tax calculation as a collection, if the calculation hasn't expired.
   */
  listLineItems(id, params, options) {
    return this._makeRequest("GET", `/v1/tax/calculations/${encodeURIComponent(id)}/line_items`, params, options, {
      methodType: "list"
    });
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/Issuing/Cardholders.js
var CardholderResource = class extends StripeResource {
  /**
   * Returns a list of Issuing Cardholder objects. The objects are sorted in descending order by creation date, with the most recently created object appearing first.
   */
  list(params, options) {
    return this._makeRequest("GET", "/v1/issuing/cardholders", params, options, {
      methodType: "list"
    });
  }
  /**
   * Creates a new Issuing Cardholder object that can be issued cards.
   */
  create(params, options) {
    return this._makeRequest("POST", "/v1/issuing/cardholders", params, options);
  }
  /**
   * Retrieves an Issuing Cardholder object.
   */
  retrieve(id, params, options) {
    return this._makeRequest("GET", `/v1/issuing/cardholders/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * Updates the specified Issuing Cardholder object by setting the values of the parameters passed. Any parameters not provided will be left unchanged.
   */
  update(id, params, options) {
    return this._makeRequest("POST", `/v1/issuing/cardholders/${encodeURIComponent(id)}`, params, options);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/Issuing/Cards.js
var CardResource = class extends StripeResource {
  /**
   * Returns a list of Issuing Card objects. The objects are sorted in descending order by creation date, with the most recently created object appearing first.
   */
  list(params, options) {
    return this._makeRequest("GET", "/v1/issuing/cards", params, options, {
      methodType: "list"
    });
  }
  /**
   * Creates an Issuing Card object.
   */
  create(params, options) {
    return this._makeRequest("POST", "/v1/issuing/cards", params, options);
  }
  /**
   * Retrieves an Issuing Card object.
   */
  retrieve(id, params, options) {
    return this._makeRequest("GET", `/v1/issuing/cards/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * Updates the specified Issuing Card object by setting the values of the parameters passed. Any parameters not provided will be left unchanged.
   */
  update(id, params, options) {
    return this._makeRequest("POST", `/v1/issuing/cards/${encodeURIComponent(id)}`, params, options);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/TestHelpers/Issuing/Cards.js
var CardResource2 = class extends StripeResource {
  /**
   * Updates the shipping status of the specified Issuing Card object to delivered.
   */
  deliverCard(id, params, options) {
    return this._makeRequest("POST", `/v1/test_helpers/issuing/cards/${encodeURIComponent(id)}/shipping/deliver`, params, options);
  }
  /**
   * Updates the shipping status of the specified Issuing Card object to failure.
   */
  failCard(id, params, options) {
    return this._makeRequest("POST", `/v1/test_helpers/issuing/cards/${encodeURIComponent(id)}/shipping/fail`, params, options);
  }
  /**
   * Updates the shipping status of the specified Issuing Card object to returned.
   */
  returnCard(id, params, options) {
    return this._makeRequest("POST", `/v1/test_helpers/issuing/cards/${encodeURIComponent(id)}/shipping/return`, params, options);
  }
  /**
   * Updates the shipping status of the specified Issuing Card object to shipped.
   */
  shipCard(id, params, options) {
    return this._makeRequest("POST", `/v1/test_helpers/issuing/cards/${encodeURIComponent(id)}/shipping/ship`, params, options);
  }
  /**
   * Updates the shipping status of the specified Issuing Card object to submitted. This method requires Stripe Version ‘2024-09-30.acacia' or later.
   */
  submitCard(id, params, options) {
    return this._makeRequest("POST", `/v1/test_helpers/issuing/cards/${encodeURIComponent(id)}/shipping/submit`, params, options);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/BillingPortal/Configurations.js
var ConfigurationResource = class extends StripeResource {
  /**
   * Returns a list of configurations that describe the functionality of the customer portal.
   */
  list(params, options) {
    return this._makeRequest("GET", "/v1/billing_portal/configurations", params, options, {
      methodType: "list"
    });
  }
  /**
   * Creates a configuration that describes the functionality and behavior of a PortalSession
   */
  create(params, options) {
    return this._makeRequest("POST", "/v1/billing_portal/configurations", params, options);
  }
  /**
   * Retrieves a configuration that describes the functionality of the customer portal.
   */
  retrieve(id, params, options) {
    return this._makeRequest("GET", `/v1/billing_portal/configurations/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * Updates a configuration that describes the functionality of the customer portal.
   */
  update(id, params, options) {
    return this._makeRequest("POST", `/v1/billing_portal/configurations/${encodeURIComponent(id)}`, params, options);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/Terminal/Configurations.js
var ConfigurationResource2 = class extends StripeResource {
  /**
   * Deletes a Configuration object.
   */
  del(id, params, options) {
    return this._makeRequest("DELETE", `/v1/terminal/configurations/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * Retrieves a Configuration object.
   */
  retrieve(id, params, options) {
    return this._makeRequest("GET", `/v1/terminal/configurations/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * Updates a new Configuration object.
   */
  update(id, params, options) {
    return this._makeRequest("POST", `/v1/terminal/configurations/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * Returns a list of Configuration objects.
   */
  list(params, options) {
    return this._makeRequest("GET", "/v1/terminal/configurations", params, options, {
      methodType: "list"
    });
  }
  /**
   * Creates a new Configuration object.
   */
  create(params, options) {
    return this._makeRequest("POST", "/v1/terminal/configurations", params, options);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/TestHelpers/ConfirmationTokens.js
var ConfirmationTokenResource = class extends StripeResource {
  /**
   * Creates a test mode Confirmation Token server side for your integration tests.
   */
  create(params, options) {
    return this._makeRequest("POST", "/v1/test_helpers/confirmation_tokens", params, options);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/Terminal/ConnectionTokens.js
var ConnectionTokenResource = class extends StripeResource {
  /**
   * To connect to a reader the Stripe Terminal SDK needs to retrieve a short-lived connection token from Stripe, proxied through your server. On your backend, add an endpoint that creates and returns a connection token.
   */
  create(params, options) {
    return this._makeRequest("POST", "/v1/terminal/connection_tokens", params, options);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/Billing/CreditBalanceSummary.js
var CreditBalanceSummaryResource = class extends StripeResource {
  /**
   * Retrieves the credit balance summary for a customer.
   */
  retrieve(params, options) {
    return this._makeRequest("GET", "/v1/billing/credit_balance_summary", params, options);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/Billing/CreditBalanceTransactions.js
var CreditBalanceTransactionResource = class extends StripeResource {
  /**
   * Retrieve a list of credit balance transactions.
   */
  list(params, options) {
    return this._makeRequest("GET", "/v1/billing/credit_balance_transactions", params, options, {
      methodType: "list"
    });
  }
  /**
   * Retrieves a credit balance transaction.
   */
  retrieve(id, params, options) {
    return this._makeRequest("GET", `/v1/billing/credit_balance_transactions/${encodeURIComponent(id)}`, params, options);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/Billing/CreditGrants.js
var CreditGrantResource = class extends StripeResource {
  /**
   * Retrieve a list of credit grants.
   */
  list(params, options) {
    return this._makeRequest("GET", "/v1/billing/credit_grants", params, options, {
      methodType: "list"
    });
  }
  /**
   * Creates a credit grant.
   */
  create(params, options) {
    return this._makeRequest("POST", "/v1/billing/credit_grants", params, options);
  }
  /**
   * Retrieves a credit grant.
   */
  retrieve(id, params, options) {
    return this._makeRequest("GET", `/v1/billing/credit_grants/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * Updates a credit grant.
   */
  update(id, params, options) {
    return this._makeRequest("POST", `/v1/billing/credit_grants/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * Expires a credit grant.
   */
  expire(id, params, options) {
    return this._makeRequest("POST", `/v1/billing/credit_grants/${encodeURIComponent(id)}/expire`, params, options);
  }
  /**
   * Voids a credit grant.
   */
  voidGrant(id, params, options) {
    return this._makeRequest("POST", `/v1/billing/credit_grants/${encodeURIComponent(id)}/void`, params, options);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/Treasury/CreditReversals.js
var CreditReversalResource = class extends StripeResource {
  /**
   * Returns a list of CreditReversals.
   */
  list(params, options) {
    return this._makeRequest("GET", "/v1/treasury/credit_reversals", params, options, {
      methodType: "list"
    });
  }
  /**
   * Reverses a ReceivedCredit and creates a CreditReversal object.
   */
  create(params, options) {
    return this._makeRequest("POST", "/v1/treasury/credit_reversals", params, options);
  }
  /**
   * Retrieves the details of an existing CreditReversal by passing the unique CreditReversal ID from either the CreditReversal creation request or CreditReversal list
   */
  retrieve(id, params, options) {
    return this._makeRequest("GET", `/v1/treasury/credit_reversals/${encodeURIComponent(id)}`, params, options);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/TestHelpers/Customers.js
var CustomerResource = class extends StripeResource {
  /**
   * Create an incoming testmode bank transfer
   */
  fundCashBalance(id, params, options) {
    return this._makeRequest("POST", `/v1/test_helpers/customers/${encodeURIComponent(id)}/fund_cash_balance`, params, options);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/Treasury/DebitReversals.js
var DebitReversalResource = class extends StripeResource {
  /**
   * Returns a list of DebitReversals.
   */
  list(params, options) {
    return this._makeRequest("GET", "/v1/treasury/debit_reversals", params, options, {
      methodType: "list"
    });
  }
  /**
   * Reverses a ReceivedDebit and creates a DebitReversal object.
   */
  create(params, options) {
    return this._makeRequest("POST", "/v1/treasury/debit_reversals", params, options);
  }
  /**
   * Retrieves a DebitReversal object.
   */
  retrieve(id, params, options) {
    return this._makeRequest("GET", `/v1/treasury/debit_reversals/${encodeURIComponent(id)}`, params, options);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/Issuing/Disputes.js
var DisputeResource = class extends StripeResource {
  /**
   * Returns a list of Issuing Dispute objects. The objects are sorted in descending order by creation date, with the most recently created object appearing first.
   */
  list(params, options) {
    return this._makeRequest("GET", "/v1/issuing/disputes", params, options, {
      methodType: "list"
    });
  }
  /**
   * Creates an Issuing Dispute object. Individual pieces of evidence within the evidence object are optional at this point. Stripe only validates that required evidence is present during submission. Refer to [Dispute reasons and evidence](https://docs.stripe.com/docs/issuing/purchases/disputes#dispute-reasons-and-evidence) for more details about evidence requirements.
   */
  create(params, options) {
    return this._makeRequest("POST", "/v1/issuing/disputes", params, options);
  }
  /**
   * Retrieves an Issuing Dispute object.
   */
  retrieve(id, params, options) {
    return this._makeRequest("GET", `/v1/issuing/disputes/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * Updates the specified Issuing Dispute object by setting the values of the parameters passed. Any parameters not provided will be left unchanged. Properties on the evidence object can be unset by passing in an empty string.
   */
  update(id, params, options) {
    return this._makeRequest("POST", `/v1/issuing/disputes/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * Submits an Issuing Dispute to the card network. Stripe validates that all evidence fields required for the dispute's reason are present. For more details, see [Dispute reasons and evidence](https://docs.stripe.com/docs/issuing/purchases/disputes#dispute-reasons-and-evidence).
   */
  submit(id, params, options) {
    return this._makeRequest("POST", `/v1/issuing/disputes/${encodeURIComponent(id)}/submit`, params, options);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/Radar/EarlyFraudWarnings.js
var EarlyFraudWarningResource = class extends StripeResource {
  /**
   * Returns a list of early fraud warnings.
   */
  list(params, options) {
    return this._makeRequest("GET", "/v1/radar/early_fraud_warnings", params, options, {
      methodType: "list"
    });
  }
  /**
   * Retrieves the details of an early fraud warning that has previously been created.
   *
   * Please refer to the [early fraud warning](https://docs.stripe.com/api#early_fraud_warning_object) object reference for more details.
   */
  retrieve(id, params, options) {
    return this._makeRequest("GET", `/v1/radar/early_fraud_warnings/${encodeURIComponent(id)}`, params, options);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/V2/Core/EventDestinations.js
var EventDestinationResource = class extends StripeResource {
  /**
   * Lists all event destinations.
   */
  list(params, options) {
    return this._makeRequest("GET", "/v2/core/event_destinations", params, options, {
      methodType: "list"
    });
  }
  /**
   * Create a new event destination.
   */
  create(params, options) {
    return this._makeRequest("POST", "/v2/core/event_destinations", params, options);
  }
  /**
   * Delete an event destination.
   */
  del(id, params, options) {
    return this._makeRequest("DELETE", `/v2/core/event_destinations/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * Retrieves the details of an event destination.
   */
  retrieve(id, params, options) {
    return this._makeRequest("GET", `/v2/core/event_destinations/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * Update the details of an event destination.
   */
  update(id, params, options) {
    return this._makeRequest("POST", `/v2/core/event_destinations/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * Disable an event destination.
   */
  disable(id, params, options) {
    return this._makeRequest("POST", `/v2/core/event_destinations/${encodeURIComponent(id)}/disable`, params, options);
  }
  /**
   * Enable an event destination.
   */
  enable(id, params, options) {
    return this._makeRequest("POST", `/v2/core/event_destinations/${encodeURIComponent(id)}/enable`, params, options);
  }
  /**
   * Send a `ping` event to an event destination.
   */
  ping(id, params, options) {
    return this._makeRequest("POST", `/v2/core/event_destinations/${encodeURIComponent(id)}/ping`, params, options);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/V2/Core/Events.js
var EventResource = class extends StripeResource {
  /**
   * List events, going back up to 30 days.
   */
  list(params, options) {
    const transformResponseData = (response) => {
      return {
        ...response,
        data: response.data.map(this.addFetchRelatedObjectIfNeeded.bind(this))
      };
    };
    return this._makeRequest("GET", "/v2/core/events", params, options, {
      methodType: "list",
      transformResponseData
    });
  }
  /**
   * Retrieves the details of an event if it was created in the last 30 days. Supply the unique
   * identifier of the event, which might have been delivered to your event destination.
   */
  retrieve(id, params, options) {
    const transformResponseData = (response) => {
      return this.addFetchRelatedObjectIfNeeded(response);
    };
    return this._makeRequest("GET", `/v2/core/events/${encodeURIComponent(id)}`, params, options, {
      transformResponseData
    });
  }
  /**
   * @private
   *
   * For internal use in stripe-node.
   *
   * @param pulledEvent The retrieved event object
   * @returns The retrieved event object with a fetchRelatedObject method,
   * if pulledEvent.related_object is valid (non-null and has a url)
   */
  addFetchRelatedObjectIfNeeded(pulledEvent) {
    if (!pulledEvent.related_object || !pulledEvent.related_object.url) {
      return pulledEvent;
    }
    return {
      ...pulledEvent,
      fetchRelatedObject: () => this._makeRequest("GET", pulledEvent.related_object.url, void 0, {
        stripeContext: pulledEvent.context,
        headers: {
          "Stripe-Request-Trigger": `event=${pulledEvent.id}`
        }
      })
    };
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/Entitlements/Features.js
var FeatureResource = class extends StripeResource {
  /**
   * Retrieve a list of features
   */
  list(params, options) {
    return this._makeRequest("GET", "/v1/entitlements/features", params, options, {
      methodType: "list"
    });
  }
  /**
   * Creates a feature
   */
  create(params, options) {
    return this._makeRequest("POST", "/v1/entitlements/features", params, options);
  }
  /**
   * Retrieves a feature
   */
  retrieve(id, params, options) {
    return this._makeRequest("GET", `/v1/entitlements/features/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * Update a feature's metadata or permanently deactivate it.
   */
  update(id, params, options) {
    return this._makeRequest("POST", `/v1/entitlements/features/${encodeURIComponent(id)}`, params, options);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/Treasury/FinancialAccounts.js
var FinancialAccountResource = class extends StripeResource {
  /**
   * Returns a list of FinancialAccounts.
   */
  list(params, options) {
    return this._makeRequest("GET", "/v1/treasury/financial_accounts", params, options, {
      methodType: "list"
    });
  }
  /**
   * Creates a new FinancialAccount. Each connected account can have up to three FinancialAccounts by default.
   */
  create(params, options) {
    return this._makeRequest("POST", "/v1/treasury/financial_accounts", params, options);
  }
  /**
   * Retrieves the details of a FinancialAccount.
   */
  retrieve(id, params, options) {
    return this._makeRequest("GET", `/v1/treasury/financial_accounts/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * Updates the details of a FinancialAccount.
   */
  update(id, params, options) {
    return this._makeRequest("POST", `/v1/treasury/financial_accounts/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * Closes a FinancialAccount. A FinancialAccount can only be closed if it has a zero balance, has no pending InboundTransfers, and has canceled all attached Issuing cards.
   */
  close(id, params, options) {
    return this._makeRequest("POST", `/v1/treasury/financial_accounts/${encodeURIComponent(id)}/close`, params, options);
  }
  /**
   * Updates the Features associated with a FinancialAccount.
   */
  updateFeatures(id, params, options) {
    return this._makeRequest("POST", `/v1/treasury/financial_accounts/${encodeURIComponent(id)}/features`, params, options);
  }
  /**
   * Retrieves Features information associated with the FinancialAccount.
   */
  retrieveFeatures(id, params, options) {
    return this._makeRequest("GET", `/v1/treasury/financial_accounts/${encodeURIComponent(id)}/features`, params, options);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/V2/Commerce/ProductCatalog/Imports.js
var ImportResource = class extends StripeResource {
  /**
   * Returns a list of ProductCatalogImport objects.
   */
  list(params, options) {
    return this._makeRequest("GET", "/v2/commerce/product_catalog/imports", params, options, {
      methodType: "list",
      responseSchema: {
        kind: "object",
        fields: {
          data: {
            kind: "array",
            element: {
              kind: "object",
              fields: {
                status_details: {
                  kind: "object",
                  fields: {
                    processing: {
                      kind: "object",
                      fields: {
                        error_count: { kind: "int64_string" },
                        success_count: { kind: "int64_string" }
                      }
                    },
                    succeeded: {
                      kind: "object",
                      fields: { success_count: { kind: "int64_string" } }
                    },
                    succeeded_with_errors: {
                      kind: "object",
                      fields: {
                        error_count: { kind: "int64_string" },
                        error_file: {
                          kind: "object",
                          fields: { size: { kind: "int64_string" } }
                        },
                        samples: {
                          kind: "array",
                          element: {
                            kind: "object",
                            fields: { row: { kind: "int64_string" } }
                          }
                        },
                        success_count: { kind: "int64_string" }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
  }
  /**
   * Creates a ProductCatalogImport.
   */
  create(params, options) {
    return this._makeRequest("POST", "/v2/commerce/product_catalog/imports", params, options, {
      responseSchema: {
        kind: "object",
        fields: {
          status_details: {
            kind: "object",
            fields: {
              processing: {
                kind: "object",
                fields: {
                  error_count: { kind: "int64_string" },
                  success_count: { kind: "int64_string" }
                }
              },
              succeeded: {
                kind: "object",
                fields: { success_count: { kind: "int64_string" } }
              },
              succeeded_with_errors: {
                kind: "object",
                fields: {
                  error_count: { kind: "int64_string" },
                  error_file: {
                    kind: "object",
                    fields: { size: { kind: "int64_string" } }
                  },
                  samples: {
                    kind: "array",
                    element: {
                      kind: "object",
                      fields: { row: { kind: "int64_string" } }
                    }
                  },
                  success_count: { kind: "int64_string" }
                }
              }
            }
          }
        }
      }
    });
  }
  /**
   * Retrieves a ProductCatalogImport by ID.
   */
  retrieve(id, params, options) {
    return this._makeRequest("GET", `/v2/commerce/product_catalog/imports/${encodeURIComponent(id)}`, params, options, {
      responseSchema: {
        kind: "object",
        fields: {
          status_details: {
            kind: "object",
            fields: {
              processing: {
                kind: "object",
                fields: {
                  error_count: { kind: "int64_string" },
                  success_count: { kind: "int64_string" }
                }
              },
              succeeded: {
                kind: "object",
                fields: { success_count: { kind: "int64_string" } }
              },
              succeeded_with_errors: {
                kind: "object",
                fields: {
                  error_count: { kind: "int64_string" },
                  error_file: {
                    kind: "object",
                    fields: { size: { kind: "int64_string" } }
                  },
                  samples: {
                    kind: "array",
                    element: {
                      kind: "object",
                      fields: { row: { kind: "int64_string" } }
                    }
                  },
                  success_count: { kind: "int64_string" }
                }
              }
            }
          }
        }
      }
    });
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/TestHelpers/Treasury/InboundTransfers.js
var InboundTransferResource = class extends StripeResource {
  /**
   * Transitions a test mode created InboundTransfer to the failed status. The InboundTransfer must already be in the processing state.
   */
  fail(id, params, options) {
    return this._makeRequest("POST", `/v1/test_helpers/treasury/inbound_transfers/${encodeURIComponent(id)}/fail`, params, options);
  }
  /**
   * Marks the test mode InboundTransfer object as returned and links the InboundTransfer to a ReceivedDebit. The InboundTransfer must already be in the succeeded state.
   */
  returnInboundTransfer(id, params, options) {
    return this._makeRequest("POST", `/v1/test_helpers/treasury/inbound_transfers/${encodeURIComponent(id)}/return`, params, options);
  }
  /**
   * Transitions a test mode created InboundTransfer to the succeeded status. The InboundTransfer must already be in the processing state.
   */
  succeed(id, params, options) {
    return this._makeRequest("POST", `/v1/test_helpers/treasury/inbound_transfers/${encodeURIComponent(id)}/succeed`, params, options);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/Treasury/InboundTransfers.js
var InboundTransferResource2 = class extends StripeResource {
  /**
   * Returns a list of InboundTransfers sent from the specified FinancialAccount.
   */
  list(params, options) {
    return this._makeRequest("GET", "/v1/treasury/inbound_transfers", params, options, {
      methodType: "list"
    });
  }
  /**
   * Creates an InboundTransfer.
   */
  create(params, options) {
    return this._makeRequest("POST", "/v1/treasury/inbound_transfers", params, options);
  }
  /**
   * Retrieves the details of an existing InboundTransfer.
   */
  retrieve(id, params, options) {
    return this._makeRequest("GET", `/v1/treasury/inbound_transfers/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * Cancels an InboundTransfer.
   */
  cancel(id, params, options) {
    return this._makeRequest("POST", `/v1/treasury/inbound_transfers/${encodeURIComponent(id)}/cancel`, params, options);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/Terminal/Locations.js
var LocationResource = class extends StripeResource {
  /**
   * Deletes a Location object.
   */
  del(id, params, options) {
    return this._makeRequest("DELETE", `/v1/terminal/locations/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * Retrieves a Location object.
   */
  retrieve(id, params, options) {
    return this._makeRequest("GET", `/v1/terminal/locations/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * Updates a Location object by setting the values of the parameters passed. Any parameters not provided will be left unchanged.
   */
  update(id, params, options) {
    return this._makeRequest("POST", `/v1/terminal/locations/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * Returns a list of Location objects.
   */
  list(params, options) {
    return this._makeRequest("GET", "/v1/terminal/locations", params, options, {
      methodType: "list"
    });
  }
  /**
   * Creates a new Location object.
   * For further details, including which address fields are required in each country, see the [Manage locations](https://docs.stripe.com/docs/terminal/fleet/locations) guide.
   */
  create(params, options) {
    return this._makeRequest("POST", "/v1/terminal/locations", params, options);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/Billing/MeterEventAdjustments.js
var MeterEventAdjustmentResource = class extends StripeResource {
  /**
   * Creates a billing meter event adjustment.
   */
  create(params, options) {
    return this._makeRequest("POST", "/v1/billing/meter_event_adjustments", params, options);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/V2/Billing/MeterEventAdjustments.js
var MeterEventAdjustmentResource2 = class extends StripeResource {
  /**
   * Creates a meter event adjustment to cancel a previously sent meter event.
   */
  create(params, options) {
    return this._makeRequest("POST", "/v2/billing/meter_event_adjustments", params, options);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/V2/Billing/MeterEventSession.js
var MeterEventSessionResource = class extends StripeResource {
  /**
   * Creates a meter event session to send usage on the high-throughput meter event stream. Authentication tokens are only valid for 15 minutes, so you need to create a new meter event session when your token expires.
   */
  create(params, options) {
    return this._makeRequest("POST", "/v2/billing/meter_event_session", params, options);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/V2/Billing/MeterEventStream.js
var MeterEventStreamResource = class extends StripeResource {
  /**
   * Creates meter events. Events are processed asynchronously, including validation. Requires a meter event session for authentication. Supports up to 10,000 requests per second in livemode. For even higher rate-limits, contact sales.
   * @throws Stripe.TemporarySessionExpiredError
   */
  create(params, options) {
    return this._makeRequest("POST", "/v2/billing/meter_event_stream", params, options, {
      apiBase: "meter_events"
    });
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/Billing/MeterEvents.js
var MeterEventResource = class extends StripeResource {
  /**
   * Creates a billing meter event.
   */
  create(params, options) {
    return this._makeRequest("POST", "/v1/billing/meter_events", params, options);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/V2/Billing/MeterEvents.js
var MeterEventResource2 = class extends StripeResource {
  /**
   * Creates a meter event. Events are validated synchronously, but are processed asynchronously. Supports up to 1,000 events per second in livemode. For higher rate-limits, please use meter event streams instead.
   */
  create(params, options) {
    return this._makeRequest("POST", "/v2/billing/meter_events", params, options);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/Billing/Meters.js
var MeterResource = class extends StripeResource {
  /**
   * Retrieve a list of billing meters.
   */
  list(params, options) {
    return this._makeRequest("GET", "/v1/billing/meters", params, options, {
      methodType: "list"
    });
  }
  /**
   * Creates a billing meter.
   */
  create(params, options) {
    return this._makeRequest("POST", "/v1/billing/meters", params, options);
  }
  /**
   * Retrieves a billing meter given an ID.
   */
  retrieve(id, params, options) {
    return this._makeRequest("GET", `/v1/billing/meters/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * Updates a billing meter.
   */
  update(id, params, options) {
    return this._makeRequest("POST", `/v1/billing/meters/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * When a meter is deactivated, no more meter events will be accepted for this meter. You can't attach a deactivated meter to a price.
   */
  deactivate(id, params, options) {
    return this._makeRequest("POST", `/v1/billing/meters/${encodeURIComponent(id)}/deactivate`, params, options);
  }
  /**
   * When a meter is reactivated, events for this meter can be accepted and you can attach the meter to a price.
   */
  reactivate(id, params, options) {
    return this._makeRequest("POST", `/v1/billing/meters/${encodeURIComponent(id)}/reactivate`, params, options);
  }
  /**
   * Retrieve a list of billing meter event summaries.
   */
  listEventSummaries(id, params, options) {
    return this._makeRequest("GET", `/v1/billing/meters/${encodeURIComponent(id)}/event_summaries`, params, options, {
      methodType: "list"
    });
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/Terminal/OnboardingLinks.js
var OnboardingLinkResource = class extends StripeResource {
  /**
   * Creates a new OnboardingLink object that contains a redirect_url used for onboarding onto Tap to Pay on iPhone.
   */
  create(params, options) {
    return this._makeRequest("POST", "/v1/terminal/onboarding_links", params, options);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/Climate/Orders.js
var OrderResource = class extends StripeResource {
  /**
   * Lists all Climate order objects. The orders are returned sorted by creation date, with the
   * most recently created orders appearing first.
   */
  list(params, options) {
    return this._makeRequest("GET", "/v1/climate/orders", params, options, {
      methodType: "list",
      responseSchema: {
        kind: "object",
        fields: {
          data: {
            kind: "array",
            element: {
              kind: "object",
              fields: { metric_tons: { kind: "decimal_string" } }
            }
          }
        }
      }
    });
  }
  /**
   * Creates a Climate order object for a given Climate product. The order will be processed immediately
   * after creation and payment will be deducted your Stripe balance.
   */
  create(params, options) {
    return this._makeRequest("POST", "/v1/climate/orders", params, options, {
      requestSchema: {
        kind: "object",
        fields: { metric_tons: { kind: "decimal_string" } }
      },
      responseSchema: {
        kind: "object",
        fields: { metric_tons: { kind: "decimal_string" } }
      }
    });
  }
  /**
   * Retrieves the details of a Climate order object with the given ID.
   */
  retrieve(id, params, options) {
    return this._makeRequest("GET", `/v1/climate/orders/${encodeURIComponent(id)}`, params, options, {
      responseSchema: {
        kind: "object",
        fields: { metric_tons: { kind: "decimal_string" } }
      }
    });
  }
  /**
   * Updates the specified order by setting the values of the parameters passed.
   */
  update(id, params, options) {
    return this._makeRequest("POST", `/v1/climate/orders/${encodeURIComponent(id)}`, params, options, {
      responseSchema: {
        kind: "object",
        fields: { metric_tons: { kind: "decimal_string" } }
      }
    });
  }
  /**
   * Cancels a Climate order. You can cancel an order within 24 hours of creation. Stripe refunds the
   * reservation amount_subtotal, but not the amount_fees for user-triggered cancellations. Frontier
   * might cancel reservations if suppliers fail to deliver. If Frontier cancels the reservation, Stripe
   * provides 90 days advance notice and refunds the amount_total.
   */
  cancel(id, params, options) {
    return this._makeRequest("POST", `/v1/climate/orders/${encodeURIComponent(id)}/cancel`, params, options, {
      responseSchema: {
        kind: "object",
        fields: { metric_tons: { kind: "decimal_string" } }
      }
    });
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/TestHelpers/Treasury/OutboundPayments.js
var OutboundPaymentResource = class extends StripeResource {
  /**
   * Updates a test mode created OutboundPayment with tracking details. The OutboundPayment must not be cancelable, and cannot be in the canceled or failed states.
   */
  update(id, params, options) {
    return this._makeRequest("POST", `/v1/test_helpers/treasury/outbound_payments/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * Transitions a test mode created OutboundPayment to the failed status. The OutboundPayment must already be in the processing state.
   */
  fail(id, params, options) {
    return this._makeRequest("POST", `/v1/test_helpers/treasury/outbound_payments/${encodeURIComponent(id)}/fail`, params, options);
  }
  /**
   * Transitions a test mode created OutboundPayment to the posted status. The OutboundPayment must already be in the processing state.
   */
  post(id, params, options) {
    return this._makeRequest("POST", `/v1/test_helpers/treasury/outbound_payments/${encodeURIComponent(id)}/post`, params, options);
  }
  /**
   * Transitions a test mode created OutboundPayment to the returned status. The OutboundPayment must already be in the processing state.
   */
  returnOutboundPayment(id, params, options) {
    return this._makeRequest("POST", `/v1/test_helpers/treasury/outbound_payments/${encodeURIComponent(id)}/return`, params, options);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/Treasury/OutboundPayments.js
var OutboundPaymentResource2 = class extends StripeResource {
  /**
   * Returns a list of OutboundPayments sent from the specified FinancialAccount.
   */
  list(params, options) {
    return this._makeRequest("GET", "/v1/treasury/outbound_payments", params, options, {
      methodType: "list"
    });
  }
  /**
   * Creates an OutboundPayment.
   */
  create(params, options) {
    return this._makeRequest("POST", "/v1/treasury/outbound_payments", params, options);
  }
  /**
   * Retrieves the details of an existing OutboundPayment by passing the unique OutboundPayment ID from either the OutboundPayment creation request or OutboundPayment list.
   */
  retrieve(id, params, options) {
    return this._makeRequest("GET", `/v1/treasury/outbound_payments/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * Cancel an OutboundPayment.
   */
  cancel(id, params, options) {
    return this._makeRequest("POST", `/v1/treasury/outbound_payments/${encodeURIComponent(id)}/cancel`, params, options);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/TestHelpers/Treasury/OutboundTransfers.js
var OutboundTransferResource = class extends StripeResource {
  /**
   * Updates a test mode created OutboundTransfer with tracking details. The OutboundTransfer must not be cancelable, and cannot be in the canceled or failed states.
   */
  update(id, params, options) {
    return this._makeRequest("POST", `/v1/test_helpers/treasury/outbound_transfers/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * Transitions a test mode created OutboundTransfer to the failed status. The OutboundTransfer must already be in the processing state.
   */
  fail(id, params, options) {
    return this._makeRequest("POST", `/v1/test_helpers/treasury/outbound_transfers/${encodeURIComponent(id)}/fail`, params, options);
  }
  /**
   * Transitions a test mode created OutboundTransfer to the posted status. The OutboundTransfer must already be in the processing state.
   */
  post(id, params, options) {
    return this._makeRequest("POST", `/v1/test_helpers/treasury/outbound_transfers/${encodeURIComponent(id)}/post`, params, options);
  }
  /**
   * Transitions a test mode created OutboundTransfer to the returned status. The OutboundTransfer must already be in the processing state.
   */
  returnOutboundTransfer(id, params, options) {
    return this._makeRequest("POST", `/v1/test_helpers/treasury/outbound_transfers/${encodeURIComponent(id)}/return`, params, options);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/Treasury/OutboundTransfers.js
var OutboundTransferResource2 = class extends StripeResource {
  /**
   * Returns a list of OutboundTransfers sent from the specified FinancialAccount.
   */
  list(params, options) {
    return this._makeRequest("GET", "/v1/treasury/outbound_transfers", params, options, {
      methodType: "list"
    });
  }
  /**
   * Creates an OutboundTransfer.
   */
  create(params, options) {
    return this._makeRequest("POST", "/v1/treasury/outbound_transfers", params, options);
  }
  /**
   * Retrieves the details of an existing OutboundTransfer by passing the unique OutboundTransfer ID from either the OutboundTransfer creation request or OutboundTransfer list.
   */
  retrieve(id, params, options) {
    return this._makeRequest("GET", `/v1/treasury/outbound_transfers/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * An OutboundTransfer can be canceled if the funds have not yet been paid out.
   */
  cancel(id, params, options) {
    return this._makeRequest("POST", `/v1/treasury/outbound_transfers/${encodeURIComponent(id)}/cancel`, params, options);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/Radar/PaymentEvaluations.js
var PaymentEvaluationResource = class extends StripeResource {
  /**
   * Request a Radar API fraud risk score from Stripe for a payment before sending it for external processor authorization.
   */
  create(params, options) {
    return this._makeRequest("POST", "/v1/radar/payment_evaluations", params, options);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/Issuing/PersonalizationDesigns.js
var PersonalizationDesignResource = class extends StripeResource {
  /**
   * Returns a list of personalization design objects. The objects are sorted in descending order by creation date, with the most recently created object appearing first.
   */
  list(params, options) {
    return this._makeRequest("GET", "/v1/issuing/personalization_designs", params, options, {
      methodType: "list"
    });
  }
  /**
   * Creates a personalization design object.
   */
  create(params, options) {
    return this._makeRequest("POST", "/v1/issuing/personalization_designs", params, options);
  }
  /**
   * Retrieves a personalization design object.
   */
  retrieve(id, params, options) {
    return this._makeRequest("GET", `/v1/issuing/personalization_designs/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * Updates a card personalization object.
   */
  update(id, params, options) {
    return this._makeRequest("POST", `/v1/issuing/personalization_designs/${encodeURIComponent(id)}`, params, options);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/TestHelpers/Issuing/PersonalizationDesigns.js
var PersonalizationDesignResource2 = class extends StripeResource {
  /**
   * Updates the status of the specified testmode personalization design object to active.
   */
  activate(id, params, options) {
    return this._makeRequest("POST", `/v1/test_helpers/issuing/personalization_designs/${encodeURIComponent(id)}/activate`, params, options);
  }
  /**
   * Updates the status of the specified testmode personalization design object to inactive.
   */
  deactivate(id, params, options) {
    return this._makeRequest("POST", `/v1/test_helpers/issuing/personalization_designs/${encodeURIComponent(id)}/deactivate`, params, options);
  }
  /**
   * Updates the status of the specified testmode personalization design object to rejected.
   */
  reject(id, params, options) {
    return this._makeRequest("POST", `/v1/test_helpers/issuing/personalization_designs/${encodeURIComponent(id)}/reject`, params, options);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/Issuing/PhysicalBundles.js
var PhysicalBundleResource = class extends StripeResource {
  /**
   * Returns a list of physical bundle objects. The objects are sorted in descending order by creation date, with the most recently created object appearing first.
   */
  list(params, options) {
    return this._makeRequest("GET", "/v1/issuing/physical_bundles", params, options, {
      methodType: "list"
    });
  }
  /**
   * Retrieves a physical bundle object.
   */
  retrieve(id, params, options) {
    return this._makeRequest("GET", `/v1/issuing/physical_bundles/${encodeURIComponent(id)}`, params, options);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/Climate/Products.js
var ProductResource = class extends StripeResource {
  /**
   * Lists all available Climate product objects.
   */
  list(params, options) {
    return this._makeRequest("GET", "/v1/climate/products", params, options, {
      methodType: "list",
      responseSchema: {
        kind: "object",
        fields: {
          data: {
            kind: "array",
            element: {
              kind: "object",
              fields: { metric_tons_available: { kind: "decimal_string" } }
            }
          }
        }
      }
    });
  }
  /**
   * Retrieves the details of a Climate product with the given ID.
   */
  retrieve(id, params, options) {
    return this._makeRequest("GET", `/v1/climate/products/${encodeURIComponent(id)}`, params, options, {
      responseSchema: {
        kind: "object",
        fields: { metric_tons_available: { kind: "decimal_string" } }
      }
    });
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/Terminal/Readers.js
var ReaderResource = class extends StripeResource {
  /**
   * Deletes a Reader object.
   */
  del(id, params, options) {
    return this._makeRequest("DELETE", `/v1/terminal/readers/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * Retrieves a Reader object.
   */
  retrieve(id, params, options) {
    return this._makeRequest("GET", `/v1/terminal/readers/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * Updates a Reader object by setting the values of the parameters passed. Any parameters not provided will be left unchanged.
   */
  update(id, params, options) {
    return this._makeRequest("POST", `/v1/terminal/readers/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * Returns a list of Reader objects.
   */
  list(params, options) {
    return this._makeRequest("GET", "/v1/terminal/readers", params, options, {
      methodType: "list"
    });
  }
  /**
   * Creates a new Reader object.
   */
  create(params, options) {
    return this._makeRequest("POST", "/v1/terminal/readers", params, options);
  }
  /**
   * Cancels the current reader action. See [Programmatic Cancellation](https://docs.stripe.com/docs/terminal/payments/collect-card-payment?terminal-sdk-platform=server-driven#programmatic-cancellation) for more details.
   */
  cancelAction(id, params, options) {
    return this._makeRequest("POST", `/v1/terminal/readers/${encodeURIComponent(id)}/cancel_action`, params, options);
  }
  /**
   * Initiates an [input collection flow](https://docs.stripe.com/docs/terminal/features/collect-inputs) on a Reader to display input forms and collect information from your customers.
   */
  collectInputs(id, params, options) {
    return this._makeRequest("POST", `/v1/terminal/readers/${encodeURIComponent(id)}/collect_inputs`, params, options);
  }
  /**
   * Initiates a payment flow on a Reader and updates the PaymentIntent with card details before manual confirmation. See [Collecting a Payment method](https://docs.stripe.com/docs/terminal/payments/collect-card-payment?terminal-sdk-platform=server-driven&process=inspect#collect-a-paymentmethod) for more details.
   */
  collectPaymentMethod(id, params, options) {
    return this._makeRequest("POST", `/v1/terminal/readers/${encodeURIComponent(id)}/collect_payment_method`, params, options);
  }
  /**
   * Finalizes a payment on a Reader. See [Confirming a Payment](https://docs.stripe.com/docs/terminal/payments/collect-card-payment?terminal-sdk-platform=server-driven&process=inspect#confirm-the-paymentintent) for more details.
   */
  confirmPaymentIntent(id, params, options) {
    return this._makeRequest("POST", `/v1/terminal/readers/${encodeURIComponent(id)}/confirm_payment_intent`, params, options);
  }
  /**
   * Initiates a payment flow on a Reader. See [process the payment](https://docs.stripe.com/docs/terminal/payments/collect-card-payment?terminal-sdk-platform=server-driven&process=immediately#process-payment) for more details.
   */
  processPaymentIntent(id, params, options) {
    return this._makeRequest("POST", `/v1/terminal/readers/${encodeURIComponent(id)}/process_payment_intent`, params, options);
  }
  /**
   * Initiates a SetupIntent flow on a Reader. See [Save directly without charging](https://docs.stripe.com/docs/terminal/features/saving-payment-details/save-directly) for more details.
   */
  processSetupIntent(id, params, options) {
    return this._makeRequest("POST", `/v1/terminal/readers/${encodeURIComponent(id)}/process_setup_intent`, params, options);
  }
  /**
   * Initiates an in-person refund on a Reader. See [Refund an Interac Payment](https://docs.stripe.com/docs/terminal/payments/regional?integration-country=CA#refund-an-interac-payment) for more details.
   */
  refundPayment(id, params, options) {
    return this._makeRequest("POST", `/v1/terminal/readers/${encodeURIComponent(id)}/refund_payment`, params, options);
  }
  /**
   * Sets the reader display to show [cart details](https://docs.stripe.com/docs/terminal/features/display).
   */
  setReaderDisplay(id, params, options) {
    return this._makeRequest("POST", `/v1/terminal/readers/${encodeURIComponent(id)}/set_reader_display`, params, options);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/TestHelpers/Terminal/Readers.js
var ReaderResource2 = class extends StripeResource {
  /**
   * Presents a payment method on a simulated reader. Can be used to simulate accepting a payment, saving a card or refunding a transaction.
   */
  presentPaymentMethod(id, params, options) {
    return this._makeRequest("POST", `/v1/test_helpers/terminal/readers/${encodeURIComponent(id)}/present_payment_method`, params, options);
  }
  /**
   * Use this endpoint to trigger a successful input collection on a simulated reader.
   */
  succeedInputCollection(id, params, options) {
    return this._makeRequest("POST", `/v1/test_helpers/terminal/readers/${encodeURIComponent(id)}/succeed_input_collection`, params, options);
  }
  /**
   * Use this endpoint to complete an input collection with a timeout error on a simulated reader.
   */
  timeoutInputCollection(id, params, options) {
    return this._makeRequest("POST", `/v1/test_helpers/terminal/readers/${encodeURIComponent(id)}/timeout_input_collection`, params, options);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/TestHelpers/Treasury/ReceivedCredits.js
var ReceivedCreditResource = class extends StripeResource {
  /**
   * Use this endpoint to simulate a test mode ReceivedCredit initiated by a third party. In live mode, you can't directly create ReceivedCredits initiated by third parties.
   */
  create(params, options) {
    return this._makeRequest("POST", "/v1/test_helpers/treasury/received_credits", params, options);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/Treasury/ReceivedCredits.js
var ReceivedCreditResource2 = class extends StripeResource {
  /**
   * Returns a list of ReceivedCredits.
   */
  list(params, options) {
    return this._makeRequest("GET", "/v1/treasury/received_credits", params, options, {
      methodType: "list"
    });
  }
  /**
   * Retrieves the details of an existing ReceivedCredit by passing the unique ReceivedCredit ID from the ReceivedCredit list.
   */
  retrieve(id, params, options) {
    return this._makeRequest("GET", `/v1/treasury/received_credits/${encodeURIComponent(id)}`, params, options);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/TestHelpers/Treasury/ReceivedDebits.js
var ReceivedDebitResource = class extends StripeResource {
  /**
   * Use this endpoint to simulate a test mode ReceivedDebit initiated by a third party. In live mode, you can't directly create ReceivedDebits initiated by third parties.
   */
  create(params, options) {
    return this._makeRequest("POST", "/v1/test_helpers/treasury/received_debits", params, options);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/Treasury/ReceivedDebits.js
var ReceivedDebitResource2 = class extends StripeResource {
  /**
   * Returns a list of ReceivedDebits.
   */
  list(params, options) {
    return this._makeRequest("GET", "/v1/treasury/received_debits", params, options, {
      methodType: "list"
    });
  }
  /**
   * Retrieves the details of an existing ReceivedDebit by passing the unique ReceivedDebit ID from the ReceivedDebit list
   */
  retrieve(id, params, options) {
    return this._makeRequest("GET", `/v1/treasury/received_debits/${encodeURIComponent(id)}`, params, options);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/TestHelpers/Refunds.js
var RefundResource = class extends StripeResource {
  /**
   * Expire a refund with a status of requires_action.
   */
  expire(id, params, options) {
    return this._makeRequest("POST", `/v1/test_helpers/refunds/${encodeURIComponent(id)}/expire`, params, options);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/Tax/Registrations.js
var RegistrationResource = class extends StripeResource {
  /**
   * Returns a list of Tax Registration objects.
   */
  list(params, options) {
    return this._makeRequest("GET", "/v1/tax/registrations", params, options, {
      methodType: "list"
    });
  }
  /**
   * Creates a new Tax Registration object.
   */
  create(params, options) {
    return this._makeRequest("POST", "/v1/tax/registrations", params, options);
  }
  /**
   * Returns a Tax Registration object.
   */
  retrieve(id, params, options) {
    return this._makeRequest("GET", `/v1/tax/registrations/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * Updates an existing Tax Registration object.
   *
   * A registration cannot be deleted after it has been created. If you wish to end a registration you may do so by setting expires_at.
   */
  update(id, params, options) {
    return this._makeRequest("POST", `/v1/tax/registrations/${encodeURIComponent(id)}`, params, options);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/Reporting/ReportRuns.js
var ReportRunResource = class extends StripeResource {
  /**
   * Returns a list of Report Runs, with the most recent appearing first.
   */
  list(params, options) {
    return this._makeRequest("GET", "/v1/reporting/report_runs", params, options, {
      methodType: "list"
    });
  }
  /**
   * Creates a new object and begin running the report. (Certain report types require a [live-mode API key](https://stripe.com/docs/keys#test-live-modes).)
   */
  create(params, options) {
    return this._makeRequest("POST", "/v1/reporting/report_runs", params, options);
  }
  /**
   * Retrieves the details of an existing Report Run.
   */
  retrieve(id, params, options) {
    return this._makeRequest("GET", `/v1/reporting/report_runs/${encodeURIComponent(id)}`, params, options);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/Reporting/ReportTypes.js
var ReportTypeResource = class extends StripeResource {
  /**
   * Returns a full list of Report Types.
   */
  list(params, options) {
    return this._makeRequest("GET", "/v1/reporting/report_types", params, options, {
      methodType: "list"
    });
  }
  /**
   * Retrieves the details of a Report Type. (Certain report types require a [live-mode API key](https://stripe.com/docs/keys#test-live-modes).)
   */
  retrieve(id, params, options) {
    return this._makeRequest("GET", `/v1/reporting/report_types/${encodeURIComponent(id)}`, params, options);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/Forwarding/Requests.js
var RequestResource = class extends StripeResource {
  /**
   * Lists all ForwardingRequest objects.
   */
  list(params, options) {
    return this._makeRequest("GET", "/v1/forwarding/requests", params, options, {
      methodType: "list"
    });
  }
  /**
   * Creates a ForwardingRequest object.
   */
  create(params, options) {
    return this._makeRequest("POST", "/v1/forwarding/requests", params, options);
  }
  /**
   * Retrieves a ForwardingRequest object.
   */
  retrieve(id, params, options) {
    return this._makeRequest("GET", `/v1/forwarding/requests/${encodeURIComponent(id)}`, params, options);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/Sigma/ScheduledQueryRuns.js
var ScheduledQueryRunResource = class extends StripeResource {
  /**
   * Returns a list of scheduled query runs.
   */
  list(params, options) {
    return this._makeRequest("GET", "/v1/sigma/scheduled_query_runs", params, options, {
      methodType: "list"
    });
  }
  /**
   * Retrieves the details of an scheduled query run.
   */
  retrieve(id, params, options) {
    return this._makeRequest("GET", `/v1/sigma/scheduled_query_runs/${encodeURIComponent(id)}`, params, options);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/Apps/Secrets.js
var SecretResource = class extends StripeResource {
  /**
   * List all secrets stored on the given scope.
   */
  list(params, options) {
    return this._makeRequest("GET", "/v1/apps/secrets", params, options, {
      methodType: "list"
    });
  }
  /**
   * Create or replace a secret in the secret store.
   */
  create(params, options) {
    return this._makeRequest("POST", "/v1/apps/secrets", params, options);
  }
  /**
   * Finds a secret in the secret store by name and scope.
   */
  find(params, options) {
    return this._makeRequest("GET", "/v1/apps/secrets/find", params, options);
  }
  /**
   * Deletes a secret from the secret store by name and scope.
   */
  deleteWhere(params, options) {
    return this._makeRequest("POST", "/v1/apps/secrets/delete", params, options);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/BillingPortal/Sessions.js
var SessionResource = class extends StripeResource {
  /**
   * Creates a session of the customer portal.
   */
  create(params, options) {
    return this._makeRequest("POST", "/v1/billing_portal/sessions", params, options);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/Checkout/Sessions.js
var SessionResource2 = class extends StripeResource {
  /**
   * Returns a list of Checkout Sessions.
   */
  list(params, options) {
    return this._makeRequest("GET", "/v1/checkout/sessions", params, options, {
      methodType: "list",
      responseSchema: {
        kind: "object",
        fields: {
          data: {
            kind: "array",
            element: {
              kind: "object",
              fields: {
                currency_conversion: {
                  kind: "nullable",
                  inner: {
                    kind: "object",
                    fields: { fx_rate: { kind: "decimal_string" } }
                  }
                },
                line_items: {
                  kind: "object",
                  fields: {
                    data: {
                      kind: "array",
                      element: {
                        kind: "object",
                        fields: {
                          price: {
                            kind: "nullable",
                            inner: {
                              kind: "object",
                              fields: {
                                currency_options: {
                                  kind: "array",
                                  element: {
                                    kind: "object",
                                    fields: {
                                      tiers: {
                                        kind: "array",
                                        element: {
                                          kind: "object",
                                          fields: {
                                            flat_amount_decimal: {
                                              kind: "nullable",
                                              inner: { kind: "decimal_string" }
                                            },
                                            unit_amount_decimal: {
                                              kind: "nullable",
                                              inner: { kind: "decimal_string" }
                                            }
                                          }
                                        }
                                      },
                                      unit_amount_decimal: {
                                        kind: "nullable",
                                        inner: { kind: "decimal_string" }
                                      }
                                    }
                                  }
                                },
                                tiers: {
                                  kind: "array",
                                  element: {
                                    kind: "object",
                                    fields: {
                                      flat_amount_decimal: {
                                        kind: "nullable",
                                        inner: { kind: "decimal_string" }
                                      },
                                      unit_amount_decimal: {
                                        kind: "nullable",
                                        inner: { kind: "decimal_string" }
                                      }
                                    }
                                  }
                                },
                                unit_amount_decimal: {
                                  kind: "nullable",
                                  inner: { kind: "decimal_string" }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
  }
  /**
   * Creates a Checkout Session object.
   */
  create(params, options) {
    return this._makeRequest("POST", "/v1/checkout/sessions", params, options, {
      requestSchema: {
        kind: "object",
        fields: {
          line_items: {
            kind: "array",
            element: {
              kind: "object",
              fields: {
                price_data: {
                  kind: "object",
                  fields: { unit_amount_decimal: { kind: "decimal_string" } }
                }
              }
            }
          }
        }
      },
      responseSchema: {
        kind: "object",
        fields: {
          currency_conversion: {
            kind: "nullable",
            inner: {
              kind: "object",
              fields: { fx_rate: { kind: "decimal_string" } }
            }
          },
          line_items: {
            kind: "object",
            fields: {
              data: {
                kind: "array",
                element: {
                  kind: "object",
                  fields: {
                    price: {
                      kind: "nullable",
                      inner: {
                        kind: "object",
                        fields: {
                          currency_options: {
                            kind: "array",
                            element: {
                              kind: "object",
                              fields: {
                                tiers: {
                                  kind: "array",
                                  element: {
                                    kind: "object",
                                    fields: {
                                      flat_amount_decimal: {
                                        kind: "nullable",
                                        inner: { kind: "decimal_string" }
                                      },
                                      unit_amount_decimal: {
                                        kind: "nullable",
                                        inner: { kind: "decimal_string" }
                                      }
                                    }
                                  }
                                },
                                unit_amount_decimal: {
                                  kind: "nullable",
                                  inner: { kind: "decimal_string" }
                                }
                              }
                            }
                          },
                          tiers: {
                            kind: "array",
                            element: {
                              kind: "object",
                              fields: {
                                flat_amount_decimal: {
                                  kind: "nullable",
                                  inner: { kind: "decimal_string" }
                                },
                                unit_amount_decimal: {
                                  kind: "nullable",
                                  inner: { kind: "decimal_string" }
                                }
                              }
                            }
                          },
                          unit_amount_decimal: {
                            kind: "nullable",
                            inner: { kind: "decimal_string" }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
  }
  /**
   * Retrieves a Checkout Session object.
   */
  retrieve(id, params, options) {
    return this._makeRequest("GET", `/v1/checkout/sessions/${encodeURIComponent(id)}`, params, options, {
      responseSchema: {
        kind: "object",
        fields: {
          currency_conversion: {
            kind: "nullable",
            inner: {
              kind: "object",
              fields: { fx_rate: { kind: "decimal_string" } }
            }
          },
          line_items: {
            kind: "object",
            fields: {
              data: {
                kind: "array",
                element: {
                  kind: "object",
                  fields: {
                    price: {
                      kind: "nullable",
                      inner: {
                        kind: "object",
                        fields: {
                          currency_options: {
                            kind: "array",
                            element: {
                              kind: "object",
                              fields: {
                                tiers: {
                                  kind: "array",
                                  element: {
                                    kind: "object",
                                    fields: {
                                      flat_amount_decimal: {
                                        kind: "nullable",
                                        inner: { kind: "decimal_string" }
                                      },
                                      unit_amount_decimal: {
                                        kind: "nullable",
                                        inner: { kind: "decimal_string" }
                                      }
                                    }
                                  }
                                },
                                unit_amount_decimal: {
                                  kind: "nullable",
                                  inner: { kind: "decimal_string" }
                                }
                              }
                            }
                          },
                          tiers: {
                            kind: "array",
                            element: {
                              kind: "object",
                              fields: {
                                flat_amount_decimal: {
                                  kind: "nullable",
                                  inner: { kind: "decimal_string" }
                                },
                                unit_amount_decimal: {
                                  kind: "nullable",
                                  inner: { kind: "decimal_string" }
                                }
                              }
                            }
                          },
                          unit_amount_decimal: {
                            kind: "nullable",
                            inner: { kind: "decimal_string" }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
  }
  /**
   * Updates a Checkout Session object.
   *
   * Related guide: [Dynamically update a Checkout Session](https://docs.stripe.com/payments/advanced/dynamic-updates)
   */
  update(id, params, options) {
    return this._makeRequest("POST", `/v1/checkout/sessions/${encodeURIComponent(id)}`, params, options, {
      requestSchema: {
        kind: "object",
        fields: {
          line_items: {
            kind: "array",
            element: {
              kind: "object",
              fields: {
                price_data: {
                  kind: "object",
                  fields: { unit_amount_decimal: { kind: "decimal_string" } }
                }
              }
            }
          }
        }
      },
      responseSchema: {
        kind: "object",
        fields: {
          currency_conversion: {
            kind: "nullable",
            inner: {
              kind: "object",
              fields: { fx_rate: { kind: "decimal_string" } }
            }
          },
          line_items: {
            kind: "object",
            fields: {
              data: {
                kind: "array",
                element: {
                  kind: "object",
                  fields: {
                    price: {
                      kind: "nullable",
                      inner: {
                        kind: "object",
                        fields: {
                          currency_options: {
                            kind: "array",
                            element: {
                              kind: "object",
                              fields: {
                                tiers: {
                                  kind: "array",
                                  element: {
                                    kind: "object",
                                    fields: {
                                      flat_amount_decimal: {
                                        kind: "nullable",
                                        inner: { kind: "decimal_string" }
                                      },
                                      unit_amount_decimal: {
                                        kind: "nullable",
                                        inner: { kind: "decimal_string" }
                                      }
                                    }
                                  }
                                },
                                unit_amount_decimal: {
                                  kind: "nullable",
                                  inner: { kind: "decimal_string" }
                                }
                              }
                            }
                          },
                          tiers: {
                            kind: "array",
                            element: {
                              kind: "object",
                              fields: {
                                flat_amount_decimal: {
                                  kind: "nullable",
                                  inner: { kind: "decimal_string" }
                                },
                                unit_amount_decimal: {
                                  kind: "nullable",
                                  inner: { kind: "decimal_string" }
                                }
                              }
                            }
                          },
                          unit_amount_decimal: {
                            kind: "nullable",
                            inner: { kind: "decimal_string" }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
  }
  /**
   * A Checkout Session can be expired when it is in one of these statuses: open
   *
   * After it expires, a customer can't complete a Checkout Session and customers loading the Checkout Session see a message saying the Checkout Session is expired.
   */
  expire(id, params, options) {
    return this._makeRequest("POST", `/v1/checkout/sessions/${encodeURIComponent(id)}/expire`, params, options, {
      responseSchema: {
        kind: "object",
        fields: {
          currency_conversion: {
            kind: "nullable",
            inner: {
              kind: "object",
              fields: { fx_rate: { kind: "decimal_string" } }
            }
          },
          line_items: {
            kind: "object",
            fields: {
              data: {
                kind: "array",
                element: {
                  kind: "object",
                  fields: {
                    price: {
                      kind: "nullable",
                      inner: {
                        kind: "object",
                        fields: {
                          currency_options: {
                            kind: "array",
                            element: {
                              kind: "object",
                              fields: {
                                tiers: {
                                  kind: "array",
                                  element: {
                                    kind: "object",
                                    fields: {
                                      flat_amount_decimal: {
                                        kind: "nullable",
                                        inner: { kind: "decimal_string" }
                                      },
                                      unit_amount_decimal: {
                                        kind: "nullable",
                                        inner: { kind: "decimal_string" }
                                      }
                                    }
                                  }
                                },
                                unit_amount_decimal: {
                                  kind: "nullable",
                                  inner: { kind: "decimal_string" }
                                }
                              }
                            }
                          },
                          tiers: {
                            kind: "array",
                            element: {
                              kind: "object",
                              fields: {
                                flat_amount_decimal: {
                                  kind: "nullable",
                                  inner: { kind: "decimal_string" }
                                },
                                unit_amount_decimal: {
                                  kind: "nullable",
                                  inner: { kind: "decimal_string" }
                                }
                              }
                            }
                          },
                          unit_amount_decimal: {
                            kind: "nullable",
                            inner: { kind: "decimal_string" }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
  }
  /**
   * When retrieving a Checkout Session, there is an includable line_items property containing the first handful of those items. There is also a URL where you can retrieve the full (paginated) list of line items.
   */
  listLineItems(id, params, options) {
    return this._makeRequest("GET", `/v1/checkout/sessions/${encodeURIComponent(id)}/line_items`, params, options, {
      methodType: "list",
      responseSchema: {
        kind: "object",
        fields: {
          data: {
            kind: "array",
            element: {
              kind: "object",
              fields: {
                price: {
                  kind: "nullable",
                  inner: {
                    kind: "object",
                    fields: {
                      currency_options: {
                        kind: "array",
                        element: {
                          kind: "object",
                          fields: {
                            tiers: {
                              kind: "array",
                              element: {
                                kind: "object",
                                fields: {
                                  flat_amount_decimal: {
                                    kind: "nullable",
                                    inner: { kind: "decimal_string" }
                                  },
                                  unit_amount_decimal: {
                                    kind: "nullable",
                                    inner: { kind: "decimal_string" }
                                  }
                                }
                              }
                            },
                            unit_amount_decimal: {
                              kind: "nullable",
                              inner: { kind: "decimal_string" }
                            }
                          }
                        }
                      },
                      tiers: {
                        kind: "array",
                        element: {
                          kind: "object",
                          fields: {
                            flat_amount_decimal: {
                              kind: "nullable",
                              inner: { kind: "decimal_string" }
                            },
                            unit_amount_decimal: {
                              kind: "nullable",
                              inner: { kind: "decimal_string" }
                            }
                          }
                        }
                      },
                      unit_amount_decimal: {
                        kind: "nullable",
                        inner: { kind: "decimal_string" }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/FinancialConnections/Sessions.js
var SessionResource3 = class extends StripeResource {
  /**
   * Retrieves the details of a Financial Connections Session
   */
  retrieve(id, params, options) {
    return this._makeRequest("GET", `/v1/financial_connections/sessions/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * To launch the Financial Connections authorization flow, create a Session. The session's client_secret can be used to launch the flow using Stripe.js.
   */
  create(params, options) {
    return this._makeRequest("POST", "/v1/financial_connections/sessions", params, options);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/Tax/Settings.js
var SettingResource = class extends StripeResource {
  /**
   * Retrieves Tax Settings for a merchant.
   */
  retrieve(params, options) {
    return this._makeRequest("GET", "/v1/tax/settings", params, options);
  }
  /**
   * Updates Tax Settings parameters used in tax calculations. All parameters are editable but none can be removed once set.
   */
  update(params, options) {
    return this._makeRequest("POST", "/v1/tax/settings", params, options);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/Climate/Suppliers.js
var SupplierResource = class extends StripeResource {
  /**
   * Lists all available Climate supplier objects.
   */
  list(params, options) {
    return this._makeRequest("GET", "/v1/climate/suppliers", params, options, {
      methodType: "list"
    });
  }
  /**
   * Retrieves a Climate supplier object.
   */
  retrieve(id, params, options) {
    return this._makeRequest("GET", `/v1/climate/suppliers/${encodeURIComponent(id)}`, params, options);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/TestHelpers/TestClocks.js
var TestClockResource = class extends StripeResource {
  /**
   * Deletes a test clock.
   */
  del(id, params, options) {
    return this._makeRequest("DELETE", `/v1/test_helpers/test_clocks/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * Retrieves a test clock.
   */
  retrieve(id, params, options) {
    return this._makeRequest("GET", `/v1/test_helpers/test_clocks/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * Returns a list of your test clocks.
   */
  list(params, options) {
    return this._makeRequest("GET", "/v1/test_helpers/test_clocks", params, options, {
      methodType: "list"
    });
  }
  /**
   * Creates a new test clock that can be attached to new customers and quotes.
   */
  create(params, options) {
    return this._makeRequest("POST", "/v1/test_helpers/test_clocks", params, options);
  }
  /**
   * Starts advancing a test clock to a specified time in the future. Advancement is done when status changes to Ready.
   */
  advance(id, params, options) {
    return this._makeRequest("POST", `/v1/test_helpers/test_clocks/${encodeURIComponent(id)}/advance`, params, options);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/Issuing/Tokens.js
var TokenResource = class extends StripeResource {
  /**
   * Lists all Issuing Token objects for a given card.
   */
  list(params, options) {
    return this._makeRequest("GET", "/v1/issuing/tokens", params, options, {
      methodType: "list"
    });
  }
  /**
   * Retrieves an Issuing Token object.
   */
  retrieve(id, params, options) {
    return this._makeRequest("GET", `/v1/issuing/tokens/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * Attempts to update the specified Issuing Token object to the status specified.
   */
  update(id, params, options) {
    return this._makeRequest("POST", `/v1/issuing/tokens/${encodeURIComponent(id)}`, params, options);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/Treasury/TransactionEntries.js
var TransactionEntryResource = class extends StripeResource {
  /**
   * Retrieves a list of TransactionEntry objects.
   */
  list(params, options) {
    return this._makeRequest("GET", "/v1/treasury/transaction_entries", params, options, {
      methodType: "list",
      responseSchema: {
        kind: "object",
        fields: {
          data: {
            kind: "array",
            element: {
              kind: "object",
              fields: {
                flow_details: {
                  kind: "nullable",
                  inner: {
                    kind: "object",
                    fields: {
                      issuing_authorization: {
                        kind: "object",
                        fields: {
                          fleet: {
                            kind: "nullable",
                            inner: {
                              kind: "object",
                              fields: {
                                reported_breakdown: {
                                  kind: "nullable",
                                  inner: {
                                    kind: "object",
                                    fields: {
                                      fuel: {
                                        kind: "nullable",
                                        inner: {
                                          kind: "object",
                                          fields: {
                                            gross_amount_decimal: {
                                              kind: "nullable",
                                              inner: { kind: "decimal_string" }
                                            }
                                          }
                                        }
                                      },
                                      non_fuel: {
                                        kind: "nullable",
                                        inner: {
                                          kind: "object",
                                          fields: {
                                            gross_amount_decimal: {
                                              kind: "nullable",
                                              inner: { kind: "decimal_string" }
                                            }
                                          }
                                        }
                                      },
                                      tax: {
                                        kind: "nullable",
                                        inner: {
                                          kind: "object",
                                          fields: {
                                            local_amount_decimal: {
                                              kind: "nullable",
                                              inner: { kind: "decimal_string" }
                                            },
                                            national_amount_decimal: {
                                              kind: "nullable",
                                              inner: { kind: "decimal_string" }
                                            }
                                          }
                                        }
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          },
                          fuel: {
                            kind: "nullable",
                            inner: {
                              kind: "object",
                              fields: {
                                quantity_decimal: {
                                  kind: "nullable",
                                  inner: { kind: "decimal_string" }
                                },
                                unit_cost_decimal: {
                                  kind: "nullable",
                                  inner: { kind: "decimal_string" }
                                }
                              }
                            }
                          },
                          transactions: {
                            kind: "array",
                            element: {
                              kind: "object",
                              fields: {
                                purchase_details: {
                                  kind: "nullable",
                                  inner: {
                                    kind: "object",
                                    fields: {
                                      fleet: {
                                        kind: "nullable",
                                        inner: {
                                          kind: "object",
                                          fields: {
                                            reported_breakdown: {
                                              kind: "nullable",
                                              inner: {
                                                kind: "object",
                                                fields: {
                                                  fuel: {
                                                    kind: "nullable",
                                                    inner: {
                                                      kind: "object",
                                                      fields: {
                                                        gross_amount_decimal: {
                                                          kind: "nullable",
                                                          inner: {
                                                            kind: "decimal_string"
                                                          }
                                                        }
                                                      }
                                                    }
                                                  },
                                                  non_fuel: {
                                                    kind: "nullable",
                                                    inner: {
                                                      kind: "object",
                                                      fields: {
                                                        gross_amount_decimal: {
                                                          kind: "nullable",
                                                          inner: {
                                                            kind: "decimal_string"
                                                          }
                                                        }
                                                      }
                                                    }
                                                  },
                                                  tax: {
                                                    kind: "nullable",
                                                    inner: {
                                                      kind: "object",
                                                      fields: {
                                                        local_amount_decimal: {
                                                          kind: "nullable",
                                                          inner: {
                                                            kind: "decimal_string"
                                                          }
                                                        },
                                                        national_amount_decimal: {
                                                          kind: "nullable",
                                                          inner: {
                                                            kind: "decimal_string"
                                                          }
                                                        }
                                                      }
                                                    }
                                                  }
                                                }
                                              }
                                            }
                                          }
                                        }
                                      },
                                      fuel: {
                                        kind: "nullable",
                                        inner: {
                                          kind: "object",
                                          fields: {
                                            quantity_decimal: {
                                              kind: "nullable",
                                              inner: { kind: "decimal_string" }
                                            },
                                            unit_cost_decimal: {
                                              kind: "decimal_string"
                                            }
                                          }
                                        }
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
  }
  /**
   * Retrieves a TransactionEntry object.
   */
  retrieve(id, params, options) {
    return this._makeRequest("GET", `/v1/treasury/transaction_entries/${encodeURIComponent(id)}`, params, options, {
      responseSchema: {
        kind: "object",
        fields: {
          flow_details: {
            kind: "nullable",
            inner: {
              kind: "object",
              fields: {
                issuing_authorization: {
                  kind: "object",
                  fields: {
                    fleet: {
                      kind: "nullable",
                      inner: {
                        kind: "object",
                        fields: {
                          reported_breakdown: {
                            kind: "nullable",
                            inner: {
                              kind: "object",
                              fields: {
                                fuel: {
                                  kind: "nullable",
                                  inner: {
                                    kind: "object",
                                    fields: {
                                      gross_amount_decimal: {
                                        kind: "nullable",
                                        inner: { kind: "decimal_string" }
                                      }
                                    }
                                  }
                                },
                                non_fuel: {
                                  kind: "nullable",
                                  inner: {
                                    kind: "object",
                                    fields: {
                                      gross_amount_decimal: {
                                        kind: "nullable",
                                        inner: { kind: "decimal_string" }
                                      }
                                    }
                                  }
                                },
                                tax: {
                                  kind: "nullable",
                                  inner: {
                                    kind: "object",
                                    fields: {
                                      local_amount_decimal: {
                                        kind: "nullable",
                                        inner: { kind: "decimal_string" }
                                      },
                                      national_amount_decimal: {
                                        kind: "nullable",
                                        inner: { kind: "decimal_string" }
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    },
                    fuel: {
                      kind: "nullable",
                      inner: {
                        kind: "object",
                        fields: {
                          quantity_decimal: {
                            kind: "nullable",
                            inner: { kind: "decimal_string" }
                          },
                          unit_cost_decimal: {
                            kind: "nullable",
                            inner: { kind: "decimal_string" }
                          }
                        }
                      }
                    },
                    transactions: {
                      kind: "array",
                      element: {
                        kind: "object",
                        fields: {
                          purchase_details: {
                            kind: "nullable",
                            inner: {
                              kind: "object",
                              fields: {
                                fleet: {
                                  kind: "nullable",
                                  inner: {
                                    kind: "object",
                                    fields: {
                                      reported_breakdown: {
                                        kind: "nullable",
                                        inner: {
                                          kind: "object",
                                          fields: {
                                            fuel: {
                                              kind: "nullable",
                                              inner: {
                                                kind: "object",
                                                fields: {
                                                  gross_amount_decimal: {
                                                    kind: "nullable",
                                                    inner: {
                                                      kind: "decimal_string"
                                                    }
                                                  }
                                                }
                                              }
                                            },
                                            non_fuel: {
                                              kind: "nullable",
                                              inner: {
                                                kind: "object",
                                                fields: {
                                                  gross_amount_decimal: {
                                                    kind: "nullable",
                                                    inner: {
                                                      kind: "decimal_string"
                                                    }
                                                  }
                                                }
                                              }
                                            },
                                            tax: {
                                              kind: "nullable",
                                              inner: {
                                                kind: "object",
                                                fields: {
                                                  local_amount_decimal: {
                                                    kind: "nullable",
                                                    inner: {
                                                      kind: "decimal_string"
                                                    }
                                                  },
                                                  national_amount_decimal: {
                                                    kind: "nullable",
                                                    inner: {
                                                      kind: "decimal_string"
                                                    }
                                                  }
                                                }
                                              }
                                            }
                                          }
                                        }
                                      }
                                    }
                                  }
                                },
                                fuel: {
                                  kind: "nullable",
                                  inner: {
                                    kind: "object",
                                    fields: {
                                      quantity_decimal: {
                                        kind: "nullable",
                                        inner: { kind: "decimal_string" }
                                      },
                                      unit_cost_decimal: {
                                        kind: "decimal_string"
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/FinancialConnections/Transactions.js
var TransactionResource = class extends StripeResource {
  /**
   * Returns a list of Financial Connections Transaction objects.
   */
  list(params, options) {
    return this._makeRequest("GET", "/v1/financial_connections/transactions", params, options, {
      methodType: "list"
    });
  }
  /**
   * Retrieves the details of a Financial Connections Transaction
   */
  retrieve(id, params, options) {
    return this._makeRequest("GET", `/v1/financial_connections/transactions/${encodeURIComponent(id)}`, params, options);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/Issuing/Transactions.js
var TransactionResource2 = class extends StripeResource {
  /**
   * Returns a list of Issuing Transaction objects. The objects are sorted in descending order by creation date, with the most recently created object appearing first.
   */
  list(params, options) {
    return this._makeRequest("GET", "/v1/issuing/transactions", params, options, {
      methodType: "list",
      responseSchema: {
        kind: "object",
        fields: {
          data: {
            kind: "array",
            element: {
              kind: "object",
              fields: {
                purchase_details: {
                  kind: "nullable",
                  inner: {
                    kind: "object",
                    fields: {
                      fleet: {
                        kind: "nullable",
                        inner: {
                          kind: "object",
                          fields: {
                            reported_breakdown: {
                              kind: "nullable",
                              inner: {
                                kind: "object",
                                fields: {
                                  fuel: {
                                    kind: "nullable",
                                    inner: {
                                      kind: "object",
                                      fields: {
                                        gross_amount_decimal: {
                                          kind: "nullable",
                                          inner: { kind: "decimal_string" }
                                        }
                                      }
                                    }
                                  },
                                  non_fuel: {
                                    kind: "nullable",
                                    inner: {
                                      kind: "object",
                                      fields: {
                                        gross_amount_decimal: {
                                          kind: "nullable",
                                          inner: { kind: "decimal_string" }
                                        }
                                      }
                                    }
                                  },
                                  tax: {
                                    kind: "nullable",
                                    inner: {
                                      kind: "object",
                                      fields: {
                                        local_amount_decimal: {
                                          kind: "nullable",
                                          inner: { kind: "decimal_string" }
                                        },
                                        national_amount_decimal: {
                                          kind: "nullable",
                                          inner: { kind: "decimal_string" }
                                        }
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      },
                      fuel: {
                        kind: "nullable",
                        inner: {
                          kind: "object",
                          fields: {
                            quantity_decimal: {
                              kind: "nullable",
                              inner: { kind: "decimal_string" }
                            },
                            unit_cost_decimal: { kind: "decimal_string" }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
  }
  /**
   * Retrieves an Issuing Transaction object.
   */
  retrieve(id, params, options) {
    return this._makeRequest("GET", `/v1/issuing/transactions/${encodeURIComponent(id)}`, params, options, {
      responseSchema: {
        kind: "object",
        fields: {
          purchase_details: {
            kind: "nullable",
            inner: {
              kind: "object",
              fields: {
                fleet: {
                  kind: "nullable",
                  inner: {
                    kind: "object",
                    fields: {
                      reported_breakdown: {
                        kind: "nullable",
                        inner: {
                          kind: "object",
                          fields: {
                            fuel: {
                              kind: "nullable",
                              inner: {
                                kind: "object",
                                fields: {
                                  gross_amount_decimal: {
                                    kind: "nullable",
                                    inner: { kind: "decimal_string" }
                                  }
                                }
                              }
                            },
                            non_fuel: {
                              kind: "nullable",
                              inner: {
                                kind: "object",
                                fields: {
                                  gross_amount_decimal: {
                                    kind: "nullable",
                                    inner: { kind: "decimal_string" }
                                  }
                                }
                              }
                            },
                            tax: {
                              kind: "nullable",
                              inner: {
                                kind: "object",
                                fields: {
                                  local_amount_decimal: {
                                    kind: "nullable",
                                    inner: { kind: "decimal_string" }
                                  },
                                  national_amount_decimal: {
                                    kind: "nullable",
                                    inner: { kind: "decimal_string" }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                },
                fuel: {
                  kind: "nullable",
                  inner: {
                    kind: "object",
                    fields: {
                      quantity_decimal: {
                        kind: "nullable",
                        inner: { kind: "decimal_string" }
                      },
                      unit_cost_decimal: { kind: "decimal_string" }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
  }
  /**
   * Updates the specified Issuing Transaction object by setting the values of the parameters passed. Any parameters not provided will be left unchanged.
   */
  update(id, params, options) {
    return this._makeRequest("POST", `/v1/issuing/transactions/${encodeURIComponent(id)}`, params, options, {
      responseSchema: {
        kind: "object",
        fields: {
          purchase_details: {
            kind: "nullable",
            inner: {
              kind: "object",
              fields: {
                fleet: {
                  kind: "nullable",
                  inner: {
                    kind: "object",
                    fields: {
                      reported_breakdown: {
                        kind: "nullable",
                        inner: {
                          kind: "object",
                          fields: {
                            fuel: {
                              kind: "nullable",
                              inner: {
                                kind: "object",
                                fields: {
                                  gross_amount_decimal: {
                                    kind: "nullable",
                                    inner: { kind: "decimal_string" }
                                  }
                                }
                              }
                            },
                            non_fuel: {
                              kind: "nullable",
                              inner: {
                                kind: "object",
                                fields: {
                                  gross_amount_decimal: {
                                    kind: "nullable",
                                    inner: { kind: "decimal_string" }
                                  }
                                }
                              }
                            },
                            tax: {
                              kind: "nullable",
                              inner: {
                                kind: "object",
                                fields: {
                                  local_amount_decimal: {
                                    kind: "nullable",
                                    inner: { kind: "decimal_string" }
                                  },
                                  national_amount_decimal: {
                                    kind: "nullable",
                                    inner: { kind: "decimal_string" }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                },
                fuel: {
                  kind: "nullable",
                  inner: {
                    kind: "object",
                    fields: {
                      quantity_decimal: {
                        kind: "nullable",
                        inner: { kind: "decimal_string" }
                      },
                      unit_cost_decimal: { kind: "decimal_string" }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/Tax/Transactions.js
var TransactionResource3 = class extends StripeResource {
  /**
   * Retrieves a Tax Transaction object.
   */
  retrieve(id, params, options) {
    return this._makeRequest("GET", `/v1/tax/transactions/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * Creates a Tax Transaction from a calculation, if that calculation hasn't expired. Calculations expire after 90 days.
   */
  createFromCalculation(params, options) {
    return this._makeRequest("POST", "/v1/tax/transactions/create_from_calculation", params, options);
  }
  /**
   * Partially or fully reverses a previously created Transaction.
   */
  createReversal(params, options) {
    return this._makeRequest("POST", "/v1/tax/transactions/create_reversal", params, options);
  }
  /**
   * Retrieves the line items of a committed standalone transaction as a collection.
   */
  listLineItems(id, params, options) {
    return this._makeRequest("GET", `/v1/tax/transactions/${encodeURIComponent(id)}/line_items`, params, options, {
      methodType: "list"
    });
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/TestHelpers/Issuing/Transactions.js
var TransactionResource4 = class extends StripeResource {
  /**
   * Refund a test-mode Transaction.
   */
  refund(id, params, options) {
    return this._makeRequest("POST", `/v1/test_helpers/issuing/transactions/${encodeURIComponent(id)}/refund`, params, options, {
      responseSchema: {
        kind: "object",
        fields: {
          purchase_details: {
            kind: "nullable",
            inner: {
              kind: "object",
              fields: {
                fleet: {
                  kind: "nullable",
                  inner: {
                    kind: "object",
                    fields: {
                      reported_breakdown: {
                        kind: "nullable",
                        inner: {
                          kind: "object",
                          fields: {
                            fuel: {
                              kind: "nullable",
                              inner: {
                                kind: "object",
                                fields: {
                                  gross_amount_decimal: {
                                    kind: "nullable",
                                    inner: { kind: "decimal_string" }
                                  }
                                }
                              }
                            },
                            non_fuel: {
                              kind: "nullable",
                              inner: {
                                kind: "object",
                                fields: {
                                  gross_amount_decimal: {
                                    kind: "nullable",
                                    inner: { kind: "decimal_string" }
                                  }
                                }
                              }
                            },
                            tax: {
                              kind: "nullable",
                              inner: {
                                kind: "object",
                                fields: {
                                  local_amount_decimal: {
                                    kind: "nullable",
                                    inner: { kind: "decimal_string" }
                                  },
                                  national_amount_decimal: {
                                    kind: "nullable",
                                    inner: { kind: "decimal_string" }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                },
                fuel: {
                  kind: "nullable",
                  inner: {
                    kind: "object",
                    fields: {
                      quantity_decimal: {
                        kind: "nullable",
                        inner: { kind: "decimal_string" }
                      },
                      unit_cost_decimal: { kind: "decimal_string" }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
  }
  /**
   * Allows the user to capture an arbitrary amount, also known as a forced capture.
   */
  createForceCapture(params, options) {
    return this._makeRequest("POST", "/v1/test_helpers/issuing/transactions/create_force_capture", params, options, {
      requestSchema: {
        kind: "object",
        fields: {
          purchase_details: {
            kind: "object",
            fields: {
              fleet: {
                kind: "object",
                fields: {
                  reported_breakdown: {
                    kind: "object",
                    fields: {
                      fuel: {
                        kind: "object",
                        fields: {
                          gross_amount_decimal: { kind: "decimal_string" }
                        }
                      },
                      non_fuel: {
                        kind: "object",
                        fields: {
                          gross_amount_decimal: { kind: "decimal_string" }
                        }
                      },
                      tax: {
                        kind: "object",
                        fields: {
                          local_amount_decimal: { kind: "decimal_string" },
                          national_amount_decimal: { kind: "decimal_string" }
                        }
                      }
                    }
                  }
                }
              },
              fuel: {
                kind: "object",
                fields: {
                  quantity_decimal: { kind: "decimal_string" },
                  unit_cost_decimal: { kind: "decimal_string" }
                }
              },
              receipt: {
                kind: "array",
                element: {
                  kind: "object",
                  fields: { quantity: { kind: "decimal_string" } }
                }
              }
            }
          }
        }
      },
      responseSchema: {
        kind: "object",
        fields: {
          purchase_details: {
            kind: "nullable",
            inner: {
              kind: "object",
              fields: {
                fleet: {
                  kind: "nullable",
                  inner: {
                    kind: "object",
                    fields: {
                      reported_breakdown: {
                        kind: "nullable",
                        inner: {
                          kind: "object",
                          fields: {
                            fuel: {
                              kind: "nullable",
                              inner: {
                                kind: "object",
                                fields: {
                                  gross_amount_decimal: {
                                    kind: "nullable",
                                    inner: { kind: "decimal_string" }
                                  }
                                }
                              }
                            },
                            non_fuel: {
                              kind: "nullable",
                              inner: {
                                kind: "object",
                                fields: {
                                  gross_amount_decimal: {
                                    kind: "nullable",
                                    inner: { kind: "decimal_string" }
                                  }
                                }
                              }
                            },
                            tax: {
                              kind: "nullable",
                              inner: {
                                kind: "object",
                                fields: {
                                  local_amount_decimal: {
                                    kind: "nullable",
                                    inner: { kind: "decimal_string" }
                                  },
                                  national_amount_decimal: {
                                    kind: "nullable",
                                    inner: { kind: "decimal_string" }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                },
                fuel: {
                  kind: "nullable",
                  inner: {
                    kind: "object",
                    fields: {
                      quantity_decimal: {
                        kind: "nullable",
                        inner: { kind: "decimal_string" }
                      },
                      unit_cost_decimal: { kind: "decimal_string" }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
  }
  /**
   * Allows the user to refund an arbitrary amount, also known as a unlinked refund.
   */
  createUnlinkedRefund(params, options) {
    return this._makeRequest("POST", "/v1/test_helpers/issuing/transactions/create_unlinked_refund", params, options, {
      requestSchema: {
        kind: "object",
        fields: {
          purchase_details: {
            kind: "object",
            fields: {
              fleet: {
                kind: "object",
                fields: {
                  reported_breakdown: {
                    kind: "object",
                    fields: {
                      fuel: {
                        kind: "object",
                        fields: {
                          gross_amount_decimal: { kind: "decimal_string" }
                        }
                      },
                      non_fuel: {
                        kind: "object",
                        fields: {
                          gross_amount_decimal: { kind: "decimal_string" }
                        }
                      },
                      tax: {
                        kind: "object",
                        fields: {
                          local_amount_decimal: { kind: "decimal_string" },
                          national_amount_decimal: { kind: "decimal_string" }
                        }
                      }
                    }
                  }
                }
              },
              fuel: {
                kind: "object",
                fields: {
                  quantity_decimal: { kind: "decimal_string" },
                  unit_cost_decimal: { kind: "decimal_string" }
                }
              },
              receipt: {
                kind: "array",
                element: {
                  kind: "object",
                  fields: { quantity: { kind: "decimal_string" } }
                }
              }
            }
          }
        }
      },
      responseSchema: {
        kind: "object",
        fields: {
          purchase_details: {
            kind: "nullable",
            inner: {
              kind: "object",
              fields: {
                fleet: {
                  kind: "nullable",
                  inner: {
                    kind: "object",
                    fields: {
                      reported_breakdown: {
                        kind: "nullable",
                        inner: {
                          kind: "object",
                          fields: {
                            fuel: {
                              kind: "nullable",
                              inner: {
                                kind: "object",
                                fields: {
                                  gross_amount_decimal: {
                                    kind: "nullable",
                                    inner: { kind: "decimal_string" }
                                  }
                                }
                              }
                            },
                            non_fuel: {
                              kind: "nullable",
                              inner: {
                                kind: "object",
                                fields: {
                                  gross_amount_decimal: {
                                    kind: "nullable",
                                    inner: { kind: "decimal_string" }
                                  }
                                }
                              }
                            },
                            tax: {
                              kind: "nullable",
                              inner: {
                                kind: "object",
                                fields: {
                                  local_amount_decimal: {
                                    kind: "nullable",
                                    inner: { kind: "decimal_string" }
                                  },
                                  national_amount_decimal: {
                                    kind: "nullable",
                                    inner: { kind: "decimal_string" }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                },
                fuel: {
                  kind: "nullable",
                  inner: {
                    kind: "object",
                    fields: {
                      quantity_decimal: {
                        kind: "nullable",
                        inner: { kind: "decimal_string" }
                      },
                      unit_cost_decimal: { kind: "decimal_string" }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/Treasury/Transactions.js
var TransactionResource5 = class extends StripeResource {
  /**
   * Retrieves a list of Transaction objects.
   */
  list(params, options) {
    return this._makeRequest("GET", "/v1/treasury/transactions", params, options, {
      methodType: "list",
      responseSchema: {
        kind: "object",
        fields: {
          data: {
            kind: "array",
            element: {
              kind: "object",
              fields: {
                entries: {
                  kind: "nullable",
                  inner: {
                    kind: "object",
                    fields: {
                      data: {
                        kind: "array",
                        element: {
                          kind: "object",
                          fields: {
                            flow_details: {
                              kind: "nullable",
                              inner: {
                                kind: "object",
                                fields: {
                                  issuing_authorization: {
                                    kind: "object",
                                    fields: {
                                      fleet: {
                                        kind: "nullable",
                                        inner: {
                                          kind: "object",
                                          fields: {
                                            reported_breakdown: {
                                              kind: "nullable",
                                              inner: {
                                                kind: "object",
                                                fields: {
                                                  fuel: {
                                                    kind: "nullable",
                                                    inner: {
                                                      kind: "object",
                                                      fields: {
                                                        gross_amount_decimal: {
                                                          kind: "nullable",
                                                          inner: {
                                                            kind: "decimal_string"
                                                          }
                                                        }
                                                      }
                                                    }
                                                  },
                                                  non_fuel: {
                                                    kind: "nullable",
                                                    inner: {
                                                      kind: "object",
                                                      fields: {
                                                        gross_amount_decimal: {
                                                          kind: "nullable",
                                                          inner: {
                                                            kind: "decimal_string"
                                                          }
                                                        }
                                                      }
                                                    }
                                                  },
                                                  tax: {
                                                    kind: "nullable",
                                                    inner: {
                                                      kind: "object",
                                                      fields: {
                                                        local_amount_decimal: {
                                                          kind: "nullable",
                                                          inner: {
                                                            kind: "decimal_string"
                                                          }
                                                        },
                                                        national_amount_decimal: {
                                                          kind: "nullable",
                                                          inner: {
                                                            kind: "decimal_string"
                                                          }
                                                        }
                                                      }
                                                    }
                                                  }
                                                }
                                              }
                                            }
                                          }
                                        }
                                      },
                                      fuel: {
                                        kind: "nullable",
                                        inner: {
                                          kind: "object",
                                          fields: {
                                            quantity_decimal: {
                                              kind: "nullable",
                                              inner: { kind: "decimal_string" }
                                            },
                                            unit_cost_decimal: {
                                              kind: "nullable",
                                              inner: { kind: "decimal_string" }
                                            }
                                          }
                                        }
                                      },
                                      transactions: {
                                        kind: "array",
                                        element: {
                                          kind: "object",
                                          fields: {
                                            purchase_details: {
                                              kind: "nullable",
                                              inner: {
                                                kind: "object",
                                                fields: {
                                                  fleet: {
                                                    kind: "nullable",
                                                    inner: {
                                                      kind: "object",
                                                      fields: {
                                                        reported_breakdown: {
                                                          kind: "nullable",
                                                          inner: {
                                                            kind: "object",
                                                            fields: {
                                                              fuel: {
                                                                kind: "nullable",
                                                                inner: {
                                                                  kind: "object",
                                                                  fields: {
                                                                    gross_amount_decimal: {
                                                                      kind: "nullable",
                                                                      inner: {
                                                                        kind: "decimal_string"
                                                                      }
                                                                    }
                                                                  }
                                                                }
                                                              },
                                                              non_fuel: {
                                                                kind: "nullable",
                                                                inner: {
                                                                  kind: "object",
                                                                  fields: {
                                                                    gross_amount_decimal: {
                                                                      kind: "nullable",
                                                                      inner: {
                                                                        kind: "decimal_string"
                                                                      }
                                                                    }
                                                                  }
                                                                }
                                                              },
                                                              tax: {
                                                                kind: "nullable",
                                                                inner: {
                                                                  kind: "object",
                                                                  fields: {
                                                                    local_amount_decimal: {
                                                                      kind: "nullable",
                                                                      inner: {
                                                                        kind: "decimal_string"
                                                                      }
                                                                    },
                                                                    national_amount_decimal: {
                                                                      kind: "nullable",
                                                                      inner: {
                                                                        kind: "decimal_string"
                                                                      }
                                                                    }
                                                                  }
                                                                }
                                                              }
                                                            }
                                                          }
                                                        }
                                                      }
                                                    }
                                                  },
                                                  fuel: {
                                                    kind: "nullable",
                                                    inner: {
                                                      kind: "object",
                                                      fields: {
                                                        quantity_decimal: {
                                                          kind: "nullable",
                                                          inner: {
                                                            kind: "decimal_string"
                                                          }
                                                        },
                                                        unit_cost_decimal: {
                                                          kind: "decimal_string"
                                                        }
                                                      }
                                                    }
                                                  }
                                                }
                                              }
                                            }
                                          }
                                        }
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
  }
  /**
   * Retrieves the details of an existing Transaction.
   */
  retrieve(id, params, options) {
    return this._makeRequest("GET", `/v1/treasury/transactions/${encodeURIComponent(id)}`, params, options, {
      responseSchema: {
        kind: "object",
        fields: {
          entries: {
            kind: "nullable",
            inner: {
              kind: "object",
              fields: {
                data: {
                  kind: "array",
                  element: {
                    kind: "object",
                    fields: {
                      flow_details: {
                        kind: "nullable",
                        inner: {
                          kind: "object",
                          fields: {
                            issuing_authorization: {
                              kind: "object",
                              fields: {
                                fleet: {
                                  kind: "nullable",
                                  inner: {
                                    kind: "object",
                                    fields: {
                                      reported_breakdown: {
                                        kind: "nullable",
                                        inner: {
                                          kind: "object",
                                          fields: {
                                            fuel: {
                                              kind: "nullable",
                                              inner: {
                                                kind: "object",
                                                fields: {
                                                  gross_amount_decimal: {
                                                    kind: "nullable",
                                                    inner: {
                                                      kind: "decimal_string"
                                                    }
                                                  }
                                                }
                                              }
                                            },
                                            non_fuel: {
                                              kind: "nullable",
                                              inner: {
                                                kind: "object",
                                                fields: {
                                                  gross_amount_decimal: {
                                                    kind: "nullable",
                                                    inner: {
                                                      kind: "decimal_string"
                                                    }
                                                  }
                                                }
                                              }
                                            },
                                            tax: {
                                              kind: "nullable",
                                              inner: {
                                                kind: "object",
                                                fields: {
                                                  local_amount_decimal: {
                                                    kind: "nullable",
                                                    inner: {
                                                      kind: "decimal_string"
                                                    }
                                                  },
                                                  national_amount_decimal: {
                                                    kind: "nullable",
                                                    inner: {
                                                      kind: "decimal_string"
                                                    }
                                                  }
                                                }
                                              }
                                            }
                                          }
                                        }
                                      }
                                    }
                                  }
                                },
                                fuel: {
                                  kind: "nullable",
                                  inner: {
                                    kind: "object",
                                    fields: {
                                      quantity_decimal: {
                                        kind: "nullable",
                                        inner: { kind: "decimal_string" }
                                      },
                                      unit_cost_decimal: {
                                        kind: "nullable",
                                        inner: { kind: "decimal_string" }
                                      }
                                    }
                                  }
                                },
                                transactions: {
                                  kind: "array",
                                  element: {
                                    kind: "object",
                                    fields: {
                                      purchase_details: {
                                        kind: "nullable",
                                        inner: {
                                          kind: "object",
                                          fields: {
                                            fleet: {
                                              kind: "nullable",
                                              inner: {
                                                kind: "object",
                                                fields: {
                                                  reported_breakdown: {
                                                    kind: "nullable",
                                                    inner: {
                                                      kind: "object",
                                                      fields: {
                                                        fuel: {
                                                          kind: "nullable",
                                                          inner: {
                                                            kind: "object",
                                                            fields: {
                                                              gross_amount_decimal: {
                                                                kind: "nullable",
                                                                inner: {
                                                                  kind: "decimal_string"
                                                                }
                                                              }
                                                            }
                                                          }
                                                        },
                                                        non_fuel: {
                                                          kind: "nullable",
                                                          inner: {
                                                            kind: "object",
                                                            fields: {
                                                              gross_amount_decimal: {
                                                                kind: "nullable",
                                                                inner: {
                                                                  kind: "decimal_string"
                                                                }
                                                              }
                                                            }
                                                          }
                                                        },
                                                        tax: {
                                                          kind: "nullable",
                                                          inner: {
                                                            kind: "object",
                                                            fields: {
                                                              local_amount_decimal: {
                                                                kind: "nullable",
                                                                inner: {
                                                                  kind: "decimal_string"
                                                                }
                                                              },
                                                              national_amount_decimal: {
                                                                kind: "nullable",
                                                                inner: {
                                                                  kind: "decimal_string"
                                                                }
                                                              }
                                                            }
                                                          }
                                                        }
                                                      }
                                                    }
                                                  }
                                                }
                                              }
                                            },
                                            fuel: {
                                              kind: "nullable",
                                              inner: {
                                                kind: "object",
                                                fields: {
                                                  quantity_decimal: {
                                                    kind: "nullable",
                                                    inner: {
                                                      kind: "decimal_string"
                                                    }
                                                  },
                                                  unit_cost_decimal: {
                                                    kind: "decimal_string"
                                                  }
                                                }
                                              }
                                            }
                                          }
                                        }
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/Radar/ValueListItems.js
var ValueListItemResource = class extends StripeResource {
  /**
   * Deletes a ValueListItem object, removing it from its parent value list.
   */
  del(id, params, options) {
    return this._makeRequest("DELETE", `/v1/radar/value_list_items/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * Retrieves a ValueListItem object.
   */
  retrieve(id, params, options) {
    return this._makeRequest("GET", `/v1/radar/value_list_items/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * Returns a list of ValueListItem objects. The objects are sorted in descending order by creation date, with the most recently created object appearing first.
   */
  list(params, options) {
    return this._makeRequest("GET", "/v1/radar/value_list_items", params, options, {
      methodType: "list"
    });
  }
  /**
   * Creates a new ValueListItem object, which is added to the specified parent value list.
   */
  create(params, options) {
    return this._makeRequest("POST", "/v1/radar/value_list_items", params, options);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/Radar/ValueLists.js
var ValueListResource = class extends StripeResource {
  /**
   * Deletes a ValueList object, also deleting any items contained within the value list. To be deleted, a value list must not be referenced in any rules.
   */
  del(id, params, options) {
    return this._makeRequest("DELETE", `/v1/radar/value_lists/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * Retrieves a ValueList object.
   */
  retrieve(id, params, options) {
    return this._makeRequest("GET", `/v1/radar/value_lists/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * Updates a ValueList object by setting the values of the parameters passed. Any parameters not provided will be left unchanged. Note that item_type is immutable.
   */
  update(id, params, options) {
    return this._makeRequest("POST", `/v1/radar/value_lists/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * Returns a list of ValueList objects. The objects are sorted in descending order by creation date, with the most recently created object appearing first.
   */
  list(params, options) {
    return this._makeRequest("GET", "/v1/radar/value_lists", params, options, {
      methodType: "list"
    });
  }
  /**
   * Creates a new ValueList object, which can then be referenced in rules.
   */
  create(params, options) {
    return this._makeRequest("POST", "/v1/radar/value_lists", params, options);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/Identity/VerificationReports.js
var VerificationReportResource = class extends StripeResource {
  /**
   * List all verification reports.
   */
  list(params, options) {
    return this._makeRequest("GET", "/v1/identity/verification_reports", params, options, {
      methodType: "list"
    });
  }
  /**
   * Retrieves an existing VerificationReport
   */
  retrieve(id, params, options) {
    return this._makeRequest("GET", `/v1/identity/verification_reports/${encodeURIComponent(id)}`, params, options);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/Identity/VerificationSessions.js
var VerificationSessionResource = class extends StripeResource {
  /**
   * Returns a list of VerificationSessions
   */
  list(params, options) {
    return this._makeRequest("GET", "/v1/identity/verification_sessions", params, options, {
      methodType: "list"
    });
  }
  /**
   * Creates a VerificationSession object.
   *
   * After the VerificationSession is created, display a verification modal using the session client_secret or send your users to the session's url.
   *
   * If your API key is in test mode, verification checks won't actually process, though everything else will occur as if in live mode.
   *
   * Related guide: [Verify your users' identity documents](https://docs.stripe.com/docs/identity/verify-identity-documents)
   */
  create(params, options) {
    return this._makeRequest("POST", "/v1/identity/verification_sessions", params, options);
  }
  /**
   * Retrieves the details of a VerificationSession that was previously created.
   *
   * When the session status is requires_input, you can use this method to retrieve a valid
   * client_secret or url to allow re-submission.
   */
  retrieve(id, params, options) {
    return this._makeRequest("GET", `/v1/identity/verification_sessions/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * Updates a VerificationSession object.
   *
   * When the session status is requires_input, you can use this method to update the
   * verification check and options.
   */
  update(id, params, options) {
    return this._makeRequest("POST", `/v1/identity/verification_sessions/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * A VerificationSession object can be canceled when it is in requires_input [status](https://docs.stripe.com/docs/identity/how-sessions-work).
   *
   * Once canceled, future submission attempts are disabled. This cannot be undone. [Learn more](https://docs.stripe.com/docs/identity/verification-sessions#cancel).
   */
  cancel(id, params, options) {
    return this._makeRequest("POST", `/v1/identity/verification_sessions/${encodeURIComponent(id)}/cancel`, params, options);
  }
  /**
   * Redact a VerificationSession to remove all collected information from Stripe. This will redact
   * the VerificationSession and all objects related to it, including VerificationReports, Events,
   * request logs, etc.
   *
   * A VerificationSession object can be redacted when it is in requires_input or verified
   * [status](https://docs.stripe.com/docs/identity/how-sessions-work). Redacting a VerificationSession in requires_action
   * state will automatically cancel it.
   *
   * The redaction process may take up to four days. When the redaction process is in progress, the
   * VerificationSession's redaction.status field will be set to processing; when the process is
   * finished, it will change to redacted and an identity.verification_session.redacted event
   * will be emitted.
   *
   * Redaction is irreversible. Redacted objects are still accessible in the Stripe API, but all the
   * fields that contain personal data will be replaced by the string [redacted] or a similar
   * placeholder. The metadata field will also be erased. Redacted objects cannot be updated or
   * used for any purpose.
   *
   * [Learn more](https://docs.stripe.com/docs/identity/verification-sessions#redact).
   */
  redact(id, params, options) {
    return this._makeRequest("POST", `/v1/identity/verification_sessions/${encodeURIComponent(id)}/redact`, params, options);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/Accounts.js
var AccountResource3 = class extends StripeResource {
  /**
   * With [Connect](https://docs.stripe.com/connect), you can delete accounts you manage.
   *
   * Test-mode accounts can be deleted at any time.
   *
   * Live-mode accounts that have access to the standard dashboard and Stripe is responsible for negative account balances cannot be deleted, which includes Standard accounts. All other Live-mode accounts, can be deleted when all [balances](https://docs.stripe.com/api/balance/balance_object) are zero.
   *
   * If you want to delete your own account, use the [account information tab in your account settings](https://dashboard.stripe.com/settings/account) instead.
   */
  del(id, params, options) {
    return this._makeRequest("DELETE", `/v1/accounts/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * Retrieves the details of an account. Pass `null` as the account id to retrieve details about your own account.
   */
  retrieve(id, params, options) {
    if (typeof id === "string") {
      return this._makeRequest("GET", `/v1/accounts/${encodeURIComponent(id)}`, params, options);
    } else {
      return this._makeRequest("GET", "/v1/account", params, options);
    }
  }
  /**
   * Updates a [connected account](https://docs.stripe.com/connect/accounts) by setting the values of the parameters passed. Any parameters not provided are
   * left unchanged.
   *
   * For accounts where [controller.requirement_collection](https://docs.stripe.com/api/accounts/object#account_object-controller-requirement_collection)
   * is application, which includes Custom accounts, you can update any information on the account.
   *
   * For accounts where [controller.requirement_collection](https://docs.stripe.com/api/accounts/object#account_object-controller-requirement_collection)
   * is stripe, which includes Standard and Express accounts, you can update all information until you create
   * an [Account Link or <a href="/api/account_sessions">Account Session](https://docs.stripe.com/api/account_links) to start Connect onboarding,
   * after which some properties can no longer be updated.
   *
   * To update your own account, use the [Dashboard](https://dashboard.stripe.com/settings/account). Refer to our
   * [Connect](https://docs.stripe.com/docs/connect/updating-accounts) documentation to learn more about updating accounts.
   */
  update(id, params, options) {
    return this._makeRequest("POST", `/v1/accounts/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * Retrieves the details of an account.
   */
  retrieveCurrent(params, options) {
    return this._makeRequest("GET", "/v1/account", params, options);
  }
  /**
   * Returns a list of accounts connected to your platform via [Connect](https://docs.stripe.com/docs/connect). If you're not a platform, the list is empty.
   */
  list(params, options) {
    return this._makeRequest("GET", "/v1/accounts", params, options, {
      methodType: "list"
    });
  }
  /**
   * With [Connect](https://docs.stripe.com/docs/connect), you can create Stripe accounts for your users.
   * To do this, you'll first need to [register your platform](https://dashboard.stripe.com/account/applications/settings).
   *
   * If you've already collected information for your connected accounts, you [can prefill that information](https://docs.stripe.com/docs/connect/best-practices#onboarding) when
   * creating the account. Connect Onboarding won't ask for the prefilled information during account onboarding.
   * You can prefill any information on the account.
   */
  create(params, options) {
    return this._makeRequest("POST", "/v1/accounts", params, options);
  }
  /**
   * With [Connect](https://docs.stripe.com/connect), you can reject accounts that you have flagged as suspicious.
   *
   * Only accounts where your platform is liable for negative account balances, which includes Custom and Express accounts, can be rejected. Test-mode accounts can be rejected at any time. Live-mode accounts can only be rejected after all balances are zero.
   */
  reject(id, params, options) {
    return this._makeRequest("POST", `/v1/accounts/${encodeURIComponent(id)}/reject`, params, options);
  }
  /**
   * Returns a list of capabilities associated with the account. The capabilities are returned sorted by creation date, with the most recent capability appearing first.
   */
  listCapabilities(id, params, options) {
    return this._makeRequest("GET", `/v1/accounts/${encodeURIComponent(id)}/capabilities`, params, options, {
      methodType: "list"
    });
  }
  /**
   * Retrieves information about the specified Account Capability.
   */
  retrieveCapability(accountId, id, params, options) {
    return this._makeRequest("GET", `/v1/accounts/${encodeURIComponent(accountId)}/capabilities/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * Updates an existing Account Capability. Request or remove a capability by updating its requested parameter.
   */
  updateCapability(accountId, id, params, options) {
    return this._makeRequest("POST", `/v1/accounts/${encodeURIComponent(accountId)}/capabilities/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * Delete a specified external account for a given account.
   */
  deleteExternalAccount(accountId, id, params, options) {
    return this._makeRequest("DELETE", `/v1/accounts/${encodeURIComponent(accountId)}/external_accounts/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * Retrieve a specified external account for a given account.
   */
  retrieveExternalAccount(accountId, id, params, options) {
    return this._makeRequest("GET", `/v1/accounts/${encodeURIComponent(accountId)}/external_accounts/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * Updates the metadata, account holder name, account holder type of a bank account belonging to
   * a connected account and optionally sets it as the default for its currency. Other bank account
   * details are not editable by design.
   *
   * You can only update bank accounts when [account.controller.requirement_collection is application, which includes <a href="/connect/custom-accounts">Custom accounts](https://docs.stripe.com/api/accounts/object#account_object-controller-requirement_collection).
   *
   * You can re-enable a disabled bank account by performing an update call without providing any
   * arguments or changes.
   */
  updateExternalAccount(accountId, id, params, options) {
    return this._makeRequest("POST", `/v1/accounts/${encodeURIComponent(accountId)}/external_accounts/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * List external accounts for an account.
   */
  listExternalAccounts(id, params, options) {
    return this._makeRequest("GET", `/v1/accounts/${encodeURIComponent(id)}/external_accounts`, params, options, {
      methodType: "list"
    });
  }
  /**
   * Create an external account for a given account.
   */
  createExternalAccount(id, params, options) {
    return this._makeRequest("POST", `/v1/accounts/${encodeURIComponent(id)}/external_accounts`, params, options);
  }
  /**
   * Creates a login link for a connected account to access the Express Dashboard.
   *
   * You can only create login links for accounts that use the [Express Dashboard](https://docs.stripe.com/connect/express-dashboard) and are connected to your platform.
   */
  createLoginLink(id, params, options) {
    return this._makeRequest("POST", `/v1/accounts/${encodeURIComponent(id)}/login_links`, params, options);
  }
  /**
   * Deletes an existing person's relationship to the account's legal entity. Any person with a relationship for an account can be deleted through the API, except if the person is the account_opener. If your integration is using the executive parameter, you cannot delete the only verified executive on file.
   */
  deletePerson(accountId, id, params, options) {
    return this._makeRequest("DELETE", `/v1/accounts/${encodeURIComponent(accountId)}/persons/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * Retrieves an existing person.
   */
  retrievePerson(accountId, id, params, options) {
    return this._makeRequest("GET", `/v1/accounts/${encodeURIComponent(accountId)}/persons/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * Updates an existing person.
   */
  updatePerson(accountId, id, params, options) {
    return this._makeRequest("POST", `/v1/accounts/${encodeURIComponent(accountId)}/persons/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * Returns a list of people associated with the account's legal entity. The people are returned sorted by creation date, with the most recent people appearing first.
   */
  listPersons(id, params, options) {
    return this._makeRequest("GET", `/v1/accounts/${encodeURIComponent(id)}/persons`, params, options, {
      methodType: "list"
    });
  }
  /**
   * Creates a new person.
   */
  createPerson(id, params, options) {
    return this._makeRequest("POST", `/v1/accounts/${encodeURIComponent(id)}/persons`, params, options);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/AccountLinks.js
var AccountLinkResource2 = class extends StripeResource {
  /**
   * Creates an AccountLink object that includes a single-use Stripe URL that the platform can redirect their user to in order to take them through the Connect Onboarding flow.
   */
  create(params, options) {
    return this._makeRequest("POST", "/v1/account_links", params, options);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/AccountSessions.js
var AccountSessionResource = class extends StripeResource {
  /**
   * Creates a AccountSession object that includes a single-use token that the platform can use on their front-end to grant client-side API access.
   */
  create(params, options) {
    return this._makeRequest("POST", "/v1/account_sessions", params, options);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/ApplePayDomains.js
var ApplePayDomainResource = class extends StripeResource {
  /**
   * Delete an apple pay domain.
   */
  del(id, params, options) {
    return this._makeRequest("DELETE", `/v1/apple_pay/domains/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * Retrieve an apple pay domain.
   */
  retrieve(id, params, options) {
    return this._makeRequest("GET", `/v1/apple_pay/domains/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * List apple pay domains.
   */
  list(params, options) {
    return this._makeRequest("GET", "/v1/apple_pay/domains", params, options, {
      methodType: "list"
    });
  }
  /**
   * Create an apple pay domain.
   */
  create(params, options) {
    return this._makeRequest("POST", "/v1/apple_pay/domains", params, options);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/ApplicationFees.js
var ApplicationFeeResource = class extends StripeResource {
  /**
   * Returns a list of application fees you've previously collected. The application fees are returned in sorted order, with the most recent fees appearing first.
   */
  list(params, options) {
    return this._makeRequest("GET", "/v1/application_fees", params, options, {
      methodType: "list"
    });
  }
  /**
   * Retrieves the details of an application fee that your account has collected. The same information is returned when refunding the application fee.
   */
  retrieve(id, params, options) {
    return this._makeRequest("GET", `/v1/application_fees/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * By default, you can see the 10 most recent refunds stored directly on the application fee object, but you can also retrieve details about a specific refund stored on the application fee.
   */
  retrieveRefund(feeId, id, params, options) {
    return this._makeRequest("GET", `/v1/application_fees/${encodeURIComponent(feeId)}/refunds/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * Updates the specified application fee refund by setting the values of the parameters passed. Any parameters not provided will be left unchanged.
   *
   * This request only accepts metadata as an argument.
   */
  updateRefund(feeId, id, params, options) {
    return this._makeRequest("POST", `/v1/application_fees/${encodeURIComponent(feeId)}/refunds/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * You can see a list of the refunds belonging to a specific application fee. Note that the 10 most recent refunds are always available by default on the application fee object. If you need more than those 10, you can use this API method and the limit and starting_after parameters to page through additional refunds.
   */
  listRefunds(id, params, options) {
    return this._makeRequest("GET", `/v1/application_fees/${encodeURIComponent(id)}/refunds`, params, options, {
      methodType: "list"
    });
  }
  /**
   * Refunds an application fee that has previously been collected but not yet refunded.
   * Funds will be refunded to the Stripe account from which the fee was originally collected.
   *
   * You can optionally refund only part of an application fee.
   * You can do so multiple times, until the entire fee has been refunded.
   *
   * Once entirely refunded, an application fee can't be refunded again.
   * This method will raise an error when called on an already-refunded application fee,
   * or when trying to refund more money than is left on an application fee.
   */
  createRefund(id, params, options) {
    return this._makeRequest("POST", `/v1/application_fees/${encodeURIComponent(id)}/refunds`, params, options);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/Balance.js
var BalanceResource = class extends StripeResource {
  /**
   * Retrieves the current account balance, based on the authentication that was used to make the request.
   *  For a sample request, see [Accounting for negative balances](https://docs.stripe.com/docs/connect/account-balances#accounting-for-negative-balances).
   */
  retrieve(params, options) {
    return this._makeRequest("GET", "/v1/balance", params, options);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/BalanceSettings.js
var BalanceSettingResource = class extends StripeResource {
  /**
   * Retrieves balance settings for a given connected account.
   *  Related guide: [Making API calls for connected accounts](https://docs.stripe.com/connect/authentication)
   */
  retrieve(params, options) {
    return this._makeRequest("GET", "/v1/balance_settings", params, options);
  }
  /**
   * Updates balance settings for a given connected account.
   *  Related guide: [Making API calls for connected accounts](https://docs.stripe.com/connect/authentication)
   */
  update(params, options) {
    return this._makeRequest("POST", "/v1/balance_settings", params, options);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/BalanceTransactions.js
var BalanceTransactionResource = class extends StripeResource {
  /**
   * Returns a list of transactions that have contributed to the Stripe account balance (for example, charges, transfers, and so on). The transactions return in sorted order, with the most recent transactions appearing first.
   *
   * The previous name of this endpoint was “Balance history,” and it used the path /v1/balance/history.
   */
  list(params, options) {
    return this._makeRequest("GET", "/v1/balance_transactions", params, options, {
      methodType: "list"
    });
  }
  /**
   * Retrieves the balance transaction with the given ID.
   *
   * Note that this endpoint previously used the path /v1/balance/history/:id.
   */
  retrieve(id, params, options) {
    return this._makeRequest("GET", `/v1/balance_transactions/${encodeURIComponent(id)}`, params, options);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/Charges.js
var ChargeResource = class extends StripeResource {
  /**
   * Returns a list of charges you've previously created. The charges are returned in sorted order, with the most recent charges appearing first.
   */
  list(params, options) {
    return this._makeRequest("GET", "/v1/charges", params, options, {
      methodType: "list"
    });
  }
  /**
   * This method is no longer recommended—use the [Payment Intents API](https://docs.stripe.com/docs/api/payment_intents)
   * to initiate a new payment instead. Confirmation of the PaymentIntent creates the Charge
   * object used to request payment.
   */
  create(params, options) {
    return this._makeRequest("POST", "/v1/charges", params, options);
  }
  /**
   * Retrieves the details of a charge that has previously been created. Supply the unique charge ID that was returned from your previous request, and Stripe will return the corresponding charge information. The same information is returned when creating or refunding the charge.
   */
  retrieve(id, params, options) {
    return this._makeRequest("GET", `/v1/charges/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * Updates the specified charge by setting the values of the parameters passed. Any parameters not provided will be left unchanged.
   */
  update(id, params, options) {
    return this._makeRequest("POST", `/v1/charges/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * Search for charges you've previously created using Stripe's [Search Query Language](https://docs.stripe.com/docs/search#search-query-language).
   * Don't use search in read-after-write flows where strict consistency is necessary. Under normal operating
   * conditions, data is searchable in less than a minute. Occasionally, propagation of new or updated data can be up
   * to an hour behind during outages. Search functionality is not available to merchants in India.
   */
  search(params, options) {
    return this._makeRequest("GET", "/v1/charges/search", params, options, {
      methodType: "search"
    });
  }
  /**
   * Capture the payment of an existing, uncaptured charge that was created with the capture option set to false.
   *
   * Uncaptured payments expire a set number of days after they are created ([7 by default](https://docs.stripe.com/docs/charges/placing-a-hold)), after which they are marked as refunded and capture attempts will fail.
   *
   * Don't use this method to capture a PaymentIntent-initiated charge. Use [Capture a PaymentIntent](https://docs.stripe.com/docs/api/payment_intents/capture).
   */
  capture(id, params, options) {
    return this._makeRequest("POST", `/v1/charges/${encodeURIComponent(id)}/capture`, params, options);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/ConfirmationTokens.js
var ConfirmationTokenResource2 = class extends StripeResource {
  /**
   * Retrieves an existing ConfirmationToken object
   */
  retrieve(id, params, options) {
    return this._makeRequest("GET", `/v1/confirmation_tokens/${encodeURIComponent(id)}`, params, options);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/CountrySpecs.js
var CountrySpecResource = class extends StripeResource {
  /**
   * Lists all Country Spec objects available in the API.
   */
  list(params, options) {
    return this._makeRequest("GET", "/v1/country_specs", params, options, {
      methodType: "list"
    });
  }
  /**
   * Returns a Country Spec for a given Country code.
   */
  retrieve(id, params, options) {
    return this._makeRequest("GET", `/v1/country_specs/${encodeURIComponent(id)}`, params, options);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/Coupons.js
var CouponResource = class extends StripeResource {
  /**
   * You can delete coupons via the [coupon management](https://dashboard.stripe.com/coupons) page of the Stripe dashboard. However, deleting a coupon does not affect any customers who have already applied the coupon; it means that new customers can't redeem the coupon. You can also delete coupons via the API.
   */
  del(id, params, options) {
    return this._makeRequest("DELETE", `/v1/coupons/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * Retrieves the coupon with the given ID.
   */
  retrieve(id, params, options) {
    return this._makeRequest("GET", `/v1/coupons/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * Updates the metadata of a coupon. Other coupon details (currency, duration, amount_off) are, by design, not editable.
   */
  update(id, params, options) {
    return this._makeRequest("POST", `/v1/coupons/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * Returns a list of your coupons.
   */
  list(params, options) {
    return this._makeRequest("GET", "/v1/coupons", params, options, {
      methodType: "list"
    });
  }
  /**
   * You can create coupons easily via the [coupon management](https://dashboard.stripe.com/coupons) page of the Stripe dashboard. Coupon creation is also accessible via the API if you need to create coupons on the fly.
   *
   * A coupon has either a percent_off or an amount_off and currency. If you set an amount_off, that amount will be subtracted from any invoice's subtotal. For example, an invoice with a subtotal of 100 will have a final total of 0 if a coupon with an amount_off of 200 is applied to it and an invoice with a subtotal of 300 will have a final total of 100 if a coupon with an amount_off of 200 is applied to it.
   */
  create(params, options) {
    return this._makeRequest("POST", "/v1/coupons", params, options);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/CreditNotes.js
var CreditNoteResource = class extends StripeResource {
  /**
   * Returns a list of credit notes.
   */
  list(params, options) {
    return this._makeRequest("GET", "/v1/credit_notes", params, options, {
      methodType: "list",
      responseSchema: {
        kind: "object",
        fields: {
          data: {
            kind: "array",
            element: {
              kind: "object",
              fields: {
                lines: {
                  kind: "object",
                  fields: {
                    data: {
                      kind: "array",
                      element: {
                        kind: "object",
                        fields: {
                          unit_amount_decimal: {
                            kind: "nullable",
                            inner: { kind: "decimal_string" }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
  }
  /**
   * Issue a credit note to adjust the amount of a finalized invoice. A credit note will first reduce the invoice's amount_remaining (and amount_due), but not below zero.
   * This amount is indicated by the credit note's pre_payment_amount. The excess amount is indicated by post_payment_amount, and it can result in any combination of the following:
   *
   *
   * Refunds: create a new refund (using refund_amount) or link existing refunds (using refunds).
   * Customer balance credit: credit the customer's balance (using credit_amount) which will be automatically applied to their next invoice when it's finalized.
   * Outside of Stripe credit: record the amount that is or will be credited outside of Stripe (using out_of_band_amount).
   *
   *
   * The sum of refunds, customer balance credits, and outside of Stripe credits must equal the post_payment_amount.
   *
   * You may issue multiple credit notes for an invoice. Each credit note may increment the invoice's pre_payment_credit_notes_amount,
   * post_payment_credit_notes_amount, or both, depending on the invoice's amount_remaining at the time of credit note creation.
   *
   * For invoices that also have refunds created through the [Refund API](https://docs.stripe.com/docs/api/refunds), the credit note API subtracts those refund amounts from the maximum creditable amount. This prevents the combined credit notes and refunds from exceeding the invoice amount. If you use both, ensure the combined total does not exceed the invoice's paid amount.
   */
  create(params, options) {
    return this._makeRequest("POST", "/v1/credit_notes", params, options, {
      requestSchema: {
        kind: "object",
        fields: {
          lines: {
            kind: "array",
            element: {
              kind: "object",
              fields: { unit_amount_decimal: { kind: "decimal_string" } }
            }
          }
        }
      },
      responseSchema: {
        kind: "object",
        fields: {
          lines: {
            kind: "object",
            fields: {
              data: {
                kind: "array",
                element: {
                  kind: "object",
                  fields: {
                    unit_amount_decimal: {
                      kind: "nullable",
                      inner: { kind: "decimal_string" }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
  }
  /**
   * Retrieves the credit note object with the given identifier.
   */
  retrieve(id, params, options) {
    return this._makeRequest("GET", `/v1/credit_notes/${encodeURIComponent(id)}`, params, options, {
      responseSchema: {
        kind: "object",
        fields: {
          lines: {
            kind: "object",
            fields: {
              data: {
                kind: "array",
                element: {
                  kind: "object",
                  fields: {
                    unit_amount_decimal: {
                      kind: "nullable",
                      inner: { kind: "decimal_string" }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
  }
  /**
   * Updates an existing credit note.
   */
  update(id, params, options) {
    return this._makeRequest("POST", `/v1/credit_notes/${encodeURIComponent(id)}`, params, options, {
      responseSchema: {
        kind: "object",
        fields: {
          lines: {
            kind: "object",
            fields: {
              data: {
                kind: "array",
                element: {
                  kind: "object",
                  fields: {
                    unit_amount_decimal: {
                      kind: "nullable",
                      inner: { kind: "decimal_string" }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
  }
  /**
   * Get a preview of a credit note without creating it.
   */
  preview(params, options) {
    return this._makeRequest("GET", "/v1/credit_notes/preview", params, options, {
      requestSchema: {
        kind: "object",
        fields: {
          lines: {
            kind: "array",
            element: {
              kind: "object",
              fields: { unit_amount_decimal: { kind: "decimal_string" } }
            }
          }
        }
      },
      responseSchema: {
        kind: "object",
        fields: {
          lines: {
            kind: "object",
            fields: {
              data: {
                kind: "array",
                element: {
                  kind: "object",
                  fields: {
                    unit_amount_decimal: {
                      kind: "nullable",
                      inner: { kind: "decimal_string" }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
  }
  /**
   * Marks a credit note as void. Learn more about [voiding credit notes](https://docs.stripe.com/docs/billing/invoices/credit-notes#voiding).
   */
  voidCreditNote(id, params, options) {
    return this._makeRequest("POST", `/v1/credit_notes/${encodeURIComponent(id)}/void`, params, options, {
      responseSchema: {
        kind: "object",
        fields: {
          lines: {
            kind: "object",
            fields: {
              data: {
                kind: "array",
                element: {
                  kind: "object",
                  fields: {
                    unit_amount_decimal: {
                      kind: "nullable",
                      inner: { kind: "decimal_string" }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
  }
  /**
   * When retrieving a credit note preview, you'll get a lines property containing the first handful of those items. This URL you can retrieve the full (paginated) list of line items.
   */
  listPreviewLineItems(params, options) {
    return this._makeRequest("GET", "/v1/credit_notes/preview/lines", params, options, {
      methodType: "list",
      requestSchema: {
        kind: "object",
        fields: {
          lines: {
            kind: "array",
            element: {
              kind: "object",
              fields: { unit_amount_decimal: { kind: "decimal_string" } }
            }
          }
        }
      },
      responseSchema: {
        kind: "object",
        fields: {
          data: {
            kind: "array",
            element: {
              kind: "object",
              fields: {
                unit_amount_decimal: {
                  kind: "nullable",
                  inner: { kind: "decimal_string" }
                }
              }
            }
          }
        }
      }
    });
  }
  /**
   * When retrieving a credit note, you'll get a lines property containing the first handful of those items. There is also a URL where you can retrieve the full (paginated) list of line items.
   */
  listLineItems(id, params, options) {
    return this._makeRequest("GET", `/v1/credit_notes/${encodeURIComponent(id)}/lines`, params, options, {
      methodType: "list",
      responseSchema: {
        kind: "object",
        fields: {
          data: {
            kind: "array",
            element: {
              kind: "object",
              fields: {
                unit_amount_decimal: {
                  kind: "nullable",
                  inner: { kind: "decimal_string" }
                }
              }
            }
          }
        }
      }
    });
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/Customers.js
var CustomerResource2 = class extends StripeResource {
  /**
   * Permanently deletes a customer. It cannot be undone. Also immediately cancels any active subscriptions on the customer.
   */
  del(id, params, options) {
    return this._makeRequest("DELETE", `/v1/customers/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * Retrieves a Customer object.
   */
  retrieve(id, params, options) {
    return this._makeRequest("GET", `/v1/customers/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * Updates the specified customer by setting the values of the parameters passed. Any parameters not provided are left unchanged. For example, if you pass the source parameter, that becomes the customer's active source (such as a card) to be used for all charges in the future. When you update a customer to a new valid card source by passing the source parameter: for each of the customer's current subscriptions, if the subscription bills automatically and is in the past_due state, then the latest open invoice for the subscription with automatic collection enabled is retried. This retry doesn't count as an automatic retry, and doesn't affect the next regularly scheduled payment for the invoice. Changing the default_source for a customer doesn't trigger this behavior.
   *
   * This request accepts mostly the same arguments as the customer creation call.
   */
  update(id, params, options) {
    return this._makeRequest("POST", `/v1/customers/${encodeURIComponent(id)}`, params, options, {
      responseSchema: {
        kind: "object",
        fields: {
          subscriptions: {
            kind: "object",
            fields: {
              data: {
                kind: "array",
                element: {
                  kind: "object",
                  fields: {
                    items: {
                      kind: "object",
                      fields: {
                        data: {
                          kind: "array",
                          element: {
                            kind: "object",
                            fields: {
                              plan: {
                                kind: "object",
                                fields: {
                                  amount_decimal: {
                                    kind: "nullable",
                                    inner: { kind: "decimal_string" }
                                  },
                                  tiers: {
                                    kind: "array",
                                    element: {
                                      kind: "object",
                                      fields: {
                                        flat_amount_decimal: {
                                          kind: "nullable",
                                          inner: { kind: "decimal_string" }
                                        },
                                        unit_amount_decimal: {
                                          kind: "nullable",
                                          inner: { kind: "decimal_string" }
                                        }
                                      }
                                    }
                                  }
                                }
                              },
                              price: {
                                kind: "object",
                                fields: {
                                  currency_options: {
                                    kind: "array",
                                    element: {
                                      kind: "object",
                                      fields: {
                                        tiers: {
                                          kind: "array",
                                          element: {
                                            kind: "object",
                                            fields: {
                                              flat_amount_decimal: {
                                                kind: "nullable",
                                                inner: {
                                                  kind: "decimal_string"
                                                }
                                              },
                                              unit_amount_decimal: {
                                                kind: "nullable",
                                                inner: {
                                                  kind: "decimal_string"
                                                }
                                              }
                                            }
                                          }
                                        },
                                        unit_amount_decimal: {
                                          kind: "nullable",
                                          inner: { kind: "decimal_string" }
                                        }
                                      }
                                    }
                                  },
                                  tiers: {
                                    kind: "array",
                                    element: {
                                      kind: "object",
                                      fields: {
                                        flat_amount_decimal: {
                                          kind: "nullable",
                                          inner: { kind: "decimal_string" }
                                        },
                                        unit_amount_decimal: {
                                          kind: "nullable",
                                          inner: { kind: "decimal_string" }
                                        }
                                      }
                                    }
                                  },
                                  unit_amount_decimal: {
                                    kind: "nullable",
                                    inner: { kind: "decimal_string" }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
  }
  /**
   * Removes the currently applied discount on a customer.
   */
  deleteDiscount(id, params, options) {
    return this._makeRequest("DELETE", `/v1/customers/${encodeURIComponent(id)}/discount`, params, options);
  }
  /**
   * Returns a list of your customers. The customers are returned sorted by creation date, with the most recent customers appearing first.
   */
  list(params, options) {
    return this._makeRequest("GET", "/v1/customers", params, options, {
      methodType: "list",
      responseSchema: {
        kind: "object",
        fields: {
          data: {
            kind: "array",
            element: {
              kind: "object",
              fields: {
                subscriptions: {
                  kind: "object",
                  fields: {
                    data: {
                      kind: "array",
                      element: {
                        kind: "object",
                        fields: {
                          items: {
                            kind: "object",
                            fields: {
                              data: {
                                kind: "array",
                                element: {
                                  kind: "object",
                                  fields: {
                                    plan: {
                                      kind: "object",
                                      fields: {
                                        amount_decimal: {
                                          kind: "nullable",
                                          inner: { kind: "decimal_string" }
                                        },
                                        tiers: {
                                          kind: "array",
                                          element: {
                                            kind: "object",
                                            fields: {
                                              flat_amount_decimal: {
                                                kind: "nullable",
                                                inner: { kind: "decimal_string" }
                                              },
                                              unit_amount_decimal: {
                                                kind: "nullable",
                                                inner: { kind: "decimal_string" }
                                              }
                                            }
                                          }
                                        }
                                      }
                                    },
                                    price: {
                                      kind: "object",
                                      fields: {
                                        currency_options: {
                                          kind: "array",
                                          element: {
                                            kind: "object",
                                            fields: {
                                              tiers: {
                                                kind: "array",
                                                element: {
                                                  kind: "object",
                                                  fields: {
                                                    flat_amount_decimal: {
                                                      kind: "nullable",
                                                      inner: {
                                                        kind: "decimal_string"
                                                      }
                                                    },
                                                    unit_amount_decimal: {
                                                      kind: "nullable",
                                                      inner: {
                                                        kind: "decimal_string"
                                                      }
                                                    }
                                                  }
                                                }
                                              },
                                              unit_amount_decimal: {
                                                kind: "nullable",
                                                inner: { kind: "decimal_string" }
                                              }
                                            }
                                          }
                                        },
                                        tiers: {
                                          kind: "array",
                                          element: {
                                            kind: "object",
                                            fields: {
                                              flat_amount_decimal: {
                                                kind: "nullable",
                                                inner: { kind: "decimal_string" }
                                              },
                                              unit_amount_decimal: {
                                                kind: "nullable",
                                                inner: { kind: "decimal_string" }
                                              }
                                            }
                                          }
                                        },
                                        unit_amount_decimal: {
                                          kind: "nullable",
                                          inner: { kind: "decimal_string" }
                                        }
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
  }
  /**
   * Creates a new customer object.
   */
  create(params, options) {
    return this._makeRequest("POST", "/v1/customers", params, options, {
      responseSchema: {
        kind: "object",
        fields: {
          subscriptions: {
            kind: "object",
            fields: {
              data: {
                kind: "array",
                element: {
                  kind: "object",
                  fields: {
                    items: {
                      kind: "object",
                      fields: {
                        data: {
                          kind: "array",
                          element: {
                            kind: "object",
                            fields: {
                              plan: {
                                kind: "object",
                                fields: {
                                  amount_decimal: {
                                    kind: "nullable",
                                    inner: { kind: "decimal_string" }
                                  },
                                  tiers: {
                                    kind: "array",
                                    element: {
                                      kind: "object",
                                      fields: {
                                        flat_amount_decimal: {
                                          kind: "nullable",
                                          inner: { kind: "decimal_string" }
                                        },
                                        unit_amount_decimal: {
                                          kind: "nullable",
                                          inner: { kind: "decimal_string" }
                                        }
                                      }
                                    }
                                  }
                                }
                              },
                              price: {
                                kind: "object",
                                fields: {
                                  currency_options: {
                                    kind: "array",
                                    element: {
                                      kind: "object",
                                      fields: {
                                        tiers: {
                                          kind: "array",
                                          element: {
                                            kind: "object",
                                            fields: {
                                              flat_amount_decimal: {
                                                kind: "nullable",
                                                inner: { kind: "decimal_string" }
                                              },
                                              unit_amount_decimal: {
                                                kind: "nullable",
                                                inner: { kind: "decimal_string" }
                                              }
                                            }
                                          }
                                        },
                                        unit_amount_decimal: {
                                          kind: "nullable",
                                          inner: { kind: "decimal_string" }
                                        }
                                      }
                                    }
                                  },
                                  tiers: {
                                    kind: "array",
                                    element: {
                                      kind: "object",
                                      fields: {
                                        flat_amount_decimal: {
                                          kind: "nullable",
                                          inner: { kind: "decimal_string" }
                                        },
                                        unit_amount_decimal: {
                                          kind: "nullable",
                                          inner: { kind: "decimal_string" }
                                        }
                                      }
                                    }
                                  },
                                  unit_amount_decimal: {
                                    kind: "nullable",
                                    inner: { kind: "decimal_string" }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
  }
  /**
   * Search for customers you've previously created using Stripe's [Search Query Language](https://docs.stripe.com/docs/search#search-query-language).
   * Don't use search in read-after-write flows where strict consistency is necessary. Under normal operating
   * conditions, data is searchable in less than a minute. Occasionally, propagation of new or updated data can be up
   * to an hour behind during outages. Search functionality is not available to merchants in India.
   */
  search(params, options) {
    return this._makeRequest("GET", "/v1/customers/search", params, options, {
      methodType: "search",
      responseSchema: {
        kind: "object",
        fields: {
          data: {
            kind: "array",
            element: {
              kind: "object",
              fields: {
                subscriptions: {
                  kind: "object",
                  fields: {
                    data: {
                      kind: "array",
                      element: {
                        kind: "object",
                        fields: {
                          items: {
                            kind: "object",
                            fields: {
                              data: {
                                kind: "array",
                                element: {
                                  kind: "object",
                                  fields: {
                                    plan: {
                                      kind: "object",
                                      fields: {
                                        amount_decimal: {
                                          kind: "nullable",
                                          inner: { kind: "decimal_string" }
                                        },
                                        tiers: {
                                          kind: "array",
                                          element: {
                                            kind: "object",
                                            fields: {
                                              flat_amount_decimal: {
                                                kind: "nullable",
                                                inner: { kind: "decimal_string" }
                                              },
                                              unit_amount_decimal: {
                                                kind: "nullable",
                                                inner: { kind: "decimal_string" }
                                              }
                                            }
                                          }
                                        }
                                      }
                                    },
                                    price: {
                                      kind: "object",
                                      fields: {
                                        currency_options: {
                                          kind: "array",
                                          element: {
                                            kind: "object",
                                            fields: {
                                              tiers: {
                                                kind: "array",
                                                element: {
                                                  kind: "object",
                                                  fields: {
                                                    flat_amount_decimal: {
                                                      kind: "nullable",
                                                      inner: {
                                                        kind: "decimal_string"
                                                      }
                                                    },
                                                    unit_amount_decimal: {
                                                      kind: "nullable",
                                                      inner: {
                                                        kind: "decimal_string"
                                                      }
                                                    }
                                                  }
                                                }
                                              },
                                              unit_amount_decimal: {
                                                kind: "nullable",
                                                inner: { kind: "decimal_string" }
                                              }
                                            }
                                          }
                                        },
                                        tiers: {
                                          kind: "array",
                                          element: {
                                            kind: "object",
                                            fields: {
                                              flat_amount_decimal: {
                                                kind: "nullable",
                                                inner: { kind: "decimal_string" }
                                              },
                                              unit_amount_decimal: {
                                                kind: "nullable",
                                                inner: { kind: "decimal_string" }
                                              }
                                            }
                                          }
                                        },
                                        unit_amount_decimal: {
                                          kind: "nullable",
                                          inner: { kind: "decimal_string" }
                                        }
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
  }
  /**
   * Returns a list of transactions that updated the customer's [balances](https://docs.stripe.com/docs/billing/customer/balance).
   */
  listBalanceTransactions(id, params, options) {
    return this._makeRequest("GET", `/v1/customers/${encodeURIComponent(id)}/balance_transactions`, params, options, {
      methodType: "list"
    });
  }
  /**
   * Creates an immutable transaction that updates the customer's credit [balance](https://docs.stripe.com/docs/billing/customer/balance).
   */
  createBalanceTransaction(id, params, options) {
    return this._makeRequest("POST", `/v1/customers/${encodeURIComponent(id)}/balance_transactions`, params, options);
  }
  /**
   * Retrieves a specific customer balance transaction that updated the customer's [balances](https://docs.stripe.com/docs/billing/customer/balance).
   */
  retrieveBalanceTransaction(customerId, id, params, options) {
    return this._makeRequest("GET", `/v1/customers/${encodeURIComponent(customerId)}/balance_transactions/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * Most credit balance transaction fields are immutable, but you may update its description and metadata.
   */
  updateBalanceTransaction(customerId, id, params, options) {
    return this._makeRequest("POST", `/v1/customers/${encodeURIComponent(customerId)}/balance_transactions/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * Retrieves a customer's cash balance.
   */
  retrieveCashBalance(id, params, options) {
    return this._makeRequest("GET", `/v1/customers/${encodeURIComponent(id)}/cash_balance`, params, options);
  }
  /**
   * Changes the settings on a customer's cash balance.
   */
  updateCashBalance(id, params, options) {
    return this._makeRequest("POST", `/v1/customers/${encodeURIComponent(id)}/cash_balance`, params, options);
  }
  /**
   * Returns a list of transactions that modified the customer's [cash balance](https://docs.stripe.com/docs/payments/customer-balance).
   */
  listCashBalanceTransactions(id, params, options) {
    return this._makeRequest("GET", `/v1/customers/${encodeURIComponent(id)}/cash_balance_transactions`, params, options, {
      methodType: "list"
    });
  }
  /**
   * Retrieves a specific cash balance transaction, which updated the customer's [cash balance](https://docs.stripe.com/docs/payments/customer-balance).
   */
  retrieveCashBalanceTransaction(customerId, id, params, options) {
    return this._makeRequest("GET", `/v1/customers/${encodeURIComponent(customerId)}/cash_balance_transactions/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * Retrieve funding instructions for a customer cash balance. If funding instructions do not yet exist for the customer, new
   * funding instructions will be created. If funding instructions have already been created for a given customer, the same
   * funding instructions will be retrieved. In other words, we will return the same funding instructions each time.
   */
  createFundingInstructions(id, params, options) {
    return this._makeRequest("POST", `/v1/customers/${encodeURIComponent(id)}/funding_instructions`, params, options);
  }
  /**
   * Returns a list of PaymentMethods for a given Customer
   */
  listPaymentMethods(id, params, options) {
    return this._makeRequest("GET", `/v1/customers/${encodeURIComponent(id)}/payment_methods`, params, options, {
      methodType: "list"
    });
  }
  /**
   * Retrieves a PaymentMethod object for a given Customer.
   */
  retrievePaymentMethod(customerId, id, params, options) {
    return this._makeRequest("GET", `/v1/customers/${encodeURIComponent(customerId)}/payment_methods/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * List sources for a specified customer.
   */
  listSources(id, params, options) {
    return this._makeRequest("GET", `/v1/customers/${encodeURIComponent(id)}/sources`, params, options, {
      methodType: "list"
    });
  }
  /**
   * When you create a new credit card, you must specify a customer or recipient on which to create it.
   *
   * If the card's owner has no default card, then the new card will become the default.
   * However, if the owner already has a default, then it will not change.
   * To change the default, you should [update the customer](https://docs.stripe.com/api/customers/update) to have a new default_source.
   */
  createSource(id, params, options) {
    return this._makeRequest("POST", `/v1/customers/${encodeURIComponent(id)}/sources`, params, options);
  }
  /**
   * Retrieve a specified source for a given customer.
   */
  retrieveSource(customerId, id, params, options) {
    return this._makeRequest("GET", `/v1/customers/${encodeURIComponent(customerId)}/sources/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * Update a specified source for a given customer.
   */
  updateSource(customerId, id, params, options) {
    return this._makeRequest("POST", `/v1/customers/${encodeURIComponent(customerId)}/sources/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * Delete a specified source for a given customer.
   */
  deleteSource(customerId, id, params, options) {
    return this._makeRequest("DELETE", `/v1/customers/${encodeURIComponent(customerId)}/sources/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * Verify a specified bank account for a given customer.
   */
  verifySource(customerId, id, params, options) {
    return this._makeRequest("POST", `/v1/customers/${encodeURIComponent(customerId)}/sources/${encodeURIComponent(id)}/verify`, params, options);
  }
  /**
   * Deletes an existing tax_id object.
   */
  deleteTaxId(customerId, id, params, options) {
    return this._makeRequest("DELETE", `/v1/customers/${encodeURIComponent(customerId)}/tax_ids/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * Retrieves the tax_id object with the given identifier.
   */
  retrieveTaxId(customerId, id, params, options) {
    return this._makeRequest("GET", `/v1/customers/${encodeURIComponent(customerId)}/tax_ids/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * Returns a list of tax IDs for a customer.
   */
  listTaxIds(id, params, options) {
    return this._makeRequest("GET", `/v1/customers/${encodeURIComponent(id)}/tax_ids`, params, options, {
      methodType: "list"
    });
  }
  /**
   * Creates a new tax_id object for a customer.
   */
  createTaxId(id, params, options) {
    return this._makeRequest("POST", `/v1/customers/${encodeURIComponent(id)}/tax_ids`, params, options);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/CustomerSessions.js
var CustomerSessionResource = class extends StripeResource {
  /**
   * Creates a Customer Session object that includes a single-use client secret that you can use on your front-end to grant client-side API access for certain customer resources.
   */
  create(params, options) {
    return this._makeRequest("POST", "/v1/customer_sessions", params, options);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/Disputes.js
var DisputeResource2 = class extends StripeResource {
  /**
   * Returns a list of your disputes.
   */
  list(params, options) {
    return this._makeRequest("GET", "/v1/disputes", params, options, {
      methodType: "list"
    });
  }
  /**
   * Retrieves the dispute with the given ID.
   */
  retrieve(id, params, options) {
    return this._makeRequest("GET", `/v1/disputes/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * When you get a dispute, contacting your customer is always the best first step. If that doesn't work, you can submit evidence to help us resolve the dispute in your favor. You can do this in your [dashboard](https://dashboard.stripe.com/disputes), but if you prefer, you can use the API to submit evidence programmatically.
   *
   * Depending on your dispute type, different evidence fields will give you a better chance of winning your dispute. To figure out which evidence fields to provide, see our [guide to dispute types](https://docs.stripe.com/docs/disputes/categories).
   */
  update(id, params, options) {
    return this._makeRequest("POST", `/v1/disputes/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * Closing the dispute for a charge indicates that you do not have any evidence to submit and are essentially dismissing the dispute, acknowledging it as lost.
   *
   * The status of the dispute will change from needs_response to lost. Closing a dispute is irreversible.
   */
  close(id, params, options) {
    return this._makeRequest("POST", `/v1/disputes/${encodeURIComponent(id)}/close`, params, options);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/EphemeralKeys.js
var EphemeralKeyResource = class extends StripeResource {
  /**
   * Invalidates a short-lived API key for a given resource.
   */
  del(id, params, options) {
    return this._makeRequest("DELETE", `/v1/ephemeral_keys/${encodeURIComponent(id)}`, params, options);
  }
  create(params, options) {
    return this._makeRequest("POST", "/v1/ephemeral_keys", params, options, {
      validator: (data, options2) => {
        if (!options2.headers || !options2.headers["Stripe-Version"]) {
          throw new Error("Passing apiVersion in a separate options hash is required to create an ephemeral key. See https://stripe.com/docs/api/versioning?lang=node");
        }
      }
    });
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/Events.js
var EventResource2 = class extends StripeResource {
  /**
   * List events, going back up to 30 days. Each event data is rendered according to Stripe API version at its creation time, specified in [event object](https://docs.stripe.com/api/events/object) api_version attribute (not according to your current Stripe API version or Stripe-Version header).
   */
  list(params, options) {
    return this._makeRequest("GET", "/v1/events", params, options, {
      methodType: "list"
    });
  }
  /**
   * Retrieves the details of an event if it was created in the last 30 days. Supply the unique identifier of the event, which you might have received in a webhook.
   */
  retrieve(id, params, options) {
    return this._makeRequest("GET", `/v1/events/${encodeURIComponent(id)}`, params, options);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/ExchangeRates.js
var ExchangeRateResource = class extends StripeResource {
  /**
   * [Deprecated] The ExchangeRate APIs are deprecated. Please use the [FX Quotes API](https://docs.stripe.com/payments/currencies/localize-prices/fx-quotes-api) instead.
   *
   * Returns a list of objects that contain the rates at which foreign currencies are converted to one another. Only shows the currencies for which Stripe supports.
   * @deprecated
   */
  list(params, options) {
    return this._makeRequest("GET", "/v1/exchange_rates", params, options, {
      methodType: "list"
    });
  }
  /**
   * [Deprecated] The ExchangeRate APIs are deprecated. Please use the [FX Quotes API](https://docs.stripe.com/payments/currencies/localize-prices/fx-quotes-api) instead.
   *
   * Retrieves the exchange rates from the given currency to every supported currency.
   * @deprecated
   */
  retrieve(id, params, options) {
    return this._makeRequest("GET", `/v1/exchange_rates/${encodeURIComponent(id)}`, params, options);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/multipart.js
var multipartDataGenerator = (method, data, headers) => {
  const segno = (Math.round(Math.random() * 1e16) + Math.round(Math.random() * 1e16)).toString();
  headers["Content-Type"] = `multipart/form-data; boundary=${segno}`;
  const textEncoder = new TextEncoder();
  let buffer = new Uint8Array(0);
  const endBuffer = textEncoder.encode("\r\n");
  function push(l) {
    const prevBuffer = buffer;
    const newBuffer = l instanceof Uint8Array ? l : new Uint8Array(textEncoder.encode(l));
    buffer = new Uint8Array(prevBuffer.length + newBuffer.length + 2);
    buffer.set(prevBuffer);
    buffer.set(newBuffer, prevBuffer.length);
    buffer.set(endBuffer, buffer.length - 2);
  }
  function q(s) {
    return `"${s.replace(/"|"/g, "%22").replace(/\r\n|\r|\n/g, " ")}"`;
  }
  const flattenedData = flattenAndStringify(data);
  for (const k in flattenedData) {
    if (!Object.prototype.hasOwnProperty.call(flattenedData, k)) {
      continue;
    }
    const v = flattenedData[k];
    push(`--${segno}`);
    if (Object.prototype.hasOwnProperty.call(v, "data")) {
      const typedEntry = v;
      push(`Content-Disposition: form-data; name=${q(k)}; filename=${q(typedEntry.name || "blob")}`);
      push(`Content-Type: ${typedEntry.type || "application/octet-stream"}`);
      push("");
      push(typedEntry.data);
    } else {
      push(`Content-Disposition: form-data; name=${q(k)}`);
      push("");
      push(v);
    }
  }
  push(`--${segno}--`);
  return buffer;
};
function multipartRequestDataProcessor(method, data, headers, callback) {
  data = data || {};
  if (method !== "POST") {
    return callback(null, queryStringifyRequestData(data));
  }
  this._stripe._platformFunctions.tryBufferData(data).then((bufferedData) => {
    const buffer = multipartDataGenerator(method, bufferedData, headers);
    return callback(null, buffer);
  }).catch((err) => callback(err, null));
}

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/Files.js
var FileResource = class extends StripeResource {
  constructor() {
    super(...arguments);
    this.requestDataProcessor = multipartRequestDataProcessor;
  }
  /**
   * Returns a list of the files that your account has access to. Stripe sorts and returns the files by their creation dates, placing the most recently created files at the top.
   */
  list(params, options) {
    return this._makeRequest("GET", "/v1/files", params, options, {
      methodType: "list"
    });
  }
  /**
   * To upload a file to Stripe, you need to send a request of type multipart/form-data. Include the file you want to upload in the request, and the parameters for creating a file.
   *
   * All of Stripe's officially supported Client libraries support sending multipart/form-data.
   */
  create(params, options) {
    return this._makeRequest("POST", "/v1/files", params, options, {
      headers: {
        "Content-Type": "multipart/form-data"
      },
      apiBase: "files"
    });
  }
  /**
   * Retrieves the details of an existing file object. After you supply a unique file ID, Stripe returns the corresponding file object. Learn how to [access file contents](https://docs.stripe.com/docs/file-upload#download-file-contents).
   */
  retrieve(id, params, options) {
    return this._makeRequest("GET", `/v1/files/${encodeURIComponent(id)}`, params, options);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/FileLinks.js
var FileLinkResource = class extends StripeResource {
  /**
   * Returns a list of file links.
   */
  list(params, options) {
    return this._makeRequest("GET", "/v1/file_links", params, options, {
      methodType: "list"
    });
  }
  /**
   * Creates a new file link object.
   */
  create(params, options) {
    return this._makeRequest("POST", "/v1/file_links", params, options);
  }
  /**
   * Retrieves the file link with the given ID.
   */
  retrieve(id, params, options) {
    return this._makeRequest("GET", `/v1/file_links/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * Updates an existing file link object. Expired links can no longer be updated.
   */
  update(id, params, options) {
    return this._makeRequest("POST", `/v1/file_links/${encodeURIComponent(id)}`, params, options);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/Invoices.js
var InvoiceResource = class extends StripeResource {
  /**
   * Permanently deletes a one-off invoice draft. This cannot be undone. Attempts to delete invoices that are no longer in a draft state will fail; once an invoice has been finalized or if an invoice is for a subscription, it must be [voided](https://docs.stripe.com/api/invoices/void).
   */
  del(id, params, options) {
    return this._makeRequest("DELETE", `/v1/invoices/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * Retrieves the invoice with the given ID.
   */
  retrieve(id, params, options) {
    return this._makeRequest("GET", `/v1/invoices/${encodeURIComponent(id)}`, params, options, {
      responseSchema: {
        kind: "object",
        fields: {
          lines: {
            kind: "object",
            fields: {
              data: {
                kind: "array",
                element: {
                  kind: "object",
                  fields: {
                    pricing: {
                      kind: "nullable",
                      inner: {
                        kind: "object",
                        fields: {
                          unit_amount_decimal: {
                            kind: "nullable",
                            inner: { kind: "decimal_string" }
                          }
                        }
                      }
                    },
                    quantity_decimal: {
                      kind: "nullable",
                      inner: { kind: "decimal_string" }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
  }
  /**
   * Draft invoices are fully editable. Once an invoice is [finalized](https://docs.stripe.com/docs/billing/invoices/workflow#finalized),
   * monetary values, as well as collection_method, become uneditable.
   *
   * If you would like to stop the Stripe Billing engine from automatically finalizing, reattempting payments on,
   * sending reminders for, or [automatically reconciling](https://docs.stripe.com/docs/billing/invoices/reconciliation) invoices, pass
   * auto_advance=false.
   */
  update(id, params, options) {
    return this._makeRequest("POST", `/v1/invoices/${encodeURIComponent(id)}`, params, options, {
      responseSchema: {
        kind: "object",
        fields: {
          lines: {
            kind: "object",
            fields: {
              data: {
                kind: "array",
                element: {
                  kind: "object",
                  fields: {
                    pricing: {
                      kind: "nullable",
                      inner: {
                        kind: "object",
                        fields: {
                          unit_amount_decimal: {
                            kind: "nullable",
                            inner: { kind: "decimal_string" }
                          }
                        }
                      }
                    },
                    quantity_decimal: {
                      kind: "nullable",
                      inner: { kind: "decimal_string" }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
  }
  /**
   * You can list all invoices, or list the invoices for a specific customer. The invoices are returned sorted by creation date, with the most recently created invoices appearing first.
   */
  list(params, options) {
    return this._makeRequest("GET", "/v1/invoices", params, options, {
      methodType: "list",
      responseSchema: {
        kind: "object",
        fields: {
          data: {
            kind: "array",
            element: {
              kind: "object",
              fields: {
                lines: {
                  kind: "object",
                  fields: {
                    data: {
                      kind: "array",
                      element: {
                        kind: "object",
                        fields: {
                          pricing: {
                            kind: "nullable",
                            inner: {
                              kind: "object",
                              fields: {
                                unit_amount_decimal: {
                                  kind: "nullable",
                                  inner: { kind: "decimal_string" }
                                }
                              }
                            }
                          },
                          quantity_decimal: {
                            kind: "nullable",
                            inner: { kind: "decimal_string" }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
  }
  /**
   * This endpoint creates a draft invoice for a given customer. The invoice remains a draft until you [finalize the invoice, which allows you to [pay](/api/invoices/pay) or <a href="/api/invoices/send">send](https://docs.stripe.com/api/invoices/finalize) the invoice to your customers.
   */
  create(params, options) {
    return this._makeRequest("POST", "/v1/invoices", params, options, {
      responseSchema: {
        kind: "object",
        fields: {
          lines: {
            kind: "object",
            fields: {
              data: {
                kind: "array",
                element: {
                  kind: "object",
                  fields: {
                    pricing: {
                      kind: "nullable",
                      inner: {
                        kind: "object",
                        fields: {
                          unit_amount_decimal: {
                            kind: "nullable",
                            inner: { kind: "decimal_string" }
                          }
                        }
                      }
                    },
                    quantity_decimal: {
                      kind: "nullable",
                      inner: { kind: "decimal_string" }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
  }
  /**
   * Search for invoices you've previously created using Stripe's [Search Query Language](https://docs.stripe.com/docs/search#search-query-language).
   * Don't use search in read-after-write flows where strict consistency is necessary. Under normal operating
   * conditions, data is searchable in less than a minute. Occasionally, propagation of new or updated data can be up
   * to an hour behind during outages. Search functionality is not available to merchants in India.
   */
  search(params, options) {
    return this._makeRequest("GET", "/v1/invoices/search", params, options, {
      methodType: "search",
      responseSchema: {
        kind: "object",
        fields: {
          data: {
            kind: "array",
            element: {
              kind: "object",
              fields: {
                lines: {
                  kind: "object",
                  fields: {
                    data: {
                      kind: "array",
                      element: {
                        kind: "object",
                        fields: {
                          pricing: {
                            kind: "nullable",
                            inner: {
                              kind: "object",
                              fields: {
                                unit_amount_decimal: {
                                  kind: "nullable",
                                  inner: { kind: "decimal_string" }
                                }
                              }
                            }
                          },
                          quantity_decimal: {
                            kind: "nullable",
                            inner: { kind: "decimal_string" }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
  }
  /**
   * Adds multiple line items to an invoice. This is only possible when an invoice is still a draft.
   */
  addLines(id, params, options) {
    return this._makeRequest("POST", `/v1/invoices/${encodeURIComponent(id)}/add_lines`, params, options, {
      requestSchema: {
        kind: "object",
        fields: {
          lines: {
            kind: "array",
            element: {
              kind: "object",
              fields: {
                price_data: {
                  kind: "object",
                  fields: { unit_amount_decimal: { kind: "decimal_string" } }
                },
                quantity_decimal: { kind: "decimal_string" }
              }
            }
          }
        }
      },
      responseSchema: {
        kind: "object",
        fields: {
          lines: {
            kind: "object",
            fields: {
              data: {
                kind: "array",
                element: {
                  kind: "object",
                  fields: {
                    pricing: {
                      kind: "nullable",
                      inner: {
                        kind: "object",
                        fields: {
                          unit_amount_decimal: {
                            kind: "nullable",
                            inner: { kind: "decimal_string" }
                          }
                        }
                      }
                    },
                    quantity_decimal: {
                      kind: "nullable",
                      inner: { kind: "decimal_string" }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
  }
  /**
   * Attaches a PaymentIntent or an Out of Band Payment to the invoice, adding it to the list of payments.
   *
   * For the PaymentIntent, when the PaymentIntent's status changes to succeeded, the payment is credited
   * to the invoice, increasing its amount_paid. When the invoice is fully paid, the
   * invoice's status becomes paid.
   *
   * If the PaymentIntent's status is already succeeded when it's attached, it's
   * credited to the invoice immediately.
   *
   * See: [Partial payments](https://docs.stripe.com/docs/invoicing/partial-payments) to learn more.
   */
  attachPayment(id, params, options) {
    return this._makeRequest("POST", `/v1/invoices/${encodeURIComponent(id)}/attach_payment`, params, options, {
      responseSchema: {
        kind: "object",
        fields: {
          lines: {
            kind: "object",
            fields: {
              data: {
                kind: "array",
                element: {
                  kind: "object",
                  fields: {
                    pricing: {
                      kind: "nullable",
                      inner: {
                        kind: "object",
                        fields: {
                          unit_amount_decimal: {
                            kind: "nullable",
                            inner: { kind: "decimal_string" }
                          }
                        }
                      }
                    },
                    quantity_decimal: {
                      kind: "nullable",
                      inner: { kind: "decimal_string" }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
  }
  /**
   * Stripe automatically finalizes drafts before sending and attempting payment on invoices. However, if you'd like to finalize a draft invoice manually, you can do so using this method.
   */
  finalizeInvoice(id, params, options) {
    return this._makeRequest("POST", `/v1/invoices/${encodeURIComponent(id)}/finalize`, params, options, {
      responseSchema: {
        kind: "object",
        fields: {
          lines: {
            kind: "object",
            fields: {
              data: {
                kind: "array",
                element: {
                  kind: "object",
                  fields: {
                    pricing: {
                      kind: "nullable",
                      inner: {
                        kind: "object",
                        fields: {
                          unit_amount_decimal: {
                            kind: "nullable",
                            inner: { kind: "decimal_string" }
                          }
                        }
                      }
                    },
                    quantity_decimal: {
                      kind: "nullable",
                      inner: { kind: "decimal_string" }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
  }
  /**
   * Marking an invoice as uncollectible is useful for keeping track of bad debts that can be written off for accounting purposes.
   */
  markUncollectible(id, params, options) {
    return this._makeRequest("POST", `/v1/invoices/${encodeURIComponent(id)}/mark_uncollectible`, params, options, {
      responseSchema: {
        kind: "object",
        fields: {
          lines: {
            kind: "object",
            fields: {
              data: {
                kind: "array",
                element: {
                  kind: "object",
                  fields: {
                    pricing: {
                      kind: "nullable",
                      inner: {
                        kind: "object",
                        fields: {
                          unit_amount_decimal: {
                            kind: "nullable",
                            inner: { kind: "decimal_string" }
                          }
                        }
                      }
                    },
                    quantity_decimal: {
                      kind: "nullable",
                      inner: { kind: "decimal_string" }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
  }
  /**
   * Stripe automatically creates and then attempts to collect payment on invoices for customers on subscriptions according to your [subscriptions settings](https://dashboard.stripe.com/account/billing/automatic). However, if you'd like to attempt payment on an invoice out of the normal collection schedule or for some other reason, you can do so.
   */
  pay(id, params, options) {
    return this._makeRequest("POST", `/v1/invoices/${encodeURIComponent(id)}/pay`, params, options, {
      responseSchema: {
        kind: "object",
        fields: {
          lines: {
            kind: "object",
            fields: {
              data: {
                kind: "array",
                element: {
                  kind: "object",
                  fields: {
                    pricing: {
                      kind: "nullable",
                      inner: {
                        kind: "object",
                        fields: {
                          unit_amount_decimal: {
                            kind: "nullable",
                            inner: { kind: "decimal_string" }
                          }
                        }
                      }
                    },
                    quantity_decimal: {
                      kind: "nullable",
                      inner: { kind: "decimal_string" }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
  }
  /**
   * Removes multiple line items from an invoice. This is only possible when an invoice is still a draft.
   */
  removeLines(id, params, options) {
    return this._makeRequest("POST", `/v1/invoices/${encodeURIComponent(id)}/remove_lines`, params, options, {
      responseSchema: {
        kind: "object",
        fields: {
          lines: {
            kind: "object",
            fields: {
              data: {
                kind: "array",
                element: {
                  kind: "object",
                  fields: {
                    pricing: {
                      kind: "nullable",
                      inner: {
                        kind: "object",
                        fields: {
                          unit_amount_decimal: {
                            kind: "nullable",
                            inner: { kind: "decimal_string" }
                          }
                        }
                      }
                    },
                    quantity_decimal: {
                      kind: "nullable",
                      inner: { kind: "decimal_string" }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
  }
  /**
   * Stripe will automatically send invoices to customers according to your [subscriptions settings](https://dashboard.stripe.com/account/billing/automatic). However, if you'd like to manually send an invoice to your customer out of the normal schedule, you can do so. When sending invoices that have already been paid, there will be no reference to the payment in the email.
   *
   * Requests made in test-mode result in no emails being sent, despite sending an invoice.sent event.
   */
  sendInvoice(id, params, options) {
    return this._makeRequest("POST", `/v1/invoices/${encodeURIComponent(id)}/send`, params, options, {
      responseSchema: {
        kind: "object",
        fields: {
          lines: {
            kind: "object",
            fields: {
              data: {
                kind: "array",
                element: {
                  kind: "object",
                  fields: {
                    pricing: {
                      kind: "nullable",
                      inner: {
                        kind: "object",
                        fields: {
                          unit_amount_decimal: {
                            kind: "nullable",
                            inner: { kind: "decimal_string" }
                          }
                        }
                      }
                    },
                    quantity_decimal: {
                      kind: "nullable",
                      inner: { kind: "decimal_string" }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
  }
  /**
   * Updates multiple line items on an invoice. This is only possible when an invoice is still a draft.
   */
  updateLines(id, params, options) {
    return this._makeRequest("POST", `/v1/invoices/${encodeURIComponent(id)}/update_lines`, params, options, {
      requestSchema: {
        kind: "object",
        fields: {
          lines: {
            kind: "array",
            element: {
              kind: "object",
              fields: {
                price_data: {
                  kind: "object",
                  fields: { unit_amount_decimal: { kind: "decimal_string" } }
                },
                quantity_decimal: { kind: "decimal_string" }
              }
            }
          }
        }
      },
      responseSchema: {
        kind: "object",
        fields: {
          lines: {
            kind: "object",
            fields: {
              data: {
                kind: "array",
                element: {
                  kind: "object",
                  fields: {
                    pricing: {
                      kind: "nullable",
                      inner: {
                        kind: "object",
                        fields: {
                          unit_amount_decimal: {
                            kind: "nullable",
                            inner: { kind: "decimal_string" }
                          }
                        }
                      }
                    },
                    quantity_decimal: {
                      kind: "nullable",
                      inner: { kind: "decimal_string" }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
  }
  /**
   * Mark a finalized invoice as void. This cannot be undone. Voiding an invoice is similar to [deletion](https://docs.stripe.com/api/invoices/delete), however it only applies to finalized invoices and maintains a papertrail where the invoice can still be found.
   *
   * Consult with local regulations to determine whether and how an invoice might be amended, canceled, or voided in the jurisdiction you're doing business in. You might need to [issue another invoice or <a href="/api/credit_notes/create">credit note](https://docs.stripe.com/api/invoices/create) instead. Stripe recommends that you consult with your legal counsel for advice specific to your business.
   */
  voidInvoice(id, params, options) {
    return this._makeRequest("POST", `/v1/invoices/${encodeURIComponent(id)}/void`, params, options, {
      responseSchema: {
        kind: "object",
        fields: {
          lines: {
            kind: "object",
            fields: {
              data: {
                kind: "array",
                element: {
                  kind: "object",
                  fields: {
                    pricing: {
                      kind: "nullable",
                      inner: {
                        kind: "object",
                        fields: {
                          unit_amount_decimal: {
                            kind: "nullable",
                            inner: { kind: "decimal_string" }
                          }
                        }
                      }
                    },
                    quantity_decimal: {
                      kind: "nullable",
                      inner: { kind: "decimal_string" }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
  }
  /**
   * At any time, you can preview the upcoming invoice for a subscription or subscription schedule. This will show you all the charges that are pending, including subscription renewal charges, invoice item charges, etc. It will also show you any discounts that are applicable to the invoice.
   *
   * You can also preview the effects of creating or updating a subscription or subscription schedule, including a preview of any prorations that will take place. To ensure that the actual proration is calculated exactly the same as the previewed proration, you should pass the subscription_details.proration_date parameter when doing the actual subscription update.
   *
   * The recommended way to get only the prorations being previewed on the invoice is to consider line items where parent.subscription_item_details.proration is true.
   *
   * Note that when you are viewing an upcoming invoice, you are simply viewing a preview – the invoice has not yet been created. As such, the upcoming invoice will not show up in invoice listing calls, and you cannot use the API to pay or edit the invoice. If you want to change the amount that your customer will be billed, you can add, remove, or update pending invoice items, or update the customer's discount.
   *
   * Note: Currency conversion calculations use the latest exchange rates. Exchange rates may vary between the time of the preview and the time of the actual invoice creation. [Learn more](https://docs.stripe.com/currencies/conversions)
   */
  createPreview(params, options) {
    return this._makeRequest("POST", "/v1/invoices/create_preview", params, options, {
      requestSchema: {
        kind: "object",
        fields: {
          invoice_items: {
            kind: "array",
            element: {
              kind: "object",
              fields: {
                price_data: {
                  kind: "object",
                  fields: { unit_amount_decimal: { kind: "decimal_string" } }
                },
                quantity_decimal: { kind: "decimal_string" },
                unit_amount_decimal: { kind: "decimal_string" }
              }
            }
          },
          schedule_details: {
            kind: "object",
            fields: {
              phases: {
                kind: "array",
                element: {
                  kind: "object",
                  fields: {
                    add_invoice_items: {
                      kind: "array",
                      element: {
                        kind: "object",
                        fields: {
                          price_data: {
                            kind: "object",
                            fields: {
                              unit_amount_decimal: { kind: "decimal_string" }
                            }
                          }
                        }
                      }
                    },
                    items: {
                      kind: "array",
                      element: {
                        kind: "object",
                        fields: {
                          price_data: {
                            kind: "object",
                            fields: {
                              unit_amount_decimal: { kind: "decimal_string" }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          subscription_details: {
            kind: "object",
            fields: {
              items: {
                kind: "array",
                element: {
                  kind: "object",
                  fields: {
                    price_data: {
                      kind: "object",
                      fields: { unit_amount_decimal: { kind: "decimal_string" } }
                    }
                  }
                }
              }
            }
          }
        }
      },
      responseSchema: {
        kind: "object",
        fields: {
          lines: {
            kind: "object",
            fields: {
              data: {
                kind: "array",
                element: {
                  kind: "object",
                  fields: {
                    pricing: {
                      kind: "nullable",
                      inner: {
                        kind: "object",
                        fields: {
                          unit_amount_decimal: {
                            kind: "nullable",
                            inner: { kind: "decimal_string" }
                          }
                        }
                      }
                    },
                    quantity_decimal: {
                      kind: "nullable",
                      inner: { kind: "decimal_string" }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
  }
  /**
   * When retrieving an invoice, you'll get a lines property containing the total count of line items and the first handful of those items. There is also a URL where you can retrieve the full (paginated) list of line items.
   */
  listLineItems(id, params, options) {
    return this._makeRequest("GET", `/v1/invoices/${encodeURIComponent(id)}/lines`, params, options, {
      methodType: "list",
      responseSchema: {
        kind: "object",
        fields: {
          data: {
            kind: "array",
            element: {
              kind: "object",
              fields: {
                pricing: {
                  kind: "nullable",
                  inner: {
                    kind: "object",
                    fields: {
                      unit_amount_decimal: {
                        kind: "nullable",
                        inner: { kind: "decimal_string" }
                      }
                    }
                  }
                },
                quantity_decimal: {
                  kind: "nullable",
                  inner: { kind: "decimal_string" }
                }
              }
            }
          }
        }
      }
    });
  }
  /**
   * Updates an invoice's line item. Some fields, such as tax_amounts, only live on the invoice line item,
   * so they can only be updated through this endpoint. Other fields, such as amount, live on both the invoice
   * item and the invoice line item, so updates on this endpoint will propagate to the invoice item as well.
   * Updating an invoice's line item is only possible before the invoice is finalized.
   */
  updateLineItem(invoiceId, id, params, options) {
    return this._makeRequest("POST", `/v1/invoices/${encodeURIComponent(invoiceId)}/lines/${encodeURIComponent(id)}`, params, options, {
      requestSchema: {
        kind: "object",
        fields: {
          price_data: {
            kind: "object",
            fields: { unit_amount_decimal: { kind: "decimal_string" } }
          },
          quantity_decimal: { kind: "decimal_string" }
        }
      },
      responseSchema: {
        kind: "object",
        fields: {
          pricing: {
            kind: "nullable",
            inner: {
              kind: "object",
              fields: {
                unit_amount_decimal: {
                  kind: "nullable",
                  inner: { kind: "decimal_string" }
                }
              }
            }
          },
          quantity_decimal: {
            kind: "nullable",
            inner: { kind: "decimal_string" }
          }
        }
      }
    });
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/InvoiceItems.js
var InvoiceItemResource = class extends StripeResource {
  /**
   * Deletes an invoice item, removing it from an invoice. Deleting invoice items is only possible when they're not attached to invoices, or if it's attached to a draft invoice.
   */
  del(id, params, options) {
    return this._makeRequest("DELETE", `/v1/invoiceitems/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * Retrieves the invoice item with the given ID.
   */
  retrieve(id, params, options) {
    return this._makeRequest("GET", `/v1/invoiceitems/${encodeURIComponent(id)}`, params, options, {
      responseSchema: {
        kind: "object",
        fields: {
          pricing: {
            kind: "nullable",
            inner: {
              kind: "object",
              fields: {
                unit_amount_decimal: {
                  kind: "nullable",
                  inner: { kind: "decimal_string" }
                }
              }
            }
          },
          quantity_decimal: { kind: "decimal_string" }
        }
      }
    });
  }
  /**
   * Updates the amount or description of an invoice item on an upcoming invoice. Updating an invoice item is only possible before the invoice it's attached to is closed.
   */
  update(id, params, options) {
    return this._makeRequest("POST", `/v1/invoiceitems/${encodeURIComponent(id)}`, params, options, {
      requestSchema: {
        kind: "object",
        fields: {
          price_data: {
            kind: "object",
            fields: { unit_amount_decimal: { kind: "decimal_string" } }
          },
          quantity_decimal: { kind: "decimal_string" },
          unit_amount_decimal: { kind: "decimal_string" }
        }
      },
      responseSchema: {
        kind: "object",
        fields: {
          pricing: {
            kind: "nullable",
            inner: {
              kind: "object",
              fields: {
                unit_amount_decimal: {
                  kind: "nullable",
                  inner: { kind: "decimal_string" }
                }
              }
            }
          },
          quantity_decimal: { kind: "decimal_string" }
        }
      }
    });
  }
  /**
   * Returns a list of your invoice items. Invoice items are returned sorted by creation date, with the most recently created invoice items appearing first.
   */
  list(params, options) {
    return this._makeRequest("GET", "/v1/invoiceitems", params, options, {
      methodType: "list",
      responseSchema: {
        kind: "object",
        fields: {
          data: {
            kind: "array",
            element: {
              kind: "object",
              fields: {
                pricing: {
                  kind: "nullable",
                  inner: {
                    kind: "object",
                    fields: {
                      unit_amount_decimal: {
                        kind: "nullable",
                        inner: { kind: "decimal_string" }
                      }
                    }
                  }
                },
                quantity_decimal: { kind: "decimal_string" }
              }
            }
          }
        }
      }
    });
  }
  /**
   * Creates an item to be added to a draft invoice (up to 250 items per invoice). If no invoice is specified, the item will be on the next invoice created for the customer specified.
   */
  create(params, options) {
    return this._makeRequest("POST", "/v1/invoiceitems", params, options, {
      requestSchema: {
        kind: "object",
        fields: {
          price_data: {
            kind: "object",
            fields: { unit_amount_decimal: { kind: "decimal_string" } }
          },
          quantity_decimal: { kind: "decimal_string" },
          unit_amount_decimal: { kind: "decimal_string" }
        }
      },
      responseSchema: {
        kind: "object",
        fields: {
          pricing: {
            kind: "nullable",
            inner: {
              kind: "object",
              fields: {
                unit_amount_decimal: {
                  kind: "nullable",
                  inner: { kind: "decimal_string" }
                }
              }
            }
          },
          quantity_decimal: { kind: "decimal_string" }
        }
      }
    });
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/InvoicePayments.js
var InvoicePaymentResource = class extends StripeResource {
  /**
   * When retrieving an invoice, there is an includable payments property containing the first handful of those items. There is also a URL where you can retrieve the full (paginated) list of payments.
   */
  list(params, options) {
    return this._makeRequest("GET", "/v1/invoice_payments", params, options, {
      methodType: "list"
    });
  }
  /**
   * Retrieves the invoice payment with the given ID.
   */
  retrieve(id, params, options) {
    return this._makeRequest("GET", `/v1/invoice_payments/${encodeURIComponent(id)}`, params, options);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/InvoiceRenderingTemplates.js
var InvoiceRenderingTemplateResource = class extends StripeResource {
  /**
   * List all templates, ordered by creation date, with the most recently created template appearing first.
   */
  list(params, options) {
    return this._makeRequest("GET", "/v1/invoice_rendering_templates", params, options, {
      methodType: "list"
    });
  }
  /**
   * Retrieves an invoice rendering template with the given ID. It by default returns the latest version of the template. Optionally, specify a version to see previous versions.
   */
  retrieve(id, params, options) {
    return this._makeRequest("GET", `/v1/invoice_rendering_templates/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * Updates the status of an invoice rendering template to ‘archived' so no new Stripe objects (customers, invoices, etc.) can reference it. The template can also no longer be updated. However, if the template is already set on a Stripe object, it will continue to be applied on invoices generated by it.
   */
  archive(id, params, options) {
    return this._makeRequest("POST", `/v1/invoice_rendering_templates/${encodeURIComponent(id)}/archive`, params, options);
  }
  /**
   * Unarchive an invoice rendering template so it can be used on new Stripe objects again.
   */
  unarchive(id, params, options) {
    return this._makeRequest("POST", `/v1/invoice_rendering_templates/${encodeURIComponent(id)}/unarchive`, params, options);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/Mandates.js
var MandateResource = class extends StripeResource {
  /**
   * Retrieves a Mandate object.
   */
  retrieve(id, params, options) {
    return this._makeRequest("GET", `/v1/mandates/${encodeURIComponent(id)}`, params, options);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/OAuth.js
var OAuthResource = class extends StripeResource {
  constructor() {
    super(...arguments);
    this.basePath = makeURLInterpolator("/");
  }
  authorizeUrl(params, options) {
    params = params || {};
    options = options || {};
    let path = "oauth/authorize";
    if (options.express) {
      path = `express/${path}`;
    }
    if (!params.response_type) {
      params.response_type = "code";
    }
    if (!params.client_id) {
      params.client_id = this._stripe.getClientId();
    }
    if (!params.scope) {
      params.scope = "read_write";
    }
    const connectHost = this._stripe.resolveBaseAddress("connect");
    return `https://${connectHost}/${path}?${queryStringifyRequestData(params)}`;
  }
  token(params, options) {
    return this._makeRequest("POST", "/oauth/token", params, options, {
      apiBase: "connect"
    });
  }
  deauthorize(params, options) {
    if (!params.client_id) {
      params.client_id = this._stripe.getClientId();
    }
    return this._makeRequest("POST", "/oauth/deauthorize", params, options, {
      apiBase: "connect"
    });
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/PaymentAttemptRecords.js
var PaymentAttemptRecordResource = class extends StripeResource {
  /**
   * List all the Payment Attempt Records attached to the specified Payment Record.
   */
  list(params, options) {
    return this._makeRequest("GET", "/v1/payment_attempt_records", params, options, {
      methodType: "list"
    });
  }
  /**
   * Retrieves a Payment Attempt Record with the given ID
   */
  retrieve(id, params, options) {
    return this._makeRequest("GET", `/v1/payment_attempt_records/${encodeURIComponent(id)}`, params, options);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/PaymentIntents.js
var PaymentIntentResource = class extends StripeResource {
  /**
   * Returns a list of PaymentIntents.
   */
  list(params, options) {
    return this._makeRequest("GET", "/v1/payment_intents", params, options, {
      methodType: "list"
    });
  }
  /**
   * Creates a PaymentIntent object.
   *
   * After the PaymentIntent is created, attach a payment method and [confirm](https://docs.stripe.com/docs/api/payment_intents/confirm)
   * to continue the payment. Learn more about <a href="/docs/payments/payment-intents">the available payment flows
   * with the Payment Intents API.
   *
   * When you use confirm=true during creation, it's equivalent to creating
   * and confirming the PaymentIntent in the same call. You can use any parameters
   * available in the [confirm API](https://docs.stripe.com/docs/api/payment_intents/confirm) when you supply
   * confirm=true.
   */
  create(params, options) {
    return this._makeRequest("POST", "/v1/payment_intents", params, options);
  }
  /**
   * Retrieves the details of a PaymentIntent that has previously been created.
   *
   * You can retrieve a PaymentIntent client-side using a publishable key when the client_secret is in the query string.
   *
   * If you retrieve a PaymentIntent with a publishable key, it only returns a subset of properties. Refer to the [payment intent](https://docs.stripe.com/api#payment_intent_object) object reference for more details.
   */
  retrieve(id, params, options) {
    return this._makeRequest("GET", `/v1/payment_intents/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * Updates properties on a PaymentIntent object without confirming.
   *
   * Depending on which properties you update, you might need to confirm the
   * PaymentIntent again. For example, updating the payment_method
   * always requires you to confirm the PaymentIntent again. If you prefer to
   * update and confirm at the same time, we recommend updating properties through
   * the [confirm API](https://docs.stripe.com/docs/api/payment_intents/confirm) instead.
   */
  update(id, params, options) {
    return this._makeRequest("POST", `/v1/payment_intents/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * Search for PaymentIntents you've previously created using Stripe's [Search Query Language](https://docs.stripe.com/docs/search#search-query-language).
   * Don't use search in read-after-write flows where strict consistency is necessary. Under normal operating
   * conditions, data is searchable in less than a minute. Occasionally, propagation of new or updated data can be up
   * to an hour behind during outages. Search functionality is not available to merchants in India.
   */
  search(params, options) {
    return this._makeRequest("GET", "/v1/payment_intents/search", params, options, {
      methodType: "search"
    });
  }
  /**
   * Manually reconcile the remaining amount for a customer_balance PaymentIntent.
   */
  applyCustomerBalance(id, params, options) {
    return this._makeRequest("POST", `/v1/payment_intents/${encodeURIComponent(id)}/apply_customer_balance`, params, options);
  }
  /**
   * You can cancel a PaymentIntent object when it's in one of these statuses: requires_payment_method, requires_capture, requires_confirmation, requires_action or, [in rare cases](https://docs.stripe.com/docs/payments/intents), processing.
   *
   * After it's canceled, no additional charges are made by the PaymentIntent and any operations on the PaymentIntent fail with an error. For PaymentIntents with a status of requires_capture, the remaining amount_capturable is automatically refunded.
   *
   * You can directly cancel the PaymentIntent for a Checkout Session only when the PaymentIntent has a status of requires_capture. Otherwise, you must [expire the Checkout Session](https://docs.stripe.com/docs/api/checkout/sessions/expire).
   */
  cancel(id, params, options) {
    return this._makeRequest("POST", `/v1/payment_intents/${encodeURIComponent(id)}/cancel`, params, options);
  }
  /**
   * Capture the funds of an existing uncaptured PaymentIntent when its status is requires_capture.
   *
   * Uncaptured PaymentIntents are cancelled a set number of days (7 by default) after their creation.
   *
   * Learn more about [separate authorization and capture](https://docs.stripe.com/docs/payments/capture-later).
   */
  capture(id, params, options) {
    return this._makeRequest("POST", `/v1/payment_intents/${encodeURIComponent(id)}/capture`, params, options);
  }
  /**
   * Confirm that your customer intends to pay with current or provided
   * payment method. Upon confirmation, the PaymentIntent will attempt to initiate
   * a payment.
   *
   * If the selected payment method requires additional authentication steps, the
   * PaymentIntent will transition to the requires_action status and
   * suggest additional actions via next_action. If payment fails,
   * the PaymentIntent transitions to the requires_payment_method status or the
   * canceled status if the confirmation limit is reached. If
   * payment succeeds, the PaymentIntent will transition to the succeeded
   * status (or requires_capture, if capture_method is set to manual).
   *
   * If the confirmation_method is automatic, payment may be attempted
   * using our [client SDKs](https://docs.stripe.com/docs/stripe-js/reference#stripe-handle-card-payment)
   * and the PaymentIntent's [client_secret](https://docs.stripe.com/api#payment_intent_object-client_secret).
   * After next_actions are handled by the client, no additional
   * confirmation is required to complete the payment.
   *
   * If the confirmation_method is manual, all payment attempts must be
   * initiated using a secret key.
   *
   * If any actions are required for the payment, the PaymentIntent will
   * return to the requires_confirmation state
   * after those actions are completed. Your server needs to then
   * explicitly re-confirm the PaymentIntent to initiate the next payment
   * attempt.
   *
   * There is a variable upper limit on how many times a PaymentIntent can be confirmed.
   * After this limit is reached, any further calls to this endpoint will
   * transition the PaymentIntent to the canceled state.
   */
  confirm(id, params, options) {
    return this._makeRequest("POST", `/v1/payment_intents/${encodeURIComponent(id)}/confirm`, params, options);
  }
  /**
   * Perform an incremental authorization on an eligible
   * [PaymentIntent](https://docs.stripe.com/docs/api/payment_intents/object). To be eligible, the
   * PaymentIntent's status must be requires_capture and
   * [incremental_authorization_supported](https://docs.stripe.com/docs/api/charges/object#charge_object-payment_method_details-card_present-incremental_authorization_supported)
   * must be true.
   *
   * Incremental authorizations attempt to increase the authorized amount on
   * your customer's card to the new, higher amount provided. Similar to the
   * initial authorization, incremental authorizations can be declined. A
   * single PaymentIntent can call this endpoint multiple times to further
   * increase the authorized amount.
   *
   * If the incremental authorization succeeds, the PaymentIntent object
   * returns with the updated
   * [amount](https://docs.stripe.com/docs/api/payment_intents/object#payment_intent_object-amount).
   * If the incremental authorization fails, a
   * [card_declined](https://docs.stripe.com/docs/error-codes#card-declined) error returns, and no other
   * fields on the PaymentIntent or Charge update. The PaymentIntent
   * object remains capturable for the previously authorized amount.
   *
   * Each PaymentIntent can have a maximum of 10 incremental authorization attempts, including declines.
   * After it's captured, a PaymentIntent can no longer be incremented.
   *
   * Learn more about incremental authorizations with
   * [in-person payments](https://docs.stripe.com/docs/terminal/features/incremental-authorizations) and
   * [online payments](https://docs.stripe.com/docs/payments/incremental-authorization?platform=web&ui=elements).
   */
  incrementAuthorization(id, params, options) {
    return this._makeRequest("POST", `/v1/payment_intents/${encodeURIComponent(id)}/increment_authorization`, params, options);
  }
  /**
   * Verifies microdeposits on a PaymentIntent object.
   */
  verifyMicrodeposits(id, params, options) {
    return this._makeRequest("POST", `/v1/payment_intents/${encodeURIComponent(id)}/verify_microdeposits`, params, options);
  }
  /**
   * Lists all LineItems of a given PaymentIntent.
   */
  listAmountDetailsLineItems(id, params, options) {
    return this._makeRequest("GET", `/v1/payment_intents/${encodeURIComponent(id)}/amount_details_line_items`, params, options, {
      methodType: "list"
    });
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/PaymentLinks.js
var PaymentLinkResource = class extends StripeResource {
  /**
   * Returns a list of your payment links.
   */
  list(params, options) {
    return this._makeRequest("GET", "/v1/payment_links", params, options, {
      methodType: "list",
      responseSchema: {
        kind: "object",
        fields: {
          data: {
            kind: "array",
            element: {
              kind: "object",
              fields: {
                line_items: {
                  kind: "object",
                  fields: {
                    data: {
                      kind: "array",
                      element: {
                        kind: "object",
                        fields: {
                          price: {
                            kind: "nullable",
                            inner: {
                              kind: "object",
                              fields: {
                                currency_options: {
                                  kind: "array",
                                  element: {
                                    kind: "object",
                                    fields: {
                                      tiers: {
                                        kind: "array",
                                        element: {
                                          kind: "object",
                                          fields: {
                                            flat_amount_decimal: {
                                              kind: "nullable",
                                              inner: { kind: "decimal_string" }
                                            },
                                            unit_amount_decimal: {
                                              kind: "nullable",
                                              inner: { kind: "decimal_string" }
                                            }
                                          }
                                        }
                                      },
                                      unit_amount_decimal: {
                                        kind: "nullable",
                                        inner: { kind: "decimal_string" }
                                      }
                                    }
                                  }
                                },
                                tiers: {
                                  kind: "array",
                                  element: {
                                    kind: "object",
                                    fields: {
                                      flat_amount_decimal: {
                                        kind: "nullable",
                                        inner: { kind: "decimal_string" }
                                      },
                                      unit_amount_decimal: {
                                        kind: "nullable",
                                        inner: { kind: "decimal_string" }
                                      }
                                    }
                                  }
                                },
                                unit_amount_decimal: {
                                  kind: "nullable",
                                  inner: { kind: "decimal_string" }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
  }
  /**
   * Creates a payment link.
   */
  create(params, options) {
    return this._makeRequest("POST", "/v1/payment_links", params, options, {
      requestSchema: {
        kind: "object",
        fields: {
          line_items: {
            kind: "array",
            element: {
              kind: "object",
              fields: {
                price_data: {
                  kind: "object",
                  fields: { unit_amount_decimal: { kind: "decimal_string" } }
                }
              }
            }
          }
        }
      },
      responseSchema: {
        kind: "object",
        fields: {
          line_items: {
            kind: "object",
            fields: {
              data: {
                kind: "array",
                element: {
                  kind: "object",
                  fields: {
                    price: {
                      kind: "nullable",
                      inner: {
                        kind: "object",
                        fields: {
                          currency_options: {
                            kind: "array",
                            element: {
                              kind: "object",
                              fields: {
                                tiers: {
                                  kind: "array",
                                  element: {
                                    kind: "object",
                                    fields: {
                                      flat_amount_decimal: {
                                        kind: "nullable",
                                        inner: { kind: "decimal_string" }
                                      },
                                      unit_amount_decimal: {
                                        kind: "nullable",
                                        inner: { kind: "decimal_string" }
                                      }
                                    }
                                  }
                                },
                                unit_amount_decimal: {
                                  kind: "nullable",
                                  inner: { kind: "decimal_string" }
                                }
                              }
                            }
                          },
                          tiers: {
                            kind: "array",
                            element: {
                              kind: "object",
                              fields: {
                                flat_amount_decimal: {
                                  kind: "nullable",
                                  inner: { kind: "decimal_string" }
                                },
                                unit_amount_decimal: {
                                  kind: "nullable",
                                  inner: { kind: "decimal_string" }
                                }
                              }
                            }
                          },
                          unit_amount_decimal: {
                            kind: "nullable",
                            inner: { kind: "decimal_string" }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
  }
  /**
   * Retrieve a payment link.
   */
  retrieve(id, params, options) {
    return this._makeRequest("GET", `/v1/payment_links/${encodeURIComponent(id)}`, params, options, {
      responseSchema: {
        kind: "object",
        fields: {
          line_items: {
            kind: "object",
            fields: {
              data: {
                kind: "array",
                element: {
                  kind: "object",
                  fields: {
                    price: {
                      kind: "nullable",
                      inner: {
                        kind: "object",
                        fields: {
                          currency_options: {
                            kind: "array",
                            element: {
                              kind: "object",
                              fields: {
                                tiers: {
                                  kind: "array",
                                  element: {
                                    kind: "object",
                                    fields: {
                                      flat_amount_decimal: {
                                        kind: "nullable",
                                        inner: { kind: "decimal_string" }
                                      },
                                      unit_amount_decimal: {
                                        kind: "nullable",
                                        inner: { kind: "decimal_string" }
                                      }
                                    }
                                  }
                                },
                                unit_amount_decimal: {
                                  kind: "nullable",
                                  inner: { kind: "decimal_string" }
                                }
                              }
                            }
                          },
                          tiers: {
                            kind: "array",
                            element: {
                              kind: "object",
                              fields: {
                                flat_amount_decimal: {
                                  kind: "nullable",
                                  inner: { kind: "decimal_string" }
                                },
                                unit_amount_decimal: {
                                  kind: "nullable",
                                  inner: { kind: "decimal_string" }
                                }
                              }
                            }
                          },
                          unit_amount_decimal: {
                            kind: "nullable",
                            inner: { kind: "decimal_string" }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
  }
  /**
   * Updates a payment link.
   */
  update(id, params, options) {
    return this._makeRequest("POST", `/v1/payment_links/${encodeURIComponent(id)}`, params, options, {
      responseSchema: {
        kind: "object",
        fields: {
          line_items: {
            kind: "object",
            fields: {
              data: {
                kind: "array",
                element: {
                  kind: "object",
                  fields: {
                    price: {
                      kind: "nullable",
                      inner: {
                        kind: "object",
                        fields: {
                          currency_options: {
                            kind: "array",
                            element: {
                              kind: "object",
                              fields: {
                                tiers: {
                                  kind: "array",
                                  element: {
                                    kind: "object",
                                    fields: {
                                      flat_amount_decimal: {
                                        kind: "nullable",
                                        inner: { kind: "decimal_string" }
                                      },
                                      unit_amount_decimal: {
                                        kind: "nullable",
                                        inner: { kind: "decimal_string" }
                                      }
                                    }
                                  }
                                },
                                unit_amount_decimal: {
                                  kind: "nullable",
                                  inner: { kind: "decimal_string" }
                                }
                              }
                            }
                          },
                          tiers: {
                            kind: "array",
                            element: {
                              kind: "object",
                              fields: {
                                flat_amount_decimal: {
                                  kind: "nullable",
                                  inner: { kind: "decimal_string" }
                                },
                                unit_amount_decimal: {
                                  kind: "nullable",
                                  inner: { kind: "decimal_string" }
                                }
                              }
                            }
                          },
                          unit_amount_decimal: {
                            kind: "nullable",
                            inner: { kind: "decimal_string" }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
  }
  /**
   * When retrieving a payment link, there is an includable line_items property containing the first handful of those items. There is also a URL where you can retrieve the full (paginated) list of line items.
   */
  listLineItems(id, params, options) {
    return this._makeRequest("GET", `/v1/payment_links/${encodeURIComponent(id)}/line_items`, params, options, {
      methodType: "list",
      responseSchema: {
        kind: "object",
        fields: {
          data: {
            kind: "array",
            element: {
              kind: "object",
              fields: {
                price: {
                  kind: "nullable",
                  inner: {
                    kind: "object",
                    fields: {
                      currency_options: {
                        kind: "array",
                        element: {
                          kind: "object",
                          fields: {
                            tiers: {
                              kind: "array",
                              element: {
                                kind: "object",
                                fields: {
                                  flat_amount_decimal: {
                                    kind: "nullable",
                                    inner: { kind: "decimal_string" }
                                  },
                                  unit_amount_decimal: {
                                    kind: "nullable",
                                    inner: { kind: "decimal_string" }
                                  }
                                }
                              }
                            },
                            unit_amount_decimal: {
                              kind: "nullable",
                              inner: { kind: "decimal_string" }
                            }
                          }
                        }
                      },
                      tiers: {
                        kind: "array",
                        element: {
                          kind: "object",
                          fields: {
                            flat_amount_decimal: {
                              kind: "nullable",
                              inner: { kind: "decimal_string" }
                            },
                            unit_amount_decimal: {
                              kind: "nullable",
                              inner: { kind: "decimal_string" }
                            }
                          }
                        }
                      },
                      unit_amount_decimal: {
                        kind: "nullable",
                        inner: { kind: "decimal_string" }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/PaymentMethods.js
var PaymentMethodResource = class extends StripeResource {
  /**
   * Returns a list of all PaymentMethods.
   */
  list(params, options) {
    return this._makeRequest("GET", "/v1/payment_methods", params, options, {
      methodType: "list"
    });
  }
  /**
   * Creates a PaymentMethod object. Read the [Stripe.js reference](https://docs.stripe.com/docs/stripe-js/reference#stripe-create-payment-method) to learn how to create PaymentMethods via Stripe.js.
   *
   * Instead of creating a PaymentMethod directly, we recommend using the [PaymentIntents API to accept a payment immediately or the <a href="/docs/payments/save-and-reuse">SetupIntent](https://docs.stripe.com/docs/payments/accept-a-payment) API to collect payment method details ahead of a future payment.
   */
  create(params, options) {
    return this._makeRequest("POST", "/v1/payment_methods", params, options);
  }
  /**
   * Retrieves a PaymentMethod object attached to the StripeAccount. To retrieve a payment method attached to a Customer, you should use [Retrieve a Customer's PaymentMethods](https://docs.stripe.com/docs/api/payment_methods/customer)
   */
  retrieve(id, params, options) {
    return this._makeRequest("GET", `/v1/payment_methods/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * Updates a PaymentMethod object. A PaymentMethod must be attached to a customer to be updated.
   */
  update(id, params, options) {
    return this._makeRequest("POST", `/v1/payment_methods/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * Attaches a PaymentMethod object to a Customer.
   *
   * To attach a new PaymentMethod to a customer for future payments, we recommend you use a [SetupIntent](https://docs.stripe.com/docs/api/setup_intents)
   * or a PaymentIntent with [setup_future_usage](https://docs.stripe.com/docs/api/payment_intents/create#create_payment_intent-setup_future_usage).
   * These approaches will perform any necessary steps to set up the PaymentMethod for future payments. Using the /v1/payment_methods/:id/attach
   * endpoint without first using a SetupIntent or PaymentIntent with setup_future_usage does not optimize the PaymentMethod for
   * future use, which makes later declines and payment friction more likely.
   * See [Optimizing cards for future payments](https://docs.stripe.com/docs/payments/payment-intents#future-usage) for more information about setting up
   * future payments.
   *
   * To use this PaymentMethod as the default for invoice or subscription payments,
   * set [invoice_settings.default_payment_method](https://docs.stripe.com/docs/api/customers/update#update_customer-invoice_settings-default_payment_method),
   * on the Customer to the PaymentMethod's ID.
   */
  attach(id, params, options) {
    return this._makeRequest("POST", `/v1/payment_methods/${encodeURIComponent(id)}/attach`, params, options);
  }
  /**
   * Detaches a PaymentMethod object from a Customer. After a PaymentMethod is detached, it can no longer be used for a payment or re-attached to a Customer.
   */
  detach(id, params, options) {
    return this._makeRequest("POST", `/v1/payment_methods/${encodeURIComponent(id)}/detach`, params, options);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/PaymentMethodConfigurations.js
var PaymentMethodConfigurationResource = class extends StripeResource {
  /**
   * List payment method configurations
   */
  list(params, options) {
    return this._makeRequest("GET", "/v1/payment_method_configurations", params, options, {
      methodType: "list"
    });
  }
  /**
   * Creates a payment method configuration
   */
  create(params, options) {
    return this._makeRequest("POST", "/v1/payment_method_configurations", params, options);
  }
  /**
   * Retrieve payment method configuration
   */
  retrieve(id, params, options) {
    return this._makeRequest("GET", `/v1/payment_method_configurations/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * Update payment method configuration
   */
  update(id, params, options) {
    return this._makeRequest("POST", `/v1/payment_method_configurations/${encodeURIComponent(id)}`, params, options);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/PaymentMethodDomains.js
var PaymentMethodDomainResource = class extends StripeResource {
  /**
   * Lists the details of existing payment method domains.
   */
  list(params, options) {
    return this._makeRequest("GET", "/v1/payment_method_domains", params, options, {
      methodType: "list"
    });
  }
  /**
   * Creates a payment method domain.
   */
  create(params, options) {
    return this._makeRequest("POST", "/v1/payment_method_domains", params, options);
  }
  /**
   * Retrieves the details of an existing payment method domain.
   */
  retrieve(id, params, options) {
    return this._makeRequest("GET", `/v1/payment_method_domains/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * Updates an existing payment method domain.
   */
  update(id, params, options) {
    return this._makeRequest("POST", `/v1/payment_method_domains/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * Some payment methods might require additional steps to register a domain. If the requirements weren't satisfied when the domain was created, the payment method will be inactive on the domain.
   * The payment method doesn't appear in Elements or Embedded Checkout for this domain until it is active.
   *
   * To activate a payment method on an existing payment method domain, complete the required registration steps specific to the payment method, and then validate the payment method domain with this endpoint.
   *
   * Related guides: [Payment method domains](https://docs.stripe.com/docs/payments/payment-methods/pmd-registration).
   */
  validate(id, params, options) {
    return this._makeRequest("POST", `/v1/payment_method_domains/${encodeURIComponent(id)}/validate`, params, options);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/PaymentRecords.js
var PaymentRecordResource = class extends StripeResource {
  /**
   * Retrieves a Payment Record with the given ID
   */
  retrieve(id, params, options) {
    return this._makeRequest("GET", `/v1/payment_records/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * Report a new payment attempt on the specified Payment Record. A new payment
   *  attempt can only be specified if all other payment attempts are canceled or failed.
   */
  reportPaymentAttempt(id, params, options) {
    return this._makeRequest("POST", `/v1/payment_records/${encodeURIComponent(id)}/report_payment_attempt`, params, options);
  }
  /**
   * Report that the most recent payment attempt on the specified Payment Record
   *  was canceled.
   */
  reportPaymentAttemptCanceled(id, params, options) {
    return this._makeRequest("POST", `/v1/payment_records/${encodeURIComponent(id)}/report_payment_attempt_canceled`, params, options);
  }
  /**
   * Report that the most recent payment attempt on the specified Payment Record
   *  failed or errored.
   */
  reportPaymentAttemptFailed(id, params, options) {
    return this._makeRequest("POST", `/v1/payment_records/${encodeURIComponent(id)}/report_payment_attempt_failed`, params, options);
  }
  /**
   * Report that the most recent payment attempt on the specified Payment Record
   *  was guaranteed.
   */
  reportPaymentAttemptGuaranteed(id, params, options) {
    return this._makeRequest("POST", `/v1/payment_records/${encodeURIComponent(id)}/report_payment_attempt_guaranteed`, params, options);
  }
  /**
   * Report informational updates on the specified Payment Record.
   */
  reportPaymentAttemptInformational(id, params, options) {
    return this._makeRequest("POST", `/v1/payment_records/${encodeURIComponent(id)}/report_payment_attempt_informational`, params, options);
  }
  /**
   * Report that the most recent payment attempt on the specified Payment Record
   *  was refunded.
   */
  reportRefund(id, params, options) {
    return this._makeRequest("POST", `/v1/payment_records/${encodeURIComponent(id)}/report_refund`, params, options);
  }
  /**
   * Report a new Payment Record. You may report a Payment Record as it is
   *  initialized and later report updates through the other report_* methods, or report Payment
   *  Records in a terminal state directly, through this method.
   */
  reportPayment(params, options) {
    return this._makeRequest("POST", "/v1/payment_records/report_payment", params, options);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/Payouts.js
var PayoutResource = class extends StripeResource {
  /**
   * Returns a list of existing payouts sent to third-party bank accounts or payouts that Stripe sent to you. The payouts return in sorted order, with the most recently created payouts appearing first.
   */
  list(params, options) {
    return this._makeRequest("GET", "/v1/payouts", params, options, {
      methodType: "list"
    });
  }
  /**
   * To send funds to your own bank account, create a new payout object. Your [Stripe balance](https://docs.stripe.com/api#balance) must cover the payout amount. If it doesn't, you receive an “Insufficient Funds” error.
   *
   * If your API key is in test mode, money won't actually be sent, though every other action occurs as if you're in live mode.
   *
   * If you create a manual payout on a Stripe account that uses multiple payment source types, you need to specify the source type balance that the payout draws from. The [balance object](https://docs.stripe.com/api/balances/object) details available and pending amounts by source type.
   */
  create(params, options) {
    return this._makeRequest("POST", "/v1/payouts", params, options);
  }
  /**
   * Retrieves the details of an existing payout. Supply the unique payout ID from either a payout creation request or the payout list. Stripe returns the corresponding payout information.
   */
  retrieve(id, params, options) {
    return this._makeRequest("GET", `/v1/payouts/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * Updates the specified payout by setting the values of the parameters you pass. We don't change parameters that you don't provide. This request only accepts the metadata as arguments.
   */
  update(id, params, options) {
    return this._makeRequest("POST", `/v1/payouts/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * You can cancel a previously created payout if its status is pending. Stripe refunds the funds to your available balance. You can't cancel automatic Stripe payouts.
   */
  cancel(id, params, options) {
    return this._makeRequest("POST", `/v1/payouts/${encodeURIComponent(id)}/cancel`, params, options);
  }
  /**
   * Reverses a payout by debiting the destination bank account. At this time, you can only reverse payouts for connected accounts to US and Canadian bank accounts. If the payout is manual and in the pending status, use /v1/payouts/:id/cancel instead.
   *
   * By requesting a reversal through /v1/payouts/:id/reverse, you confirm that the authorized signatory of the selected bank account authorizes the debit on the bank account and that no other authorization is required.
   */
  reverse(id, params, options) {
    return this._makeRequest("POST", `/v1/payouts/${encodeURIComponent(id)}/reverse`, params, options);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/Plans.js
var PlanResource = class extends StripeResource {
  /**
   * Deleting plans means new subscribers can't be added. Existing subscribers aren't affected.
   */
  del(id, params, options) {
    return this._makeRequest("DELETE", `/v1/plans/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * Retrieves the plan with the given ID.
   */
  retrieve(id, params, options) {
    return this._makeRequest("GET", `/v1/plans/${encodeURIComponent(id)}`, params, options, {
      responseSchema: {
        kind: "object",
        fields: {
          amount_decimal: { kind: "nullable", inner: { kind: "decimal_string" } },
          tiers: {
            kind: "array",
            element: {
              kind: "object",
              fields: {
                flat_amount_decimal: {
                  kind: "nullable",
                  inner: { kind: "decimal_string" }
                },
                unit_amount_decimal: {
                  kind: "nullable",
                  inner: { kind: "decimal_string" }
                }
              }
            }
          }
        }
      }
    });
  }
  /**
   * Updates the specified plan by setting the values of the parameters passed. Any parameters not provided are left unchanged. By design, you cannot change a plan's ID, amount, currency, or billing cycle.
   */
  update(id, params, options) {
    return this._makeRequest("POST", `/v1/plans/${encodeURIComponent(id)}`, params, options, {
      responseSchema: {
        kind: "object",
        fields: {
          amount_decimal: { kind: "nullable", inner: { kind: "decimal_string" } },
          tiers: {
            kind: "array",
            element: {
              kind: "object",
              fields: {
                flat_amount_decimal: {
                  kind: "nullable",
                  inner: { kind: "decimal_string" }
                },
                unit_amount_decimal: {
                  kind: "nullable",
                  inner: { kind: "decimal_string" }
                }
              }
            }
          }
        }
      }
    });
  }
  /**
   * Returns a list of your plans.
   */
  list(params, options) {
    return this._makeRequest("GET", "/v1/plans", params, options, {
      methodType: "list",
      responseSchema: {
        kind: "object",
        fields: {
          data: {
            kind: "array",
            element: {
              kind: "object",
              fields: {
                amount_decimal: {
                  kind: "nullable",
                  inner: { kind: "decimal_string" }
                },
                tiers: {
                  kind: "array",
                  element: {
                    kind: "object",
                    fields: {
                      flat_amount_decimal: {
                        kind: "nullable",
                        inner: { kind: "decimal_string" }
                      },
                      unit_amount_decimal: {
                        kind: "nullable",
                        inner: { kind: "decimal_string" }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
  }
  /**
   * You can now model subscriptions more flexibly using the [Prices API](https://docs.stripe.com/api#prices). It replaces the Plans API and is backwards compatible to simplify your migration.
   */
  create(params, options) {
    return this._makeRequest("POST", "/v1/plans", params, options, {
      requestSchema: {
        kind: "object",
        fields: {
          amount_decimal: { kind: "decimal_string" },
          tiers: {
            kind: "array",
            element: {
              kind: "object",
              fields: {
                flat_amount_decimal: { kind: "decimal_string" },
                unit_amount_decimal: { kind: "decimal_string" }
              }
            }
          }
        }
      },
      responseSchema: {
        kind: "object",
        fields: {
          amount_decimal: { kind: "nullable", inner: { kind: "decimal_string" } },
          tiers: {
            kind: "array",
            element: {
              kind: "object",
              fields: {
                flat_amount_decimal: {
                  kind: "nullable",
                  inner: { kind: "decimal_string" }
                },
                unit_amount_decimal: {
                  kind: "nullable",
                  inner: { kind: "decimal_string" }
                }
              }
            }
          }
        }
      }
    });
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/Prices.js
var PriceResource = class extends StripeResource {
  /**
   * Returns a list of your active prices, excluding [inline prices](https://docs.stripe.com/docs/products-prices/pricing-models#inline-pricing). For the list of inactive prices, set active to false.
   */
  list(params, options) {
    return this._makeRequest("GET", "/v1/prices", params, options, {
      methodType: "list",
      responseSchema: {
        kind: "object",
        fields: {
          data: {
            kind: "array",
            element: {
              kind: "object",
              fields: {
                currency_options: {
                  kind: "array",
                  element: {
                    kind: "object",
                    fields: {
                      tiers: {
                        kind: "array",
                        element: {
                          kind: "object",
                          fields: {
                            flat_amount_decimal: {
                              kind: "nullable",
                              inner: { kind: "decimal_string" }
                            },
                            unit_amount_decimal: {
                              kind: "nullable",
                              inner: { kind: "decimal_string" }
                            }
                          }
                        }
                      },
                      unit_amount_decimal: {
                        kind: "nullable",
                        inner: { kind: "decimal_string" }
                      }
                    }
                  }
                },
                tiers: {
                  kind: "array",
                  element: {
                    kind: "object",
                    fields: {
                      flat_amount_decimal: {
                        kind: "nullable",
                        inner: { kind: "decimal_string" }
                      },
                      unit_amount_decimal: {
                        kind: "nullable",
                        inner: { kind: "decimal_string" }
                      }
                    }
                  }
                },
                unit_amount_decimal: {
                  kind: "nullable",
                  inner: { kind: "decimal_string" }
                }
              }
            }
          }
        }
      }
    });
  }
  /**
   * Creates a new [Price for an existing <a href="https://docs.stripe.com/api/products">Product](https://docs.stripe.com/api/prices). The Price can be recurring or one-time.
   */
  create(params, options) {
    return this._makeRequest("POST", "/v1/prices", params, options, {
      requestSchema: {
        kind: "object",
        fields: {
          currency_options: {
            kind: "array",
            element: {
              kind: "object",
              fields: {
                tiers: {
                  kind: "array",
                  element: {
                    kind: "object",
                    fields: {
                      flat_amount_decimal: { kind: "decimal_string" },
                      unit_amount_decimal: { kind: "decimal_string" }
                    }
                  }
                },
                unit_amount_decimal: { kind: "decimal_string" }
              }
            }
          },
          tiers: {
            kind: "array",
            element: {
              kind: "object",
              fields: {
                flat_amount_decimal: { kind: "decimal_string" },
                unit_amount_decimal: { kind: "decimal_string" }
              }
            }
          },
          unit_amount_decimal: { kind: "decimal_string" }
        }
      },
      responseSchema: {
        kind: "object",
        fields: {
          currency_options: {
            kind: "array",
            element: {
              kind: "object",
              fields: {
                tiers: {
                  kind: "array",
                  element: {
                    kind: "object",
                    fields: {
                      flat_amount_decimal: {
                        kind: "nullable",
                        inner: { kind: "decimal_string" }
                      },
                      unit_amount_decimal: {
                        kind: "nullable",
                        inner: { kind: "decimal_string" }
                      }
                    }
                  }
                },
                unit_amount_decimal: {
                  kind: "nullable",
                  inner: { kind: "decimal_string" }
                }
              }
            }
          },
          tiers: {
            kind: "array",
            element: {
              kind: "object",
              fields: {
                flat_amount_decimal: {
                  kind: "nullable",
                  inner: { kind: "decimal_string" }
                },
                unit_amount_decimal: {
                  kind: "nullable",
                  inner: { kind: "decimal_string" }
                }
              }
            }
          },
          unit_amount_decimal: {
            kind: "nullable",
            inner: { kind: "decimal_string" }
          }
        }
      }
    });
  }
  /**
   * Retrieves the price with the given ID.
   */
  retrieve(id, params, options) {
    return this._makeRequest("GET", `/v1/prices/${encodeURIComponent(id)}`, params, options, {
      responseSchema: {
        kind: "object",
        fields: {
          currency_options: {
            kind: "array",
            element: {
              kind: "object",
              fields: {
                tiers: {
                  kind: "array",
                  element: {
                    kind: "object",
                    fields: {
                      flat_amount_decimal: {
                        kind: "nullable",
                        inner: { kind: "decimal_string" }
                      },
                      unit_amount_decimal: {
                        kind: "nullable",
                        inner: { kind: "decimal_string" }
                      }
                    }
                  }
                },
                unit_amount_decimal: {
                  kind: "nullable",
                  inner: { kind: "decimal_string" }
                }
              }
            }
          },
          tiers: {
            kind: "array",
            element: {
              kind: "object",
              fields: {
                flat_amount_decimal: {
                  kind: "nullable",
                  inner: { kind: "decimal_string" }
                },
                unit_amount_decimal: {
                  kind: "nullable",
                  inner: { kind: "decimal_string" }
                }
              }
            }
          },
          unit_amount_decimal: {
            kind: "nullable",
            inner: { kind: "decimal_string" }
          }
        }
      }
    });
  }
  /**
   * Updates the specified price by setting the values of the parameters passed. Any parameters not provided are left unchanged.
   */
  update(id, params, options) {
    return this._makeRequest("POST", `/v1/prices/${encodeURIComponent(id)}`, params, options, {
      responseSchema: {
        kind: "object",
        fields: {
          currency_options: {
            kind: "array",
            element: {
              kind: "object",
              fields: {
                tiers: {
                  kind: "array",
                  element: {
                    kind: "object",
                    fields: {
                      flat_amount_decimal: {
                        kind: "nullable",
                        inner: { kind: "decimal_string" }
                      },
                      unit_amount_decimal: {
                        kind: "nullable",
                        inner: { kind: "decimal_string" }
                      }
                    }
                  }
                },
                unit_amount_decimal: {
                  kind: "nullable",
                  inner: { kind: "decimal_string" }
                }
              }
            }
          },
          tiers: {
            kind: "array",
            element: {
              kind: "object",
              fields: {
                flat_amount_decimal: {
                  kind: "nullable",
                  inner: { kind: "decimal_string" }
                },
                unit_amount_decimal: {
                  kind: "nullable",
                  inner: { kind: "decimal_string" }
                }
              }
            }
          },
          unit_amount_decimal: {
            kind: "nullable",
            inner: { kind: "decimal_string" }
          }
        }
      }
    });
  }
  /**
   * Search for prices you've previously created using Stripe's [Search Query Language](https://docs.stripe.com/docs/search#search-query-language).
   * Don't use search in read-after-write flows where strict consistency is necessary. Under normal operating
   * conditions, data is searchable in less than a minute. Occasionally, propagation of new or updated data can be up
   * to an hour behind during outages. Search functionality is not available to merchants in India.
   */
  search(params, options) {
    return this._makeRequest("GET", "/v1/prices/search", params, options, {
      methodType: "search",
      responseSchema: {
        kind: "object",
        fields: {
          data: {
            kind: "array",
            element: {
              kind: "object",
              fields: {
                currency_options: {
                  kind: "array",
                  element: {
                    kind: "object",
                    fields: {
                      tiers: {
                        kind: "array",
                        element: {
                          kind: "object",
                          fields: {
                            flat_amount_decimal: {
                              kind: "nullable",
                              inner: { kind: "decimal_string" }
                            },
                            unit_amount_decimal: {
                              kind: "nullable",
                              inner: { kind: "decimal_string" }
                            }
                          }
                        }
                      },
                      unit_amount_decimal: {
                        kind: "nullable",
                        inner: { kind: "decimal_string" }
                      }
                    }
                  }
                },
                tiers: {
                  kind: "array",
                  element: {
                    kind: "object",
                    fields: {
                      flat_amount_decimal: {
                        kind: "nullable",
                        inner: { kind: "decimal_string" }
                      },
                      unit_amount_decimal: {
                        kind: "nullable",
                        inner: { kind: "decimal_string" }
                      }
                    }
                  }
                },
                unit_amount_decimal: {
                  kind: "nullable",
                  inner: { kind: "decimal_string" }
                }
              }
            }
          }
        }
      }
    });
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/Products.js
var ProductResource2 = class extends StripeResource {
  /**
   * Delete a product. Deleting a product is only possible if it has no prices associated with it. Additionally, deleting a product with type=good is only possible if it has no SKUs associated with it.
   */
  del(id, params, options) {
    return this._makeRequest("DELETE", `/v1/products/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * Retrieves the details of an existing product. Supply the unique product ID from either a product creation request or the product list, and Stripe will return the corresponding product information.
   */
  retrieve(id, params, options) {
    return this._makeRequest("GET", `/v1/products/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * Updates the specific product by setting the values of the parameters passed. Any parameters not provided will be left unchanged.
   */
  update(id, params, options) {
    return this._makeRequest("POST", `/v1/products/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * Returns a list of your products. The products are returned sorted by creation date, with the most recently created products appearing first.
   */
  list(params, options) {
    return this._makeRequest("GET", "/v1/products", params, options, {
      methodType: "list"
    });
  }
  /**
   * Creates a new product object.
   */
  create(params, options) {
    return this._makeRequest("POST", "/v1/products", params, options, {
      requestSchema: {
        kind: "object",
        fields: {
          default_price_data: {
            kind: "object",
            fields: {
              currency_options: {
                kind: "array",
                element: {
                  kind: "object",
                  fields: {
                    tiers: {
                      kind: "array",
                      element: {
                        kind: "object",
                        fields: {
                          flat_amount_decimal: { kind: "decimal_string" },
                          unit_amount_decimal: { kind: "decimal_string" }
                        }
                      }
                    },
                    unit_amount_decimal: { kind: "decimal_string" }
                  }
                }
              },
              unit_amount_decimal: { kind: "decimal_string" }
            }
          }
        }
      }
    });
  }
  /**
   * Search for products you've previously created using Stripe's [Search Query Language](https://docs.stripe.com/docs/search#search-query-language).
   * Don't use search in read-after-write flows where strict consistency is necessary. Under normal operating
   * conditions, data is searchable in less than a minute. Occasionally, propagation of new or updated data can be up
   * to an hour behind during outages. Search functionality is not available to merchants in India.
   */
  search(params, options) {
    return this._makeRequest("GET", "/v1/products/search", params, options, {
      methodType: "search"
    });
  }
  /**
   * Deletes the feature attachment to a product
   */
  deleteFeature(productId, id, params, options) {
    return this._makeRequest("DELETE", `/v1/products/${encodeURIComponent(productId)}/features/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * Retrieves a product_feature, which represents a feature attachment to a product
   */
  retrieveFeature(productId, id, params, options) {
    return this._makeRequest("GET", `/v1/products/${encodeURIComponent(productId)}/features/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * Retrieve a list of features for a product
   */
  listFeatures(id, params, options) {
    return this._makeRequest("GET", `/v1/products/${encodeURIComponent(id)}/features`, params, options, {
      methodType: "list"
    });
  }
  /**
   * Creates a product_feature, which represents a feature attachment to a product
   */
  createFeature(id, params, options) {
    return this._makeRequest("POST", `/v1/products/${encodeURIComponent(id)}/features`, params, options);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/PromotionCodes.js
var PromotionCodeResource = class extends StripeResource {
  /**
   * Returns a list of your promotion codes.
   */
  list(params, options) {
    return this._makeRequest("GET", "/v1/promotion_codes", params, options, {
      methodType: "list"
    });
  }
  /**
   * A promotion code points to an underlying promotion. You can optionally restrict the code to a specific customer, redemption limit, and expiration date.
   */
  create(params, options) {
    return this._makeRequest("POST", "/v1/promotion_codes", params, options);
  }
  /**
   * Retrieves the promotion code with the given ID. In order to retrieve a promotion code by the customer-facing code use [list](https://docs.stripe.com/docs/api/promotion_codes/list) with the desired code.
   */
  retrieve(id, params, options) {
    return this._makeRequest("GET", `/v1/promotion_codes/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * Updates the specified promotion code by setting the values of the parameters passed. Most fields are, by design, not editable.
   */
  update(id, params, options) {
    return this._makeRequest("POST", `/v1/promotion_codes/${encodeURIComponent(id)}`, params, options);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/Quotes.js
var QuoteResource = class extends StripeResource {
  /**
   * Returns a list of your quotes.
   */
  list(params, options) {
    return this._makeRequest("GET", "/v1/quotes", params, options, {
      methodType: "list",
      responseSchema: {
        kind: "object",
        fields: {
          data: {
            kind: "array",
            element: {
              kind: "object",
              fields: {
                computed: {
                  kind: "object",
                  fields: {
                    upfront: {
                      kind: "object",
                      fields: {
                        line_items: {
                          kind: "object",
                          fields: {
                            data: {
                              kind: "array",
                              element: {
                                kind: "object",
                                fields: {
                                  price: {
                                    kind: "nullable",
                                    inner: {
                                      kind: "object",
                                      fields: {
                                        currency_options: {
                                          kind: "array",
                                          element: {
                                            kind: "object",
                                            fields: {
                                              tiers: {
                                                kind: "array",
                                                element: {
                                                  kind: "object",
                                                  fields: {
                                                    flat_amount_decimal: {
                                                      kind: "nullable",
                                                      inner: {
                                                        kind: "decimal_string"
                                                      }
                                                    },
                                                    unit_amount_decimal: {
                                                      kind: "nullable",
                                                      inner: {
                                                        kind: "decimal_string"
                                                      }
                                                    }
                                                  }
                                                }
                                              },
                                              unit_amount_decimal: {
                                                kind: "nullable",
                                                inner: { kind: "decimal_string" }
                                              }
                                            }
                                          }
                                        },
                                        tiers: {
                                          kind: "array",
                                          element: {
                                            kind: "object",
                                            fields: {
                                              flat_amount_decimal: {
                                                kind: "nullable",
                                                inner: { kind: "decimal_string" }
                                              },
                                              unit_amount_decimal: {
                                                kind: "nullable",
                                                inner: { kind: "decimal_string" }
                                              }
                                            }
                                          }
                                        },
                                        unit_amount_decimal: {
                                          kind: "nullable",
                                          inner: { kind: "decimal_string" }
                                        }
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
  }
  /**
   * A quote models prices and services for a customer. Default options for header, description, footer, and expires_at can be set in the dashboard via the [quote template](https://dashboard.stripe.com/settings/billing/quote).
   */
  create(params, options) {
    return this._makeRequest("POST", "/v1/quotes", params, options, {
      requestSchema: {
        kind: "object",
        fields: {
          line_items: {
            kind: "array",
            element: {
              kind: "object",
              fields: {
                price_data: {
                  kind: "object",
                  fields: { unit_amount_decimal: { kind: "decimal_string" } }
                }
              }
            }
          }
        }
      },
      responseSchema: {
        kind: "object",
        fields: {
          computed: {
            kind: "object",
            fields: {
              upfront: {
                kind: "object",
                fields: {
                  line_items: {
                    kind: "object",
                    fields: {
                      data: {
                        kind: "array",
                        element: {
                          kind: "object",
                          fields: {
                            price: {
                              kind: "nullable",
                              inner: {
                                kind: "object",
                                fields: {
                                  currency_options: {
                                    kind: "array",
                                    element: {
                                      kind: "object",
                                      fields: {
                                        tiers: {
                                          kind: "array",
                                          element: {
                                            kind: "object",
                                            fields: {
                                              flat_amount_decimal: {
                                                kind: "nullable",
                                                inner: { kind: "decimal_string" }
                                              },
                                              unit_amount_decimal: {
                                                kind: "nullable",
                                                inner: { kind: "decimal_string" }
                                              }
                                            }
                                          }
                                        },
                                        unit_amount_decimal: {
                                          kind: "nullable",
                                          inner: { kind: "decimal_string" }
                                        }
                                      }
                                    }
                                  },
                                  tiers: {
                                    kind: "array",
                                    element: {
                                      kind: "object",
                                      fields: {
                                        flat_amount_decimal: {
                                          kind: "nullable",
                                          inner: { kind: "decimal_string" }
                                        },
                                        unit_amount_decimal: {
                                          kind: "nullable",
                                          inner: { kind: "decimal_string" }
                                        }
                                      }
                                    }
                                  },
                                  unit_amount_decimal: {
                                    kind: "nullable",
                                    inner: { kind: "decimal_string" }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
  }
  /**
   * Retrieves the quote with the given ID.
   */
  retrieve(id, params, options) {
    return this._makeRequest("GET", `/v1/quotes/${encodeURIComponent(id)}`, params, options, {
      responseSchema: {
        kind: "object",
        fields: {
          computed: {
            kind: "object",
            fields: {
              upfront: {
                kind: "object",
                fields: {
                  line_items: {
                    kind: "object",
                    fields: {
                      data: {
                        kind: "array",
                        element: {
                          kind: "object",
                          fields: {
                            price: {
                              kind: "nullable",
                              inner: {
                                kind: "object",
                                fields: {
                                  currency_options: {
                                    kind: "array",
                                    element: {
                                      kind: "object",
                                      fields: {
                                        tiers: {
                                          kind: "array",
                                          element: {
                                            kind: "object",
                                            fields: {
                                              flat_amount_decimal: {
                                                kind: "nullable",
                                                inner: {
                                                  kind: "decimal_string"
                                                }
                                              },
                                              unit_amount_decimal: {
                                                kind: "nullable",
                                                inner: {
                                                  kind: "decimal_string"
                                                }
                                              }
                                            }
                                          }
                                        },
                                        unit_amount_decimal: {
                                          kind: "nullable",
                                          inner: { kind: "decimal_string" }
                                        }
                                      }
                                    }
                                  },
                                  tiers: {
                                    kind: "array",
                                    element: {
                                      kind: "object",
                                      fields: {
                                        flat_amount_decimal: {
                                          kind: "nullable",
                                          inner: { kind: "decimal_string" }
                                        },
                                        unit_amount_decimal: {
                                          kind: "nullable",
                                          inner: { kind: "decimal_string" }
                                        }
                                      }
                                    }
                                  },
                                  unit_amount_decimal: {
                                    kind: "nullable",
                                    inner: { kind: "decimal_string" }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
  }
  /**
   * A quote models prices and services for a customer.
   */
  update(id, params, options) {
    return this._makeRequest("POST", `/v1/quotes/${encodeURIComponent(id)}`, params, options, {
      requestSchema: {
        kind: "object",
        fields: {
          line_items: {
            kind: "array",
            element: {
              kind: "object",
              fields: {
                price_data: {
                  kind: "object",
                  fields: { unit_amount_decimal: { kind: "decimal_string" } }
                }
              }
            }
          }
        }
      },
      responseSchema: {
        kind: "object",
        fields: {
          computed: {
            kind: "object",
            fields: {
              upfront: {
                kind: "object",
                fields: {
                  line_items: {
                    kind: "object",
                    fields: {
                      data: {
                        kind: "array",
                        element: {
                          kind: "object",
                          fields: {
                            price: {
                              kind: "nullable",
                              inner: {
                                kind: "object",
                                fields: {
                                  currency_options: {
                                    kind: "array",
                                    element: {
                                      kind: "object",
                                      fields: {
                                        tiers: {
                                          kind: "array",
                                          element: {
                                            kind: "object",
                                            fields: {
                                              flat_amount_decimal: {
                                                kind: "nullable",
                                                inner: {
                                                  kind: "decimal_string"
                                                }
                                              },
                                              unit_amount_decimal: {
                                                kind: "nullable",
                                                inner: {
                                                  kind: "decimal_string"
                                                }
                                              }
                                            }
                                          }
                                        },
                                        unit_amount_decimal: {
                                          kind: "nullable",
                                          inner: { kind: "decimal_string" }
                                        }
                                      }
                                    }
                                  },
                                  tiers: {
                                    kind: "array",
                                    element: {
                                      kind: "object",
                                      fields: {
                                        flat_amount_decimal: {
                                          kind: "nullable",
                                          inner: { kind: "decimal_string" }
                                        },
                                        unit_amount_decimal: {
                                          kind: "nullable",
                                          inner: { kind: "decimal_string" }
                                        }
                                      }
                                    }
                                  },
                                  unit_amount_decimal: {
                                    kind: "nullable",
                                    inner: { kind: "decimal_string" }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
  }
  /**
   * Accepts the specified quote.
   */
  accept(id, params, options) {
    return this._makeRequest("POST", `/v1/quotes/${encodeURIComponent(id)}/accept`, params, options, {
      responseSchema: {
        kind: "object",
        fields: {
          computed: {
            kind: "object",
            fields: {
              upfront: {
                kind: "object",
                fields: {
                  line_items: {
                    kind: "object",
                    fields: {
                      data: {
                        kind: "array",
                        element: {
                          kind: "object",
                          fields: {
                            price: {
                              kind: "nullable",
                              inner: {
                                kind: "object",
                                fields: {
                                  currency_options: {
                                    kind: "array",
                                    element: {
                                      kind: "object",
                                      fields: {
                                        tiers: {
                                          kind: "array",
                                          element: {
                                            kind: "object",
                                            fields: {
                                              flat_amount_decimal: {
                                                kind: "nullable",
                                                inner: {
                                                  kind: "decimal_string"
                                                }
                                              },
                                              unit_amount_decimal: {
                                                kind: "nullable",
                                                inner: {
                                                  kind: "decimal_string"
                                                }
                                              }
                                            }
                                          }
                                        },
                                        unit_amount_decimal: {
                                          kind: "nullable",
                                          inner: { kind: "decimal_string" }
                                        }
                                      }
                                    }
                                  },
                                  tiers: {
                                    kind: "array",
                                    element: {
                                      kind: "object",
                                      fields: {
                                        flat_amount_decimal: {
                                          kind: "nullable",
                                          inner: { kind: "decimal_string" }
                                        },
                                        unit_amount_decimal: {
                                          kind: "nullable",
                                          inner: { kind: "decimal_string" }
                                        }
                                      }
                                    }
                                  },
                                  unit_amount_decimal: {
                                    kind: "nullable",
                                    inner: { kind: "decimal_string" }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
  }
  /**
   * Cancels the quote.
   */
  cancel(id, params, options) {
    return this._makeRequest("POST", `/v1/quotes/${encodeURIComponent(id)}/cancel`, params, options, {
      responseSchema: {
        kind: "object",
        fields: {
          computed: {
            kind: "object",
            fields: {
              upfront: {
                kind: "object",
                fields: {
                  line_items: {
                    kind: "object",
                    fields: {
                      data: {
                        kind: "array",
                        element: {
                          kind: "object",
                          fields: {
                            price: {
                              kind: "nullable",
                              inner: {
                                kind: "object",
                                fields: {
                                  currency_options: {
                                    kind: "array",
                                    element: {
                                      kind: "object",
                                      fields: {
                                        tiers: {
                                          kind: "array",
                                          element: {
                                            kind: "object",
                                            fields: {
                                              flat_amount_decimal: {
                                                kind: "nullable",
                                                inner: {
                                                  kind: "decimal_string"
                                                }
                                              },
                                              unit_amount_decimal: {
                                                kind: "nullable",
                                                inner: {
                                                  kind: "decimal_string"
                                                }
                                              }
                                            }
                                          }
                                        },
                                        unit_amount_decimal: {
                                          kind: "nullable",
                                          inner: { kind: "decimal_string" }
                                        }
                                      }
                                    }
                                  },
                                  tiers: {
                                    kind: "array",
                                    element: {
                                      kind: "object",
                                      fields: {
                                        flat_amount_decimal: {
                                          kind: "nullable",
                                          inner: { kind: "decimal_string" }
                                        },
                                        unit_amount_decimal: {
                                          kind: "nullable",
                                          inner: { kind: "decimal_string" }
                                        }
                                      }
                                    }
                                  },
                                  unit_amount_decimal: {
                                    kind: "nullable",
                                    inner: { kind: "decimal_string" }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
  }
  /**
   * Finalizes the quote.
   */
  finalizeQuote(id, params, options) {
    return this._makeRequest("POST", `/v1/quotes/${encodeURIComponent(id)}/finalize`, params, options, {
      responseSchema: {
        kind: "object",
        fields: {
          computed: {
            kind: "object",
            fields: {
              upfront: {
                kind: "object",
                fields: {
                  line_items: {
                    kind: "object",
                    fields: {
                      data: {
                        kind: "array",
                        element: {
                          kind: "object",
                          fields: {
                            price: {
                              kind: "nullable",
                              inner: {
                                kind: "object",
                                fields: {
                                  currency_options: {
                                    kind: "array",
                                    element: {
                                      kind: "object",
                                      fields: {
                                        tiers: {
                                          kind: "array",
                                          element: {
                                            kind: "object",
                                            fields: {
                                              flat_amount_decimal: {
                                                kind: "nullable",
                                                inner: {
                                                  kind: "decimal_string"
                                                }
                                              },
                                              unit_amount_decimal: {
                                                kind: "nullable",
                                                inner: {
                                                  kind: "decimal_string"
                                                }
                                              }
                                            }
                                          }
                                        },
                                        unit_amount_decimal: {
                                          kind: "nullable",
                                          inner: { kind: "decimal_string" }
                                        }
                                      }
                                    }
                                  },
                                  tiers: {
                                    kind: "array",
                                    element: {
                                      kind: "object",
                                      fields: {
                                        flat_amount_decimal: {
                                          kind: "nullable",
                                          inner: { kind: "decimal_string" }
                                        },
                                        unit_amount_decimal: {
                                          kind: "nullable",
                                          inner: { kind: "decimal_string" }
                                        }
                                      }
                                    }
                                  },
                                  unit_amount_decimal: {
                                    kind: "nullable",
                                    inner: { kind: "decimal_string" }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
  }
  /**
   * Download the PDF for a finalized quote. Explanation for special handling can be found [here](https://docs.stripe.com/quotes/overview#quote_pdf)
   */
  pdf(id, params, options) {
    return this._makeRequest("GET", `/v1/quotes/${encodeURIComponent(id)}/pdf`, params, options, {
      apiBase: "files",
      streaming: true
    });
  }
  /**
   * When retrieving a quote, there is an includable [computed.upfront.line_items](https://stripe.com/docs/api/quotes/object#quote_object-computed-upfront-line_items) property containing the first handful of those items. There is also a URL where you can retrieve the full (paginated) list of upfront line items.
   */
  listComputedUpfrontLineItems(id, params, options) {
    return this._makeRequest("GET", `/v1/quotes/${encodeURIComponent(id)}/computed_upfront_line_items`, params, options, {
      methodType: "list",
      responseSchema: {
        kind: "object",
        fields: {
          data: {
            kind: "array",
            element: {
              kind: "object",
              fields: {
                price: {
                  kind: "nullable",
                  inner: {
                    kind: "object",
                    fields: {
                      currency_options: {
                        kind: "array",
                        element: {
                          kind: "object",
                          fields: {
                            tiers: {
                              kind: "array",
                              element: {
                                kind: "object",
                                fields: {
                                  flat_amount_decimal: {
                                    kind: "nullable",
                                    inner: { kind: "decimal_string" }
                                  },
                                  unit_amount_decimal: {
                                    kind: "nullable",
                                    inner: { kind: "decimal_string" }
                                  }
                                }
                              }
                            },
                            unit_amount_decimal: {
                              kind: "nullable",
                              inner: { kind: "decimal_string" }
                            }
                          }
                        }
                      },
                      tiers: {
                        kind: "array",
                        element: {
                          kind: "object",
                          fields: {
                            flat_amount_decimal: {
                              kind: "nullable",
                              inner: { kind: "decimal_string" }
                            },
                            unit_amount_decimal: {
                              kind: "nullable",
                              inner: { kind: "decimal_string" }
                            }
                          }
                        }
                      },
                      unit_amount_decimal: {
                        kind: "nullable",
                        inner: { kind: "decimal_string" }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
  }
  /**
   * When retrieving a quote, there is an includable line_items property containing the first handful of those items. There is also a URL where you can retrieve the full (paginated) list of line items.
   */
  listLineItems(id, params, options) {
    return this._makeRequest("GET", `/v1/quotes/${encodeURIComponent(id)}/line_items`, params, options, {
      methodType: "list",
      responseSchema: {
        kind: "object",
        fields: {
          data: {
            kind: "array",
            element: {
              kind: "object",
              fields: {
                price: {
                  kind: "nullable",
                  inner: {
                    kind: "object",
                    fields: {
                      currency_options: {
                        kind: "array",
                        element: {
                          kind: "object",
                          fields: {
                            tiers: {
                              kind: "array",
                              element: {
                                kind: "object",
                                fields: {
                                  flat_amount_decimal: {
                                    kind: "nullable",
                                    inner: { kind: "decimal_string" }
                                  },
                                  unit_amount_decimal: {
                                    kind: "nullable",
                                    inner: { kind: "decimal_string" }
                                  }
                                }
                              }
                            },
                            unit_amount_decimal: {
                              kind: "nullable",
                              inner: { kind: "decimal_string" }
                            }
                          }
                        }
                      },
                      tiers: {
                        kind: "array",
                        element: {
                          kind: "object",
                          fields: {
                            flat_amount_decimal: {
                              kind: "nullable",
                              inner: { kind: "decimal_string" }
                            },
                            unit_amount_decimal: {
                              kind: "nullable",
                              inner: { kind: "decimal_string" }
                            }
                          }
                        }
                      },
                      unit_amount_decimal: {
                        kind: "nullable",
                        inner: { kind: "decimal_string" }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/Refunds.js
var RefundResource2 = class extends StripeResource {
  /**
   * Returns a list of all refunds you created. We return the refunds in sorted order, with the most recent refunds appearing first. The 10 most recent refunds are always available by default on the Charge object.
   */
  list(params, options) {
    return this._makeRequest("GET", "/v1/refunds", params, options, {
      methodType: "list"
    });
  }
  /**
   * When you create a new refund, you must specify a Charge or a PaymentIntent object on which to create it.
   *
   * Creating a new refund will refund a charge that has previously been created but not yet refunded.
   * Funds will be refunded to the credit or debit card that was originally charged.
   *
   * You can optionally refund only part of a charge.
   * You can do so multiple times, until the entire charge has been refunded.
   *
   * Once entirely refunded, a charge can't be refunded again.
   * This method will raise an error when called on an already-refunded charge,
   * or when trying to refund more money than is left on a charge.
   */
  create(params, options) {
    return this._makeRequest("POST", "/v1/refunds", params, options);
  }
  /**
   * Retrieves the details of an existing refund.
   */
  retrieve(id, params, options) {
    return this._makeRequest("GET", `/v1/refunds/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * Updates the refund that you specify by setting the values of the passed parameters. Any parameters that you don't provide remain unchanged.
   *
   * This request only accepts metadata as an argument.
   */
  update(id, params, options) {
    return this._makeRequest("POST", `/v1/refunds/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * Cancels a refund with a status of requires_action.
   *
   * You can't cancel refunds in other states. Only refunds for payment methods that require customer action can enter the requires_action state.
   */
  cancel(id, params, options) {
    return this._makeRequest("POST", `/v1/refunds/${encodeURIComponent(id)}/cancel`, params, options);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/Reviews.js
var ReviewResource = class extends StripeResource {
  /**
   * Returns a list of Review objects that have open set to true. The objects are sorted in descending order by creation date, with the most recently created object appearing first.
   */
  list(params, options) {
    return this._makeRequest("GET", "/v1/reviews", params, options, {
      methodType: "list"
    });
  }
  /**
   * Retrieves a Review object.
   */
  retrieve(id, params, options) {
    return this._makeRequest("GET", `/v1/reviews/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * Approves a Review object, closing it and removing it from the list of reviews.
   */
  approve(id, params, options) {
    return this._makeRequest("POST", `/v1/reviews/${encodeURIComponent(id)}/approve`, params, options);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/SetupAttempts.js
var SetupAttemptResource = class extends StripeResource {
  /**
   * Returns a list of SetupAttempts that associate with a provided SetupIntent.
   */
  list(params, options) {
    return this._makeRequest("GET", "/v1/setup_attempts", params, options, {
      methodType: "list"
    });
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/SetupIntents.js
var SetupIntentResource = class extends StripeResource {
  /**
   * Returns a list of SetupIntents.
   */
  list(params, options) {
    return this._makeRequest("GET", "/v1/setup_intents", params, options, {
      methodType: "list"
    });
  }
  /**
   * Creates a SetupIntent object.
   *
   * After you create the SetupIntent, attach a payment method and [confirm](https://docs.stripe.com/docs/api/setup_intents/confirm)
   * it to collect any required permissions to charge the payment method later.
   */
  create(params, options) {
    return this._makeRequest("POST", "/v1/setup_intents", params, options);
  }
  /**
   * Retrieves the details of a SetupIntent that has previously been created.
   *
   * Client-side retrieval using a publishable key is allowed when the client_secret is provided in the query string.
   *
   * When retrieved with a publishable key, only a subset of properties will be returned. Please refer to the [SetupIntent](https://docs.stripe.com/api#setup_intent_object) object reference for more details.
   */
  retrieve(id, params, options) {
    return this._makeRequest("GET", `/v1/setup_intents/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * Updates a SetupIntent object.
   */
  update(id, params, options) {
    return this._makeRequest("POST", `/v1/setup_intents/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * You can cancel a SetupIntent object when it's in one of these statuses: requires_payment_method, requires_confirmation, or requires_action.
   *
   * After you cancel it, setup is abandoned and any operations on the SetupIntent fail with an error. You can't cancel the SetupIntent for a Checkout Session. [Expire the Checkout Session](https://docs.stripe.com/docs/api/checkout/sessions/expire) instead.
   */
  cancel(id, params, options) {
    return this._makeRequest("POST", `/v1/setup_intents/${encodeURIComponent(id)}/cancel`, params, options);
  }
  /**
   * Confirm that your customer intends to set up the current or
   * provided payment method. For example, you would confirm a SetupIntent
   * when a customer hits the “Save” button on a payment method management
   * page on your website.
   *
   * If the selected payment method does not require any additional
   * steps from the customer, the SetupIntent will transition to the
   * succeeded status.
   *
   * Otherwise, it will transition to the requires_action status and
   * suggest additional actions via next_action. If setup fails,
   * the SetupIntent will transition to the
   * requires_payment_method status or the canceled status if the
   * confirmation limit is reached.
   */
  confirm(id, params, options) {
    return this._makeRequest("POST", `/v1/setup_intents/${encodeURIComponent(id)}/confirm`, params, options);
  }
  /**
   * Verifies microdeposits on a SetupIntent object.
   */
  verifyMicrodeposits(id, params, options) {
    return this._makeRequest("POST", `/v1/setup_intents/${encodeURIComponent(id)}/verify_microdeposits`, params, options);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/ShippingRates.js
var ShippingRateResource = class extends StripeResource {
  /**
   * Returns a list of your shipping rates.
   */
  list(params, options) {
    return this._makeRequest("GET", "/v1/shipping_rates", params, options, {
      methodType: "list"
    });
  }
  /**
   * Creates a new shipping rate object.
   */
  create(params, options) {
    return this._makeRequest("POST", "/v1/shipping_rates", params, options);
  }
  /**
   * Returns the shipping rate object with the given ID.
   */
  retrieve(id, params, options) {
    return this._makeRequest("GET", `/v1/shipping_rates/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * Updates an existing shipping rate object.
   */
  update(id, params, options) {
    return this._makeRequest("POST", `/v1/shipping_rates/${encodeURIComponent(id)}`, params, options);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/Sources.js
var SourceResource = class extends StripeResource {
  /**
   * Retrieves an existing source object. Supply the unique source ID from a source creation request and Stripe will return the corresponding up-to-date source object information.
   */
  retrieve(id, params, options) {
    return this._makeRequest("GET", `/v1/sources/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * Updates the specified source by setting the values of the parameters passed. Any parameters not provided will be left unchanged.
   *
   * This request accepts the metadata and owner as arguments. It is also possible to update type specific information for selected payment methods. Please refer to our [payment method guides](https://docs.stripe.com/docs/sources) for more detail.
   */
  update(id, params, options) {
    return this._makeRequest("POST", `/v1/sources/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * Creates a new source object.
   */
  create(params, options) {
    return this._makeRequest("POST", "/v1/sources", params, options);
  }
  /**
   * Verify a given source.
   */
  verify(id, params, options) {
    return this._makeRequest("POST", `/v1/sources/${encodeURIComponent(id)}/verify`, params, options);
  }
  /**
   * List source transactions for a given source.
   */
  listSourceTransactions(id, params, options) {
    return this._makeRequest("GET", `/v1/sources/${encodeURIComponent(id)}/source_transactions`, params, options, {
      methodType: "list"
    });
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/Subscriptions.js
var SubscriptionResource = class extends StripeResource {
  /**
   * Cancels a customer's subscription immediately. The customer won't be charged again for the subscription. After it's canceled, the subscription is largely immutable. You can still update its [metadata](https://docs.stripe.com/metadata) and cancellation_details.
   *
   * Any pending invoice items that you've created are still charged at the end of the period, unless manually [deleted](https://docs.stripe.com/api/invoiceitems/delete). If you've set the subscription to cancel at the end of the period, any pending prorations are also left in place and collected at the end of the period. But if the subscription is set to cancel immediately, pending prorations are removed if invoice_now and prorate are both set to false.
   *
   * By default, upon subscription cancellation, Stripe stops automatic collection of all finalized invoices for the customer. This is intended to prevent unexpected payment attempts after the customer has canceled a subscription. However, you can resume automatic collection of the invoices manually after subscription cancellation to have us proceed. Or, you could check for unpaid invoices before allowing the customer to cancel the subscription at all.
   */
  cancel(id, params, options) {
    return this._makeRequest("DELETE", `/v1/subscriptions/${encodeURIComponent(id)}`, params, options, {
      responseSchema: {
        kind: "object",
        fields: {
          items: {
            kind: "object",
            fields: {
              data: {
                kind: "array",
                element: {
                  kind: "object",
                  fields: {
                    plan: {
                      kind: "object",
                      fields: {
                        amount_decimal: {
                          kind: "nullable",
                          inner: { kind: "decimal_string" }
                        },
                        tiers: {
                          kind: "array",
                          element: {
                            kind: "object",
                            fields: {
                              flat_amount_decimal: {
                                kind: "nullable",
                                inner: { kind: "decimal_string" }
                              },
                              unit_amount_decimal: {
                                kind: "nullable",
                                inner: { kind: "decimal_string" }
                              }
                            }
                          }
                        }
                      }
                    },
                    price: {
                      kind: "object",
                      fields: {
                        currency_options: {
                          kind: "array",
                          element: {
                            kind: "object",
                            fields: {
                              tiers: {
                                kind: "array",
                                element: {
                                  kind: "object",
                                  fields: {
                                    flat_amount_decimal: {
                                      kind: "nullable",
                                      inner: { kind: "decimal_string" }
                                    },
                                    unit_amount_decimal: {
                                      kind: "nullable",
                                      inner: { kind: "decimal_string" }
                                    }
                                  }
                                }
                              },
                              unit_amount_decimal: {
                                kind: "nullable",
                                inner: { kind: "decimal_string" }
                              }
                            }
                          }
                        },
                        tiers: {
                          kind: "array",
                          element: {
                            kind: "object",
                            fields: {
                              flat_amount_decimal: {
                                kind: "nullable",
                                inner: { kind: "decimal_string" }
                              },
                              unit_amount_decimal: {
                                kind: "nullable",
                                inner: { kind: "decimal_string" }
                              }
                            }
                          }
                        },
                        unit_amount_decimal: {
                          kind: "nullable",
                          inner: { kind: "decimal_string" }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
  }
  /**
   * Retrieves the subscription with the given ID.
   */
  retrieve(id, params, options) {
    return this._makeRequest("GET", `/v1/subscriptions/${encodeURIComponent(id)}`, params, options, {
      responseSchema: {
        kind: "object",
        fields: {
          items: {
            kind: "object",
            fields: {
              data: {
                kind: "array",
                element: {
                  kind: "object",
                  fields: {
                    plan: {
                      kind: "object",
                      fields: {
                        amount_decimal: {
                          kind: "nullable",
                          inner: { kind: "decimal_string" }
                        },
                        tiers: {
                          kind: "array",
                          element: {
                            kind: "object",
                            fields: {
                              flat_amount_decimal: {
                                kind: "nullable",
                                inner: { kind: "decimal_string" }
                              },
                              unit_amount_decimal: {
                                kind: "nullable",
                                inner: { kind: "decimal_string" }
                              }
                            }
                          }
                        }
                      }
                    },
                    price: {
                      kind: "object",
                      fields: {
                        currency_options: {
                          kind: "array",
                          element: {
                            kind: "object",
                            fields: {
                              tiers: {
                                kind: "array",
                                element: {
                                  kind: "object",
                                  fields: {
                                    flat_amount_decimal: {
                                      kind: "nullable",
                                      inner: { kind: "decimal_string" }
                                    },
                                    unit_amount_decimal: {
                                      kind: "nullable",
                                      inner: { kind: "decimal_string" }
                                    }
                                  }
                                }
                              },
                              unit_amount_decimal: {
                                kind: "nullable",
                                inner: { kind: "decimal_string" }
                              }
                            }
                          }
                        },
                        tiers: {
                          kind: "array",
                          element: {
                            kind: "object",
                            fields: {
                              flat_amount_decimal: {
                                kind: "nullable",
                                inner: { kind: "decimal_string" }
                              },
                              unit_amount_decimal: {
                                kind: "nullable",
                                inner: { kind: "decimal_string" }
                              }
                            }
                          }
                        },
                        unit_amount_decimal: {
                          kind: "nullable",
                          inner: { kind: "decimal_string" }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
  }
  /**
   * Updates an existing subscription to match the specified parameters.
   * When changing prices or quantities, we optionally prorate the price we charge next month to make up for any price changes.
   * To preview how the proration is calculated, use the [create preview](https://docs.stripe.com/docs/api/invoices/create_preview) endpoint.
   *
   * By default, we prorate subscription changes. For example, if a customer signs up on May 1 for a 100 price, they'll be billed 100 immediately. If on May 15 they switch to a 200 price, then on June 1 they'll be billed 250 (200 for a renewal of her subscription, plus a 50 prorating adjustment for half of the previous month's 100 difference). Similarly, a downgrade generates a credit that is applied to the next invoice. We also prorate when you make quantity changes.
   *
   * Switching prices does not normally change the billing date or generate an immediate charge unless:
   *
   *
   * The billing interval is changed (for example, from monthly to yearly).
   * The subscription moves from free to paid.
   * A trial starts or ends.
   *
   *
   * In these cases, we apply a credit for the unused time on the previous price, immediately charge the customer using the new price, and reset the billing date. Learn about how [Stripe immediately attempts payment for subscription changes](https://docs.stripe.com/docs/billing/subscriptions/upgrade-downgrade#immediate-payment).
   *
   * If you want to charge for an upgrade immediately, pass proration_behavior as always_invoice to create prorations, automatically invoice the customer for those proration adjustments, and attempt to collect payment. If you pass create_prorations, the prorations are created but not automatically invoiced. If you want to bill the customer for the prorations before the subscription's renewal date, you need to manually [invoice the customer](https://docs.stripe.com/docs/api/invoices/create).
   *
   * If you don't want to prorate, set the proration_behavior option to none. With this option, the customer is billed 100 on May 1 and 200 on June 1. Similarly, if you set proration_behavior to none when switching between different billing intervals (for example, from monthly to yearly), we don't generate any credits for the old subscription's unused time. We still reset the billing date and bill immediately for the new subscription.
   *
   * Updating the quantity on a subscription many times in an hour may result in [rate limiting. If you need to bill for a frequently changing quantity, consider integrating <a href="/docs/billing/subscriptions/usage-based">usage-based billing](https://docs.stripe.com/docs/rate-limits) instead.
   */
  update(id, params, options) {
    return this._makeRequest("POST", `/v1/subscriptions/${encodeURIComponent(id)}`, params, options, {
      requestSchema: {
        kind: "object",
        fields: {
          add_invoice_items: {
            kind: "array",
            element: {
              kind: "object",
              fields: {
                price_data: {
                  kind: "object",
                  fields: { unit_amount_decimal: { kind: "decimal_string" } }
                }
              }
            }
          },
          items: {
            kind: "array",
            element: {
              kind: "object",
              fields: {
                price_data: {
                  kind: "object",
                  fields: { unit_amount_decimal: { kind: "decimal_string" } }
                }
              }
            }
          }
        }
      },
      responseSchema: {
        kind: "object",
        fields: {
          items: {
            kind: "object",
            fields: {
              data: {
                kind: "array",
                element: {
                  kind: "object",
                  fields: {
                    plan: {
                      kind: "object",
                      fields: {
                        amount_decimal: {
                          kind: "nullable",
                          inner: { kind: "decimal_string" }
                        },
                        tiers: {
                          kind: "array",
                          element: {
                            kind: "object",
                            fields: {
                              flat_amount_decimal: {
                                kind: "nullable",
                                inner: { kind: "decimal_string" }
                              },
                              unit_amount_decimal: {
                                kind: "nullable",
                                inner: { kind: "decimal_string" }
                              }
                            }
                          }
                        }
                      }
                    },
                    price: {
                      kind: "object",
                      fields: {
                        currency_options: {
                          kind: "array",
                          element: {
                            kind: "object",
                            fields: {
                              tiers: {
                                kind: "array",
                                element: {
                                  kind: "object",
                                  fields: {
                                    flat_amount_decimal: {
                                      kind: "nullable",
                                      inner: { kind: "decimal_string" }
                                    },
                                    unit_amount_decimal: {
                                      kind: "nullable",
                                      inner: { kind: "decimal_string" }
                                    }
                                  }
                                }
                              },
                              unit_amount_decimal: {
                                kind: "nullable",
                                inner: { kind: "decimal_string" }
                              }
                            }
                          }
                        },
                        tiers: {
                          kind: "array",
                          element: {
                            kind: "object",
                            fields: {
                              flat_amount_decimal: {
                                kind: "nullable",
                                inner: { kind: "decimal_string" }
                              },
                              unit_amount_decimal: {
                                kind: "nullable",
                                inner: { kind: "decimal_string" }
                              }
                            }
                          }
                        },
                        unit_amount_decimal: {
                          kind: "nullable",
                          inner: { kind: "decimal_string" }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
  }
  /**
   * Removes the currently applied discount on a subscription.
   */
  deleteDiscount(id, params, options) {
    return this._makeRequest("DELETE", `/v1/subscriptions/${encodeURIComponent(id)}/discount`, params, options);
  }
  /**
   * By default, returns a list of subscriptions that have not been canceled. In order to list canceled subscriptions, specify status=canceled.
   */
  list(params, options) {
    return this._makeRequest("GET", "/v1/subscriptions", params, options, {
      methodType: "list",
      responseSchema: {
        kind: "object",
        fields: {
          data: {
            kind: "array",
            element: {
              kind: "object",
              fields: {
                items: {
                  kind: "object",
                  fields: {
                    data: {
                      kind: "array",
                      element: {
                        kind: "object",
                        fields: {
                          plan: {
                            kind: "object",
                            fields: {
                              amount_decimal: {
                                kind: "nullable",
                                inner: { kind: "decimal_string" }
                              },
                              tiers: {
                                kind: "array",
                                element: {
                                  kind: "object",
                                  fields: {
                                    flat_amount_decimal: {
                                      kind: "nullable",
                                      inner: { kind: "decimal_string" }
                                    },
                                    unit_amount_decimal: {
                                      kind: "nullable",
                                      inner: { kind: "decimal_string" }
                                    }
                                  }
                                }
                              }
                            }
                          },
                          price: {
                            kind: "object",
                            fields: {
                              currency_options: {
                                kind: "array",
                                element: {
                                  kind: "object",
                                  fields: {
                                    tiers: {
                                      kind: "array",
                                      element: {
                                        kind: "object",
                                        fields: {
                                          flat_amount_decimal: {
                                            kind: "nullable",
                                            inner: { kind: "decimal_string" }
                                          },
                                          unit_amount_decimal: {
                                            kind: "nullable",
                                            inner: { kind: "decimal_string" }
                                          }
                                        }
                                      }
                                    },
                                    unit_amount_decimal: {
                                      kind: "nullable",
                                      inner: { kind: "decimal_string" }
                                    }
                                  }
                                }
                              },
                              tiers: {
                                kind: "array",
                                element: {
                                  kind: "object",
                                  fields: {
                                    flat_amount_decimal: {
                                      kind: "nullable",
                                      inner: { kind: "decimal_string" }
                                    },
                                    unit_amount_decimal: {
                                      kind: "nullable",
                                      inner: { kind: "decimal_string" }
                                    }
                                  }
                                }
                              },
                              unit_amount_decimal: {
                                kind: "nullable",
                                inner: { kind: "decimal_string" }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
  }
  /**
   * Creates a new subscription on an existing customer. Each customer can have up to 500 active or scheduled subscriptions.
   *
   * When you create a subscription with collection_method=charge_automatically, the first invoice is finalized as part of the request.
   * The payment_behavior parameter determines the exact behavior of the initial payment.
   *
   * To start subscriptions where the first invoice always begins in a draft status, use [subscription schedules](https://docs.stripe.com/docs/billing/subscriptions/subscription-schedules#managing) instead.
   * Schedules provide the flexibility to model more complex billing configurations that change over time.
   */
  create(params, options) {
    return this._makeRequest("POST", "/v1/subscriptions", params, options, {
      requestSchema: {
        kind: "object",
        fields: {
          add_invoice_items: {
            kind: "array",
            element: {
              kind: "object",
              fields: {
                price_data: {
                  kind: "object",
                  fields: { unit_amount_decimal: { kind: "decimal_string" } }
                }
              }
            }
          },
          items: {
            kind: "array",
            element: {
              kind: "object",
              fields: {
                price_data: {
                  kind: "object",
                  fields: { unit_amount_decimal: { kind: "decimal_string" } }
                }
              }
            }
          }
        }
      },
      responseSchema: {
        kind: "object",
        fields: {
          items: {
            kind: "object",
            fields: {
              data: {
                kind: "array",
                element: {
                  kind: "object",
                  fields: {
                    plan: {
                      kind: "object",
                      fields: {
                        amount_decimal: {
                          kind: "nullable",
                          inner: { kind: "decimal_string" }
                        },
                        tiers: {
                          kind: "array",
                          element: {
                            kind: "object",
                            fields: {
                              flat_amount_decimal: {
                                kind: "nullable",
                                inner: { kind: "decimal_string" }
                              },
                              unit_amount_decimal: {
                                kind: "nullable",
                                inner: { kind: "decimal_string" }
                              }
                            }
                          }
                        }
                      }
                    },
                    price: {
                      kind: "object",
                      fields: {
                        currency_options: {
                          kind: "array",
                          element: {
                            kind: "object",
                            fields: {
                              tiers: {
                                kind: "array",
                                element: {
                                  kind: "object",
                                  fields: {
                                    flat_amount_decimal: {
                                      kind: "nullable",
                                      inner: { kind: "decimal_string" }
                                    },
                                    unit_amount_decimal: {
                                      kind: "nullable",
                                      inner: { kind: "decimal_string" }
                                    }
                                  }
                                }
                              },
                              unit_amount_decimal: {
                                kind: "nullable",
                                inner: { kind: "decimal_string" }
                              }
                            }
                          }
                        },
                        tiers: {
                          kind: "array",
                          element: {
                            kind: "object",
                            fields: {
                              flat_amount_decimal: {
                                kind: "nullable",
                                inner: { kind: "decimal_string" }
                              },
                              unit_amount_decimal: {
                                kind: "nullable",
                                inner: { kind: "decimal_string" }
                              }
                            }
                          }
                        },
                        unit_amount_decimal: {
                          kind: "nullable",
                          inner: { kind: "decimal_string" }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
  }
  /**
   * Search for subscriptions you've previously created using Stripe's [Search Query Language](https://docs.stripe.com/docs/search#search-query-language).
   * Don't use search in read-after-write flows where strict consistency is necessary. Under normal operating
   * conditions, data is searchable in less than a minute. Occasionally, propagation of new or updated data can be up
   * to an hour behind during outages. Search functionality is not available to merchants in India.
   */
  search(params, options) {
    return this._makeRequest("GET", "/v1/subscriptions/search", params, options, {
      methodType: "search",
      responseSchema: {
        kind: "object",
        fields: {
          data: {
            kind: "array",
            element: {
              kind: "object",
              fields: {
                items: {
                  kind: "object",
                  fields: {
                    data: {
                      kind: "array",
                      element: {
                        kind: "object",
                        fields: {
                          plan: {
                            kind: "object",
                            fields: {
                              amount_decimal: {
                                kind: "nullable",
                                inner: { kind: "decimal_string" }
                              },
                              tiers: {
                                kind: "array",
                                element: {
                                  kind: "object",
                                  fields: {
                                    flat_amount_decimal: {
                                      kind: "nullable",
                                      inner: { kind: "decimal_string" }
                                    },
                                    unit_amount_decimal: {
                                      kind: "nullable",
                                      inner: { kind: "decimal_string" }
                                    }
                                  }
                                }
                              }
                            }
                          },
                          price: {
                            kind: "object",
                            fields: {
                              currency_options: {
                                kind: "array",
                                element: {
                                  kind: "object",
                                  fields: {
                                    tiers: {
                                      kind: "array",
                                      element: {
                                        kind: "object",
                                        fields: {
                                          flat_amount_decimal: {
                                            kind: "nullable",
                                            inner: { kind: "decimal_string" }
                                          },
                                          unit_amount_decimal: {
                                            kind: "nullable",
                                            inner: { kind: "decimal_string" }
                                          }
                                        }
                                      }
                                    },
                                    unit_amount_decimal: {
                                      kind: "nullable",
                                      inner: { kind: "decimal_string" }
                                    }
                                  }
                                }
                              },
                              tiers: {
                                kind: "array",
                                element: {
                                  kind: "object",
                                  fields: {
                                    flat_amount_decimal: {
                                      kind: "nullable",
                                      inner: { kind: "decimal_string" }
                                    },
                                    unit_amount_decimal: {
                                      kind: "nullable",
                                      inner: { kind: "decimal_string" }
                                    }
                                  }
                                }
                              },
                              unit_amount_decimal: {
                                kind: "nullable",
                                inner: { kind: "decimal_string" }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
  }
  /**
   * Upgrade the billing_mode of an existing subscription.
   */
  migrate(id, params, options) {
    return this._makeRequest("POST", `/v1/subscriptions/${encodeURIComponent(id)}/migrate`, params, options, {
      responseSchema: {
        kind: "object",
        fields: {
          items: {
            kind: "object",
            fields: {
              data: {
                kind: "array",
                element: {
                  kind: "object",
                  fields: {
                    plan: {
                      kind: "object",
                      fields: {
                        amount_decimal: {
                          kind: "nullable",
                          inner: { kind: "decimal_string" }
                        },
                        tiers: {
                          kind: "array",
                          element: {
                            kind: "object",
                            fields: {
                              flat_amount_decimal: {
                                kind: "nullable",
                                inner: { kind: "decimal_string" }
                              },
                              unit_amount_decimal: {
                                kind: "nullable",
                                inner: { kind: "decimal_string" }
                              }
                            }
                          }
                        }
                      }
                    },
                    price: {
                      kind: "object",
                      fields: {
                        currency_options: {
                          kind: "array",
                          element: {
                            kind: "object",
                            fields: {
                              tiers: {
                                kind: "array",
                                element: {
                                  kind: "object",
                                  fields: {
                                    flat_amount_decimal: {
                                      kind: "nullable",
                                      inner: { kind: "decimal_string" }
                                    },
                                    unit_amount_decimal: {
                                      kind: "nullable",
                                      inner: { kind: "decimal_string" }
                                    }
                                  }
                                }
                              },
                              unit_amount_decimal: {
                                kind: "nullable",
                                inner: { kind: "decimal_string" }
                              }
                            }
                          }
                        },
                        tiers: {
                          kind: "array",
                          element: {
                            kind: "object",
                            fields: {
                              flat_amount_decimal: {
                                kind: "nullable",
                                inner: { kind: "decimal_string" }
                              },
                              unit_amount_decimal: {
                                kind: "nullable",
                                inner: { kind: "decimal_string" }
                              }
                            }
                          }
                        },
                        unit_amount_decimal: {
                          kind: "nullable",
                          inner: { kind: "decimal_string" }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
  }
  /**
   * Initiates resumption of a paused subscription, optionally resetting the billing cycle anchor and creating prorations. Resume is only available for subscriptions that use charge_automatically collection. If Stripe doesn't generate a resumption invoice, the subscription becomes active immediately. When a resumption invoice is generated, Stripe finalizes it immediately. If the invoice is paid or marked uncollectible, the subscription becomes active. If the invoice is manually voided, the subscription stays paused. If there is no payment attempt within 23 hours, Stripe voids the invoice and the subscription stays paused. Learn more about [resuming subscriptions](https://docs.stripe.com/docs/billing/subscriptions/pause#resume-subscriptions).
   */
  resume(id, params, options) {
    return this._makeRequest("POST", `/v1/subscriptions/${encodeURIComponent(id)}/resume`, params, options, {
      responseSchema: {
        kind: "object",
        fields: {
          items: {
            kind: "object",
            fields: {
              data: {
                kind: "array",
                element: {
                  kind: "object",
                  fields: {
                    plan: {
                      kind: "object",
                      fields: {
                        amount_decimal: {
                          kind: "nullable",
                          inner: { kind: "decimal_string" }
                        },
                        tiers: {
                          kind: "array",
                          element: {
                            kind: "object",
                            fields: {
                              flat_amount_decimal: {
                                kind: "nullable",
                                inner: { kind: "decimal_string" }
                              },
                              unit_amount_decimal: {
                                kind: "nullable",
                                inner: { kind: "decimal_string" }
                              }
                            }
                          }
                        }
                      }
                    },
                    price: {
                      kind: "object",
                      fields: {
                        currency_options: {
                          kind: "array",
                          element: {
                            kind: "object",
                            fields: {
                              tiers: {
                                kind: "array",
                                element: {
                                  kind: "object",
                                  fields: {
                                    flat_amount_decimal: {
                                      kind: "nullable",
                                      inner: { kind: "decimal_string" }
                                    },
                                    unit_amount_decimal: {
                                      kind: "nullable",
                                      inner: { kind: "decimal_string" }
                                    }
                                  }
                                }
                              },
                              unit_amount_decimal: {
                                kind: "nullable",
                                inner: { kind: "decimal_string" }
                              }
                            }
                          }
                        },
                        tiers: {
                          kind: "array",
                          element: {
                            kind: "object",
                            fields: {
                              flat_amount_decimal: {
                                kind: "nullable",
                                inner: { kind: "decimal_string" }
                              },
                              unit_amount_decimal: {
                                kind: "nullable",
                                inner: { kind: "decimal_string" }
                              }
                            }
                          }
                        },
                        unit_amount_decimal: {
                          kind: "nullable",
                          inner: { kind: "decimal_string" }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/SubscriptionItems.js
var SubscriptionItemResource = class extends StripeResource {
  /**
   * Deletes an item from the subscription. Removing a subscription item from a subscription will not cancel the subscription.
   */
  del(id, params, options) {
    return this._makeRequest("DELETE", `/v1/subscription_items/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * Retrieves the subscription item with the given ID.
   */
  retrieve(id, params, options) {
    return this._makeRequest("GET", `/v1/subscription_items/${encodeURIComponent(id)}`, params, options, {
      responseSchema: {
        kind: "object",
        fields: {
          plan: {
            kind: "object",
            fields: {
              amount_decimal: {
                kind: "nullable",
                inner: { kind: "decimal_string" }
              },
              tiers: {
                kind: "array",
                element: {
                  kind: "object",
                  fields: {
                    flat_amount_decimal: {
                      kind: "nullable",
                      inner: { kind: "decimal_string" }
                    },
                    unit_amount_decimal: {
                      kind: "nullable",
                      inner: { kind: "decimal_string" }
                    }
                  }
                }
              }
            }
          },
          price: {
            kind: "object",
            fields: {
              currency_options: {
                kind: "array",
                element: {
                  kind: "object",
                  fields: {
                    tiers: {
                      kind: "array",
                      element: {
                        kind: "object",
                        fields: {
                          flat_amount_decimal: {
                            kind: "nullable",
                            inner: { kind: "decimal_string" }
                          },
                          unit_amount_decimal: {
                            kind: "nullable",
                            inner: { kind: "decimal_string" }
                          }
                        }
                      }
                    },
                    unit_amount_decimal: {
                      kind: "nullable",
                      inner: { kind: "decimal_string" }
                    }
                  }
                }
              },
              tiers: {
                kind: "array",
                element: {
                  kind: "object",
                  fields: {
                    flat_amount_decimal: {
                      kind: "nullable",
                      inner: { kind: "decimal_string" }
                    },
                    unit_amount_decimal: {
                      kind: "nullable",
                      inner: { kind: "decimal_string" }
                    }
                  }
                }
              },
              unit_amount_decimal: {
                kind: "nullable",
                inner: { kind: "decimal_string" }
              }
            }
          }
        }
      }
    });
  }
  /**
   * Updates the plan or quantity of an item on a current subscription.
   */
  update(id, params, options) {
    return this._makeRequest("POST", `/v1/subscription_items/${encodeURIComponent(id)}`, params, options, {
      requestSchema: {
        kind: "object",
        fields: {
          price_data: {
            kind: "object",
            fields: { unit_amount_decimal: { kind: "decimal_string" } }
          }
        }
      },
      responseSchema: {
        kind: "object",
        fields: {
          plan: {
            kind: "object",
            fields: {
              amount_decimal: {
                kind: "nullable",
                inner: { kind: "decimal_string" }
              },
              tiers: {
                kind: "array",
                element: {
                  kind: "object",
                  fields: {
                    flat_amount_decimal: {
                      kind: "nullable",
                      inner: { kind: "decimal_string" }
                    },
                    unit_amount_decimal: {
                      kind: "nullable",
                      inner: { kind: "decimal_string" }
                    }
                  }
                }
              }
            }
          },
          price: {
            kind: "object",
            fields: {
              currency_options: {
                kind: "array",
                element: {
                  kind: "object",
                  fields: {
                    tiers: {
                      kind: "array",
                      element: {
                        kind: "object",
                        fields: {
                          flat_amount_decimal: {
                            kind: "nullable",
                            inner: { kind: "decimal_string" }
                          },
                          unit_amount_decimal: {
                            kind: "nullable",
                            inner: { kind: "decimal_string" }
                          }
                        }
                      }
                    },
                    unit_amount_decimal: {
                      kind: "nullable",
                      inner: { kind: "decimal_string" }
                    }
                  }
                }
              },
              tiers: {
                kind: "array",
                element: {
                  kind: "object",
                  fields: {
                    flat_amount_decimal: {
                      kind: "nullable",
                      inner: { kind: "decimal_string" }
                    },
                    unit_amount_decimal: {
                      kind: "nullable",
                      inner: { kind: "decimal_string" }
                    }
                  }
                }
              },
              unit_amount_decimal: {
                kind: "nullable",
                inner: { kind: "decimal_string" }
              }
            }
          }
        }
      }
    });
  }
  /**
   * Returns a list of your subscription items for a given subscription.
   */
  list(params, options) {
    return this._makeRequest("GET", "/v1/subscription_items", params, options, {
      methodType: "list",
      responseSchema: {
        kind: "object",
        fields: {
          data: {
            kind: "array",
            element: {
              kind: "object",
              fields: {
                plan: {
                  kind: "object",
                  fields: {
                    amount_decimal: {
                      kind: "nullable",
                      inner: { kind: "decimal_string" }
                    },
                    tiers: {
                      kind: "array",
                      element: {
                        kind: "object",
                        fields: {
                          flat_amount_decimal: {
                            kind: "nullable",
                            inner: { kind: "decimal_string" }
                          },
                          unit_amount_decimal: {
                            kind: "nullable",
                            inner: { kind: "decimal_string" }
                          }
                        }
                      }
                    }
                  }
                },
                price: {
                  kind: "object",
                  fields: {
                    currency_options: {
                      kind: "array",
                      element: {
                        kind: "object",
                        fields: {
                          tiers: {
                            kind: "array",
                            element: {
                              kind: "object",
                              fields: {
                                flat_amount_decimal: {
                                  kind: "nullable",
                                  inner: { kind: "decimal_string" }
                                },
                                unit_amount_decimal: {
                                  kind: "nullable",
                                  inner: { kind: "decimal_string" }
                                }
                              }
                            }
                          },
                          unit_amount_decimal: {
                            kind: "nullable",
                            inner: { kind: "decimal_string" }
                          }
                        }
                      }
                    },
                    tiers: {
                      kind: "array",
                      element: {
                        kind: "object",
                        fields: {
                          flat_amount_decimal: {
                            kind: "nullable",
                            inner: { kind: "decimal_string" }
                          },
                          unit_amount_decimal: {
                            kind: "nullable",
                            inner: { kind: "decimal_string" }
                          }
                        }
                      }
                    },
                    unit_amount_decimal: {
                      kind: "nullable",
                      inner: { kind: "decimal_string" }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
  }
  /**
   * Adds a new item to an existing subscription. No existing items will be changed or replaced.
   */
  create(params, options) {
    return this._makeRequest("POST", "/v1/subscription_items", params, options, {
      requestSchema: {
        kind: "object",
        fields: {
          price_data: {
            kind: "object",
            fields: { unit_amount_decimal: { kind: "decimal_string" } }
          }
        }
      },
      responseSchema: {
        kind: "object",
        fields: {
          plan: {
            kind: "object",
            fields: {
              amount_decimal: {
                kind: "nullable",
                inner: { kind: "decimal_string" }
              },
              tiers: {
                kind: "array",
                element: {
                  kind: "object",
                  fields: {
                    flat_amount_decimal: {
                      kind: "nullable",
                      inner: { kind: "decimal_string" }
                    },
                    unit_amount_decimal: {
                      kind: "nullable",
                      inner: { kind: "decimal_string" }
                    }
                  }
                }
              }
            }
          },
          price: {
            kind: "object",
            fields: {
              currency_options: {
                kind: "array",
                element: {
                  kind: "object",
                  fields: {
                    tiers: {
                      kind: "array",
                      element: {
                        kind: "object",
                        fields: {
                          flat_amount_decimal: {
                            kind: "nullable",
                            inner: { kind: "decimal_string" }
                          },
                          unit_amount_decimal: {
                            kind: "nullable",
                            inner: { kind: "decimal_string" }
                          }
                        }
                      }
                    },
                    unit_amount_decimal: {
                      kind: "nullable",
                      inner: { kind: "decimal_string" }
                    }
                  }
                }
              },
              tiers: {
                kind: "array",
                element: {
                  kind: "object",
                  fields: {
                    flat_amount_decimal: {
                      kind: "nullable",
                      inner: { kind: "decimal_string" }
                    },
                    unit_amount_decimal: {
                      kind: "nullable",
                      inner: { kind: "decimal_string" }
                    }
                  }
                }
              },
              unit_amount_decimal: {
                kind: "nullable",
                inner: { kind: "decimal_string" }
              }
            }
          }
        }
      }
    });
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/SubscriptionSchedules.js
var SubscriptionScheduleResource = class extends StripeResource {
  /**
   * Retrieves the list of your subscription schedules.
   */
  list(params, options) {
    return this._makeRequest("GET", "/v1/subscription_schedules", params, options, {
      methodType: "list"
    });
  }
  /**
   * Creates a new subscription schedule object. Each customer can have up to 500 active or scheduled subscriptions.
   */
  create(params, options) {
    return this._makeRequest("POST", "/v1/subscription_schedules", params, options, {
      requestSchema: {
        kind: "object",
        fields: {
          phases: {
            kind: "array",
            element: {
              kind: "object",
              fields: {
                add_invoice_items: {
                  kind: "array",
                  element: {
                    kind: "object",
                    fields: {
                      price_data: {
                        kind: "object",
                        fields: {
                          unit_amount_decimal: { kind: "decimal_string" }
                        }
                      }
                    }
                  }
                },
                items: {
                  kind: "array",
                  element: {
                    kind: "object",
                    fields: {
                      price_data: {
                        kind: "object",
                        fields: {
                          unit_amount_decimal: { kind: "decimal_string" }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
  }
  /**
   * Retrieves the details of an existing subscription schedule. You only need to supply the unique subscription schedule identifier that was returned upon subscription schedule creation.
   */
  retrieve(id, params, options) {
    return this._makeRequest("GET", `/v1/subscription_schedules/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * Updates an existing subscription schedule.
   */
  update(id, params, options) {
    return this._makeRequest("POST", `/v1/subscription_schedules/${encodeURIComponent(id)}`, params, options, {
      requestSchema: {
        kind: "object",
        fields: {
          phases: {
            kind: "array",
            element: {
              kind: "object",
              fields: {
                add_invoice_items: {
                  kind: "array",
                  element: {
                    kind: "object",
                    fields: {
                      price_data: {
                        kind: "object",
                        fields: {
                          unit_amount_decimal: { kind: "decimal_string" }
                        }
                      }
                    }
                  }
                },
                items: {
                  kind: "array",
                  element: {
                    kind: "object",
                    fields: {
                      price_data: {
                        kind: "object",
                        fields: {
                          unit_amount_decimal: { kind: "decimal_string" }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
  }
  /**
   * Cancels a subscription schedule and its associated subscription immediately (if the subscription schedule has an active subscription). A subscription schedule can only be canceled if its status is not_started or active.
   */
  cancel(id, params, options) {
    return this._makeRequest("POST", `/v1/subscription_schedules/${encodeURIComponent(id)}/cancel`, params, options);
  }
  /**
   * Releases the subscription schedule immediately, which will stop scheduling of its phases, but leave any existing subscription in place. A schedule can only be released if its status is not_started or active. If the subscription schedule is currently associated with a subscription, releasing it will remove its subscription property and set the subscription's ID to the released_subscription property.
   */
  release(id, params, options) {
    return this._makeRequest("POST", `/v1/subscription_schedules/${encodeURIComponent(id)}/release`, params, options);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/TaxCodes.js
var TaxCodeResource = class extends StripeResource {
  /**
   * A list of [all tax codes available](https://stripe.com/docs/tax/tax-categories) to add to Products in order to allow specific tax calculations.
   */
  list(params, options) {
    return this._makeRequest("GET", "/v1/tax_codes", params, options, {
      methodType: "list"
    });
  }
  /**
   * Retrieves the details of an existing tax code. Supply the unique tax code ID and Stripe will return the corresponding tax code information.
   */
  retrieve(id, params, options) {
    return this._makeRequest("GET", `/v1/tax_codes/${encodeURIComponent(id)}`, params, options);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/TaxIds.js
var TaxIdResource = class extends StripeResource {
  /**
   * Deletes an existing account or customer tax_id object.
   */
  del(id, params, options) {
    return this._makeRequest("DELETE", `/v1/tax_ids/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * Retrieves an account or customer tax_id object.
   */
  retrieve(id, params, options) {
    return this._makeRequest("GET", `/v1/tax_ids/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * Returns a list of tax IDs.
   */
  list(params, options) {
    return this._makeRequest("GET", "/v1/tax_ids", params, options, {
      methodType: "list"
    });
  }
  /**
   * Creates a new account or customer tax_id object.
   */
  create(params, options) {
    return this._makeRequest("POST", "/v1/tax_ids", params, options);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/TaxRates.js
var TaxRateResource = class extends StripeResource {
  /**
   * Returns a list of your tax rates. Tax rates are returned sorted by creation date, with the most recently created tax rates appearing first.
   */
  list(params, options) {
    return this._makeRequest("GET", "/v1/tax_rates", params, options, {
      methodType: "list"
    });
  }
  /**
   * Creates a new tax rate.
   */
  create(params, options) {
    return this._makeRequest("POST", "/v1/tax_rates", params, options);
  }
  /**
   * Retrieves a tax rate with the given ID
   */
  retrieve(id, params, options) {
    return this._makeRequest("GET", `/v1/tax_rates/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * Updates an existing tax rate.
   */
  update(id, params, options) {
    return this._makeRequest("POST", `/v1/tax_rates/${encodeURIComponent(id)}`, params, options);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/Tokens.js
var TokenResource2 = class extends StripeResource {
  /**
   * Retrieves the token with the given ID.
   */
  retrieve(id, params, options) {
    return this._makeRequest("GET", `/v1/tokens/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * Creates a single-use token that represents a bank account's details.
   * You can use this token with any v1 API method in place of a bank account dictionary. You can only use this token once. To do so, attach it to a [connected account](https://docs.stripe.com/api#accounts) where [controller.requirement_collection](https://docs.stripe.com/api/accounts/object#account_object-controller-requirement_collection) is application, which includes Custom accounts.
   */
  create(params, options) {
    return this._makeRequest("POST", "/v1/tokens", params, options);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/Topups.js
var TopupResource = class extends StripeResource {
  /**
   * Returns a list of top-ups.
   */
  list(params, options) {
    return this._makeRequest("GET", "/v1/topups", params, options, {
      methodType: "list"
    });
  }
  /**
   * Top up the balance of an account
   */
  create(params, options) {
    return this._makeRequest("POST", "/v1/topups", params, options);
  }
  /**
   * Retrieves the details of a top-up that has previously been created. Supply the unique top-up ID that was returned from your previous request, and Stripe will return the corresponding top-up information.
   */
  retrieve(id, params, options) {
    return this._makeRequest("GET", `/v1/topups/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * Updates the metadata of a top-up. Other top-up details are not editable by design.
   */
  update(id, params, options) {
    return this._makeRequest("POST", `/v1/topups/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * Cancels a top-up. Only pending top-ups can be canceled.
   */
  cancel(id, params, options) {
    return this._makeRequest("POST", `/v1/topups/${encodeURIComponent(id)}/cancel`, params, options);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/Transfers.js
var TransferResource = class extends StripeResource {
  /**
   * Returns a list of existing transfers sent to connected accounts. The transfers are returned in sorted order, with the most recently created transfers appearing first.
   */
  list(params, options) {
    return this._makeRequest("GET", "/v1/transfers", params, options, {
      methodType: "list"
    });
  }
  /**
   * To send funds from your Stripe account to a connected account, you create a new transfer object. Your [Stripe balance](https://docs.stripe.com/api#balance) must be able to cover the transfer amount, or you'll receive an “Insufficient Funds” error.
   */
  create(params, options) {
    return this._makeRequest("POST", "/v1/transfers", params, options);
  }
  /**
   * Retrieves the details of an existing transfer. Supply the unique transfer ID from either a transfer creation request or the transfer list, and Stripe will return the corresponding transfer information.
   */
  retrieve(id, params, options) {
    return this._makeRequest("GET", `/v1/transfers/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * Updates the specified transfer by setting the values of the parameters passed. Any parameters not provided will be left unchanged.
   *
   * This request accepts only metadata as an argument.
   */
  update(id, params, options) {
    return this._makeRequest("POST", `/v1/transfers/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * You can see a list of the reversals belonging to a specific transfer. Note that the 10 most recent reversals are always available by default on the transfer object. If you need more than those 10, you can use this API method and the limit and starting_after parameters to page through additional reversals.
   */
  listReversals(id, params, options) {
    return this._makeRequest("GET", `/v1/transfers/${encodeURIComponent(id)}/reversals`, params, options, {
      methodType: "list"
    });
  }
  /**
   * When you create a new reversal, you must specify a transfer to create it on.
   *
   * When reversing transfers, you can optionally reverse part of the transfer. You can do so as many times as you wish until the entire transfer has been reversed.
   *
   * Once entirely reversed, a transfer can't be reversed again. This method will return an error when called on an already-reversed transfer, or when trying to reverse more money than is left on a transfer.
   */
  createReversal(id, params, options) {
    return this._makeRequest("POST", `/v1/transfers/${encodeURIComponent(id)}/reversals`, params, options);
  }
  /**
   * By default, you can see the 10 most recent reversals stored directly on the transfer object, but you can also retrieve details about a specific reversal stored on the transfer.
   */
  retrieveReversal(transferId, id, params, options) {
    return this._makeRequest("GET", `/v1/transfers/${encodeURIComponent(transferId)}/reversals/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * Updates the specified reversal by setting the values of the parameters passed. Any parameters not provided will be left unchanged.
   *
   * This request only accepts metadata and description as arguments.
   */
  updateReversal(transferId, id, params, options) {
    return this._makeRequest("POST", `/v1/transfers/${encodeURIComponent(transferId)}/reversals/${encodeURIComponent(id)}`, params, options);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/WebhookEndpoints.js
var WebhookEndpointResource = class extends StripeResource {
  /**
   * You can also delete webhook endpoints via the [webhook endpoint management](https://dashboard.stripe.com/account/webhooks) page of the Stripe dashboard.
   */
  del(id, params, options) {
    return this._makeRequest("DELETE", `/v1/webhook_endpoints/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * Retrieves the webhook endpoint with the given ID.
   */
  retrieve(id, params, options) {
    return this._makeRequest("GET", `/v1/webhook_endpoints/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * Updates the webhook endpoint. You may edit the url, the list of enabled_events, and the status of your endpoint.
   */
  update(id, params, options) {
    return this._makeRequest("POST", `/v1/webhook_endpoints/${encodeURIComponent(id)}`, params, options);
  }
  /**
   * Returns a list of your webhook endpoints.
   */
  list(params, options) {
    return this._makeRequest("GET", "/v1/webhook_endpoints", params, options, {
      methodType: "list"
    });
  }
  /**
   * A webhook endpoint must have a url and a list of enabled_events. You may optionally specify the Boolean connect parameter. If set to true, then a Connect webhook endpoint that notifies the specified url about events from all connected accounts is created; otherwise an account webhook endpoint that notifies the specified url only about events from your account is created. You can also create webhook endpoints in the [webhooks settings](https://dashboard.stripe.com/account/webhooks) section of the Dashboard.
   */
  create(params, options) {
    return this._makeRequest("POST", "/v1/webhook_endpoints", params, options);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources.js
var Apps = resourceNamespace("apps", { Secrets: SecretResource });
var Billing = resourceNamespace("billing", {
  Alerts: AlertResource,
  CreditBalanceSummary: CreditBalanceSummaryResource,
  CreditBalanceTransactions: CreditBalanceTransactionResource,
  CreditGrants: CreditGrantResource,
  MeterEventAdjustments: MeterEventAdjustmentResource,
  MeterEvents: MeterEventResource,
  Meters: MeterResource
});
var BillingPortal = resourceNamespace("billingPortal", {
  Configurations: ConfigurationResource,
  Sessions: SessionResource
});
var Checkout = resourceNamespace("checkout", {
  Sessions: SessionResource2
});
var Climate = resourceNamespace("climate", {
  Orders: OrderResource,
  Products: ProductResource,
  Suppliers: SupplierResource
});
var Entitlements = resourceNamespace("entitlements", {
  ActiveEntitlements: ActiveEntitlementResource,
  Features: FeatureResource
});
var FinancialConnections = resourceNamespace("financialConnections", {
  Accounts: AccountResource,
  Sessions: SessionResource3,
  Transactions: TransactionResource
});
var Forwarding = resourceNamespace("forwarding", {
  Requests: RequestResource
});
var Identity = resourceNamespace("identity", {
  VerificationReports: VerificationReportResource,
  VerificationSessions: VerificationSessionResource
});
var Issuing = resourceNamespace("issuing", {
  Authorizations: AuthorizationResource,
  Cardholders: CardholderResource,
  Cards: CardResource,
  Disputes: DisputeResource,
  PersonalizationDesigns: PersonalizationDesignResource,
  PhysicalBundles: PhysicalBundleResource,
  Tokens: TokenResource,
  Transactions: TransactionResource2
});
var Radar = resourceNamespace("radar", {
  EarlyFraudWarnings: EarlyFraudWarningResource,
  PaymentEvaluations: PaymentEvaluationResource,
  ValueListItems: ValueListItemResource,
  ValueLists: ValueListResource
});
var Reporting = resourceNamespace("reporting", {
  ReportRuns: ReportRunResource,
  ReportTypes: ReportTypeResource
});
var Sigma = resourceNamespace("sigma", {
  ScheduledQueryRuns: ScheduledQueryRunResource
});
var Tax = resourceNamespace("tax", {
  Associations: AssociationResource,
  Calculations: CalculationResource,
  Registrations: RegistrationResource,
  Settings: SettingResource,
  Transactions: TransactionResource3
});
var Terminal = resourceNamespace("terminal", {
  Configurations: ConfigurationResource2,
  ConnectionTokens: ConnectionTokenResource,
  Locations: LocationResource,
  OnboardingLinks: OnboardingLinkResource,
  Readers: ReaderResource
});
var TestHelpers = resourceNamespace("testHelpers", {
  ConfirmationTokens: ConfirmationTokenResource,
  Customers: CustomerResource,
  Refunds: RefundResource,
  TestClocks: TestClockResource,
  Issuing: resourceNamespace("issuing", {
    Authorizations: AuthorizationResource2,
    Cards: CardResource2,
    PersonalizationDesigns: PersonalizationDesignResource2,
    Transactions: TransactionResource4
  }),
  Terminal: resourceNamespace("terminal", {
    Readers: ReaderResource2
  }),
  Treasury: resourceNamespace("treasury", {
    InboundTransfers: InboundTransferResource,
    OutboundPayments: OutboundPaymentResource,
    OutboundTransfers: OutboundTransferResource,
    ReceivedCredits: ReceivedCreditResource,
    ReceivedDebits: ReceivedDebitResource
  })
});
var Treasury = resourceNamespace("treasury", {
  CreditReversals: CreditReversalResource,
  DebitReversals: DebitReversalResource,
  FinancialAccounts: FinancialAccountResource,
  InboundTransfers: InboundTransferResource2,
  OutboundPayments: OutboundPaymentResource2,
  OutboundTransfers: OutboundTransferResource2,
  ReceivedCredits: ReceivedCreditResource2,
  ReceivedDebits: ReceivedDebitResource2,
  TransactionEntries: TransactionEntryResource,
  Transactions: TransactionResource5
});
var V2 = resourceNamespace("v2", {
  Billing: resourceNamespace("billing", {
    MeterEventAdjustments: MeterEventAdjustmentResource2,
    MeterEventSession: MeterEventSessionResource,
    MeterEventStream: MeterEventStreamResource,
    MeterEvents: MeterEventResource2
  }),
  Commerce: resourceNamespace("commerce", {
    ProductCatalog: resourceNamespace("productCatalog", {
      Imports: ImportResource
    })
  }),
  Core: resourceNamespace("core", {
    AccountLinks: AccountLinkResource,
    AccountTokens: AccountTokenResource,
    Accounts: AccountResource2,
    EventDestinations: EventDestinationResource,
    Events: EventResource
  })
});

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/Apps/index.js
var Apps2 = class {
  constructor(stripe) {
    this.stripe = stripe;
    this.secrets = new SecretResource(stripe);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/Billing/index.js
var Billing2 = class {
  constructor(stripe) {
    this.stripe = stripe;
    this.alerts = new AlertResource(stripe);
    this.creditBalanceSummaries = new CreditBalanceSummaryResource(stripe);
    this.creditBalanceTransactions = new CreditBalanceTransactionResource(stripe);
    this.creditGrants = new CreditGrantResource(stripe);
    this.meters = new MeterResource(stripe);
    this.meterEvents = new MeterEventResource(stripe);
    this.meterEventAdjustments = new MeterEventAdjustmentResource(stripe);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/BillingPortal/index.js
var BillingPortal2 = class {
  constructor(stripe) {
    this.stripe = stripe;
    this.configurations = new ConfigurationResource(stripe);
    this.sessions = new SessionResource(stripe);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/Checkout/index.js
var Checkout2 = class {
  constructor(stripe) {
    this.stripe = stripe;
    this.sessions = new SessionResource2(stripe);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/Climate/index.js
var Climate2 = class {
  constructor(stripe) {
    this.stripe = stripe;
    this.orders = new OrderResource(stripe);
    this.products = new ProductResource(stripe);
    this.suppliers = new SupplierResource(stripe);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/Entitlements/index.js
var Entitlements2 = class {
  constructor(stripe) {
    this.stripe = stripe;
    this.activeEntitlements = new ActiveEntitlementResource(stripe);
    this.features = new FeatureResource(stripe);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/FinancialConnections/index.js
var FinancialConnections2 = class {
  constructor(stripe) {
    this.stripe = stripe;
    this.accounts = new AccountResource(stripe);
    this.sessions = new SessionResource3(stripe);
    this.transactions = new TransactionResource(stripe);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/Forwarding/index.js
var Forwarding2 = class {
  constructor(stripe) {
    this.stripe = stripe;
    this.requests = new RequestResource(stripe);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/Identity/index.js
var Identity2 = class {
  constructor(stripe) {
    this.stripe = stripe;
    this.verificationReports = new VerificationReportResource(stripe);
    this.verificationSessions = new VerificationSessionResource(stripe);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/Issuing/index.js
var Issuing2 = class {
  constructor(stripe) {
    this.stripe = stripe;
    this.authorizations = new AuthorizationResource(stripe);
    this.cards = new CardResource(stripe);
    this.cardholders = new CardholderResource(stripe);
    this.disputes = new DisputeResource(stripe);
    this.personalizationDesigns = new PersonalizationDesignResource(stripe);
    this.physicalBundles = new PhysicalBundleResource(stripe);
    this.tokens = new TokenResource(stripe);
    this.transactions = new TransactionResource2(stripe);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/Radar/index.js
var Radar2 = class {
  constructor(stripe) {
    this.stripe = stripe;
    this.earlyFraudWarnings = new EarlyFraudWarningResource(stripe);
    this.paymentEvaluations = new PaymentEvaluationResource(stripe);
    this.valueLists = new ValueListResource(stripe);
    this.valueListItems = new ValueListItemResource(stripe);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/Reporting/index.js
var Reporting2 = class {
  constructor(stripe) {
    this.stripe = stripe;
    this.reportRuns = new ReportRunResource(stripe);
    this.reportTypes = new ReportTypeResource(stripe);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/Sigma/index.js
var Sigma2 = class {
  constructor(stripe) {
    this.stripe = stripe;
    this.scheduledQueryRuns = new ScheduledQueryRunResource(stripe);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/Tax/index.js
var Tax2 = class {
  constructor(stripe) {
    this.stripe = stripe;
    this.associations = new AssociationResource(stripe);
    this.calculations = new CalculationResource(stripe);
    this.registrations = new RegistrationResource(stripe);
    this.settings = new SettingResource(stripe);
    this.transactions = new TransactionResource3(stripe);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/Terminal/index.js
var Terminal2 = class {
  constructor(stripe) {
    this.stripe = stripe;
    this.configurations = new ConfigurationResource2(stripe);
    this.connectionTokens = new ConnectionTokenResource(stripe);
    this.locations = new LocationResource(stripe);
    this.onboardingLinks = new OnboardingLinkResource(stripe);
    this.readers = new ReaderResource(stripe);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/TestHelpers/Issuing/index.js
var Issuing3 = class {
  constructor(stripe) {
    this.stripe = stripe;
    this.authorizations = new AuthorizationResource2(stripe);
    this.cards = new CardResource2(stripe);
    this.personalizationDesigns = new PersonalizationDesignResource2(stripe);
    this.transactions = new TransactionResource4(stripe);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/TestHelpers/Terminal/index.js
var Terminal3 = class {
  constructor(stripe) {
    this.stripe = stripe;
    this.readers = new ReaderResource2(stripe);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/TestHelpers/Treasury/index.js
var Treasury2 = class {
  constructor(stripe) {
    this.stripe = stripe;
    this.inboundTransfers = new InboundTransferResource(stripe);
    this.outboundPayments = new OutboundPaymentResource(stripe);
    this.outboundTransfers = new OutboundTransferResource(stripe);
    this.receivedCredits = new ReceivedCreditResource(stripe);
    this.receivedDebits = new ReceivedDebitResource(stripe);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/TestHelpers/index.js
var TestHelpers2 = class {
  constructor(stripe) {
    this.stripe = stripe;
    this.confirmationTokens = new ConfirmationTokenResource(stripe);
    this.customers = new CustomerResource(stripe);
    this.refunds = new RefundResource(stripe);
    this.testClocks = new TestClockResource(stripe);
    this.issuing = new Issuing3(stripe);
    this.terminal = new Terminal3(stripe);
    this.treasury = new Treasury2(stripe);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/Treasury/index.js
var Treasury3 = class {
  constructor(stripe) {
    this.stripe = stripe;
    this.creditReversals = new CreditReversalResource(stripe);
    this.debitReversals = new DebitReversalResource(stripe);
    this.financialAccounts = new FinancialAccountResource(stripe);
    this.inboundTransfers = new InboundTransferResource2(stripe);
    this.outboundPayments = new OutboundPaymentResource2(stripe);
    this.outboundTransfers = new OutboundTransferResource2(stripe);
    this.receivedCredits = new ReceivedCreditResource2(stripe);
    this.receivedDebits = new ReceivedDebitResource2(stripe);
    this.transactions = new TransactionResource5(stripe);
    this.transactionEntries = new TransactionEntryResource(stripe);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/V2/Billing/index.js
var Billing3 = class {
  constructor(stripe) {
    this.stripe = stripe;
    this.meterEvents = new MeterEventResource2(stripe);
    this.meterEventAdjustments = new MeterEventAdjustmentResource2(stripe);
    this.meterEventSession = new MeterEventSessionResource(stripe);
    this.meterEventStream = new MeterEventStreamResource(stripe);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/V2/Commerce/ProductCatalog/index.js
var ProductCatalog = class {
  constructor(stripe) {
    this.stripe = stripe;
    this.imports = new ImportResource(stripe);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/V2/Commerce/index.js
var Commerce = class {
  constructor(stripe) {
    this.stripe = stripe;
    this.productCatalog = new ProductCatalog(stripe);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/V2/Core/index.js
var Core = class {
  constructor(stripe) {
    this.stripe = stripe;
    this.accounts = new AccountResource2(stripe);
    this.accountLinks = new AccountLinkResource(stripe);
    this.accountTokens = new AccountTokenResource(stripe);
    this.events = new EventResource(stripe);
    this.eventDestinations = new EventDestinationResource(stripe);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/resources/V2/index.js
var V22 = class {
  constructor(stripe) {
    this.stripe = stripe;
    this.billing = new Billing3(stripe);
    this.commerce = new Commerce(stripe);
    this.core = new Core(stripe);
  }
};

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/stripe.core.js
var DEFAULT_HOST = "api.stripe.com";
var DEFAULT_PORT = "443";
var DEFAULT_BASE_PATH = "/v1/";
var DEFAULT_API_VERSION = ApiVersion;
var DEFAULT_TIMEOUT = 8e4;
var MAX_NETWORK_RETRY_DELAY_SEC = 5;
var INITIAL_NETWORK_RETRY_DELAY_SEC = 0.5;
var APP_INFO_PROPERTIES = [
  "name",
  "version",
  "url",
  "partner_id"
];
var ALLOWED_CONFIG_PROPERTIES = [
  "authenticator",
  "apiVersion",
  "typescript",
  "maxNetworkRetries",
  "httpAgent",
  "httpClient",
  "timeout",
  "host",
  "port",
  "protocol",
  "telemetry",
  "emitEventBodies",
  "appInfo",
  "stripeAccount",
  "stripeContext"
];
var defaultRequestSenderFactory = (stripe) => new RequestSender(stripe, StripeResource.MAX_BUFFERED_REQUEST_METRICS);
var Stripe = class _Stripe {
  static initialize(platformFunctions, requestSenderFactory = defaultRequestSenderFactory) {
    _Stripe._platformFunctions = platformFunctions;
    _Stripe._requestSenderFactory = requestSenderFactory;
    _Stripe.webhooks = createWebhooks(platformFunctions);
    _Stripe.createNodeHttpClient = platformFunctions.createNodeHttpClient;
    _Stripe.createFetchHttpClient = platformFunctions.createFetchHttpClient;
    _Stripe.createNodeCryptoProvider = platformFunctions.createNodeCryptoProvider;
    _Stripe.createSubtleCryptoProvider = platformFunctions.createSubtleCryptoProvider;
    const env = platformFunctions.getEnv();
    const runtimeVersion = platformFunctions.getRuntimeVersion();
    _Stripe.aiAgent = env ? detectAIAgent(env) : "";
    _Stripe.AI_AGENT = _Stripe.aiAgent;
    _Stripe.USER_AGENT = {
      bindings_version: _Stripe.PACKAGE_VERSION,
      lang: "node",
      typescript: false,
      ...runtimeVersion ? { lang_version: runtimeVersion } : {},
      ..._Stripe.aiAgent ? { ai_agent: _Stripe.aiAgent } : {}
    };
    _Stripe.SOURCE_HASH = platformFunctions.getSourceHash();
  }
  constructor(key, config = {}) {
    this._authenticator = null;
    const props = this._getPropsFromConfig(config);
    this._platformFunctions = _Stripe._platformFunctions;
    Object.defineProperty(this, "_emitter", {
      value: this._platformFunctions.createEmitter(),
      enumerable: false,
      configurable: false,
      writable: false
    });
    this.VERSION = _Stripe.PACKAGE_VERSION;
    this.on = this._emitter.on.bind(this._emitter);
    this.once = this._emitter.once.bind(this._emitter);
    this.off = this._emitter.removeListener.bind(this._emitter);
    const agent = props.httpAgent || null;
    this._api = {
      host: props.host || DEFAULT_HOST,
      port: props.port || DEFAULT_PORT,
      protocol: props.protocol || "https",
      basePath: DEFAULT_BASE_PATH,
      version: props.apiVersion || DEFAULT_API_VERSION,
      timeout: validateInteger("timeout", props.timeout, DEFAULT_TIMEOUT),
      maxNetworkRetries: validateInteger("maxNetworkRetries", props.maxNetworkRetries, 2),
      agent,
      httpClient: props.httpClient || (agent ? this._platformFunctions.createNodeHttpClient(agent) : this._platformFunctions.createDefaultHttpClient()),
      dev: false,
      stripeAccount: props.stripeAccount || null,
      stripeContext: props.stripeContext || null
    };
    const typescript = props.typescript || false;
    if (typescript !== _Stripe.USER_AGENT.typescript) {
      _Stripe.USER_AGENT.typescript = typescript;
    }
    if (props.appInfo) {
      this._setAppInfo(props.appInfo);
    }
    this._setAuthenticator(key, props.authenticator || null);
    this.errors = Error_exports;
    this.Decimal = Decimal;
    this.webhooks = _Stripe.webhooks;
    this._prevRequestMetrics = [];
    this._enableTelemetry = props.telemetry !== false;
    this._emitEventBodies = props.emitEventBodies === true;
    this._requestSender = _Stripe._requestSenderFactory(this);
    this.accountLinks = new AccountLinkResource2(this);
    this.accountSessions = new AccountSessionResource(this);
    this.accounts = new AccountResource3(this);
    this.applePayDomains = new ApplePayDomainResource(this);
    this.applicationFees = new ApplicationFeeResource(this);
    this.balance = new BalanceResource(this);
    this.balanceSettings = new BalanceSettingResource(this);
    this.balanceTransactions = new BalanceTransactionResource(this);
    this.charges = new ChargeResource(this);
    this.confirmationTokens = new ConfirmationTokenResource2(this);
    this.countrySpecs = new CountrySpecResource(this);
    this.coupons = new CouponResource(this);
    this.creditNotes = new CreditNoteResource(this);
    this.customerSessions = new CustomerSessionResource(this);
    this.customers = new CustomerResource2(this);
    this.disputes = new DisputeResource2(this);
    this.ephemeralKeys = new EphemeralKeyResource(this);
    this.events = new EventResource2(this);
    this.exchangeRates = new ExchangeRateResource(this);
    this.fileLinks = new FileLinkResource(this);
    this.files = new FileResource(this);
    this.invoiceItems = new InvoiceItemResource(this);
    this.invoicePayments = new InvoicePaymentResource(this);
    this.invoiceRenderingTemplates = new InvoiceRenderingTemplateResource(this);
    this.invoices = new InvoiceResource(this);
    this.mandates = new MandateResource(this);
    this.paymentAttemptRecords = new PaymentAttemptRecordResource(this);
    this.paymentIntents = new PaymentIntentResource(this);
    this.paymentLinks = new PaymentLinkResource(this);
    this.paymentMethodConfigurations = new PaymentMethodConfigurationResource(this);
    this.paymentMethodDomains = new PaymentMethodDomainResource(this);
    this.paymentMethods = new PaymentMethodResource(this);
    this.paymentRecords = new PaymentRecordResource(this);
    this.payouts = new PayoutResource(this);
    this.plans = new PlanResource(this);
    this.prices = new PriceResource(this);
    this.products = new ProductResource2(this);
    this.promotionCodes = new PromotionCodeResource(this);
    this.quotes = new QuoteResource(this);
    this.refunds = new RefundResource2(this);
    this.reviews = new ReviewResource(this);
    this.setupAttempts = new SetupAttemptResource(this);
    this.setupIntents = new SetupIntentResource(this);
    this.shippingRates = new ShippingRateResource(this);
    this.sources = new SourceResource(this);
    this.subscriptionItems = new SubscriptionItemResource(this);
    this.subscriptionSchedules = new SubscriptionScheduleResource(this);
    this.subscriptions = new SubscriptionResource(this);
    this.taxCodes = new TaxCodeResource(this);
    this.taxIds = new TaxIdResource(this);
    this.taxRates = new TaxRateResource(this);
    this.tokens = new TokenResource2(this);
    this.topups = new TopupResource(this);
    this.transfers = new TransferResource(this);
    this.webhookEndpoints = new WebhookEndpointResource(this);
    this.apps = new Apps2(this);
    this.billing = new Billing2(this);
    this.billingPortal = new BillingPortal2(this);
    this.checkout = new Checkout2(this);
    this.climate = new Climate2(this);
    this.entitlements = new Entitlements2(this);
    this.financialConnections = new FinancialConnections2(this);
    this.forwarding = new Forwarding2(this);
    this.identity = new Identity2(this);
    this.issuing = new Issuing2(this);
    this.radar = new Radar2(this);
    this.reporting = new Reporting2(this);
    this.sigma = new Sigma2(this);
    this.tax = new Tax2(this);
    this.terminal = new Terminal2(this);
    this.testHelpers = new TestHelpers2(this);
    this.treasury = new Treasury3(this);
    this.v2 = new V22(this);
    this.account = this.accounts;
    this.oauth = new OAuthResource(this);
  }
  /**
   * Allows for sending "raw" requests to the Stripe API, which can be used for
   * testing new API endpoints or performing requests that the library does
   * not support yet.
   *
   * @param method - HTTP request method, 'GET', 'POST', or 'DELETE'
   * @param path - The path of the request, e.g. '/v1/beta_endpoint'
   * @param params - The parameters to include in the request body.
   * @param options - Additional request options.
   */
  rawRequest(method, path, params, options) {
    return this._requestSender._rawRequest(method, path, params, options);
  }
  /**
   * @private
   */
  _setAuthenticator(key, authenticator) {
    if (key && authenticator) {
      throw new Error("Can't specify both apiKey and authenticator");
    }
    if (!key && !authenticator) {
      throw new Error("Neither apiKey nor config.authenticator provided");
    }
    this._authenticator = key ? createApiKeyAuthenticator(key) : authenticator;
  }
  /**
   * @private
   * This may be removed in the future.
   */
  _setAppInfo(info) {
    if (info && typeof info !== "object") {
      throw new Error("AppInfo must be an object.");
    }
    if (info && !info.name) {
      throw new Error("AppInfo.name is required");
    }
    info = info || {};
    this._appInfo = APP_INFO_PROPERTIES.reduce((accum, prop) => {
      if (typeof info[prop] == "string") {
        accum = accum || {};
        accum[prop] = info[prop];
      }
      return accum;
    }, {});
  }
  setClientId(clientId) {
    this._clientId = clientId;
  }
  getClientId() {
    return this._clientId;
  }
  /**
   * @private
   * Please open or upvote an issue at github.com/stripe/stripe-node
   * if you use this, detailing your use-case.
   *
   * It may be deprecated and removed in the future.
   */
  getConstant(c) {
    switch (c) {
      case "DEFAULT_HOST":
        return DEFAULT_HOST;
      case "DEFAULT_PORT":
        return DEFAULT_PORT;
      case "DEFAULT_BASE_PATH":
        return DEFAULT_BASE_PATH;
      case "DEFAULT_API_VERSION":
        return DEFAULT_API_VERSION;
      case "DEFAULT_TIMEOUT":
        return DEFAULT_TIMEOUT;
      case "MAX_NETWORK_RETRY_DELAY_SEC":
        return MAX_NETWORK_RETRY_DELAY_SEC;
      case "INITIAL_NETWORK_RETRY_DELAY_SEC":
        return INITIAL_NETWORK_RETRY_DELAY_SEC;
    }
    return _Stripe[c];
  }
  resolveBaseAddress(apiBase) {
    const instanceHost = this.getApiField("host");
    if (instanceHost !== DEFAULT_HOST) {
      return instanceHost;
    }
    return DEFAULT_BASE_ADDRESSES[apiBase];
  }
  getMaxNetworkRetries() {
    return this.getApiField("maxNetworkRetries");
  }
  /**
   * @private
   * This may be removed in the future.
   */
  _setApiNumberField(prop, n, defaultVal) {
    const val = validateInteger(prop, n, defaultVal);
    this._setApiField(prop, val);
  }
  getMaxNetworkRetryDelay() {
    return MAX_NETWORK_RETRY_DELAY_SEC;
  }
  getInitialNetworkRetryDelay() {
    return INITIAL_NETWORK_RETRY_DELAY_SEC;
  }
  /**
   * @private
   * Please open or upvote an issue at github.com/stripe/stripe-node
   * if you use this, detailing your use-case.
   *
   * It may be deprecated and removed in the future.
   *
   * Gets a JSON version of a User-Agent and uses a cached version for a slight
   * speed advantage.
   */
  getClientUserAgent(cb) {
    return this.getClientUserAgentSeeded(_Stripe.USER_AGENT, cb);
  }
  /**
   * @private
   * Please open or upvote an issue at github.com/stripe/stripe-node
   * if you use this, detailing your use-case.
   *
   * It may be deprecated and removed in the future.
   *
   * Gets a JSON version of a User-Agent by encoding a seeded object and
   * fetching a uname from the system.
   */
  getClientUserAgentSeeded(seed, cb) {
    const userAgent = {};
    for (const field in seed) {
      if (!Object.prototype.hasOwnProperty.call(seed, field)) {
        continue;
      }
      userAgent[field] = encodeURIComponent(seed[field] ?? "null");
    }
    const platformInfo = this._platformFunctions.getPlatformInfo();
    if (platformInfo && this.getTelemetryEnabled()) {
      userAgent.platform = encodeURIComponent(platformInfo);
    } else {
      delete userAgent.platform;
    }
    const client = this.getApiField("httpClient");
    if (client) {
      userAgent.httplib = encodeURIComponent(client.getClientName());
    }
    if (this._appInfo) {
      userAgent.application = this._appInfo;
    }
    if (_Stripe.SOURCE_HASH) {
      userAgent.source = _Stripe.SOURCE_HASH;
    }
    cb(JSON.stringify(userAgent));
  }
  /**
   * @private
   * Please open or upvote an issue at github.com/stripe/stripe-node
   * if you use this, detailing your use-case.
   *
   * It may be deprecated and removed in the future.
   */
  getAppInfoAsString() {
    if (!this._appInfo) {
      return "";
    }
    let formatted = this._appInfo.name;
    if (this._appInfo.version) {
      formatted += `/${this._appInfo.version}`;
    }
    if (this._appInfo.url) {
      formatted += ` (${this._appInfo.url})`;
    }
    return formatted;
  }
  getTelemetryEnabled() {
    return this._enableTelemetry;
  }
  getEmitEventBodiesEnabled() {
    return this._emitEventBodies;
  }
  /**
   * @private
   * This may be removed in the future.
   */
  _prepResources() {
    for (const name in resources_exports) {
      if (!Object.prototype.hasOwnProperty.call(resources_exports, name)) {
        continue;
      }
      this[pascalToCamelCase(name.replace("Resource", ""))] = new resources_exports[name](this);
    }
  }
  /**
   * @private
   * This may be removed in the future.
   */
  _getPropsFromConfig(config) {
    if (!config) {
      return {};
    }
    const isString = typeof config === "string";
    const isObject2 = config === Object(config) && !Array.isArray(config);
    if (!isObject2 && !isString) {
      throw new Error("Config must either be an object or a string");
    }
    if (isString) {
      return {
        apiVersion: config
      };
    }
    const values = Object.keys(config).filter((value) => !ALLOWED_CONFIG_PROPERTIES.includes(value));
    if (values.length > 0) {
      throw new Error(`Config object may only contain the following: ${ALLOWED_CONFIG_PROPERTIES.join(", ")}`);
    }
    return config;
  }
  /**
   * @private
   * This may be removed in the future.
   */
  _setApiField(key, value) {
    this._api[key] = value;
  }
  /**
   * @private
   * Please open or upvote an issue at github.com/stripe/stripe-node
   * if you use this, detailing your use-case.
   *
   * It may be deprecated and removed in the future.
   */
  getApiField(key) {
    return this._api[key];
  }
  parseEventNotification(payload, header, secret, tolerance, cryptoProvider, receivedAt) {
    if (!this.webhooks.signature) {
      throw new Error("ERR: missing signature helper, unable to verify");
    }
    this.webhooks.signature.verifyHeader(payload, header, secret, tolerance || this.webhooks.DEFAULT_TOLERANCE, cryptoProvider || this._platformFunctions.createDefaultCryptoProvider(), receivedAt);
    const eventNotification = payload instanceof Uint8Array ? JSON.parse(new TextDecoder("utf8").decode(payload)) : JSON.parse(payload);
    if (eventNotification && eventNotification.object === "event") {
      throw new Error("You passed a webhook payload to stripe.parseEventNotification, which expects an event notification. Use stripe.webhooks.constructEvent instead.");
    }
    if (eventNotification.context) {
      eventNotification.context = StripeContext.parse(eventNotification.context);
    }
    eventNotification.fetchEvent = () => {
      return this._requestSender._rawRequest("GET", `/v2/core/events/${eventNotification.id}`, void 0, {
        stripeContext: eventNotification.context,
        headers: {
          "Stripe-Request-Trigger": `event=${eventNotification.id}`
        }
      }, ["fetch_event"]);
    };
    eventNotification.fetchRelatedObject = () => {
      if (!eventNotification.related_object) {
        return Promise.resolve(null);
      }
      return this._requestSender._rawRequest("GET", eventNotification.related_object.url, void 0, {
        stripeContext: eventNotification.context,
        headers: {
          "Stripe-Request-Trigger": `event=${eventNotification.id}`
        }
      }, ["fetch_related_object"]);
    };
    return eventNotification;
  }
  async parseEventNotificationAsync(payload, header, secret, tolerance, cryptoProvider, receivedAt) {
    if (!this.webhooks.signature) {
      throw new Error("ERR: missing signature helper, unable to verify");
    }
    await this.webhooks.signature.verifyHeaderAsync(payload, header, secret, tolerance || this.webhooks.DEFAULT_TOLERANCE, cryptoProvider || this._platformFunctions.createDefaultCryptoProvider(), receivedAt);
    const eventNotification = payload instanceof Uint8Array ? JSON.parse(new TextDecoder("utf8").decode(payload)) : JSON.parse(payload);
    if (eventNotification && eventNotification.object === "event") {
      throw new Error("You passed a webhook payload to stripe.parseEventNotificationAsync, which expects an event notification. Use stripe.webhooks.constructEventAsync instead.");
    }
    if (eventNotification.context) {
      eventNotification.context = StripeContext.parse(eventNotification.context);
    }
    eventNotification.fetchEvent = () => {
      return this._requestSender._rawRequest("GET", `/v2/core/events/${eventNotification.id}`, void 0, {
        stripeContext: eventNotification.context,
        headers: {
          "Stripe-Request-Trigger": `event=${eventNotification.id}`
        }
      }, ["fetch_event"]);
    };
    eventNotification.fetchRelatedObject = () => {
      if (!eventNotification.related_object) {
        return Promise.resolve(null);
      }
      return this._requestSender._rawRequest("GET", eventNotification.related_object.url, void 0, {
        stripeContext: eventNotification.context,
        headers: {
          "Stripe-Request-Trigger": `event=${eventNotification.id}`
        }
      }, ["fetch_related_object"]);
    };
    return eventNotification;
  }
};
Stripe.PACKAGE_VERSION = "22.3.0";
Stripe.API_VERSION = ApiVersion;
Stripe.aiAgent = "";
Stripe.AI_AGENT = "";
Stripe.USER_AGENT = {
  bindings_version: Stripe.PACKAGE_VERSION,
  lang: "node",
  typescript: false
};
Stripe.SOURCE_HASH = null;
Stripe.StripeResource = StripeResource;
Stripe.resources = resources_exports;
Stripe.HttpClient = HttpClient;
Stripe.HttpClientResponse = HttpClientResponse;
Stripe.CryptoProvider = CryptoProvider;
Stripe.StripeContext = StripeContext;
Stripe.errors = Error_exports;
Stripe.Decimal = Decimal;
Stripe._requestSenderFactory = defaultRequestSenderFactory;

// node_modules/.pnpm/stripe@22.3.0_@types+node@22.20.1/node_modules/stripe/esm/stripe.esm.worker.js
Stripe.initialize(new WebPlatformFunctions());
var stripe_esm_worker_default = Stripe;

// src/index.ts
function getEnv() {
  return "production";
}
function tryParse(json) {
  if (!json) return {};
  try {
    return JSON.parse(json);
  } catch {
    return {};
  }
}
async function createApp(edgespark) {
  const { db, secret, storage, auth } = edgespark;
  async function requireOwnership(userId, inspectionId) {
    const rows = await db.select().from(db_schema_exports.inspections).where(
      and(
        eq(db_schema_exports.inspections.id, inspectionId),
        eq(db_schema_exports.inspections.userId, userId)
      )
    );
    if (rows.length === 0) return null;
    return rows[0];
  }
  const app = new Hono2();
  app.onError((err, c) => {
    console.error("[API] error:", err);
    return c.json({ error: err instanceof Error ? err.message : "Internal error" }, 500);
  });
  app.get("/api/public/mobile-auth/google", (c) => {
    const origin = new URL(c.req.url).origin;
    const callbackURL = `${origin}/api/public/mobile-auth/callback`;
    return c.html(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <title>Continue with Google \u2014 MeInspect</title>
  <style>
    body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f8fafc;color:#0f172a;font:16px system-ui,-apple-system,sans-serif}
    main{width:min(88vw,360px);text-align:center}.spinner{width:38px;height:38px;margin:0 auto 20px;border:4px solid #bfdbfe;border-top-color:#2563eb;border-radius:50%;animation:spin .8s linear infinite}
    p{color:#64748b;line-height:1.5}.error{color:#b91c1c}button{border:0;border-radius:12px;padding:12px 18px;background:#2563eb;color:white;font-weight:700}@keyframes spin{to{transform:rotate(360deg)}}
  </style>
</head>
<body><main><div class="spinner" aria-hidden="true"></div><h1>Opening Google sign-in</h1><p id="status">Please wait\u2026</p></main>
<script>
(async function () {
  const status = document.getElementById('status');
  try {
    const response = await fetch('/api/_es/auth/sign-in/social', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: 'google',
        callbackURL: ${JSON.stringify(callbackURL)},
        disableRedirect: true
      })
    });
    const result = await response.json();
    if (!response.ok || !result.url) throw new Error(result.message || 'Unable to start Google sign-in');

    // Re-issue Better Auth's temporary state cookie with native-safe flags.
    // Its value remains HttpOnly and never enters JavaScript.
    const cookieResponse = await fetch('/api/public/mobile-auth/secure-state', {
      method: 'POST',
      credentials: 'include'
    });
    if (!cookieResponse.ok) throw new Error('Unable to secure the sign-in session');

    window.location.replace(result.url);
  } catch (error) {
    document.querySelector('.spinner').remove();
    status.className = 'error';
    status.textContent = error instanceof Error ? error.message : 'Google sign-in could not be started.';
  }
})();
<\/script></body></html>`);
  });
  app.post("/api/public/mobile-auth/secure-state", (c) => {
    const cookieHeader = c.req.header("Cookie") || "";
    const stateCookie = cookieHeader.split(";").map((cookie) => cookie.trim()).find((cookie) => cookie.startsWith("better-auth.state="));
    if (!stateCookie) {
      return c.json({ error: "OAuth state cookie was not initialized" }, 400);
    }
    const stateValue = stateCookie.slice("better-auth.state=".length);
    if (!stateValue || /[\r\n;]/.test(stateValue)) {
      return c.json({ error: "Invalid OAuth state cookie" }, 400);
    }
    c.header(
      "Set-Cookie",
      `better-auth.state=${stateValue}; Max-Age=300; Path=/; HttpOnly; Secure; SameSite=None`
    );
    c.header("Cache-Control", "no-store");
    return c.body(null, 204);
  });
  app.get("/api/public/mobile-auth/callback", (c) => {
    const deepLink = new URL("meinspect://auth/callback");
    const token = c.req.query("es_auth_token");
    const error = c.req.query("error");
    const errorDescription = c.req.query("error_description");
    if (token) deepLink.searchParams.set("es_auth_token", token);
    if (error) deepLink.searchParams.set("error", error);
    if (errorDescription) deepLink.searchParams.set("error_description", errorDescription);
    return c.html(`<!doctype html>
<html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Return to MeInspect</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f8fafc;font:16px system-ui;color:#0f172a}main{text-align:center;padding:24px}a{display:inline-block;margin-top:12px;padding:12px 18px;border-radius:12px;background:#2563eb;color:#fff;text-decoration:none;font-weight:700}</style></head>
<body><main><h1>Sign-in complete</h1><p>Return to MeInspect to continue.</p><a id="open-app" href=${JSON.stringify(deepLink.toString())}>Open MeInspect</a></main>
<script>window.location.replace(${JSON.stringify(deepLink.toString())});<\/script></body></html>`);
  });
  app.post("/api/user/profile", async (c) => {
    const userId = auth.user.id;
    const userEmail = auth.user.email || "";
    const { name, phone, location } = await c.req.json();
    const existing = await db.select().from(db_schema_exports.users).where(eq(db_schema_exports.users.id, userId));
    if (existing.length > 0) {
      await db.update(db_schema_exports.users).set({
        name: name !== void 0 ? name : existing[0].name,
        phone: phone !== void 0 ? phone : existing[0].phone,
        location: location !== void 0 ? location : existing[0].location,
        email: userEmail || existing[0].email,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      }).where(eq(db_schema_exports.users.id, userId));
    } else {
      await db.insert(db_schema_exports.users).values({
        id: userId,
        email: userEmail,
        name: name || auth.user.name || "",
        phone: phone || "",
        location: location || ""
      });
    }
    return c.json({ success: true });
  });
  app.delete("/api/user/account", async (c) => {
    if (!auth.user) return c.json({ error: "Unauthorized" }, 401);
    const userId = auth.user.id;
    try {
      await db.delete(db_schema_exports.inspections).where(eq(db_schema_exports.inspections.userId, userId));
      await db.delete(db_schema_exports.users).where(eq(db_schema_exports.users.id, userId));
      console.log(`[ACCOUNT] Deleted account and all data for user: ${userId}`);
      return c.json({ success: true, message: "Account and all associated data deleted successfully" });
    } catch (err) {
      console.error("[ACCOUNT] Error deleting account:", err);
      return c.json({ error: "Failed to delete account" }, 500);
    }
  });
  app.get("/api/user/profile", async (c) => {
    const userId = auth.user.id;
    const result = await db.select().from(db_schema_exports.users).where(eq(db_schema_exports.users.id, userId));
    if (result.length === 0) return c.json({ data: null });
    return c.json({ data: result[0] });
  });
  app.get("/api/inspections", async (c) => {
    const userId = auth.user.id;
    const inspections2 = await db.select().from(db_schema_exports.inspections).where(eq(db_schema_exports.inspections.userId, userId));
    return c.json({ data: inspections2 });
  });
  app.get("/api/inspections/:id", async (c) => {
    const userId = auth.user.id;
    const id = c.req.param("id");
    const row = await requireOwnership(userId, id);
    if (!row) return c.json({ error: "Not found" }, 404);
    return c.json({ data: row });
  });
  app.post("/api/inspections", async (c) => {
    const data = await c.req.json();
    const userId = auth.user.id;
    const inspection = await db.insert(db_schema_exports.inspections).values({
      id: data.id,
      userId,
      propertyType: data.propertyType || "apartment",
      status: data.status || "draft",
      generalNotes: data.generalNotes || "",
      propertyData: JSON.stringify(data.property || {}),
      tenantData: JSON.stringify(data.tenant || {}),
      landlordData: JSON.stringify(data.landlord || {}),
      agentData: JSON.stringify(data.agent || {}),
      tenancyData: JSON.stringify(data.tenancy || {}),
      roomsData: JSON.stringify(data.rooms || []),
      propertyItems: JSON.stringify(data.propertyItems || []),
      signatures: JSON.stringify(data.signatures || []),
      overallPhotos: JSON.stringify(data.overallPhotos || []),
      // Payment status cannot be set directly via API for security reasons.
      paymentData: JSON.stringify({ paid: false }),
      reportGenerated: data.reportGenerated ? 1 : 0,
      pdfUrl: data.pdfUrl || ""
    }).returning();
    return c.json({ data: inspection[0] }, 201);
  });
  app.put("/api/inspections/:id", async (c) => {
    const userId = auth.user.id;
    const id = c.req.param("id");
    const data = await c.req.json();
    const existing = await requireOwnership(userId, id);
    if (!existing) return c.json({ error: "Inspection not found" }, 404);
    const updateData = { updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
    if (data.status !== void 0) updateData.status = data.status;
    if (data.generalNotes !== void 0) updateData.generalNotes = data.generalNotes;
    if (data.property !== void 0) updateData.propertyData = JSON.stringify(data.property);
    if (data.tenant !== void 0) updateData.tenantData = JSON.stringify(data.tenant);
    if (data.landlord !== void 0) updateData.landlordData = JSON.stringify(data.landlord);
    if (data.agent !== void 0) updateData.agentData = JSON.stringify(data.agent);
    if (data.tenancy !== void 0) updateData.tenancyData = JSON.stringify(data.tenancy);
    if (data.rooms !== void 0) updateData.roomsData = JSON.stringify(data.rooms);
    if (data.propertyItems !== void 0) updateData.propertyItems = JSON.stringify(data.propertyItems);
    if (data.signatures !== void 0) updateData.signatures = JSON.stringify(data.signatures);
    if (data.overallPhotos !== void 0) updateData.overallPhotos = JSON.stringify(data.overallPhotos);
    if (data.reportGenerated !== void 0) updateData.reportGenerated = data.reportGenerated ? 1 : 0;
    if (data.completedAt !== void 0) updateData.completedAt = data.completedAt;
    if (data.pdfUrl !== void 0) updateData.pdfUrl = data.pdfUrl;
    await db.update(db_schema_exports.inspections).set(updateData).where(eq(db_schema_exports.inspections.id, id));
    return c.json({ success: true });
  });
  app.delete("/api/inspections/:id", async (c) => {
    const userId = auth.user.id;
    const id = c.req.param("id");
    const existing = await requireOwnership(userId, id);
    if (!existing) return c.json({ error: "Inspection not found" }, 404);
    await db.delete(db_schema_exports.inspections).where(
      and(
        eq(db_schema_exports.inspections.id, id),
        eq(db_schema_exports.inspections.userId, userId)
      )
    );
    return c.json({ success: true });
  });
  app.post("/api/send-email", async (c) => {
    if (!auth.user) return c.json({ error: "Unauthorized" }, 401);
    const { to, subject, html, from } = await c.req.json();
    if (!to || !subject || !html) {
      return c.json({ error: "to, subject, and html are required" }, 400);
    }
    const EMAIL_REGEX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
    const recipientList = Array.isArray(to) ? to : [to];
    const invalidEmails = recipientList.filter((email) => !EMAIL_REGEX.test(email));
    if (invalidEmails.length > 0) {
      return c.json({ error: `Invalid email address(es): ${invalidEmails.join(", ")}` }, 400);
    }
    const htmlBytes = new TextEncoder().encode(html).length;
    const MAX_HTML_BYTES = 8 * 1024 * 1024;
    if (htmlBytes > MAX_HTML_BYTES) {
      return c.json({
        error: `Email content too large (${(htmlBytes / (1024 * 1024)).toFixed(1)} MB). Please compress images before sending. Maximum allowed: 8 MB.`
      }, 413);
    }
    const apiKey = secret.get("RESEND_API_KEY");
    if (!apiKey) {
      return c.json({ error: "Email service not configured (RESEND_API_KEY missing)" }, 500);
    }
    const fromEmail = secret.get("FROM_EMAIL") || from || "MeInspect <hello@meinspect.com>";
    const recipients = recipientList;
    try {
      const results = [];
      for (const recipient of recipients) {
        try {
          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${apiKey}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              from: fromEmail,
              to: [recipient],
              subject,
              html
            })
          });
          const data = await res.json();
          if (res.ok) {
            results.push({ email: recipient, success: true, id: data.id });
          } else {
            console.error(`[EMAIL] Resend error for ${recipient}:`, data);
            results.push({ email: recipient, success: false, error: data.message || data.error || "Send failed" });
          }
        } catch (err) {
          console.error(`[EMAIL] Network error for ${recipient}:`, err);
          results.push({
            email: recipient,
            success: false,
            error: err instanceof Error ? err.message : "Network error"
          });
        }
      }
      const allSuccess = results.every((r) => r.success);
      const firstError = results.find((r) => !r.success)?.error || "";
      return c.json({
        success: allSuccess,
        results,
        sentCount: results.filter((r) => r.success).length,
        failedCount: results.filter((r) => !r.success).length,
        error: allSuccess ? void 0 : firstError
      });
    } catch (err) {
      return c.json({
        error: err instanceof Error ? err.message : "Email sending failed"
      }, 500);
    }
  });
  app.get("/api/sync/inspections", async (c) => {
    const userId = auth.user.id;
    const inspections2 = await db.select().from(db_schema_exports.inspections).where(eq(db_schema_exports.inspections.userId, userId));
    const parsed = inspections2.map((row) => ({
      id: row.id,
      userId: row.userId,
      propertyType: row.propertyType,
      status: row.status,
      generalNotes: row.generalNotes,
      reportGenerated: row.reportGenerated,
      pdfUrl: row.pdfUrl || "",
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      completedAt: row.completedAt,
      property: tryParse(row.propertyData),
      tenant: tryParse(row.tenantData),
      landlord: tryParse(row.landlordData),
      agent: tryParse(row.agentData),
      tenancy: tryParse(row.tenancyData),
      rooms: tryParse(row.roomsData),
      propertyItems: tryParse(row.propertyItems),
      signatures: tryParse(row.signatures),
      overallPhotos: tryParse(row.overallPhotos),
      payment: tryParse(row.paymentData)
    }));
    return c.json({ data: parsed, count: parsed.length });
  });
  app.post("/api/sync/push", async (c) => {
    const userId = auth.user.id;
    const { inspections: items2 } = await c.req.json();
    if (!Array.isArray(items2)) return c.json({ error: "inspections array required" }, 400);
    let created = 0;
    let updated = 0;
    for (const inspection of items2) {
      try {
        const existing = await db.select().from(db_schema_exports.inspections).where(
          and(
            eq(db_schema_exports.inspections.id, inspection.id),
            eq(db_schema_exports.inspections.userId, userId)
          )
        );
        const updateData = {
          status: inspection.status,
          generalNotes: inspection.generalNotes || "",
          propertyType: inspection.propertyType || "apartment",
          propertyData: JSON.stringify(inspection.property || {}),
          tenantData: JSON.stringify(inspection.tenant || {}),
          landlordData: JSON.stringify(inspection.landlord || {}),
          agentData: JSON.stringify(inspection.agent || {}),
          tenancyData: JSON.stringify(inspection.tenancy || {}),
          roomsData: JSON.stringify(inspection.rooms || []),
          propertyItems: JSON.stringify(inspection.propertyItems || []),
          signatures: JSON.stringify(inspection.signatures || []),
          overallPhotos: JSON.stringify(inspection.overallPhotos || []),
          // Payment status cannot be pushed from client for security reasons.
          reportGenerated: inspection.reportGenerated ? 1 : 0,
          pdfUrl: inspection.pdfUrl || "",
          updatedAt: (/* @__PURE__ */ new Date()).toISOString()
        };
        if (inspection.completedAt) updateData.completedAt = inspection.completedAt;
        if (existing.length > 0) {
          await db.update(db_schema_exports.inspections).set(updateData).where(eq(db_schema_exports.inspections.id, inspection.id));
          updated++;
        } else {
          await db.insert(db_schema_exports.inspections).values({
            id: inspection.id,
            userId,
            ...updateData,
            createdAt: inspection.createdAt || (/* @__PURE__ */ new Date()).toISOString()
          });
          created++;
        }
      } catch (err) {
        console.warn(`Failed to sync inspection ${inspection.id}:`, err);
      }
    }
    return c.json({ success: true, created, updated });
  });
  app.post("/api/upload/pdf", async (c) => {
    const { inspectionId } = await c.req.json();
    if (!inspectionId) return c.json({ error: "inspectionId required" }, 400);
    const userId = auth.user.id;
    const row = await requireOwnership(userId, inspectionId);
    if (!row) return c.json({ error: "Inspection not found" }, 404);
    const path = `reports/${userId}/${inspectionId}.pdf`;
    const { uploadUrl, expiresAt } = await storage.from(storage_schema_exports.meinspect_reports).createPresignedPutUrl(path, 3600);
    await db.update(db_schema_exports.inspections).set({ pdfUrl: path, updatedAt: (/* @__PURE__ */ new Date()).toISOString() }).where(eq(db_schema_exports.inspections.id, inspectionId));
    return c.json({ uploadUrl, path, expiresAt });
  });
  app.get("/api/download/pdf/:inspectionId", async (c) => {
    const userId = auth.user.id;
    const inspectionId = c.req.param("inspectionId");
    const row = await requireOwnership(userId, inspectionId);
    if (!row) return c.json({ error: "Not found" }, 404);
    const path = row.pdfUrl;
    if (!path) return c.json({ error: "PDF not available for this inspection" }, 404);
    const { downloadUrl, expiresAt } = await storage.from(storage_schema_exports.meinspect_reports).createPresignedGetUrl(path, 3600);
    return c.json({ downloadUrl, expiresAt });
  });
  app.post("/api/upload/photo", async (c) => {
    const { inspectionId, photoId, contentType } = await c.req.json();
    if (!inspectionId || !photoId) return c.json({ error: "inspectionId and photoId required" }, 400);
    const userId = auth.user.id;
    const row = await requireOwnership(userId, inspectionId);
    if (!row) return c.json({ error: "Inspection not found" }, 404);
    const ext = (contentType || "image/jpeg").includes("png") ? "png" : "jpg";
    const path = `photos/${userId}/${inspectionId}/${photoId}.${ext}`;
    const { uploadUrl, expiresAt } = await storage.from(storage_schema_exports.meinspect_reports).createPresignedPutUrl(path, 3600);
    return c.json({ uploadUrl, path, expiresAt });
  });
  app.get("/api/download/photo", async (c) => {
    const userId = auth.user.id;
    const path = c.req.query("path");
    if (!path) return c.json({ error: "path query param required" }, 400);
    if (!path.startsWith(`photos/${userId}/`) && !path.startsWith(`reports/${userId}/`)) {
      return c.json({ error: "Access denied" }, 403);
    }
    const { downloadUrl, expiresAt } = await storage.from(storage_schema_exports.meinspect_reports).createPresignedGetUrl(path, 3600);
    return c.json({ downloadUrl, expiresAt });
  });
  app.post("/api/download/photos", async (c) => {
    const userId = auth.user.id;
    const { paths } = await c.req.json();
    if (!Array.isArray(paths)) return c.json({ error: "paths array required" }, 400);
    const urls = await Promise.all(
      paths.map(async (path) => {
        try {
          if (!path.startsWith(`photos/${userId}/`) && !path.startsWith(`reports/${userId}/`)) {
            return { path, ok: false, error: "Access denied" };
          }
          const { downloadUrl, expiresAt } = await storage.from(storage_schema_exports.meinspect_reports).createPresignedGetUrl(path, 3600);
          return { path, downloadUrl, expiresAt, ok: true };
        } catch {
          return { path, ok: false };
        }
      })
    );
    return c.json({ urls });
  });
  app.post("/api/checkout", async (c) => {
    const userId = auth.user.id;
    const { amount, currency = "AED", inspectionId, discountCode, discountAmount } = await c.req.json();
    const userRows = await db.select().from(db_schema_exports.users).where(eq(db_schema_exports.users.id, userId));
    const isTester = userRows.length > 0 && userRows[0].isTester === 1;
    const freeCredits = userRows.length > 0 ? userRows[0].freeInspections ?? 0 : 0;
    if (isTester) {
      const sessionId = `tester_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const order = await db.insert(db_schema_exports.orders).values({
        environment: getEnv(),
        userId,
        inspectionId: inspectionId || null,
        amount: amount || 0,
        currency,
        status: "paid",
        paidAt: Math.floor(Date.now() / 1e3),
        type: "one_time",
        provider: "tester",
        providerSessionId: sessionId,
        discountCode: "TESTER_PROVISION",
        discountAmount: amount || 0
      }).returning();
      return c.json({
        success: true,
        sessionId,
        orderId: order[0].id,
        status: "paid",
        message: "Tester payment processed successfully (Free)"
      });
    }
    const stripeKey = secret.get("STRIPE_SECRET_KEY");
    const priceId = secret.get("STRIPE_PRICE_ID");
    if (freeCredits > 0) {
      const sessionId = `credit_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const order = await db.insert(db_schema_exports.orders).values({
        environment: getEnv(),
        userId,
        inspectionId: inspectionId || null,
        amount: 0,
        currency,
        status: "paid",
        paidAt: Math.floor(Date.now() / 1e3),
        type: "one_time",
        provider: "admin_credit",
        providerSessionId: sessionId,
        discountCode: "ADMIN_CREDIT",
        discountAmount: amount || 199
      }).returning();
      await db.update(db_schema_exports.users).set({ freeInspections: freeCredits - 1 }).where(eq(db_schema_exports.users.id, userId));
      console.log(`[CHECKOUT] Used 1 admin credit for user ${userId}. Remaining: ${freeCredits - 1}`);
      if (inspectionId) {
        await db.update(db_schema_exports.inspections).set({ paymentData: JSON.stringify({ paid: true, sessionId, provider: "admin_credit" }) }).where(eq(db_schema_exports.inspections.id, inspectionId));
      }
      return c.json({
        success: true,
        sessionId,
        orderId: order[0].id,
        status: "paid",
        message: "Free inspection credit used successfully."
      });
    }
    if (!stripeKey || !priceId) {
      return c.json({ error: "Stripe is not fully configured (missing key or price ID)" }, 500);
    }
    const stripe = new stripe_esm_worker_default(stripeKey, { apiVersion: "2023-10-16" });
    const BASE_PRICE = 199;
    const VALID_DISCOUNT_CODES = {
      "WELCOME20": { type: "percent", value: 20 },
      "LAUNCH50": { type: "fixed", value: 50 },
      "MEINSPECT10": { type: "percent", value: 10 },
      "INSPECTOR": { type: "fixed", value: 100 },
      "FREE_REPORT": { type: "percent", value: 100 }
    };
    let finalAmount = BASE_PRICE;
    if (discountCode) {
      const offer = VALID_DISCOUNT_CODES[discountCode.toUpperCase()];
      if (offer) {
        const discount = offer.type === "percent" ? Math.round(BASE_PRICE * offer.value / 100) : offer.value;
        finalAmount = Math.max(0, BASE_PRICE - discount);
      }
    }
    if (finalAmount === 0) {
      const sessionId = `free_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const order = await db.insert(db_schema_exports.orders).values({
        environment: getEnv(),
        userId,
        inspectionId: inspectionId || null,
        amount: 0,
        currency,
        status: "paid",
        paidAt: Math.floor(Date.now() / 1e3),
        type: "one_time",
        provider: "discount",
        providerSessionId: sessionId,
        discountCode: discountCode || "FREE_PROMO",
        discountAmount: BASE_PRICE
      }).returning();
      return c.json({
        success: true,
        sessionId,
        orderId: order[0].id,
        status: "paid",
        message: "Free report processed successfully"
      });
    }
    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: currency.toLowerCase(),
              product_data: {
                name: "Property Inspection Report",
                description: discountCode ? `Discount applied: ${discountCode}` : void 0
              },
              unit_amount: finalAmount * 100
              // Stripe expects cents
            },
            quantity: 1
          }
        ],
        mode: "payment",
        invoice_creation: {
          enabled: true
        },
        success_url: `${c.req.header("origin")}/report/${inspectionId}?payment=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${c.req.header("origin")}/report/${inspectionId}?payment=cancel`,
        metadata: {
          userId,
          inspectionId: inspectionId || "",
          reportId: inspectionId || ""
          // Explicitly adding reportId as requested
        }
      });
      const order = await db.insert(db_schema_exports.orders).values({
        environment: getEnv(),
        userId,
        inspectionId: inspectionId || null,
        amount: finalAmount,
        currency,
        status: "pending",
        type: "one_time",
        provider: "stripe",
        providerSessionId: session.id,
        discountCode: discountCode || null,
        discountAmount: BASE_PRICE - finalAmount
      }).returning();
      return c.json({
        success: true,
        sessionId: session.id,
        url: session.url,
        orderId: order[0].id,
        status: "pending"
      });
    } catch (err) {
      console.error("[STRIPE] error:", err);
      return c.json({ error: err.message }, 500);
    }
  });
  app.get("/api/checkout/:sessionId", async (c) => {
    const userId = auth.user.id;
    const sessionId = c.req.param("sessionId");
    const result = await db.select().from(db_schema_exports.orders).where(
      and(
        eq(db_schema_exports.orders.providerSessionId, sessionId),
        eq(db_schema_exports.orders.userId, userId)
      )
    );
    if (result.length === 0) return c.json({ error: "Session not found" }, 404);
    let order = result[0];
    if (order.status === "pending" && order.provider === "stripe") {
      const stripeKey = secret.get("STRIPE_SECRET_KEY");
      if (stripeKey) {
        const stripe = new stripe_esm_worker_default(stripeKey, { apiVersion: "2023-10-16" });
        try {
          const session = await stripe.checkout.sessions.retrieve(sessionId);
          if (session.payment_status === "paid") {
            const updated = await db.update(db_schema_exports.orders).set({
              status: "paid",
              paidAt: Math.floor(Date.now() / 1e3)
            }).where(eq(db_schema_exports.orders.id, order.id)).returning();
            order = updated[0];
            if (order.inspectionId) {
              const inspectionRows = await db.select().from(db_schema_exports.inspections).where(eq(db_schema_exports.inspections.id, order.inspectionId));
              if (inspectionRows.length > 0) {
                const currentData = tryParse(inspectionRows[0].paymentData);
                await db.update(db_schema_exports.inspections).set({
                  paymentData: JSON.stringify({ ...currentData, paid: true, sessionId: session.id })
                }).where(eq(db_schema_exports.inspections.id, order.inspectionId));
              }
            }
          }
        } catch (err) {
          console.error("[STRIPE] status check error:", err);
        }
      }
    }
    return c.json({ data: order });
  });
  app.post("/api/webhooks/stripe", async (c) => {
    const signature = c.req.header("stripe-signature");
    const signingSecret = secret.get("StripeSigningSecret");
    if (!signature || !signingSecret) {
      console.warn("[WEBHOOK] Missing signature or secret");
      return c.json({ error: "Missing signature or secret" }, 400);
    }
    const stripeKey = secret.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      console.error("[WEBHOOK] STRIPE_SECRET_KEY not configured");
      return c.json({ error: "Stripe not configured" }, 500);
    }
    const stripe = new stripe_esm_worker_default(stripeKey, { apiVersion: "2023-10-16" });
    try {
      const body = await c.req.text();
      const event = stripe.webhooks.constructEvent(body, signature, signingSecret);
      console.log(`[WEBHOOK] Received event: ${event.type}`);
      if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        const reportId = session.metadata?.reportId || session.metadata?.inspectionId;
        const userId = session.metadata?.userId;
        console.log(`[WEBHOOK] Checkout completed for report: ${reportId}, user: ${userId}`);
        if (reportId) {
          await db.update(db_schema_exports.orders).set({
            status: "paid",
            paidAt: Math.floor(Date.now() / 1e3)
          }).where(eq(db_schema_exports.orders.providerSessionId, session.id));
          const inspectionRows = await db.select().from(db_schema_exports.inspections).where(eq(db_schema_exports.inspections.id, reportId));
          if (inspectionRows.length > 0) {
            const currentData = tryParse(inspectionRows[0].paymentData);
            await db.update(db_schema_exports.inspections).set({
              paymentData: JSON.stringify({ ...currentData, paid: true, sessionId: session.id })
            }).where(eq(db_schema_exports.inspections.id, reportId));
            console.log(`[WEBHOOK] Successfully marked report ${reportId} as paid`);
            if (userId) {
              const userRows = await db.select().from(db_schema_exports.users).where(eq(db_schema_exports.users.id, userId));
              if (userRows.length > 0) {
                const user = userRows[0];
                const amount = session.amount_total ? session.amount_total / 100 : 199;
                const currency = session.currency?.toUpperCase() || "AED";
                const subject = `Payment Successful: MeInspect Report (RPT-${reportId.slice(0, 8).toUpperCase()})`;
                const html = `
                  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">
                    <div style="text-align: center; margin-bottom: 32px;">
                      <div style="width: 64px; height: 64px; background: #f0fdf4; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px;">
                        <span style="font-size: 32px;">\u2705</span>
                      </div>
                      <h1 style="font-size: 24px; color: #1e293b; margin: 0;">Payment Received</h1>
                      <p style="color: #64748b; font-size: 14px; margin-top: 8px;">Thank you for your purchase</p>
                    </div>
                    <div style="background: #f8fafc; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                      <p style="color: #334155; font-size: 15px; line-height: 1.6; margin: 0;">
                        Hi ${user.name || "there"},<br/><br/>
                        We've successfully received your payment of <strong>${currency} ${amount}</strong> for the property inspection report.
                      </p>
                      <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-top: 16px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                          <span style="color: #64748b; font-size: 12px;">Report ID</span>
                          <span style="color: #1e293b; font-size: 12px; font-weight: 600;">RPT-${reportId.slice(0, 8).toUpperCase()}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                          <span style="color: #64748b; font-size: 12px;">Amount Paid</span>
                          <span style="color: #1e293b; font-size: 12px; font-weight: 600;">${currency} ${amount}</span>
                        </div>
                      </div>
                    </div>
                    <div style="text-align: center;">
                      <a href="${c.req.url.split("/api")[0]}/report/${reportId}" 
                         style="display: inline-block; background: #2563eb; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
                        Access Your Report
                      </a>
                    </div>
                    <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 32px;">
                      MeInspect \u2014 Property Condition Reports for Landlords, Tenants & Inspectors
                    </p>
                  </div>
                `;
                await sendNotificationEmail(user.email, subject, html);
                console.log(`[WEBHOOK] Sent payment success notification to ${user.email}`);
              }
            }
          }
        }
      }
      return c.json({ received: true });
    } catch (err) {
      console.error("[WEBHOOK] error:", err.message);
      return c.json({ error: `Webhook Error: ${err.message}` }, 400);
    }
  });
  app.post("/api/webhooks/revenuecat", async (c) => {
    const expectedSecret = secret.get("REVENUECAT_WEBHOOK_SECRET");
    if (!expectedSecret) {
      console.error("[REVENUECAT_WEBHOOK] REVENUECAT_WEBHOOK_SECRET not configured \u2014 rejecting all requests");
      return c.json({ error: "Webhook not configured" }, 500);
    }
    const authHeader = c.req.header("Authorization");
    if (!authHeader || authHeader !== `Bearer ${expectedSecret}`) {
      console.warn("[REVENUECAT_WEBHOOK] Unauthorized request \u2014 missing/invalid Authorization header");
      return c.json({ error: "Unauthorized" }, 401);
    }
    let body;
    try {
      body = await c.req.json();
    } catch (err) {
      console.error("[REVENUECAT_WEBHOOK] Invalid JSON body:", err);
      return c.json({ error: "Invalid JSON body" }, 400);
    }
    const event = body?.event;
    if (!event || typeof event !== "object") {
      console.warn("[REVENUECAT_WEBHOOK] Missing event object in payload");
      return c.json({ error: "Missing event" }, 400);
    }
    const eventType = event.type;
    const productId = event.product_id;
    const inspectionId = event.app_user_id;
    const transactionId = event.transaction_id || event.original_transaction_id;
    const eventId = event.id;
    console.log(`[REVENUECAT_WEBHOOK] Received event: type=${eventType} product=${productId} app_user_id=${inspectionId} event_id=${eventId}`);
    const REPORT_PRODUCT_ID = "com.meinspect.app.report";
    if (productId !== REPORT_PRODUCT_ID) {
      console.log(`[REVENUECAT_WEBHOOK] Ignoring event for unrelated product: ${productId}`);
      return c.json({ received: true });
    }
    if (!inspectionId) {
      console.warn("[REVENUECAT_WEBHOOK] Event missing app_user_id \u2014 cannot resolve inspection, ignoring");
      return c.json({ received: true });
    }
    const inspectionRows = await db.select().from(db_schema_exports.inspections).where(eq(db_schema_exports.inspections.id, inspectionId));
    if (inspectionRows.length === 0) {
      console.warn(`[REVENUECAT_WEBHOOK] No inspection found for app_user_id=${inspectionId} \u2014 ignoring`);
      return c.json({ received: true });
    }
    const currentData = tryParse(inspectionRows[0].paymentData);
    if (eventType === "INITIAL_PURCHASE") {
      await db.update(db_schema_exports.inspections).set({
        paymentData: JSON.stringify({
          ...currentData,
          paid: true,
          provider: "revenuecat",
          productId,
          transactionId,
          paidAt: Math.floor(Date.now() / 1e3)
        })
      }).where(eq(db_schema_exports.inspections.id, inspectionId));
      console.log(`[REVENUECAT_WEBHOOK] Unlocked report ${inspectionId} via verified RevenueCat INITIAL_PURCHASE (transaction ${transactionId})`);
    } else if (eventType === "CANCELLATION" || eventType === "REFUND") {
      await db.update(db_schema_exports.inspections).set({
        paymentData: JSON.stringify({
          ...currentData,
          paid: false,
          provider: "revenuecat",
          productId,
          transactionId,
          revokedAt: Math.floor(Date.now() / 1e3),
          revokedReason: eventType
        })
      }).where(eq(db_schema_exports.inspections.id, inspectionId));
      console.warn(`[REVENUECAT_WEBHOOK] Revoked report ${inspectionId} access due to ${eventType} (transaction ${transactionId})`);
    } else {
      console.log(`[REVENUECAT_WEBHOOK] No action taken for event type: ${eventType}`);
    }
    return c.json({ received: true });
  });
  app.get("/api/orders", async (c) => {
    const userId = auth.user.id;
    const orders2 = await db.select().from(db_schema_exports.orders).where(eq(db_schema_exports.orders.userId, userId));
    return c.json({ data: orders2 });
  });
  app.get("/api/orders/:id/invoice", async (c) => {
    const userId = auth.user.id;
    const orderId = parseInt(c.req.param("id"));
    const result = await db.select().from(db_schema_exports.orders).where(
      and(
        eq(db_schema_exports.orders.id, orderId),
        eq(db_schema_exports.orders.userId, userId)
      )
    );
    if (result.length === 0) return c.json({ error: "Order not found" }, 404);
    const order = result[0];
    if (order.provider !== "stripe" || !order.providerSessionId) {
      return c.json({ error: "Invoice not available for this order" }, 400);
    }
    const stripeKey = secret.get("STRIPE_SECRET_KEY");
    if (!stripeKey) return c.json({ error: "Stripe not configured" }, 500);
    const stripe = new stripe_esm_worker_default(stripeKey, { apiVersion: "2023-10-16" });
    try {
      const session = await stripe.checkout.sessions.retrieve(order.providerSessionId, {
        expand: ["invoice"]
      });
      const invoice = session.invoice;
      if (!invoice || !invoice.hosted_invoice_url) {
        return c.json({ error: "Invoice not yet generated" }, 404);
      }
      return c.json({ url: invoice.hosted_invoice_url });
    } catch (err) {
      console.error("[STRIPE] invoice error:", err);
      return c.json({ error: err.message }, 500);
    }
  });
  const requireAdmin = async (c) => {
    const userId = auth.user?.id;
    if (!userId) return false;
    const userRows = await db.select().from(db_schema_exports.users).where(eq(db_schema_exports.users.id, userId));
    const isAdmin = userRows.length > 0 && (userRows[0].isTester === 1 || auth.user?.email === "aalekh.dxb@gmail.com");
    return isAdmin;
  };
  app.post("/api/admin/prices", async (c) => {
    if (!await requireAdmin(c)) return c.json({ error: "Unauthorized" }, 403);
    const { name, amount, currency = "AED", type = "one_time" } = await c.req.json();
    const env = getEnv();
    const row = await db.insert(db_schema_exports.paymentPrices).values({
      environment: env,
      name,
      amount,
      currency,
      type,
      provider: "stripe"
    }).returning();
    return c.json({ data: row[0] }, 201);
  });
  app.get("/api/admin/prices", async (c) => {
    if (!await requireAdmin(c)) return c.json({ error: "Unauthorized" }, 403);
    const env = getEnv();
    const prices = await db.select().from(db_schema_exports.paymentPrices).where(eq(db_schema_exports.paymentPrices.environment, env));
    return c.json({ data: prices });
  });
  app.post("/api/admin/set-tester", async (c) => {
    if (!await requireAdmin(c)) return c.json({ error: "Unauthorized" }, 403);
    const { email, isTester } = await c.req.json();
    await db.update(db_schema_exports.users).set({ isTester: isTester ? 1 : 0 }).where(eq(db_schema_exports.users.email, email));
    return c.json({ success: true, message: `User ${email} tester status set to ${isTester}` });
  });
  const requireAdminSecret = (c) => {
    const provided = c.req.header("X-Admin-Secret");
    const expected = secret.get("ADMIN_SECRET");
    if (!expected) {
      return auth.user?.email === "aalekh.dxb@gmail.com";
    }
    return provided === expected;
  };
  app.get("/api/public/admin/users", async (c) => {
    if (!requireAdminSecret(c)) return c.json({ error: "Unauthorized" }, 403);
    const q = c.req.query("q") || "";
    let rows;
    if (q) {
      rows = await db.select().from(db_schema_exports.users);
      rows = rows.filter(
        (u) => u.email?.toLowerCase().includes(q.toLowerCase()) || u.name?.toLowerCase().includes(q.toLowerCase())
      );
    } else {
      rows = await db.select().from(db_schema_exports.users);
    }
    const enriched = await Promise.all(rows.map(async (u) => {
      const inspectionCount = await db.select().from(db_schema_exports.inspections).where(eq(db_schema_exports.inspections.userId, u.id));
      return {
        id: u.id,
        email: u.email,
        name: u.name,
        phone: u.phone,
        location: u.location,
        isTester: u.isTester,
        freeInspections: u.freeInspections ?? 0,
        totalInspections: inspectionCount.length,
        createdAt: u.createdAt
      };
    }));
    return c.json({ data: enriched });
  });
  app.post("/api/public/admin/grant-credits", async (c) => {
    if (!requireAdminSecret(c)) return c.json({ error: "Unauthorized" }, 403);
    const { email, count = 1 } = await c.req.json();
    if (!email) return c.json({ error: "email is required" }, 400);
    const n = Math.max(1, Math.min(100, parseInt(count, 10) || 1));
    const userRows = await db.select().from(db_schema_exports.users).where(eq(db_schema_exports.users.email, email));
    if (userRows.length === 0) return c.json({ error: `No user found with email: ${email}` }, 404);
    const user = userRows[0];
    const newBalance = (user.freeInspections ?? 0) + n;
    await db.update(db_schema_exports.users).set({ freeInspections: newBalance }).where(eq(db_schema_exports.users.email, email));
    console.log(`[ADMIN] Granted ${n} free inspection(s) to ${email}. New balance: ${newBalance}`);
    return c.json({
      success: true,
      email,
      granted: n,
      newBalance,
      message: `Granted ${n} free inspection(s) to ${email}. Balance is now ${newBalance}.`
    });
  });
  app.post("/api/public/admin/revoke-credits", async (c) => {
    if (!requireAdminSecret(c)) return c.json({ error: "Unauthorized" }, 403);
    const { email, count = 1 } = await c.req.json();
    if (!email) return c.json({ error: "email is required" }, 400);
    const n = Math.max(1, parseInt(count, 10) || 1);
    const userRows = await db.select().from(db_schema_exports.users).where(eq(db_schema_exports.users.email, email));
    if (userRows.length === 0) return c.json({ error: `No user found with email: ${email}` }, 404);
    const user = userRows[0];
    const newBalance = Math.max(0, (user.freeInspections ?? 0) - n);
    await db.update(db_schema_exports.users).set({ freeInspections: newBalance }).where(eq(db_schema_exports.users.email, email));
    return c.json({
      success: true,
      email,
      revoked: n,
      newBalance,
      message: `Removed ${n} credit(s) from ${email}. Balance is now ${newBalance}.`
    });
  });
  async function sendNotificationEmail(to, subject, html) {
    const apiKey = secret.get("RESEND_API_KEY");
    const fromEmail = secret.get("FROM_EMAIL") || "MeInspect <hello@meinspect.com>";
    if (!apiKey) {
      console.error("[NOTIFICATIONS] RESEND_API_KEY not configured \u2014 email NOT sent to", to);
      return { ok: false, error: "RESEND_API_KEY not configured" };
    }
    try {
      console.log(`[NOTIFICATIONS] Sending "${subject}" to ${to} from ${fromEmail}`);
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [to],
          subject,
          html
        })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        console.log(`[NOTIFICATIONS] Resend accepted email to ${to} \u2014 id: ${data.id}`);
        return { ok: true, id: data.id, status: res.status };
      }
      const errMsg = data.message || data.error || data.name || `HTTP ${res.status}`;
      console.error(`[NOTIFICATIONS] Resend REJECTED email to ${to} (status ${res.status}):`, errMsg, data);
      return { ok: false, error: errMsg, status: res.status };
    } catch (err) {
      console.error("[NOTIFICATIONS] Network error sending email to", to, ":", err);
      return { ok: false, error: err instanceof Error ? err.message : "Network error" };
    }
  }
  function buildWelcomeHtml(name) {
    return `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="font-size: 24px; color: #1e293b; margin: 0;">Welcome to MeInspect</h1>
          <p style="color: #64748b; font-size: 14px; margin-top: 8px;">Professional Property Condition Reports</p>
        </div>
        <div style="background: #f8fafc; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
          <p style="color: #334155; font-size: 15px; line-height: 1.6; margin: 0;">
            Hi ${name || "there"},<br/><br/>
            Thank you for joining MeInspect! You can now create professional property condition reports with timestamped photos, detailed assessments, and digital signatures.
          </p>
        </div>
        <div style="text-align: center;">
          <a href="https://app.meinspect.com"
             style="display: inline-block; background: #2563eb; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
            Get Started
          </a>
        </div>
        <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 32px;">
          MeInspect \u2014 Property Condition Reports for Landlords, Tenants & Inspectors
        </p>
      </div>
    `;
  }
  app.post("/api/public/notifications/welcome", async (c) => {
    const { email, name } = await c.req.json().catch(() => ({}));
    if (!email) return c.json({ error: "email is required" }, 400);
    let authUser = null;
    try {
      const rows = await db.select().from(db_schema_exports.esSystemAuthUser).where(eq(db_schema_exports.esSystemAuthUser.email, String(email).toLowerCase().trim()));
      authUser = rows[0] || null;
    } catch (e) {
      console.error("[NOTIFICATIONS] welcome lookup failed:", e);
    }
    if (!authUser) {
      console.warn("[NOTIFICATIONS] welcome requested for unknown email:", email);
      return c.json({ success: false, error: "not_registered" }, 200);
    }
    const createdAt = Number(authUser.createdAt || 0);
    const ageMs = Date.now() - createdAt;
    if (createdAt > 0 && ageMs > 30 * 60 * 1e3) {
      console.warn("[NOTIFICATIONS] welcome skipped \u2014 account not fresh:", email, "ageMs:", ageMs);
      return c.json({ success: false, error: "not_fresh" }, 200);
    }
    const result = await sendNotificationEmail(
      authUser.email,
      "Welcome to MeInspect!",
      buildWelcomeHtml(name || authUser.name)
    );
    return c.json({ success: result.ok, error: result.error });
  });
  app.post("/api/notifications/welcome", async (c) => {
    if (!auth.user) return c.json({ error: "Unauthorized" }, 401);
    const { name, email } = await c.req.json();
    if (!email) return c.json({ error: "email is required" }, 400);
    const subject = "Welcome to MeInspect!";
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="font-size: 24px; color: #1e293b; margin: 0;">Welcome to MeInspect</h1>
          <p style="color: #64748b; font-size: 14px; margin-top: 8px;">Professional Property Condition Reports</p>
        </div>
        <div style="background: #f8fafc; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
          <p style="color: #334155; font-size: 15px; line-height: 1.6; margin: 0;">
            Hi ${name || "there"},<br/><br/>
            Thank you for joining MeInspect! You can now create professional property condition reports with timestamped photos, detailed assessments, and digital signatures.
          </p>
        </div>
        <div style="text-align: center;">
          <a href="${typeof c !== "undefined" ? c.req.url.split("/api")[0] : "https://meinspect.ae"}" 
             style="display: inline-block; background: #2563eb; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
            Get Started
          </a>
        </div>
        <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 32px;">
          MeInspect \u2014 Property Condition Reports for Landlords, Tenants & Inspectors
        </p>
      </div>
    `;
    const result = await sendNotificationEmail(email, subject, html);
    return c.json({ success: result.ok, error: result.error });
  });
  app.post("/api/notifications/report-complete", async (c) => {
    if (!auth.user) return c.json({ error: "Unauthorized" }, 401);
    const { email, name, reportName, reportId } = await c.req.json();
    if (!email || !reportId) return c.json({ error: "email and reportId are required" }, 400);
    const shortId = reportId.slice(0, 8).toUpperCase();
    const subject = `MeInspect Report Ready: ${reportName || "Property Report"} (RPT-${shortId})`;
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="font-size: 24px; color: #1e293b; margin: 0;">Report Ready</h1>
          <p style="color: #64748b; font-size: 14px; margin-top: 8px;">Your property condition report has been generated</p>
        </div>
        <div style="background: #f8fafc; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
          <p style="color: #334155; font-size: 15px; line-height: 1.6; margin: 0;">
            Hi ${name || "there"},<br/><br/>
            Your property condition report <strong>${reportName || "Property Report"}</strong> (RPT-${shortId}) is ready for review.
          </p>
          <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-top: 16px;">
            <p style="color: #64748b; font-size: 12px; margin: 0;">Report ID</p>
            <p style="color: #1e293b; font-size: 14px; font-weight: 600; margin: 4px 0 0 0;">RPT-${shortId}</p>
          </div>
        </div>
        <div style="text-align: center;">
          <a href="${typeof c !== "undefined" ? c.req.url.split("/api")[0] : "https://meinspect.ae"}/report/${reportId}" 
             style="display: inline-block; background: #2563eb; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
            View Report
          </a>
        </div>
        <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 32px;">
          MeInspect \u2014 Property Condition Reports for Landlords, Tenants & Inspectors
        </p>
      </div>
    `;
    const result = await sendNotificationEmail(email, subject, html);
    return c.json({ success: result.ok, error: result.error });
  });
  app.post("/api/notifications/payment-success", async (c) => {
    if (!auth.user) return c.json({ error: "Unauthorized" }, 401);
    const { email, name, amount, currency, reportId } = await c.req.json();
    if (!email || !reportId) return c.json({ error: "email and reportId are required" }, 400);
    const subject = `Payment Successful: MeInspect Report (RPT-${reportId.slice(0, 8).toUpperCase()})`;
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <div style="width: 64px; height: 64px; background: #f0fdf4; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px;">
            <span style="font-size: 32px;">\u2705</span>
          </div>
          <h1 style="font-size: 24px; color: #1e293b; margin: 0;">Payment Received</h1>
          <p style="color: #64748b; font-size: 14px; margin-top: 8px;">Thank you for your purchase</p>
        </div>
        <div style="background: #f8fafc; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
          <p style="color: #334155; font-size: 15px; line-height: 1.6; margin: 0;">
            Hi ${name || "there"},<br/><br/>
            We've successfully received your payment of <strong>${currency || "AED"} ${amount || "500"}</strong> for the property inspection report.
          </p>
          <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-top: 16px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="color: #64748b; font-size: 12px;">Report ID</span>
              <span style="color: #1e293b; font-size: 12px; font-weight: 600;">RPT-${reportId.slice(0, 8).toUpperCase()}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #64748b; font-size: 12px;">Amount Paid</span>
              <span style="color: #1e293b; font-size: 12px; font-weight: 600;">${currency || "AED"} ${amount || "500"}</span>
            </div>
          </div>
        </div>
        <div style="text-align: center;">
          <a href="${typeof c !== "undefined" ? c.req.url.split("/api")[0] : "https://meinspect.ae"}/report/${reportId}" 
             style="display: inline-block; background: #2563eb; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
            Access Your Report
          </a>
        </div>
        <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 32px;">
          MeInspect \u2014 Property Condition Reports for Landlords, Tenants & Inspectors
        </p>
      </div>
    `;
    const result = await sendNotificationEmail(email, subject, html);
    return c.json({ success: result.ok, error: result.error });
  });
  app.post("/api/notifications/password-changed", async (c) => {
    if (!auth.user) return c.json({ error: "Unauthorized" }, 401);
    const { email } = await c.req.json();
    if (!email) return c.json({ error: "email is required" }, 400);
    const subject = "MeInspect \u2014 Your Password Has Been Changed";
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="font-size: 24px; color: #1e293b; margin: 0;">Password Changed</h1>
        </div>
        <div style="background: #f8fafc; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
          <p style="color: #334155; font-size: 15px; line-height: 1.6; margin: 0;">
            Hi,<br/><br/>
            Your MeInspect password has been successfully changed. If you did not make this change, please contact our support team immediately.
          </p>
        </div>
        <div style="background: #fef3c7; border: 1px solid #fbbf24; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
          <p style="color: #92400e; font-size: 13px; margin: 0;">
            <strong>Security tip:</strong> If you didn't change your password, someone else may have accessed your account. Change your password again and enable two-factor authentication if available.
          </p>
        </div>
        <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 32px;">
          MeInspect \u2014 Property Condition Reports for Landlords, Tenants & Inspectors
        </p>
      </div>
    `;
    const result = await sendNotificationEmail(email, subject, html);
    return c.json({ success: result.ok, error: result.error });
  });
  return app;
}
export {
  storage_schema_exports as buckets,
  createApp,
  drizzleSchema,
  db_schema_exports as tables
};
