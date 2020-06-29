
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function validate_store(store, name) {
        if (store != null && typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.23.2' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    const subscriber_queue = [];
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (let i = 0; i < subscribers.length; i += 1) {
                        const s = subscribers[i];
                        s[1]();
                        subscriber_queue.push(s, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    const TODOS = [];

    const { subscribe: subscribe$1, set, update: update$1 } = writable(TODOS);

    const fetch$1 = async () => {

    	update$1(data);
    };

    const addTodo = (todo) =>
    	update$1((todo) => {
    		return [...todos, todo];
    	});

    const reset = () => {
    	set(TODOS);
    };

    var todos$1 = {
    	subscribe: subscribe$1,
    	addTodo,
    	reset,
    	fetch: fetch$1,
    	set
    };

    /* src/App.svelte generated by Svelte v3.23.2 */
    const file = "src/App.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[1] = list[i];
    	return child_ctx;
    }

    // (15:2) {#each $todos as todo}
    function create_each_block(ctx) {
    	let li;
    	let t_value = /*todo*/ ctx[1].task + "";
    	let t;

    	const block = {
    		c: function create() {
    			li = element("li");
    			t = text(t_value);
    			add_location(li, file, 15, 4, 278);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*$todos*/ 1 && t_value !== (t_value = /*todo*/ ctx[1].task + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(15:2) {#each $todos as todo}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let div;
    	let ul;
    	let each_value = /*$todos*/ ctx[0];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div = element("div");
    			ul = element("ul");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			add_location(ul, file, 13, 2, 244);
    			attr_dev(div, "class", "bg-red-500");
    			add_location(div, file, 12, 0, 217);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, ul);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ul, null);
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*$todos*/ 1) {
    				each_value = /*$todos*/ ctx[0];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(ul, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let $todos;
    	validate_store(todos$1, "todos");
    	component_subscribe($$self, todos$1, $$value => $$invalidate(0, $todos = $$value));

    	onMount(async () => {
    		const result = await fetch("/api/todo");
    		const data = await result.json();
    		todos$1.set(data);
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("App", $$slots, []);
    	$$self.$capture_state = () => ({ onMount, todos: todos$1, $todos });
    	return [$todos];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    /*! *****************************************************************************
    Copyright (c) Microsoft Corporation.

    Permission to use, copy, modify, and/or distribute this software for any
    purpose with or without fee is hereby granted.

    THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
    REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
    AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
    INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
    LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
    OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
    PERFORMANCE OF THIS SOFTWARE.
    ***************************************************************************** */
    /* global Reflect, Promise */

    var extendStatics = function(d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };

    function __extends(d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    }

    var __assign = function() {
        __assign = Object.assign || function __assign(t) {
            for (var s, i = 1, n = arguments.length; i < n; i++) {
                s = arguments[i];
                for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
            }
            return t;
        };
        return __assign.apply(this, arguments);
    };

    function __rest(s, e) {
        var t = {};
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
            t[p] = s[p];
        if (s != null && typeof Object.getOwnPropertySymbols === "function")
            for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
                if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                    t[p[i]] = s[p[i]];
            }
        return t;
    }

    function __decorate(decorators, target, key, desc) {
        var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
        if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
        else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
        return c > 3 && r && Object.defineProperty(target, key, r), r;
    }

    function __metadata(metadataKey, metadataValue) {
        if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(metadataKey, metadataValue);
    }

    function __values(o) {
        var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
        if (m) return m.call(o);
        if (o && typeof o.length === "number") return {
            next: function () {
                if (o && i >= o.length) o = void 0;
                return { value: o && o[i++], done: !o };
            }
        };
        throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
    }

    function __read(o, n) {
        var m = typeof Symbol === "function" && o[Symbol.iterator];
        if (!m) return o;
        var i = m.call(o), r, ar = [], e;
        try {
            while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
        }
        catch (error) { e = { error: error }; }
        finally {
            try {
                if (r && !r.done && (m = i["return"])) m.call(i);
            }
            finally { if (e) throw e.error; }
        }
        return ar;
    }

    function __spread() {
        for (var ar = [], i = 0; i < arguments.length; i++)
            ar = ar.concat(__read(arguments[i]));
        return ar;
    }

    /** PURE_IMPORTS_START  PURE_IMPORTS_END */
    function isFunction(x) {
        return typeof x === 'function';
    }

    /** PURE_IMPORTS_START  PURE_IMPORTS_END */
    var _enable_super_gross_mode_that_will_cause_bad_things = false;
    var config = {
        Promise: undefined,
        set useDeprecatedSynchronousErrorHandling(value) {
            if (value) {
                var error = /*@__PURE__*/ new Error();
                /*@__PURE__*/ console.warn('DEPRECATED! RxJS was set to use deprecated synchronous error handling behavior by code at: \n' + error.stack);
            }
            _enable_super_gross_mode_that_will_cause_bad_things = value;
        },
        get useDeprecatedSynchronousErrorHandling() {
            return _enable_super_gross_mode_that_will_cause_bad_things;
        },
    };

    /** PURE_IMPORTS_START  PURE_IMPORTS_END */
    function hostReportError(err) {
        setTimeout(function () { throw err; }, 0);
    }

    /** PURE_IMPORTS_START _config,_util_hostReportError PURE_IMPORTS_END */
    var empty = {
        closed: true,
        next: function (value) { },
        error: function (err) {
            if (config.useDeprecatedSynchronousErrorHandling) {
                throw err;
            }
            else {
                hostReportError(err);
            }
        },
        complete: function () { }
    };

    /** PURE_IMPORTS_START  PURE_IMPORTS_END */
    var isArray = /*@__PURE__*/ (function () { return Array.isArray || (function (x) { return x && typeof x.length === 'number'; }); })();

    /** PURE_IMPORTS_START  PURE_IMPORTS_END */
    function isObject(x) {
        return x !== null && typeof x === 'object';
    }

    /** PURE_IMPORTS_START  PURE_IMPORTS_END */
    var UnsubscriptionErrorImpl = /*@__PURE__*/ (function () {
        function UnsubscriptionErrorImpl(errors) {
            Error.call(this);
            this.message = errors ?
                errors.length + " errors occurred during unsubscription:\n" + errors.map(function (err, i) { return i + 1 + ") " + err.toString(); }).join('\n  ') : '';
            this.name = 'UnsubscriptionError';
            this.errors = errors;
            return this;
        }
        UnsubscriptionErrorImpl.prototype = /*@__PURE__*/ Object.create(Error.prototype);
        return UnsubscriptionErrorImpl;
    })();
    var UnsubscriptionError = UnsubscriptionErrorImpl;

    /** PURE_IMPORTS_START _util_isArray,_util_isObject,_util_isFunction,_util_UnsubscriptionError PURE_IMPORTS_END */
    var Subscription = /*@__PURE__*/ (function () {
        function Subscription(unsubscribe) {
            this.closed = false;
            this._parentOrParents = null;
            this._subscriptions = null;
            if (unsubscribe) {
                this._unsubscribe = unsubscribe;
            }
        }
        Subscription.prototype.unsubscribe = function () {
            var errors;
            if (this.closed) {
                return;
            }
            var _a = this, _parentOrParents = _a._parentOrParents, _unsubscribe = _a._unsubscribe, _subscriptions = _a._subscriptions;
            this.closed = true;
            this._parentOrParents = null;
            this._subscriptions = null;
            if (_parentOrParents instanceof Subscription) {
                _parentOrParents.remove(this);
            }
            else if (_parentOrParents !== null) {
                for (var index = 0; index < _parentOrParents.length; ++index) {
                    var parent_1 = _parentOrParents[index];
                    parent_1.remove(this);
                }
            }
            if (isFunction(_unsubscribe)) {
                try {
                    _unsubscribe.call(this);
                }
                catch (e) {
                    errors = e instanceof UnsubscriptionError ? flattenUnsubscriptionErrors(e.errors) : [e];
                }
            }
            if (isArray(_subscriptions)) {
                var index = -1;
                var len = _subscriptions.length;
                while (++index < len) {
                    var sub = _subscriptions[index];
                    if (isObject(sub)) {
                        try {
                            sub.unsubscribe();
                        }
                        catch (e) {
                            errors = errors || [];
                            if (e instanceof UnsubscriptionError) {
                                errors = errors.concat(flattenUnsubscriptionErrors(e.errors));
                            }
                            else {
                                errors.push(e);
                            }
                        }
                    }
                }
            }
            if (errors) {
                throw new UnsubscriptionError(errors);
            }
        };
        Subscription.prototype.add = function (teardown) {
            var subscription = teardown;
            if (!teardown) {
                return Subscription.EMPTY;
            }
            switch (typeof teardown) {
                case 'function':
                    subscription = new Subscription(teardown);
                case 'object':
                    if (subscription === this || subscription.closed || typeof subscription.unsubscribe !== 'function') {
                        return subscription;
                    }
                    else if (this.closed) {
                        subscription.unsubscribe();
                        return subscription;
                    }
                    else if (!(subscription instanceof Subscription)) {
                        var tmp = subscription;
                        subscription = new Subscription();
                        subscription._subscriptions = [tmp];
                    }
                    break;
                default: {
                    throw new Error('unrecognized teardown ' + teardown + ' added to Subscription.');
                }
            }
            var _parentOrParents = subscription._parentOrParents;
            if (_parentOrParents === null) {
                subscription._parentOrParents = this;
            }
            else if (_parentOrParents instanceof Subscription) {
                if (_parentOrParents === this) {
                    return subscription;
                }
                subscription._parentOrParents = [_parentOrParents, this];
            }
            else if (_parentOrParents.indexOf(this) === -1) {
                _parentOrParents.push(this);
            }
            else {
                return subscription;
            }
            var subscriptions = this._subscriptions;
            if (subscriptions === null) {
                this._subscriptions = [subscription];
            }
            else {
                subscriptions.push(subscription);
            }
            return subscription;
        };
        Subscription.prototype.remove = function (subscription) {
            var subscriptions = this._subscriptions;
            if (subscriptions) {
                var subscriptionIndex = subscriptions.indexOf(subscription);
                if (subscriptionIndex !== -1) {
                    subscriptions.splice(subscriptionIndex, 1);
                }
            }
        };
        Subscription.EMPTY = (function (empty) {
            empty.closed = true;
            return empty;
        }(new Subscription()));
        return Subscription;
    }());
    function flattenUnsubscriptionErrors(errors) {
        return errors.reduce(function (errs, err) { return errs.concat((err instanceof UnsubscriptionError) ? err.errors : err); }, []);
    }

    /** PURE_IMPORTS_START  PURE_IMPORTS_END */
    var rxSubscriber = /*@__PURE__*/ (function () {
        return typeof Symbol === 'function'
            ? /*@__PURE__*/ Symbol('rxSubscriber')
            : '@@rxSubscriber_' + /*@__PURE__*/ Math.random();
    })();

    /** PURE_IMPORTS_START tslib,_util_isFunction,_Observer,_Subscription,_internal_symbol_rxSubscriber,_config,_util_hostReportError PURE_IMPORTS_END */
    var Subscriber = /*@__PURE__*/ (function (_super) {
        __extends(Subscriber, _super);
        function Subscriber(destinationOrNext, error, complete) {
            var _this = _super.call(this) || this;
            _this.syncErrorValue = null;
            _this.syncErrorThrown = false;
            _this.syncErrorThrowable = false;
            _this.isStopped = false;
            switch (arguments.length) {
                case 0:
                    _this.destination = empty;
                    break;
                case 1:
                    if (!destinationOrNext) {
                        _this.destination = empty;
                        break;
                    }
                    if (typeof destinationOrNext === 'object') {
                        if (destinationOrNext instanceof Subscriber) {
                            _this.syncErrorThrowable = destinationOrNext.syncErrorThrowable;
                            _this.destination = destinationOrNext;
                            destinationOrNext.add(_this);
                        }
                        else {
                            _this.syncErrorThrowable = true;
                            _this.destination = new SafeSubscriber(_this, destinationOrNext);
                        }
                        break;
                    }
                default:
                    _this.syncErrorThrowable = true;
                    _this.destination = new SafeSubscriber(_this, destinationOrNext, error, complete);
                    break;
            }
            return _this;
        }
        Subscriber.prototype[rxSubscriber] = function () { return this; };
        Subscriber.create = function (next, error, complete) {
            var subscriber = new Subscriber(next, error, complete);
            subscriber.syncErrorThrowable = false;
            return subscriber;
        };
        Subscriber.prototype.next = function (value) {
            if (!this.isStopped) {
                this._next(value);
            }
        };
        Subscriber.prototype.error = function (err) {
            if (!this.isStopped) {
                this.isStopped = true;
                this._error(err);
            }
        };
        Subscriber.prototype.complete = function () {
            if (!this.isStopped) {
                this.isStopped = true;
                this._complete();
            }
        };
        Subscriber.prototype.unsubscribe = function () {
            if (this.closed) {
                return;
            }
            this.isStopped = true;
            _super.prototype.unsubscribe.call(this);
        };
        Subscriber.prototype._next = function (value) {
            this.destination.next(value);
        };
        Subscriber.prototype._error = function (err) {
            this.destination.error(err);
            this.unsubscribe();
        };
        Subscriber.prototype._complete = function () {
            this.destination.complete();
            this.unsubscribe();
        };
        Subscriber.prototype._unsubscribeAndRecycle = function () {
            var _parentOrParents = this._parentOrParents;
            this._parentOrParents = null;
            this.unsubscribe();
            this.closed = false;
            this.isStopped = false;
            this._parentOrParents = _parentOrParents;
            return this;
        };
        return Subscriber;
    }(Subscription));
    var SafeSubscriber = /*@__PURE__*/ (function (_super) {
        __extends(SafeSubscriber, _super);
        function SafeSubscriber(_parentSubscriber, observerOrNext, error, complete) {
            var _this = _super.call(this) || this;
            _this._parentSubscriber = _parentSubscriber;
            var next;
            var context = _this;
            if (isFunction(observerOrNext)) {
                next = observerOrNext;
            }
            else if (observerOrNext) {
                next = observerOrNext.next;
                error = observerOrNext.error;
                complete = observerOrNext.complete;
                if (observerOrNext !== empty) {
                    context = Object.create(observerOrNext);
                    if (isFunction(context.unsubscribe)) {
                        _this.add(context.unsubscribe.bind(context));
                    }
                    context.unsubscribe = _this.unsubscribe.bind(_this);
                }
            }
            _this._context = context;
            _this._next = next;
            _this._error = error;
            _this._complete = complete;
            return _this;
        }
        SafeSubscriber.prototype.next = function (value) {
            if (!this.isStopped && this._next) {
                var _parentSubscriber = this._parentSubscriber;
                if (!config.useDeprecatedSynchronousErrorHandling || !_parentSubscriber.syncErrorThrowable) {
                    this.__tryOrUnsub(this._next, value);
                }
                else if (this.__tryOrSetError(_parentSubscriber, this._next, value)) {
                    this.unsubscribe();
                }
            }
        };
        SafeSubscriber.prototype.error = function (err) {
            if (!this.isStopped) {
                var _parentSubscriber = this._parentSubscriber;
                var useDeprecatedSynchronousErrorHandling = config.useDeprecatedSynchronousErrorHandling;
                if (this._error) {
                    if (!useDeprecatedSynchronousErrorHandling || !_parentSubscriber.syncErrorThrowable) {
                        this.__tryOrUnsub(this._error, err);
                        this.unsubscribe();
                    }
                    else {
                        this.__tryOrSetError(_parentSubscriber, this._error, err);
                        this.unsubscribe();
                    }
                }
                else if (!_parentSubscriber.syncErrorThrowable) {
                    this.unsubscribe();
                    if (useDeprecatedSynchronousErrorHandling) {
                        throw err;
                    }
                    hostReportError(err);
                }
                else {
                    if (useDeprecatedSynchronousErrorHandling) {
                        _parentSubscriber.syncErrorValue = err;
                        _parentSubscriber.syncErrorThrown = true;
                    }
                    else {
                        hostReportError(err);
                    }
                    this.unsubscribe();
                }
            }
        };
        SafeSubscriber.prototype.complete = function () {
            var _this = this;
            if (!this.isStopped) {
                var _parentSubscriber = this._parentSubscriber;
                if (this._complete) {
                    var wrappedComplete = function () { return _this._complete.call(_this._context); };
                    if (!config.useDeprecatedSynchronousErrorHandling || !_parentSubscriber.syncErrorThrowable) {
                        this.__tryOrUnsub(wrappedComplete);
                        this.unsubscribe();
                    }
                    else {
                        this.__tryOrSetError(_parentSubscriber, wrappedComplete);
                        this.unsubscribe();
                    }
                }
                else {
                    this.unsubscribe();
                }
            }
        };
        SafeSubscriber.prototype.__tryOrUnsub = function (fn, value) {
            try {
                fn.call(this._context, value);
            }
            catch (err) {
                this.unsubscribe();
                if (config.useDeprecatedSynchronousErrorHandling) {
                    throw err;
                }
                else {
                    hostReportError(err);
                }
            }
        };
        SafeSubscriber.prototype.__tryOrSetError = function (parent, fn, value) {
            if (!config.useDeprecatedSynchronousErrorHandling) {
                throw new Error('bad call');
            }
            try {
                fn.call(this._context, value);
            }
            catch (err) {
                if (config.useDeprecatedSynchronousErrorHandling) {
                    parent.syncErrorValue = err;
                    parent.syncErrorThrown = true;
                    return true;
                }
                else {
                    hostReportError(err);
                    return true;
                }
            }
            return false;
        };
        SafeSubscriber.prototype._unsubscribe = function () {
            var _parentSubscriber = this._parentSubscriber;
            this._context = null;
            this._parentSubscriber = null;
            _parentSubscriber.unsubscribe();
        };
        return SafeSubscriber;
    }(Subscriber));

    /** PURE_IMPORTS_START _Subscriber PURE_IMPORTS_END */
    function canReportError(observer) {
        while (observer) {
            var _a = observer, closed_1 = _a.closed, destination = _a.destination, isStopped = _a.isStopped;
            if (closed_1 || isStopped) {
                return false;
            }
            else if (destination && destination instanceof Subscriber) {
                observer = destination;
            }
            else {
                observer = null;
            }
        }
        return true;
    }

    /** PURE_IMPORTS_START _Subscriber,_symbol_rxSubscriber,_Observer PURE_IMPORTS_END */
    function toSubscriber(nextOrObserver, error, complete) {
        if (nextOrObserver) {
            if (nextOrObserver instanceof Subscriber) {
                return nextOrObserver;
            }
            if (nextOrObserver[rxSubscriber]) {
                return nextOrObserver[rxSubscriber]();
            }
        }
        if (!nextOrObserver && !error && !complete) {
            return new Subscriber(empty);
        }
        return new Subscriber(nextOrObserver, error, complete);
    }

    /** PURE_IMPORTS_START  PURE_IMPORTS_END */
    var observable = /*@__PURE__*/ (function () { return typeof Symbol === 'function' && Symbol.observable || '@@observable'; })();

    /** PURE_IMPORTS_START  PURE_IMPORTS_END */
    function identity(x) {
        return x;
    }

    /** PURE_IMPORTS_START _identity PURE_IMPORTS_END */
    function pipeFromArray(fns) {
        if (fns.length === 0) {
            return identity;
        }
        if (fns.length === 1) {
            return fns[0];
        }
        return function piped(input) {
            return fns.reduce(function (prev, fn) { return fn(prev); }, input);
        };
    }

    /** PURE_IMPORTS_START _util_canReportError,_util_toSubscriber,_symbol_observable,_util_pipe,_config PURE_IMPORTS_END */
    var Observable = /*@__PURE__*/ (function () {
        function Observable(subscribe) {
            this._isScalar = false;
            if (subscribe) {
                this._subscribe = subscribe;
            }
        }
        Observable.prototype.lift = function (operator) {
            var observable = new Observable();
            observable.source = this;
            observable.operator = operator;
            return observable;
        };
        Observable.prototype.subscribe = function (observerOrNext, error, complete) {
            var operator = this.operator;
            var sink = toSubscriber(observerOrNext, error, complete);
            if (operator) {
                sink.add(operator.call(sink, this.source));
            }
            else {
                sink.add(this.source || (config.useDeprecatedSynchronousErrorHandling && !sink.syncErrorThrowable) ?
                    this._subscribe(sink) :
                    this._trySubscribe(sink));
            }
            if (config.useDeprecatedSynchronousErrorHandling) {
                if (sink.syncErrorThrowable) {
                    sink.syncErrorThrowable = false;
                    if (sink.syncErrorThrown) {
                        throw sink.syncErrorValue;
                    }
                }
            }
            return sink;
        };
        Observable.prototype._trySubscribe = function (sink) {
            try {
                return this._subscribe(sink);
            }
            catch (err) {
                if (config.useDeprecatedSynchronousErrorHandling) {
                    sink.syncErrorThrown = true;
                    sink.syncErrorValue = err;
                }
                if (canReportError(sink)) {
                    sink.error(err);
                }
                else {
                    console.warn(err);
                }
            }
        };
        Observable.prototype.forEach = function (next, promiseCtor) {
            var _this = this;
            promiseCtor = getPromiseCtor(promiseCtor);
            return new promiseCtor(function (resolve, reject) {
                var subscription;
                subscription = _this.subscribe(function (value) {
                    try {
                        next(value);
                    }
                    catch (err) {
                        reject(err);
                        if (subscription) {
                            subscription.unsubscribe();
                        }
                    }
                }, reject, resolve);
            });
        };
        Observable.prototype._subscribe = function (subscriber) {
            var source = this.source;
            return source && source.subscribe(subscriber);
        };
        Observable.prototype[observable] = function () {
            return this;
        };
        Observable.prototype.pipe = function () {
            var operations = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                operations[_i] = arguments[_i];
            }
            if (operations.length === 0) {
                return this;
            }
            return pipeFromArray(operations)(this);
        };
        Observable.prototype.toPromise = function (promiseCtor) {
            var _this = this;
            promiseCtor = getPromiseCtor(promiseCtor);
            return new promiseCtor(function (resolve, reject) {
                var value;
                _this.subscribe(function (x) { return value = x; }, function (err) { return reject(err); }, function () { return resolve(value); });
            });
        };
        Observable.create = function (subscribe) {
            return new Observable(subscribe);
        };
        return Observable;
    }());
    function getPromiseCtor(promiseCtor) {
        if (!promiseCtor) {
            promiseCtor =  Promise;
        }
        if (!promiseCtor) {
            throw new Error('no Promise impl found');
        }
        return promiseCtor;
    }

    /** PURE_IMPORTS_START  PURE_IMPORTS_END */
    var ObjectUnsubscribedErrorImpl = /*@__PURE__*/ (function () {
        function ObjectUnsubscribedErrorImpl() {
            Error.call(this);
            this.message = 'object unsubscribed';
            this.name = 'ObjectUnsubscribedError';
            return this;
        }
        ObjectUnsubscribedErrorImpl.prototype = /*@__PURE__*/ Object.create(Error.prototype);
        return ObjectUnsubscribedErrorImpl;
    })();
    var ObjectUnsubscribedError = ObjectUnsubscribedErrorImpl;

    /** PURE_IMPORTS_START tslib,_Subscription PURE_IMPORTS_END */
    var SubjectSubscription = /*@__PURE__*/ (function (_super) {
        __extends(SubjectSubscription, _super);
        function SubjectSubscription(subject, subscriber) {
            var _this = _super.call(this) || this;
            _this.subject = subject;
            _this.subscriber = subscriber;
            _this.closed = false;
            return _this;
        }
        SubjectSubscription.prototype.unsubscribe = function () {
            if (this.closed) {
                return;
            }
            this.closed = true;
            var subject = this.subject;
            var observers = subject.observers;
            this.subject = null;
            if (!observers || observers.length === 0 || subject.isStopped || subject.closed) {
                return;
            }
            var subscriberIndex = observers.indexOf(this.subscriber);
            if (subscriberIndex !== -1) {
                observers.splice(subscriberIndex, 1);
            }
        };
        return SubjectSubscription;
    }(Subscription));

    /** PURE_IMPORTS_START tslib,_Observable,_Subscriber,_Subscription,_util_ObjectUnsubscribedError,_SubjectSubscription,_internal_symbol_rxSubscriber PURE_IMPORTS_END */
    var SubjectSubscriber = /*@__PURE__*/ (function (_super) {
        __extends(SubjectSubscriber, _super);
        function SubjectSubscriber(destination) {
            var _this = _super.call(this, destination) || this;
            _this.destination = destination;
            return _this;
        }
        return SubjectSubscriber;
    }(Subscriber));
    var Subject = /*@__PURE__*/ (function (_super) {
        __extends(Subject, _super);
        function Subject() {
            var _this = _super.call(this) || this;
            _this.observers = [];
            _this.closed = false;
            _this.isStopped = false;
            _this.hasError = false;
            _this.thrownError = null;
            return _this;
        }
        Subject.prototype[rxSubscriber] = function () {
            return new SubjectSubscriber(this);
        };
        Subject.prototype.lift = function (operator) {
            var subject = new AnonymousSubject(this, this);
            subject.operator = operator;
            return subject;
        };
        Subject.prototype.next = function (value) {
            if (this.closed) {
                throw new ObjectUnsubscribedError();
            }
            if (!this.isStopped) {
                var observers = this.observers;
                var len = observers.length;
                var copy = observers.slice();
                for (var i = 0; i < len; i++) {
                    copy[i].next(value);
                }
            }
        };
        Subject.prototype.error = function (err) {
            if (this.closed) {
                throw new ObjectUnsubscribedError();
            }
            this.hasError = true;
            this.thrownError = err;
            this.isStopped = true;
            var observers = this.observers;
            var len = observers.length;
            var copy = observers.slice();
            for (var i = 0; i < len; i++) {
                copy[i].error(err);
            }
            this.observers.length = 0;
        };
        Subject.prototype.complete = function () {
            if (this.closed) {
                throw new ObjectUnsubscribedError();
            }
            this.isStopped = true;
            var observers = this.observers;
            var len = observers.length;
            var copy = observers.slice();
            for (var i = 0; i < len; i++) {
                copy[i].complete();
            }
            this.observers.length = 0;
        };
        Subject.prototype.unsubscribe = function () {
            this.isStopped = true;
            this.closed = true;
            this.observers = null;
        };
        Subject.prototype._trySubscribe = function (subscriber) {
            if (this.closed) {
                throw new ObjectUnsubscribedError();
            }
            else {
                return _super.prototype._trySubscribe.call(this, subscriber);
            }
        };
        Subject.prototype._subscribe = function (subscriber) {
            if (this.closed) {
                throw new ObjectUnsubscribedError();
            }
            else if (this.hasError) {
                subscriber.error(this.thrownError);
                return Subscription.EMPTY;
            }
            else if (this.isStopped) {
                subscriber.complete();
                return Subscription.EMPTY;
            }
            else {
                this.observers.push(subscriber);
                return new SubjectSubscription(this, subscriber);
            }
        };
        Subject.prototype.asObservable = function () {
            var observable = new Observable();
            observable.source = this;
            return observable;
        };
        Subject.create = function (destination, source) {
            return new AnonymousSubject(destination, source);
        };
        return Subject;
    }(Observable));
    var AnonymousSubject = /*@__PURE__*/ (function (_super) {
        __extends(AnonymousSubject, _super);
        function AnonymousSubject(destination, source) {
            var _this = _super.call(this) || this;
            _this.destination = destination;
            _this.source = source;
            return _this;
        }
        AnonymousSubject.prototype.next = function (value) {
            var destination = this.destination;
            if (destination && destination.next) {
                destination.next(value);
            }
        };
        AnonymousSubject.prototype.error = function (err) {
            var destination = this.destination;
            if (destination && destination.error) {
                this.destination.error(err);
            }
        };
        AnonymousSubject.prototype.complete = function () {
            var destination = this.destination;
            if (destination && destination.complete) {
                this.destination.complete();
            }
        };
        AnonymousSubject.prototype._subscribe = function (subscriber) {
            var source = this.source;
            if (source) {
                return this.source.subscribe(subscriber);
            }
            else {
                return Subscription.EMPTY;
            }
        };
        return AnonymousSubject;
    }(Subject));

    /** PURE_IMPORTS_START tslib,_Subject,_util_ObjectUnsubscribedError PURE_IMPORTS_END */
    var BehaviorSubject = /*@__PURE__*/ (function (_super) {
        __extends(BehaviorSubject, _super);
        function BehaviorSubject(_value) {
            var _this = _super.call(this) || this;
            _this._value = _value;
            return _this;
        }
        Object.defineProperty(BehaviorSubject.prototype, "value", {
            get: function () {
                return this.getValue();
            },
            enumerable: true,
            configurable: true
        });
        BehaviorSubject.prototype._subscribe = function (subscriber) {
            var subscription = _super.prototype._subscribe.call(this, subscriber);
            if (subscription && !subscription.closed) {
                subscriber.next(this._value);
            }
            return subscription;
        };
        BehaviorSubject.prototype.getValue = function () {
            if (this.hasError) {
                throw this.thrownError;
            }
            else if (this.closed) {
                throw new ObjectUnsubscribedError();
            }
            else {
                return this._value;
            }
        };
        BehaviorSubject.prototype.next = function (value) {
            _super.prototype.next.call(this, this._value = value);
        };
        return BehaviorSubject;
    }(Subject));

    /** PURE_IMPORTS_START tslib,_Subscription PURE_IMPORTS_END */
    var Action = /*@__PURE__*/ (function (_super) {
        __extends(Action, _super);
        function Action(scheduler, work) {
            return _super.call(this) || this;
        }
        Action.prototype.schedule = function (state, delay) {
            return this;
        };
        return Action;
    }(Subscription));

    /** PURE_IMPORTS_START tslib,_Action PURE_IMPORTS_END */
    var AsyncAction = /*@__PURE__*/ (function (_super) {
        __extends(AsyncAction, _super);
        function AsyncAction(scheduler, work) {
            var _this = _super.call(this, scheduler, work) || this;
            _this.scheduler = scheduler;
            _this.work = work;
            _this.pending = false;
            return _this;
        }
        AsyncAction.prototype.schedule = function (state, delay) {
            if (delay === void 0) {
                delay = 0;
            }
            if (this.closed) {
                return this;
            }
            this.state = state;
            var id = this.id;
            var scheduler = this.scheduler;
            if (id != null) {
                this.id = this.recycleAsyncId(scheduler, id, delay);
            }
            this.pending = true;
            this.delay = delay;
            this.id = this.id || this.requestAsyncId(scheduler, this.id, delay);
            return this;
        };
        AsyncAction.prototype.requestAsyncId = function (scheduler, id, delay) {
            if (delay === void 0) {
                delay = 0;
            }
            return setInterval(scheduler.flush.bind(scheduler, this), delay);
        };
        AsyncAction.prototype.recycleAsyncId = function (scheduler, id, delay) {
            if (delay === void 0) {
                delay = 0;
            }
            if (delay !== null && this.delay === delay && this.pending === false) {
                return id;
            }
            clearInterval(id);
            return undefined;
        };
        AsyncAction.prototype.execute = function (state, delay) {
            if (this.closed) {
                return new Error('executing a cancelled action');
            }
            this.pending = false;
            var error = this._execute(state, delay);
            if (error) {
                return error;
            }
            else if (this.pending === false && this.id != null) {
                this.id = this.recycleAsyncId(this.scheduler, this.id, null);
            }
        };
        AsyncAction.prototype._execute = function (state, delay) {
            var errored = false;
            var errorValue = undefined;
            try {
                this.work(state);
            }
            catch (e) {
                errored = true;
                errorValue = !!e && e || new Error(e);
            }
            if (errored) {
                this.unsubscribe();
                return errorValue;
            }
        };
        AsyncAction.prototype._unsubscribe = function () {
            var id = this.id;
            var scheduler = this.scheduler;
            var actions = scheduler.actions;
            var index = actions.indexOf(this);
            this.work = null;
            this.state = null;
            this.pending = false;
            this.scheduler = null;
            if (index !== -1) {
                actions.splice(index, 1);
            }
            if (id != null) {
                this.id = this.recycleAsyncId(scheduler, id, null);
            }
            this.delay = null;
        };
        return AsyncAction;
    }(Action));

    /** PURE_IMPORTS_START tslib,_AsyncAction PURE_IMPORTS_END */
    var QueueAction = /*@__PURE__*/ (function (_super) {
        __extends(QueueAction, _super);
        function QueueAction(scheduler, work) {
            var _this = _super.call(this, scheduler, work) || this;
            _this.scheduler = scheduler;
            _this.work = work;
            return _this;
        }
        QueueAction.prototype.schedule = function (state, delay) {
            if (delay === void 0) {
                delay = 0;
            }
            if (delay > 0) {
                return _super.prototype.schedule.call(this, state, delay);
            }
            this.delay = delay;
            this.state = state;
            this.scheduler.flush(this);
            return this;
        };
        QueueAction.prototype.execute = function (state, delay) {
            return (delay > 0 || this.closed) ?
                _super.prototype.execute.call(this, state, delay) :
                this._execute(state, delay);
        };
        QueueAction.prototype.requestAsyncId = function (scheduler, id, delay) {
            if (delay === void 0) {
                delay = 0;
            }
            if ((delay !== null && delay > 0) || (delay === null && this.delay > 0)) {
                return _super.prototype.requestAsyncId.call(this, scheduler, id, delay);
            }
            return scheduler.flush(this);
        };
        return QueueAction;
    }(AsyncAction));

    var Scheduler = /*@__PURE__*/ (function () {
        function Scheduler(SchedulerAction, now) {
            if (now === void 0) {
                now = Scheduler.now;
            }
            this.SchedulerAction = SchedulerAction;
            this.now = now;
        }
        Scheduler.prototype.schedule = function (work, delay, state) {
            if (delay === void 0) {
                delay = 0;
            }
            return new this.SchedulerAction(this, work).schedule(state, delay);
        };
        Scheduler.now = function () { return Date.now(); };
        return Scheduler;
    }());

    /** PURE_IMPORTS_START tslib,_Scheduler PURE_IMPORTS_END */
    var AsyncScheduler = /*@__PURE__*/ (function (_super) {
        __extends(AsyncScheduler, _super);
        function AsyncScheduler(SchedulerAction, now) {
            if (now === void 0) {
                now = Scheduler.now;
            }
            var _this = _super.call(this, SchedulerAction, function () {
                if (AsyncScheduler.delegate && AsyncScheduler.delegate !== _this) {
                    return AsyncScheduler.delegate.now();
                }
                else {
                    return now();
                }
            }) || this;
            _this.actions = [];
            _this.active = false;
            _this.scheduled = undefined;
            return _this;
        }
        AsyncScheduler.prototype.schedule = function (work, delay, state) {
            if (delay === void 0) {
                delay = 0;
            }
            if (AsyncScheduler.delegate && AsyncScheduler.delegate !== this) {
                return AsyncScheduler.delegate.schedule(work, delay, state);
            }
            else {
                return _super.prototype.schedule.call(this, work, delay, state);
            }
        };
        AsyncScheduler.prototype.flush = function (action) {
            var actions = this.actions;
            if (this.active) {
                actions.push(action);
                return;
            }
            var error;
            this.active = true;
            do {
                if (error = action.execute(action.state, action.delay)) {
                    break;
                }
            } while (action = actions.shift());
            this.active = false;
            if (error) {
                while (action = actions.shift()) {
                    action.unsubscribe();
                }
                throw error;
            }
        };
        return AsyncScheduler;
    }(Scheduler));

    /** PURE_IMPORTS_START tslib,_AsyncScheduler PURE_IMPORTS_END */
    var QueueScheduler = /*@__PURE__*/ (function (_super) {
        __extends(QueueScheduler, _super);
        function QueueScheduler() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        return QueueScheduler;
    }(AsyncScheduler));

    /** PURE_IMPORTS_START _QueueAction,_QueueScheduler PURE_IMPORTS_END */
    var queue = /*@__PURE__*/ new QueueScheduler(QueueAction);

    /** PURE_IMPORTS_START _Observable PURE_IMPORTS_END */
    var EMPTY = /*@__PURE__*/ new Observable(function (subscriber) { return subscriber.complete(); });
    function empty$1(scheduler) {
        return scheduler ? emptyScheduled(scheduler) : EMPTY;
    }
    function emptyScheduled(scheduler) {
        return new Observable(function (subscriber) { return scheduler.schedule(function () { return subscriber.complete(); }); });
    }

    /** PURE_IMPORTS_START  PURE_IMPORTS_END */
    function isScheduler(value) {
        return value && typeof value.schedule === 'function';
    }

    /** PURE_IMPORTS_START  PURE_IMPORTS_END */
    var subscribeToArray = function (array) {
        return function (subscriber) {
            for (var i = 0, len = array.length; i < len && !subscriber.closed; i++) {
                subscriber.next(array[i]);
            }
            subscriber.complete();
        };
    };

    /** PURE_IMPORTS_START _Observable,_Subscription PURE_IMPORTS_END */
    function scheduleArray(input, scheduler) {
        return new Observable(function (subscriber) {
            var sub = new Subscription();
            var i = 0;
            sub.add(scheduler.schedule(function () {
                if (i === input.length) {
                    subscriber.complete();
                    return;
                }
                subscriber.next(input[i++]);
                if (!subscriber.closed) {
                    sub.add(this.schedule());
                }
            }));
            return sub;
        });
    }

    /** PURE_IMPORTS_START _Observable,_util_subscribeToArray,_scheduled_scheduleArray PURE_IMPORTS_END */
    function fromArray(input, scheduler) {
        if (!scheduler) {
            return new Observable(subscribeToArray(input));
        }
        else {
            return scheduleArray(input, scheduler);
        }
    }

    /** PURE_IMPORTS_START _util_isScheduler,_fromArray,_scheduled_scheduleArray PURE_IMPORTS_END */
    function of() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        var scheduler = args[args.length - 1];
        if (isScheduler(scheduler)) {
            args.pop();
            return scheduleArray(args, scheduler);
        }
        else {
            return fromArray(args);
        }
    }

    /** PURE_IMPORTS_START _Observable PURE_IMPORTS_END */
    function throwError(error, scheduler) {
        if (!scheduler) {
            return new Observable(function (subscriber) { return subscriber.error(error); });
        }
        else {
            return new Observable(function (subscriber) { return scheduler.schedule(dispatch, 0, { error: error, subscriber: subscriber }); });
        }
    }
    function dispatch(_a) {
        var error = _a.error, subscriber = _a.subscriber;
        subscriber.error(error);
    }

    /** PURE_IMPORTS_START _observable_empty,_observable_of,_observable_throwError PURE_IMPORTS_END */
    var Notification = /*@__PURE__*/ (function () {
        function Notification(kind, value, error) {
            this.kind = kind;
            this.value = value;
            this.error = error;
            this.hasValue = kind === 'N';
        }
        Notification.prototype.observe = function (observer) {
            switch (this.kind) {
                case 'N':
                    return observer.next && observer.next(this.value);
                case 'E':
                    return observer.error && observer.error(this.error);
                case 'C':
                    return observer.complete && observer.complete();
            }
        };
        Notification.prototype.do = function (next, error, complete) {
            var kind = this.kind;
            switch (kind) {
                case 'N':
                    return next && next(this.value);
                case 'E':
                    return error && error(this.error);
                case 'C':
                    return complete && complete();
            }
        };
        Notification.prototype.accept = function (nextOrObserver, error, complete) {
            if (nextOrObserver && typeof nextOrObserver.next === 'function') {
                return this.observe(nextOrObserver);
            }
            else {
                return this.do(nextOrObserver, error, complete);
            }
        };
        Notification.prototype.toObservable = function () {
            var kind = this.kind;
            switch (kind) {
                case 'N':
                    return of(this.value);
                case 'E':
                    return throwError(this.error);
                case 'C':
                    return empty$1();
            }
            throw new Error('unexpected notification kind value');
        };
        Notification.createNext = function (value) {
            if (typeof value !== 'undefined') {
                return new Notification('N', value);
            }
            return Notification.undefinedValueNotification;
        };
        Notification.createError = function (err) {
            return new Notification('E', undefined, err);
        };
        Notification.createComplete = function () {
            return Notification.completeNotification;
        };
        Notification.completeNotification = new Notification('C');
        Notification.undefinedValueNotification = new Notification('N', undefined);
        return Notification;
    }());

    /** PURE_IMPORTS_START tslib,_Subscriber,_Notification PURE_IMPORTS_END */
    var ObserveOnSubscriber = /*@__PURE__*/ (function (_super) {
        __extends(ObserveOnSubscriber, _super);
        function ObserveOnSubscriber(destination, scheduler, delay) {
            if (delay === void 0) {
                delay = 0;
            }
            var _this = _super.call(this, destination) || this;
            _this.scheduler = scheduler;
            _this.delay = delay;
            return _this;
        }
        ObserveOnSubscriber.dispatch = function (arg) {
            var notification = arg.notification, destination = arg.destination;
            notification.observe(destination);
            this.unsubscribe();
        };
        ObserveOnSubscriber.prototype.scheduleMessage = function (notification) {
            var destination = this.destination;
            destination.add(this.scheduler.schedule(ObserveOnSubscriber.dispatch, this.delay, new ObserveOnMessage(notification, this.destination)));
        };
        ObserveOnSubscriber.prototype._next = function (value) {
            this.scheduleMessage(Notification.createNext(value));
        };
        ObserveOnSubscriber.prototype._error = function (err) {
            this.scheduleMessage(Notification.createError(err));
            this.unsubscribe();
        };
        ObserveOnSubscriber.prototype._complete = function () {
            this.scheduleMessage(Notification.createComplete());
            this.unsubscribe();
        };
        return ObserveOnSubscriber;
    }(Subscriber));
    var ObserveOnMessage = /*@__PURE__*/ (function () {
        function ObserveOnMessage(notification, destination) {
            this.notification = notification;
            this.destination = destination;
        }
        return ObserveOnMessage;
    }());

    /** PURE_IMPORTS_START tslib,_Subject,_scheduler_queue,_Subscription,_operators_observeOn,_util_ObjectUnsubscribedError,_SubjectSubscription PURE_IMPORTS_END */
    var ReplaySubject = /*@__PURE__*/ (function (_super) {
        __extends(ReplaySubject, _super);
        function ReplaySubject(bufferSize, windowTime, scheduler) {
            if (bufferSize === void 0) {
                bufferSize = Number.POSITIVE_INFINITY;
            }
            if (windowTime === void 0) {
                windowTime = Number.POSITIVE_INFINITY;
            }
            var _this = _super.call(this) || this;
            _this.scheduler = scheduler;
            _this._events = [];
            _this._infiniteTimeWindow = false;
            _this._bufferSize = bufferSize < 1 ? 1 : bufferSize;
            _this._windowTime = windowTime < 1 ? 1 : windowTime;
            if (windowTime === Number.POSITIVE_INFINITY) {
                _this._infiniteTimeWindow = true;
                _this.next = _this.nextInfiniteTimeWindow;
            }
            else {
                _this.next = _this.nextTimeWindow;
            }
            return _this;
        }
        ReplaySubject.prototype.nextInfiniteTimeWindow = function (value) {
            var _events = this._events;
            _events.push(value);
            if (_events.length > this._bufferSize) {
                _events.shift();
            }
            _super.prototype.next.call(this, value);
        };
        ReplaySubject.prototype.nextTimeWindow = function (value) {
            this._events.push(new ReplayEvent(this._getNow(), value));
            this._trimBufferThenGetEvents();
            _super.prototype.next.call(this, value);
        };
        ReplaySubject.prototype._subscribe = function (subscriber) {
            var _infiniteTimeWindow = this._infiniteTimeWindow;
            var _events = _infiniteTimeWindow ? this._events : this._trimBufferThenGetEvents();
            var scheduler = this.scheduler;
            var len = _events.length;
            var subscription;
            if (this.closed) {
                throw new ObjectUnsubscribedError();
            }
            else if (this.isStopped || this.hasError) {
                subscription = Subscription.EMPTY;
            }
            else {
                this.observers.push(subscriber);
                subscription = new SubjectSubscription(this, subscriber);
            }
            if (scheduler) {
                subscriber.add(subscriber = new ObserveOnSubscriber(subscriber, scheduler));
            }
            if (_infiniteTimeWindow) {
                for (var i = 0; i < len && !subscriber.closed; i++) {
                    subscriber.next(_events[i]);
                }
            }
            else {
                for (var i = 0; i < len && !subscriber.closed; i++) {
                    subscriber.next(_events[i].value);
                }
            }
            if (this.hasError) {
                subscriber.error(this.thrownError);
            }
            else if (this.isStopped) {
                subscriber.complete();
            }
            return subscription;
        };
        ReplaySubject.prototype._getNow = function () {
            return (this.scheduler || queue).now();
        };
        ReplaySubject.prototype._trimBufferThenGetEvents = function () {
            var now = this._getNow();
            var _bufferSize = this._bufferSize;
            var _windowTime = this._windowTime;
            var _events = this._events;
            var eventsCount = _events.length;
            var spliceCount = 0;
            while (spliceCount < eventsCount) {
                if ((now - _events[spliceCount].time) < _windowTime) {
                    break;
                }
                spliceCount++;
            }
            if (eventsCount > _bufferSize) {
                spliceCount = Math.max(spliceCount, eventsCount - _bufferSize);
            }
            if (spliceCount > 0) {
                _events.splice(0, spliceCount);
            }
            return _events;
        };
        return ReplaySubject;
    }(Subject));
    var ReplayEvent = /*@__PURE__*/ (function () {
        function ReplayEvent(time, value) {
            this.time = time;
            this.value = value;
        }
        return ReplayEvent;
    }());

    /** PURE_IMPORTS_START _AsyncAction,_AsyncScheduler PURE_IMPORTS_END */
    var async = /*@__PURE__*/ new AsyncScheduler(AsyncAction);

    /** PURE_IMPORTS_START _Observable PURE_IMPORTS_END */
    function isObservable(obj) {
        return !!obj && (obj instanceof Observable || (typeof obj.lift === 'function' && typeof obj.subscribe === 'function'));
    }

    /** PURE_IMPORTS_START  PURE_IMPORTS_END */
    var ArgumentOutOfRangeErrorImpl = /*@__PURE__*/ (function () {
        function ArgumentOutOfRangeErrorImpl() {
            Error.call(this);
            this.message = 'argument out of range';
            this.name = 'ArgumentOutOfRangeError';
            return this;
        }
        ArgumentOutOfRangeErrorImpl.prototype = /*@__PURE__*/ Object.create(Error.prototype);
        return ArgumentOutOfRangeErrorImpl;
    })();
    var ArgumentOutOfRangeError = ArgumentOutOfRangeErrorImpl;

    /** PURE_IMPORTS_START tslib,_Subscriber PURE_IMPORTS_END */
    function map(project, thisArg) {
        return function mapOperation(source) {
            if (typeof project !== 'function') {
                throw new TypeError('argument is not a function. Are you looking for `mapTo()`?');
            }
            return source.lift(new MapOperator(project, thisArg));
        };
    }
    var MapOperator = /*@__PURE__*/ (function () {
        function MapOperator(project, thisArg) {
            this.project = project;
            this.thisArg = thisArg;
        }
        MapOperator.prototype.call = function (subscriber, source) {
            return source.subscribe(new MapSubscriber(subscriber, this.project, this.thisArg));
        };
        return MapOperator;
    }());
    var MapSubscriber = /*@__PURE__*/ (function (_super) {
        __extends(MapSubscriber, _super);
        function MapSubscriber(destination, project, thisArg) {
            var _this = _super.call(this, destination) || this;
            _this.project = project;
            _this.count = 0;
            _this.thisArg = thisArg || _this;
            return _this;
        }
        MapSubscriber.prototype._next = function (value) {
            var result;
            try {
                result = this.project.call(this.thisArg, value, this.count++);
            }
            catch (err) {
                this.destination.error(err);
                return;
            }
            this.destination.next(result);
        };
        return MapSubscriber;
    }(Subscriber));

    /** PURE_IMPORTS_START tslib,_Subscriber PURE_IMPORTS_END */
    var OuterSubscriber = /*@__PURE__*/ (function (_super) {
        __extends(OuterSubscriber, _super);
        function OuterSubscriber() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        OuterSubscriber.prototype.notifyNext = function (outerValue, innerValue, outerIndex, innerIndex, innerSub) {
            this.destination.next(innerValue);
        };
        OuterSubscriber.prototype.notifyError = function (error, innerSub) {
            this.destination.error(error);
        };
        OuterSubscriber.prototype.notifyComplete = function (innerSub) {
            this.destination.complete();
        };
        return OuterSubscriber;
    }(Subscriber));

    /** PURE_IMPORTS_START tslib,_Subscriber PURE_IMPORTS_END */
    var InnerSubscriber = /*@__PURE__*/ (function (_super) {
        __extends(InnerSubscriber, _super);
        function InnerSubscriber(parent, outerValue, outerIndex) {
            var _this = _super.call(this) || this;
            _this.parent = parent;
            _this.outerValue = outerValue;
            _this.outerIndex = outerIndex;
            _this.index = 0;
            return _this;
        }
        InnerSubscriber.prototype._next = function (value) {
            this.parent.notifyNext(this.outerValue, value, this.outerIndex, this.index++, this);
        };
        InnerSubscriber.prototype._error = function (error) {
            this.parent.notifyError(error, this);
            this.unsubscribe();
        };
        InnerSubscriber.prototype._complete = function () {
            this.parent.notifyComplete(this);
            this.unsubscribe();
        };
        return InnerSubscriber;
    }(Subscriber));

    /** PURE_IMPORTS_START _hostReportError PURE_IMPORTS_END */
    var subscribeToPromise = function (promise) {
        return function (subscriber) {
            promise.then(function (value) {
                if (!subscriber.closed) {
                    subscriber.next(value);
                    subscriber.complete();
                }
            }, function (err) { return subscriber.error(err); })
                .then(null, hostReportError);
            return subscriber;
        };
    };

    /** PURE_IMPORTS_START  PURE_IMPORTS_END */
    function getSymbolIterator() {
        if (typeof Symbol !== 'function' || !Symbol.iterator) {
            return '@@iterator';
        }
        return Symbol.iterator;
    }
    var iterator = /*@__PURE__*/ getSymbolIterator();

    /** PURE_IMPORTS_START _symbol_iterator PURE_IMPORTS_END */
    var subscribeToIterable = function (iterable) {
        return function (subscriber) {
            var iterator$1 = iterable[iterator]();
            do {
                var item = iterator$1.next();
                if (item.done) {
                    subscriber.complete();
                    break;
                }
                subscriber.next(item.value);
                if (subscriber.closed) {
                    break;
                }
            } while (true);
            if (typeof iterator$1.return === 'function') {
                subscriber.add(function () {
                    if (iterator$1.return) {
                        iterator$1.return();
                    }
                });
            }
            return subscriber;
        };
    };

    /** PURE_IMPORTS_START _symbol_observable PURE_IMPORTS_END */
    var subscribeToObservable = function (obj) {
        return function (subscriber) {
            var obs = obj[observable]();
            if (typeof obs.subscribe !== 'function') {
                throw new TypeError('Provided object does not correctly implement Symbol.observable');
            }
            else {
                return obs.subscribe(subscriber);
            }
        };
    };

    /** PURE_IMPORTS_START  PURE_IMPORTS_END */
    var isArrayLike = (function (x) { return x && typeof x.length === 'number' && typeof x !== 'function'; });

    /** PURE_IMPORTS_START  PURE_IMPORTS_END */
    function isPromise(value) {
        return !!value && typeof value.subscribe !== 'function' && typeof value.then === 'function';
    }

    /** PURE_IMPORTS_START _subscribeToArray,_subscribeToPromise,_subscribeToIterable,_subscribeToObservable,_isArrayLike,_isPromise,_isObject,_symbol_iterator,_symbol_observable PURE_IMPORTS_END */
    var subscribeTo = function (result) {
        if (!!result && typeof result[observable] === 'function') {
            return subscribeToObservable(result);
        }
        else if (isArrayLike(result)) {
            return subscribeToArray(result);
        }
        else if (isPromise(result)) {
            return subscribeToPromise(result);
        }
        else if (!!result && typeof result[iterator] === 'function') {
            return subscribeToIterable(result);
        }
        else {
            var value = isObject(result) ? 'an invalid object' : "'" + result + "'";
            var msg = "You provided " + value + " where a stream was expected."
                + ' You can provide an Observable, Promise, Array, or Iterable.';
            throw new TypeError(msg);
        }
    };

    /** PURE_IMPORTS_START _InnerSubscriber,_subscribeTo,_Observable PURE_IMPORTS_END */
    function subscribeToResult(outerSubscriber, result, outerValue, outerIndex, innerSubscriber) {
        if (innerSubscriber === void 0) {
            innerSubscriber = new InnerSubscriber(outerSubscriber, outerValue, outerIndex);
        }
        if (innerSubscriber.closed) {
            return undefined;
        }
        if (result instanceof Observable) {
            return result.subscribe(innerSubscriber);
        }
        return subscribeTo(result)(innerSubscriber);
    }

    /** PURE_IMPORTS_START tslib,_util_isScheduler,_util_isArray,_OuterSubscriber,_util_subscribeToResult,_fromArray PURE_IMPORTS_END */
    var NONE = {};
    function combineLatest() {
        var observables = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            observables[_i] = arguments[_i];
        }
        var resultSelector = null;
        var scheduler = null;
        if (isScheduler(observables[observables.length - 1])) {
            scheduler = observables.pop();
        }
        if (typeof observables[observables.length - 1] === 'function') {
            resultSelector = observables.pop();
        }
        if (observables.length === 1 && isArray(observables[0])) {
            observables = observables[0];
        }
        return fromArray(observables, scheduler).lift(new CombineLatestOperator(resultSelector));
    }
    var CombineLatestOperator = /*@__PURE__*/ (function () {
        function CombineLatestOperator(resultSelector) {
            this.resultSelector = resultSelector;
        }
        CombineLatestOperator.prototype.call = function (subscriber, source) {
            return source.subscribe(new CombineLatestSubscriber(subscriber, this.resultSelector));
        };
        return CombineLatestOperator;
    }());
    var CombineLatestSubscriber = /*@__PURE__*/ (function (_super) {
        __extends(CombineLatestSubscriber, _super);
        function CombineLatestSubscriber(destination, resultSelector) {
            var _this = _super.call(this, destination) || this;
            _this.resultSelector = resultSelector;
            _this.active = 0;
            _this.values = [];
            _this.observables = [];
            return _this;
        }
        CombineLatestSubscriber.prototype._next = function (observable) {
            this.values.push(NONE);
            this.observables.push(observable);
        };
        CombineLatestSubscriber.prototype._complete = function () {
            var observables = this.observables;
            var len = observables.length;
            if (len === 0) {
                this.destination.complete();
            }
            else {
                this.active = len;
                this.toRespond = len;
                for (var i = 0; i < len; i++) {
                    var observable = observables[i];
                    this.add(subscribeToResult(this, observable, observable, i));
                }
            }
        };
        CombineLatestSubscriber.prototype.notifyComplete = function (unused) {
            if ((this.active -= 1) === 0) {
                this.destination.complete();
            }
        };
        CombineLatestSubscriber.prototype.notifyNext = function (outerValue, innerValue, outerIndex, innerIndex, innerSub) {
            var values = this.values;
            var oldVal = values[outerIndex];
            var toRespond = !this.toRespond
                ? 0
                : oldVal === NONE ? --this.toRespond : this.toRespond;
            values[outerIndex] = innerValue;
            if (toRespond === 0) {
                if (this.resultSelector) {
                    this._tryResultSelector(values);
                }
                else {
                    this.destination.next(values.slice());
                }
            }
        };
        CombineLatestSubscriber.prototype._tryResultSelector = function (values) {
            var result;
            try {
                result = this.resultSelector.apply(this, values);
            }
            catch (err) {
                this.destination.error(err);
                return;
            }
            this.destination.next(result);
        };
        return CombineLatestSubscriber;
    }(OuterSubscriber));

    /** PURE_IMPORTS_START _Observable,_Subscription,_symbol_observable PURE_IMPORTS_END */
    function scheduleObservable(input, scheduler) {
        return new Observable(function (subscriber) {
            var sub = new Subscription();
            sub.add(scheduler.schedule(function () {
                var observable$1 = input[observable]();
                sub.add(observable$1.subscribe({
                    next: function (value) { sub.add(scheduler.schedule(function () { return subscriber.next(value); })); },
                    error: function (err) { sub.add(scheduler.schedule(function () { return subscriber.error(err); })); },
                    complete: function () { sub.add(scheduler.schedule(function () { return subscriber.complete(); })); },
                }));
            }));
            return sub;
        });
    }

    /** PURE_IMPORTS_START _Observable,_Subscription PURE_IMPORTS_END */
    function schedulePromise(input, scheduler) {
        return new Observable(function (subscriber) {
            var sub = new Subscription();
            sub.add(scheduler.schedule(function () {
                return input.then(function (value) {
                    sub.add(scheduler.schedule(function () {
                        subscriber.next(value);
                        sub.add(scheduler.schedule(function () { return subscriber.complete(); }));
                    }));
                }, function (err) {
                    sub.add(scheduler.schedule(function () { return subscriber.error(err); }));
                });
            }));
            return sub;
        });
    }

    /** PURE_IMPORTS_START _Observable,_Subscription,_symbol_iterator PURE_IMPORTS_END */
    function scheduleIterable(input, scheduler) {
        if (!input) {
            throw new Error('Iterable cannot be null');
        }
        return new Observable(function (subscriber) {
            var sub = new Subscription();
            var iterator$1;
            sub.add(function () {
                if (iterator$1 && typeof iterator$1.return === 'function') {
                    iterator$1.return();
                }
            });
            sub.add(scheduler.schedule(function () {
                iterator$1 = input[iterator]();
                sub.add(scheduler.schedule(function () {
                    if (subscriber.closed) {
                        return;
                    }
                    var value;
                    var done;
                    try {
                        var result = iterator$1.next();
                        value = result.value;
                        done = result.done;
                    }
                    catch (err) {
                        subscriber.error(err);
                        return;
                    }
                    if (done) {
                        subscriber.complete();
                    }
                    else {
                        subscriber.next(value);
                        this.schedule();
                    }
                }));
            }));
            return sub;
        });
    }

    /** PURE_IMPORTS_START _symbol_observable PURE_IMPORTS_END */
    function isInteropObservable(input) {
        return input && typeof input[observable] === 'function';
    }

    /** PURE_IMPORTS_START _symbol_iterator PURE_IMPORTS_END */
    function isIterable(input) {
        return input && typeof input[iterator] === 'function';
    }

    /** PURE_IMPORTS_START _scheduleObservable,_schedulePromise,_scheduleArray,_scheduleIterable,_util_isInteropObservable,_util_isPromise,_util_isArrayLike,_util_isIterable PURE_IMPORTS_END */
    function scheduled(input, scheduler) {
        if (input != null) {
            if (isInteropObservable(input)) {
                return scheduleObservable(input, scheduler);
            }
            else if (isPromise(input)) {
                return schedulePromise(input, scheduler);
            }
            else if (isArrayLike(input)) {
                return scheduleArray(input, scheduler);
            }
            else if (isIterable(input) || typeof input === 'string') {
                return scheduleIterable(input, scheduler);
            }
        }
        throw new TypeError((input !== null && typeof input || input) + ' is not observable');
    }

    /** PURE_IMPORTS_START _Observable,_util_subscribeTo,_scheduled_scheduled PURE_IMPORTS_END */
    function from(input, scheduler) {
        if (!scheduler) {
            if (input instanceof Observable) {
                return input;
            }
            return new Observable(subscribeTo(input));
        }
        else {
            return scheduled(input, scheduler);
        }
    }

    /** PURE_IMPORTS_START tslib,_util_subscribeToResult,_OuterSubscriber,_InnerSubscriber,_map,_observable_from PURE_IMPORTS_END */
    function mergeMap(project, resultSelector, concurrent) {
        if (concurrent === void 0) {
            concurrent = Number.POSITIVE_INFINITY;
        }
        if (typeof resultSelector === 'function') {
            return function (source) { return source.pipe(mergeMap(function (a, i) { return from(project(a, i)).pipe(map(function (b, ii) { return resultSelector(a, b, i, ii); })); }, concurrent)); };
        }
        else if (typeof resultSelector === 'number') {
            concurrent = resultSelector;
        }
        return function (source) { return source.lift(new MergeMapOperator(project, concurrent)); };
    }
    var MergeMapOperator = /*@__PURE__*/ (function () {
        function MergeMapOperator(project, concurrent) {
            if (concurrent === void 0) {
                concurrent = Number.POSITIVE_INFINITY;
            }
            this.project = project;
            this.concurrent = concurrent;
        }
        MergeMapOperator.prototype.call = function (observer, source) {
            return source.subscribe(new MergeMapSubscriber(observer, this.project, this.concurrent));
        };
        return MergeMapOperator;
    }());
    var MergeMapSubscriber = /*@__PURE__*/ (function (_super) {
        __extends(MergeMapSubscriber, _super);
        function MergeMapSubscriber(destination, project, concurrent) {
            if (concurrent === void 0) {
                concurrent = Number.POSITIVE_INFINITY;
            }
            var _this = _super.call(this, destination) || this;
            _this.project = project;
            _this.concurrent = concurrent;
            _this.hasCompleted = false;
            _this.buffer = [];
            _this.active = 0;
            _this.index = 0;
            return _this;
        }
        MergeMapSubscriber.prototype._next = function (value) {
            if (this.active < this.concurrent) {
                this._tryNext(value);
            }
            else {
                this.buffer.push(value);
            }
        };
        MergeMapSubscriber.prototype._tryNext = function (value) {
            var result;
            var index = this.index++;
            try {
                result = this.project(value, index);
            }
            catch (err) {
                this.destination.error(err);
                return;
            }
            this.active++;
            this._innerSub(result, value, index);
        };
        MergeMapSubscriber.prototype._innerSub = function (ish, value, index) {
            var innerSubscriber = new InnerSubscriber(this, value, index);
            var destination = this.destination;
            destination.add(innerSubscriber);
            var innerSubscription = subscribeToResult(this, ish, undefined, undefined, innerSubscriber);
            if (innerSubscription !== innerSubscriber) {
                destination.add(innerSubscription);
            }
        };
        MergeMapSubscriber.prototype._complete = function () {
            this.hasCompleted = true;
            if (this.active === 0 && this.buffer.length === 0) {
                this.destination.complete();
            }
            this.unsubscribe();
        };
        MergeMapSubscriber.prototype.notifyNext = function (outerValue, innerValue, outerIndex, innerIndex, innerSub) {
            this.destination.next(innerValue);
        };
        MergeMapSubscriber.prototype.notifyComplete = function (innerSub) {
            var buffer = this.buffer;
            this.remove(innerSub);
            this.active--;
            if (buffer.length > 0) {
                this._next(buffer.shift());
            }
            else if (this.active === 0 && this.hasCompleted) {
                this.destination.complete();
            }
        };
        return MergeMapSubscriber;
    }(OuterSubscriber));

    /** PURE_IMPORTS_START _mergeMap,_util_identity PURE_IMPORTS_END */
    function mergeAll(concurrent) {
        if (concurrent === void 0) {
            concurrent = Number.POSITIVE_INFINITY;
        }
        return mergeMap(identity, concurrent);
    }

    /** PURE_IMPORTS_START _isArray PURE_IMPORTS_END */
    function isNumeric(val) {
        return !isArray(val) && (val - parseFloat(val) + 1) >= 0;
    }

    /** PURE_IMPORTS_START _Observable,_util_isScheduler,_operators_mergeAll,_fromArray PURE_IMPORTS_END */
    function merge() {
        var observables = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            observables[_i] = arguments[_i];
        }
        var concurrent = Number.POSITIVE_INFINITY;
        var scheduler = null;
        var last = observables[observables.length - 1];
        if (isScheduler(last)) {
            scheduler = observables.pop();
            if (observables.length > 1 && typeof observables[observables.length - 1] === 'number') {
                concurrent = observables.pop();
            }
        }
        else if (typeof last === 'number') {
            concurrent = observables.pop();
        }
        if (scheduler === null && observables.length === 1 && observables[0] instanceof Observable) {
            return observables[0];
        }
        return mergeAll(concurrent)(fromArray(observables, scheduler));
    }

    /** PURE_IMPORTS_START tslib,_Subscriber PURE_IMPORTS_END */
    function filter(predicate, thisArg) {
        return function filterOperatorFunction(source) {
            return source.lift(new FilterOperator(predicate, thisArg));
        };
    }
    var FilterOperator = /*@__PURE__*/ (function () {
        function FilterOperator(predicate, thisArg) {
            this.predicate = predicate;
            this.thisArg = thisArg;
        }
        FilterOperator.prototype.call = function (subscriber, source) {
            return source.subscribe(new FilterSubscriber(subscriber, this.predicate, this.thisArg));
        };
        return FilterOperator;
    }());
    var FilterSubscriber = /*@__PURE__*/ (function (_super) {
        __extends(FilterSubscriber, _super);
        function FilterSubscriber(destination, predicate, thisArg) {
            var _this = _super.call(this, destination) || this;
            _this.predicate = predicate;
            _this.thisArg = thisArg;
            _this.count = 0;
            return _this;
        }
        FilterSubscriber.prototype._next = function (value) {
            var result;
            try {
                result = this.predicate.call(this.thisArg, value, this.count++);
            }
            catch (err) {
                this.destination.error(err);
                return;
            }
            if (result) {
                this.destination.next(value);
            }
        };
        return FilterSubscriber;
    }(Subscriber));

    /** PURE_IMPORTS_START _Observable,_scheduler_async,_util_isNumeric,_util_isScheduler PURE_IMPORTS_END */
    function timer(dueTime, periodOrScheduler, scheduler) {
        if (dueTime === void 0) {
            dueTime = 0;
        }
        var period = -1;
        if (isNumeric(periodOrScheduler)) {
            period = Number(periodOrScheduler) < 1 && 1 || Number(periodOrScheduler);
        }
        else if (isScheduler(periodOrScheduler)) {
            scheduler = periodOrScheduler;
        }
        if (!isScheduler(scheduler)) {
            scheduler = async;
        }
        return new Observable(function (subscriber) {
            var due = isNumeric(dueTime)
                ? dueTime
                : (+dueTime - scheduler.now());
            return scheduler.schedule(dispatch$1, due, {
                index: 0, period: period, subscriber: subscriber
            });
        });
    }
    function dispatch$1(state) {
        var index = state.index, period = state.period, subscriber = state.subscriber;
        subscriber.next(index);
        if (subscriber.closed) {
            return;
        }
        else if (period === -1) {
            return subscriber.complete();
        }
        state.index = index + 1;
        this.schedule(state, period);
    }

    /** PURE_IMPORTS_START tslib,_OuterSubscriber,_util_subscribeToResult PURE_IMPORTS_END */
    function audit(durationSelector) {
        return function auditOperatorFunction(source) {
            return source.lift(new AuditOperator(durationSelector));
        };
    }
    var AuditOperator = /*@__PURE__*/ (function () {
        function AuditOperator(durationSelector) {
            this.durationSelector = durationSelector;
        }
        AuditOperator.prototype.call = function (subscriber, source) {
            return source.subscribe(new AuditSubscriber(subscriber, this.durationSelector));
        };
        return AuditOperator;
    }());
    var AuditSubscriber = /*@__PURE__*/ (function (_super) {
        __extends(AuditSubscriber, _super);
        function AuditSubscriber(destination, durationSelector) {
            var _this = _super.call(this, destination) || this;
            _this.durationSelector = durationSelector;
            _this.hasValue = false;
            return _this;
        }
        AuditSubscriber.prototype._next = function (value) {
            this.value = value;
            this.hasValue = true;
            if (!this.throttled) {
                var duration = void 0;
                try {
                    var durationSelector = this.durationSelector;
                    duration = durationSelector(value);
                }
                catch (err) {
                    return this.destination.error(err);
                }
                var innerSubscription = subscribeToResult(this, duration);
                if (!innerSubscription || innerSubscription.closed) {
                    this.clearThrottle();
                }
                else {
                    this.add(this.throttled = innerSubscription);
                }
            }
        };
        AuditSubscriber.prototype.clearThrottle = function () {
            var _a = this, value = _a.value, hasValue = _a.hasValue, throttled = _a.throttled;
            if (throttled) {
                this.remove(throttled);
                this.throttled = null;
                throttled.unsubscribe();
            }
            if (hasValue) {
                this.value = null;
                this.hasValue = false;
                this.destination.next(value);
            }
        };
        AuditSubscriber.prototype.notifyNext = function (outerValue, innerValue, outerIndex, innerIndex) {
            this.clearThrottle();
        };
        AuditSubscriber.prototype.notifyComplete = function () {
            this.clearThrottle();
        };
        return AuditSubscriber;
    }(OuterSubscriber));

    /** PURE_IMPORTS_START _scheduler_async,_audit,_observable_timer PURE_IMPORTS_END */
    function auditTime(duration, scheduler) {
        if (scheduler === void 0) {
            scheduler = async;
        }
        return audit(function () { return timer(duration, scheduler); });
    }

    /** PURE_IMPORTS_START tslib,_Subscriber,_scheduler_async PURE_IMPORTS_END */
    function debounceTime(dueTime, scheduler) {
        if (scheduler === void 0) {
            scheduler = async;
        }
        return function (source) { return source.lift(new DebounceTimeOperator(dueTime, scheduler)); };
    }
    var DebounceTimeOperator = /*@__PURE__*/ (function () {
        function DebounceTimeOperator(dueTime, scheduler) {
            this.dueTime = dueTime;
            this.scheduler = scheduler;
        }
        DebounceTimeOperator.prototype.call = function (subscriber, source) {
            return source.subscribe(new DebounceTimeSubscriber(subscriber, this.dueTime, this.scheduler));
        };
        return DebounceTimeOperator;
    }());
    var DebounceTimeSubscriber = /*@__PURE__*/ (function (_super) {
        __extends(DebounceTimeSubscriber, _super);
        function DebounceTimeSubscriber(destination, dueTime, scheduler) {
            var _this = _super.call(this, destination) || this;
            _this.dueTime = dueTime;
            _this.scheduler = scheduler;
            _this.debouncedSubscription = null;
            _this.lastValue = null;
            _this.hasValue = false;
            return _this;
        }
        DebounceTimeSubscriber.prototype._next = function (value) {
            this.clearDebounce();
            this.lastValue = value;
            this.hasValue = true;
            this.add(this.debouncedSubscription = this.scheduler.schedule(dispatchNext, this.dueTime, this));
        };
        DebounceTimeSubscriber.prototype._complete = function () {
            this.debouncedNext();
            this.destination.complete();
        };
        DebounceTimeSubscriber.prototype.debouncedNext = function () {
            this.clearDebounce();
            if (this.hasValue) {
                var lastValue = this.lastValue;
                this.lastValue = null;
                this.hasValue = false;
                this.destination.next(lastValue);
            }
        };
        DebounceTimeSubscriber.prototype.clearDebounce = function () {
            var debouncedSubscription = this.debouncedSubscription;
            if (debouncedSubscription !== null) {
                this.remove(debouncedSubscription);
                debouncedSubscription.unsubscribe();
                this.debouncedSubscription = null;
            }
        };
        return DebounceTimeSubscriber;
    }(Subscriber));
    function dispatchNext(subscriber) {
        subscriber.debouncedNext();
    }

    /** PURE_IMPORTS_START  PURE_IMPORTS_END */
    function isDate(value) {
        return value instanceof Date && !isNaN(+value);
    }

    /** PURE_IMPORTS_START tslib,_scheduler_async,_util_isDate,_Subscriber,_Notification PURE_IMPORTS_END */
    function delay(delay, scheduler) {
        if (scheduler === void 0) {
            scheduler = async;
        }
        var absoluteDelay = isDate(delay);
        var delayFor = absoluteDelay ? (+delay - scheduler.now()) : Math.abs(delay);
        return function (source) { return source.lift(new DelayOperator(delayFor, scheduler)); };
    }
    var DelayOperator = /*@__PURE__*/ (function () {
        function DelayOperator(delay, scheduler) {
            this.delay = delay;
            this.scheduler = scheduler;
        }
        DelayOperator.prototype.call = function (subscriber, source) {
            return source.subscribe(new DelaySubscriber(subscriber, this.delay, this.scheduler));
        };
        return DelayOperator;
    }());
    var DelaySubscriber = /*@__PURE__*/ (function (_super) {
        __extends(DelaySubscriber, _super);
        function DelaySubscriber(destination, delay, scheduler) {
            var _this = _super.call(this, destination) || this;
            _this.delay = delay;
            _this.scheduler = scheduler;
            _this.queue = [];
            _this.active = false;
            _this.errored = false;
            return _this;
        }
        DelaySubscriber.dispatch = function (state) {
            var source = state.source;
            var queue = source.queue;
            var scheduler = state.scheduler;
            var destination = state.destination;
            while (queue.length > 0 && (queue[0].time - scheduler.now()) <= 0) {
                queue.shift().notification.observe(destination);
            }
            if (queue.length > 0) {
                var delay_1 = Math.max(0, queue[0].time - scheduler.now());
                this.schedule(state, delay_1);
            }
            else {
                this.unsubscribe();
                source.active = false;
            }
        };
        DelaySubscriber.prototype._schedule = function (scheduler) {
            this.active = true;
            var destination = this.destination;
            destination.add(scheduler.schedule(DelaySubscriber.dispatch, this.delay, {
                source: this, destination: this.destination, scheduler: scheduler
            }));
        };
        DelaySubscriber.prototype.scheduleNotification = function (notification) {
            if (this.errored === true) {
                return;
            }
            var scheduler = this.scheduler;
            var message = new DelayMessage(scheduler.now() + this.delay, notification);
            this.queue.push(message);
            if (this.active === false) {
                this._schedule(scheduler);
            }
        };
        DelaySubscriber.prototype._next = function (value) {
            this.scheduleNotification(Notification.createNext(value));
        };
        DelaySubscriber.prototype._error = function (err) {
            this.errored = true;
            this.queue = [];
            this.destination.error(err);
            this.unsubscribe();
        };
        DelaySubscriber.prototype._complete = function () {
            this.scheduleNotification(Notification.createComplete());
            this.unsubscribe();
        };
        return DelaySubscriber;
    }(Subscriber));
    var DelayMessage = /*@__PURE__*/ (function () {
        function DelayMessage(time, notification) {
            this.time = time;
            this.notification = notification;
        }
        return DelayMessage;
    }());

    /** PURE_IMPORTS_START tslib,_Subscriber PURE_IMPORTS_END */
    function distinctUntilChanged(compare, keySelector) {
        return function (source) { return source.lift(new DistinctUntilChangedOperator(compare, keySelector)); };
    }
    var DistinctUntilChangedOperator = /*@__PURE__*/ (function () {
        function DistinctUntilChangedOperator(compare, keySelector) {
            this.compare = compare;
            this.keySelector = keySelector;
        }
        DistinctUntilChangedOperator.prototype.call = function (subscriber, source) {
            return source.subscribe(new DistinctUntilChangedSubscriber(subscriber, this.compare, this.keySelector));
        };
        return DistinctUntilChangedOperator;
    }());
    var DistinctUntilChangedSubscriber = /*@__PURE__*/ (function (_super) {
        __extends(DistinctUntilChangedSubscriber, _super);
        function DistinctUntilChangedSubscriber(destination, compare, keySelector) {
            var _this = _super.call(this, destination) || this;
            _this.keySelector = keySelector;
            _this.hasKey = false;
            if (typeof compare === 'function') {
                _this.compare = compare;
            }
            return _this;
        }
        DistinctUntilChangedSubscriber.prototype.compare = function (x, y) {
            return x === y;
        };
        DistinctUntilChangedSubscriber.prototype._next = function (value) {
            var key;
            try {
                var keySelector = this.keySelector;
                key = keySelector ? keySelector(value) : value;
            }
            catch (err) {
                return this.destination.error(err);
            }
            var result = false;
            if (this.hasKey) {
                try {
                    var compare = this.compare;
                    result = compare(this.key, key);
                }
                catch (err) {
                    return this.destination.error(err);
                }
            }
            else {
                this.hasKey = true;
            }
            if (!result) {
                this.key = key;
                this.destination.next(value);
            }
        };
        return DistinctUntilChangedSubscriber;
    }(Subscriber));

    /** PURE_IMPORTS_START tslib,_Subscriber,_util_ArgumentOutOfRangeError,_observable_empty PURE_IMPORTS_END */
    function take(count) {
        return function (source) {
            if (count === 0) {
                return empty$1();
            }
            else {
                return source.lift(new TakeOperator(count));
            }
        };
    }
    var TakeOperator = /*@__PURE__*/ (function () {
        function TakeOperator(total) {
            this.total = total;
            if (this.total < 0) {
                throw new ArgumentOutOfRangeError;
            }
        }
        TakeOperator.prototype.call = function (subscriber, source) {
            return source.subscribe(new TakeSubscriber(subscriber, this.total));
        };
        return TakeOperator;
    }());
    var TakeSubscriber = /*@__PURE__*/ (function (_super) {
        __extends(TakeSubscriber, _super);
        function TakeSubscriber(destination, total) {
            var _this = _super.call(this, destination) || this;
            _this.total = total;
            _this.count = 0;
            return _this;
        }
        TakeSubscriber.prototype._next = function (value) {
            var total = this.total;
            var count = ++this.count;
            if (count <= total) {
                this.destination.next(value);
                if (count === total) {
                    this.destination.complete();
                    this.unsubscribe();
                }
            }
        };
        return TakeSubscriber;
    }(Subscriber));

    /** PURE_IMPORTS_START tslib,_Subscriber PURE_IMPORTS_END */
    function pairwise() {
        return function (source) { return source.lift(new PairwiseOperator()); };
    }
    var PairwiseOperator = /*@__PURE__*/ (function () {
        function PairwiseOperator() {
        }
        PairwiseOperator.prototype.call = function (subscriber, source) {
            return source.subscribe(new PairwiseSubscriber(subscriber));
        };
        return PairwiseOperator;
    }());
    var PairwiseSubscriber = /*@__PURE__*/ (function (_super) {
        __extends(PairwiseSubscriber, _super);
        function PairwiseSubscriber(destination) {
            var _this = _super.call(this, destination) || this;
            _this.hasPrev = false;
            return _this;
        }
        PairwiseSubscriber.prototype._next = function (value) {
            var pair;
            if (this.hasPrev) {
                pair = [this.prev, value];
            }
            else {
                this.hasPrev = true;
            }
            this.prev = value;
            if (pair) {
                this.destination.next(pair);
            }
        };
        return PairwiseSubscriber;
    }(Subscriber));

    /** PURE_IMPORTS_START tslib,_Subscriber PURE_IMPORTS_END */
    function skip(count) {
        return function (source) { return source.lift(new SkipOperator(count)); };
    }
    var SkipOperator = /*@__PURE__*/ (function () {
        function SkipOperator(total) {
            this.total = total;
        }
        SkipOperator.prototype.call = function (subscriber, source) {
            return source.subscribe(new SkipSubscriber(subscriber, this.total));
        };
        return SkipOperator;
    }());
    var SkipSubscriber = /*@__PURE__*/ (function (_super) {
        __extends(SkipSubscriber, _super);
        function SkipSubscriber(destination, total) {
            var _this = _super.call(this, destination) || this;
            _this.total = total;
            _this.count = 0;
            return _this;
        }
        SkipSubscriber.prototype._next = function (x) {
            if (++this.count > this.total) {
                this.destination.next(x);
            }
        };
        return SkipSubscriber;
    }(Subscriber));

    /** PURE_IMPORTS_START tslib,_OuterSubscriber,_InnerSubscriber,_util_subscribeToResult,_map,_observable_from PURE_IMPORTS_END */
    function switchMap(project, resultSelector) {
        if (typeof resultSelector === 'function') {
            return function (source) { return source.pipe(switchMap(function (a, i) { return from(project(a, i)).pipe(map(function (b, ii) { return resultSelector(a, b, i, ii); })); })); };
        }
        return function (source) { return source.lift(new SwitchMapOperator(project)); };
    }
    var SwitchMapOperator = /*@__PURE__*/ (function () {
        function SwitchMapOperator(project) {
            this.project = project;
        }
        SwitchMapOperator.prototype.call = function (subscriber, source) {
            return source.subscribe(new SwitchMapSubscriber(subscriber, this.project));
        };
        return SwitchMapOperator;
    }());
    var SwitchMapSubscriber = /*@__PURE__*/ (function (_super) {
        __extends(SwitchMapSubscriber, _super);
        function SwitchMapSubscriber(destination, project) {
            var _this = _super.call(this, destination) || this;
            _this.project = project;
            _this.index = 0;
            return _this;
        }
        SwitchMapSubscriber.prototype._next = function (value) {
            var result;
            var index = this.index++;
            try {
                result = this.project(value, index);
            }
            catch (error) {
                this.destination.error(error);
                return;
            }
            this._innerSub(result, value, index);
        };
        SwitchMapSubscriber.prototype._innerSub = function (result, value, index) {
            var innerSubscription = this.innerSubscription;
            if (innerSubscription) {
                innerSubscription.unsubscribe();
            }
            var innerSubscriber = new InnerSubscriber(this, value, index);
            var destination = this.destination;
            destination.add(innerSubscriber);
            this.innerSubscription = subscribeToResult(this, result, undefined, undefined, innerSubscriber);
            if (this.innerSubscription !== innerSubscriber) {
                destination.add(this.innerSubscription);
            }
        };
        SwitchMapSubscriber.prototype._complete = function () {
            var innerSubscription = this.innerSubscription;
            if (!innerSubscription || innerSubscription.closed) {
                _super.prototype._complete.call(this);
            }
            this.unsubscribe();
        };
        SwitchMapSubscriber.prototype._unsubscribe = function () {
            this.innerSubscription = null;
        };
        SwitchMapSubscriber.prototype.notifyComplete = function (innerSub) {
            var destination = this.destination;
            destination.remove(innerSub);
            this.innerSubscription = null;
            if (this.isStopped) {
                _super.prototype._complete.call(this);
            }
        };
        SwitchMapSubscriber.prototype.notifyNext = function (outerValue, innerValue, outerIndex, innerIndex, innerSub) {
            this.destination.next(innerValue);
        };
        return SwitchMapSubscriber;
    }(OuterSubscriber));

    var currentAction = {
        type: null,
        entityIds: null,
        skip: false,
    };
    var customActionActive = false;
    function resetCustomAction() {
        customActionActive = false;
    }
    // public API for custom actions. Custom action always wins
    function logAction(type, entityIds) {
        setAction(type, entityIds);
        customActionActive = true;
    }
    function setAction(type, entityIds) {
        if (customActionActive === false) {
            currentAction.type = type;
            currentAction.entityIds = entityIds;
        }
    }
    function setSkipAction(skip) {
        if (skip === void 0) { skip = true; }
        currentAction.skip = skip;
    }
    function action(action, entityIds) {
        return function (target, propertyKey, descriptor) {
            var originalMethod = descriptor.value;
            descriptor.value = function () {
                var args = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    args[_i] = arguments[_i];
                }
                logAction(action, entityIds);
                return originalMethod.apply(this, args);
            };
            return descriptor;
        };
    }

    // @internal
    function hasEntity(entities, id) {
        return entities.hasOwnProperty(id);
    }

    // @internal
    function addEntities(_a) {
        var state = _a.state, entities = _a.entities, idKey = _a.idKey, _b = _a.options, options = _b === void 0 ? {} : _b, preAddEntity = _a.preAddEntity;
        var e_1, _c;
        var newEntities = {};
        var newIds = [];
        var hasNewEntities = false;
        try {
            for (var entities_1 = __values(entities), entities_1_1 = entities_1.next(); !entities_1_1.done; entities_1_1 = entities_1.next()) {
                var entity = entities_1_1.value;
                if (hasEntity(state.entities, entity[idKey]) === false) {
                    // evaluate the middleware first to support dynamic ids
                    var current = preAddEntity(entity);
                    var entityId = current[idKey];
                    newEntities[entityId] = current;
                    if (options.prepend)
                        newIds.unshift(entityId);
                    else
                        newIds.push(entityId);
                    hasNewEntities = true;
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (entities_1_1 && !entities_1_1.done && (_c = entities_1.return)) _c.call(entities_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        return hasNewEntities
            ? {
                newState: __assign({}, state, { entities: __assign({}, state.entities, newEntities), ids: options.prepend ? __spread(newIds, state.ids) : __spread(state.ids, newIds) }),
                newIds: newIds
            }
            : null;
    }

    // @internal
    function isNil(v) {
        return v === null || v === undefined;
    }

    // @internal
    function coerceArray(value) {
        if (isNil(value)) {
            return [];
        }
        return Array.isArray(value) ? value : [value];
    }

    var DEFAULT_ID_KEY = 'id';

    var EntityActions;
    (function (EntityActions) {
        EntityActions[EntityActions["Set"] = 0] = "Set";
        EntityActions[EntityActions["Add"] = 1] = "Add";
        EntityActions[EntityActions["Update"] = 2] = "Update";
        EntityActions[EntityActions["Remove"] = 3] = "Remove";
    })(EntityActions || (EntityActions = {}));

    var isBrowser = typeof window !== 'undefined';
    var isNotBrowser = !isBrowser;
    // export const isNativeScript = typeof global !== 'undefined' && (<any>global).__runtimeVersion !== 'undefined'; TODO is this used?
    var hasLocalStorage = function () {
        try {
            return typeof localStorage !== 'undefined';
        }
        catch (_a) {
            return false;
        }
    };
    var hasSessionStorage = function () {
        try {
            return typeof sessionStorage !== 'undefined';
        }
        catch (_a) {
            return false;
        }
    };

    // @internal
    function isObject$1(value) {
        var type = typeof value;
        return value != null && (type == 'object' || type == 'function');
    }

    // @internal
    function isArray$1(value) {
        return Array.isArray(value);
    }

    // @internal
    function getActiveEntities(idOrOptions, ids, currentActive) {
        var result;
        if (isArray$1(idOrOptions)) {
            result = idOrOptions;
        }
        else {
            if (isObject$1(idOrOptions)) {
                if (isNil(currentActive))
                    return;
                idOrOptions = Object.assign({ wrap: true }, idOrOptions);
                var currentIdIndex = ids.indexOf(currentActive);
                if (idOrOptions.prev) {
                    var isFirst = currentIdIndex === 0;
                    if (isFirst && !idOrOptions.wrap)
                        return;
                    result = isFirst ? ids[ids.length - 1] : ids[currentIdIndex - 1];
                }
                else if (idOrOptions.next) {
                    var isLast = ids.length === currentIdIndex + 1;
                    if (isLast && !idOrOptions.wrap)
                        return;
                    result = isLast ? ids[0] : ids[currentIdIndex + 1];
                }
            }
            else {
                if (idOrOptions === currentActive)
                    return;
                result = idOrOptions;
            }
        }
        return result;
    }

    // @internal
    var getInitialEntitiesState = function () {
        return ({
            entities: {},
            ids: [],
            loading: true,
            error: null
        });
    };

    // @internal
    function isDefined(val) {
        return isNil(val) === false;
    }

    // @internal
    function isEmpty(arr) {
        if (isArray$1(arr)) {
            return arr.length === 0;
        }
        return false;
    }

    // @internal
    function isFunction$1(value) {
        return typeof value === 'function';
    }

    // @internal
    function isUndefined(value) {
        return value === undefined;
    }

    // @internal
    function hasActiveState(state) {
        return state.hasOwnProperty('active');
    }
    // @internal
    function isMultiActiveState(active) {
        return isArray$1(active);
    }
    // @internal
    function resolveActiveEntity(_a) {
        var active = _a.active, ids = _a.ids, entities = _a.entities;
        if (isMultiActiveState(active)) {
            return getExitingActives(active, ids);
        }
        if (hasEntity(entities, active) === false) {
            return null;
        }
        return active;
    }
    // @internal
    function getExitingActives(currentActivesIds, newIds) {
        var filtered = currentActivesIds.filter(function (id) { return newIds.indexOf(id) > -1; });
        /** Return the same reference if nothing has changed */
        if (filtered.length === currentActivesIds.length) {
            return currentActivesIds;
        }
        return filtered;
    }

    // @internal
    function removeEntities(_a) {
        var state = _a.state, ids = _a.ids;
        var e_1, _b;
        if (isNil(ids))
            return removeAllEntities(state);
        var entities = state.entities;
        var newEntities = {};
        try {
            for (var _c = __values(state.ids), _d = _c.next(); !_d.done; _d = _c.next()) {
                var id = _d.value;
                if (ids.includes(id) === false) {
                    newEntities[id] = entities[id];
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_d && !_d.done && (_b = _c.return)) _b.call(_c);
            }
            finally { if (e_1) throw e_1.error; }
        }
        var newState = __assign({}, state, { entities: newEntities, ids: state.ids.filter(function (current) { return ids.includes(current) === false; }) });
        if (hasActiveState(state)) {
            newState.active = resolveActiveEntity(newState);
        }
        return newState;
    }
    // @internal
    function removeAllEntities(state) {
        return __assign({}, state, { entities: {}, ids: [], active: isMultiActiveState(state.active) ? [] : null });
    }

    // @internal
    function toEntitiesObject(entities, idKey, preAddEntity) {
        var e_1, _a;
        var acc = {
            entities: {},
            ids: []
        };
        try {
            for (var entities_1 = __values(entities), entities_1_1 = entities_1.next(); !entities_1_1.done; entities_1_1 = entities_1.next()) {
                var entity = entities_1_1.value;
                // evaluate the middleware first to support dynamic ids
                var current = preAddEntity(entity);
                acc.entities[current[idKey]] = current;
                acc.ids.push(current[idKey]);
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (entities_1_1 && !entities_1_1.done && (_a = entities_1.return)) _a.call(entities_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        return acc;
    }

    // @internal
    function isEntityState(state) {
        return state.entities && state.ids;
    }
    // @internal
    function applyMiddleware(entities, preAddEntity) {
        var e_1, _a;
        var mapped = {};
        try {
            for (var _b = __values(Object.keys(entities)), _c = _b.next(); !_c.done; _c = _b.next()) {
                var id = _c.value;
                mapped[id] = preAddEntity(entities[id]);
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_1) throw e_1.error; }
        }
        return mapped;
    }
    // @internal
    function setEntities(_a) {
        var state = _a.state, entities = _a.entities, idKey = _a.idKey, preAddEntity = _a.preAddEntity, isNativePreAdd = _a.isNativePreAdd;
        var newEntities;
        var newIds;
        if (isArray$1(entities)) {
            var resolve = toEntitiesObject(entities, idKey, preAddEntity);
            newEntities = resolve.entities;
            newIds = resolve.ids;
        }
        else if (isEntityState(entities)) {
            newEntities = isNativePreAdd ? entities.entities : applyMiddleware(entities.entities, preAddEntity);
            newIds = entities.ids;
        }
        else {
            // it's an object
            newEntities = isNativePreAdd ? entities : applyMiddleware(entities, preAddEntity);
            newIds = Object.keys(newEntities).map(function (id) { return (isNaN(id) ? id : Number(id)); });
        }
        var newState = __assign({}, state, { entities: newEntities, ids: newIds, loading: false });
        if (hasActiveState(state)) {
            newState.active = resolveActiveEntity(newState);
        }
        return newState;
    }

    var CONFIG = {
        resettable: false,
        ttl: null,
        producerFn: undefined
    };
    // @internal
    function getAkitaConfig() {
        return CONFIG;
    }
    function getGlobalProducerFn() {
        return CONFIG.producerFn;
    }

    // @internal
    function deepFreeze(o) {
        Object.freeze(o);
        var oIsFunction = typeof o === 'function';
        var hasOwnProp = Object.prototype.hasOwnProperty;
        Object.getOwnPropertyNames(o).forEach(function (prop) {
            if (hasOwnProp.call(o, prop) &&
                (oIsFunction ? prop !== 'caller' && prop !== 'callee' && prop !== 'arguments' : true) &&
                o[prop] !== null &&
                (typeof o[prop] === 'object' || typeof o[prop] === 'function') &&
                !Object.isFrozen(o[prop])) {
                deepFreeze(o[prop]);
            }
        });
        return o;
    }

    // @internal
    var $$deleteStore = new Subject();
    // @internal
    var $$addStore = new ReplaySubject(50, 5000);
    // @internal
    var $$updateStore = new Subject();
    // @internal
    function dispatchDeleted(storeName) {
        $$deleteStore.next(storeName);
    }
    // @internal
    function dispatchAdded(storeName) {
        $$addStore.next(storeName);
    }
    // @internal
    function dispatchUpdate(storeName, action) {
        $$updateStore.next({ storeName: storeName, action: action });
    }

    // @internal
    var AkitaError = /** @class */ (function (_super) {
        __extends(AkitaError, _super);
        function AkitaError(message) {
            return _super.call(this, message) || this;
        }
        return AkitaError;
    }(Error));
    // @internal
    function assertStoreHasName(name, className) {
        if (!name) {
            console.error("@StoreConfig({ name }) is missing in " + className);
        }
    }

    // @internal
    function toBoolean(value) {
        return value != null && "" + value !== 'false';
    }

    // @internal
    function isPlainObject(value) {
        return toBoolean(value) && value.constructor.name === 'Object';
    }

    var configKey = 'akitaConfig';

    // @internal
    var __stores__ = {};
    // @internal
    var __queries__ = {};
    if (isBrowser) {
        window.$$stores = __stores__;
        window.$$queries = __queries__;
    }

    // @internal
    var transactionFinished = new Subject();
    // @internal
    var transactionInProcess = new BehaviorSubject(false);
    // @internal
    var transactionManager = {
        activeTransactions: 0,
        batchTransaction: null
    };
    // @internal
    function startBatch() {
        if (!isTransactionInProcess()) {
            transactionManager.batchTransaction = new Subject();
        }
        transactionManager.activeTransactions++;
        transactionInProcess.next(true);
    }
    // @internal
    function endBatch() {
        if (--transactionManager.activeTransactions === 0) {
            transactionManager.batchTransaction.next(true);
            transactionManager.batchTransaction.complete();
            transactionInProcess.next(false);
            transactionFinished.next(true);
        }
    }
    // @internal
    function isTransactionInProcess() {
        return transactionManager.activeTransactions > 0;
    }
    // @internal
    function commit() {
        return transactionManager.batchTransaction ? transactionManager.batchTransaction.asObservable() : of(true);
    }
    /**
     *  A logical transaction.
     *  Use this transaction to optimize the dispatch of all the stores.
     *  The following code will update the store, BUT  emits only once
     *
     *  @example
     *  applyTransaction(() => {
     *    this.todosStore.add(new Todo(1, title));
     *    this.todosStore.add(new Todo(2, title));
     *  });
     *
     */
    function applyTransaction(action, thisArg) {
        if (thisArg === void 0) { thisArg = undefined; }
        startBatch();
        try {
            return action.apply(thisArg);
        }
        finally {
            logAction('@Transaction');
            endBatch();
        }
    }
    /**
     *  A logical transaction.
     *  Use this transaction to optimize the dispatch of all the stores.
     *
     *  The following code will update the store, BUT  emits only once.
     *
     *  @example
     *  @transaction
     *  addTodos() {
     *    this.todosStore.add(new Todo(1, title));
     *    this.todosStore.add(new Todo(2, title));
     *  }
     *
     *
     */
    function transaction() {
        return function (target, propertyKey, descriptor) {
            var originalMethod = descriptor.value;
            descriptor.value = function () {
                var _this = this;
                var args = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    args[_i] = arguments[_i];
                }
                return applyTransaction(function () {
                    return originalMethod.apply(_this, args);
                }, this);
            };
            return descriptor;
        };
    }

    /**
     *
     * Store for managing any type of data
     *
     * @example
     *
     * export interface SessionState {
     *   token: string;
     *   userDetails: UserDetails
     * }
     *
     * export function createInitialState(): SessionState {
     *  return {
     *    token: '',
     *    userDetails: null
     *  };
     * }
     *
     * @StoreConfig({ name: 'session' })
     * export class SessionStore extends Store<SessionState> {
     *   constructor() {
     *    super(createInitialState());
     *   }
     * }
     */
    var Store = /** @class */ (function () {
        function Store(initialState, options) {
            if (options === void 0) { options = {}; }
            this.options = options;
            this.inTransaction = false;
            this.cache = {
                active: new BehaviorSubject(false),
                ttl: null,
            };
            this.onInit(initialState);
        }
        /**
         *  Set the loading state
         *
         *  @example
         *
         *  store.setLoading(true)
         *
         */
        Store.prototype.setLoading = function (loading) {
            if (loading === void 0) { loading = false; }
            if (loading !== this._value().loading) {
                 setAction('Set Loading');
                this._setState(function (state) { return (__assign({}, state, { loading: loading })); });
            }
        };
        /**
         *
         * Set whether the data is cached
         *
         * @example
         *
         * store.setHasCache(true)
         * store.setHasCache(false)
         * store.setHasCache(true, { restartTTL: true })
         *
         */
        Store.prototype.setHasCache = function (hasCache, options) {
            var _this = this;
            if (options === void 0) { options = { restartTTL: false }; }
            if (hasCache !== this.cache.active.value) {
                this.cache.active.next(hasCache);
            }
            if (options.restartTTL) {
                var ttlConfig = this.getCacheTTL();
                if (ttlConfig) {
                    if (this.cache.ttl !== null) {
                        clearTimeout(this.cache.ttl);
                    }
                    this.cache.ttl = setTimeout(function () { return _this.setHasCache(false); }, ttlConfig);
                }
            }
        };
        /**
         *
         * Sometimes we need to access the store value from a store
         *
         * @example middleware
         *
         */
        Store.prototype.getValue = function () {
            return this.storeValue;
        };
        /**
         *  Set the error state
         *
         *  @example
         *
         *  store.setError({text: 'unable to load data' })
         *
         */
        Store.prototype.setError = function (error) {
            if (error !== this._value().error) {
                 setAction('Set Error');
                this._setState(function (state) { return (__assign({}, state, { error: error })); });
            }
        };
        // @internal
        Store.prototype._select = function (project) {
            return this.store.asObservable().pipe(map(function (snapshot) { return project(snapshot.state); }), distinctUntilChanged());
        };
        // @internal
        Store.prototype._value = function () {
            return this.storeValue;
        };
        // @internal
        Store.prototype._cache = function () {
            return this.cache.active;
        };
        Object.defineProperty(Store.prototype, "config", {
            // @internal
            get: function () {
                return this.constructor[configKey] || {};
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Store.prototype, "storeName", {
            // @internal
            get: function () {
                return this.config.storeName || this.options.storeName || this.options.name;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Store.prototype, "deepFreeze", {
            // @internal
            get: function () {
                return this.config.deepFreezeFn || this.options.deepFreezeFn || deepFreeze;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Store.prototype, "cacheConfig", {
            // @internal
            get: function () {
                return this.config.cache || this.options.cache;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Store.prototype, "_producerFn", {
            get: function () {
                return this.config.producerFn || this.options.producerFn || getGlobalProducerFn();
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Store.prototype, "resettable", {
            // @internal
            get: function () {
                return isDefined(this.config.resettable) ? this.config.resettable : this.options.resettable;
            },
            enumerable: true,
            configurable: true
        });
        // @internal
        Store.prototype._setState = function (newState, _dispatchAction) {
            var _this = this;
            if (_dispatchAction === void 0) { _dispatchAction = true; }
            if (isFunction$1(newState)) {
                var _newState = newState(this._value());
                this.storeValue =  this.deepFreeze(_newState) ;
            }
            else {
                this.storeValue = newState;
            }
            if (!this.store) {
                this.store = new BehaviorSubject({ state: this.storeValue });
                {
                    this.store.subscribe(function (_a) {
                        var action = _a.action;
                        if (action) {
                            dispatchUpdate(_this.storeName, action);
                        }
                    });
                }
                return;
            }
            if (isTransactionInProcess()) {
                this.handleTransaction();
                return;
            }
            this.dispatch(this.storeValue, _dispatchAction);
        };
        /**
         *
         * Reset the current store back to the initial value
         *
         * @example
         *
         * store.reset()
         *
         */
        Store.prototype.reset = function () {
            var _this = this;
            if (this.isResettable()) {
                 setAction('Reset');
                this._setState(function () { return Object.assign({}, _this._initialState); });
                this.setHasCache(false);
            }
            else {
                 console.warn("You need to enable the reset functionality");
            }
        };
        Store.prototype.update = function (stateOrCallback) {
             setAction('Update');
            var newState;
            var currentState = this._value();
            if (isFunction$1(stateOrCallback)) {
                newState = isFunction$1(this._producerFn) ? this._producerFn(currentState, stateOrCallback) : stateOrCallback(currentState);
            }
            else {
                newState = stateOrCallback;
            }
            var withHook = this.akitaPreUpdate(currentState, __assign({}, currentState, newState));
            var resolved = isPlainObject(currentState) ? withHook : new currentState.constructor(withHook);
            this._setState(resolved);
        };
        Store.prototype.updateStoreConfig = function (newOptions) {
            this.options = __assign({}, this.options, newOptions);
        };
        // @internal
        Store.prototype.akitaPreUpdate = function (_, nextState) {
            return nextState;
        };
        Store.prototype.ngOnDestroy = function () {
            this.destroy();
        };
        /**
         *
         * Destroy the store
         *
         * @example
         *
         * store.destroy()
         *
         */
        Store.prototype.destroy = function () {
            var hmrEnabled = isBrowser ? window.hmrEnabled : false;
            if (!hmrEnabled && this === __stores__[this.storeName]) {
                delete __stores__[this.storeName];
                dispatchDeleted(this.storeName);
                this.setHasCache(false);
                this.cache.active.complete();
                this.store.complete();
            }
        };
        Store.prototype.onInit = function (initialState) {
            __stores__[this.storeName] = this;
            this._setState(function () { return initialState; });
            dispatchAdded(this.storeName);
            if (this.isResettable()) {
                this._initialState = initialState;
            }
             assertStoreHasName(this.storeName, this.constructor.name);
        };
        Store.prototype.dispatch = function (state, _dispatchAction) {
            if (_dispatchAction === void 0) { _dispatchAction = true; }
            var action = undefined;
            if (_dispatchAction) {
                action = currentAction;
                resetCustomAction();
            }
            this.store.next({ state: state, action: action });
        };
        Store.prototype.watchTransaction = function () {
            var _this = this;
            commit().subscribe(function () {
                _this.inTransaction = false;
                _this.dispatch(_this._value());
            });
        };
        Store.prototype.isResettable = function () {
            if (this.resettable === false) {
                return false;
            }
            return this.resettable || getAkitaConfig().resettable;
        };
        Store.prototype.handleTransaction = function () {
            if (!this.inTransaction) {
                this.watchTransaction();
                this.inTransaction = true;
            }
        };
        Store.prototype.getCacheTTL = function () {
            return (this.cacheConfig && this.cacheConfig.ttl) || getAkitaConfig().ttl;
        };
        return Store;
    }());

    // @internal
    function updateEntities(_a) {
        var state = _a.state, ids = _a.ids, idKey = _a.idKey, newStateOrFn = _a.newStateOrFn, preUpdateEntity = _a.preUpdateEntity, producerFn = _a.producerFn;
        var e_1, _b;
        var updatedEntities = {};
        var isUpdatingIdKey = false;
        var idToUpdate;
        try {
            for (var ids_1 = __values(ids), ids_1_1 = ids_1.next(); !ids_1_1.done; ids_1_1 = ids_1.next()) {
                var id = ids_1_1.value;
                // if the entity doesn't exist don't do anything
                if (hasEntity(state.entities, id) === false) {
                    continue;
                }
                var oldEntity = state.entities[id];
                var newState = void 0;
                if (isFunction$1(newStateOrFn)) {
                    newState = isFunction$1(producerFn) ? producerFn(oldEntity, newStateOrFn) : newStateOrFn(oldEntity);
                }
                else {
                    newState = newStateOrFn;
                }
                var isIdChanged = newState.hasOwnProperty(idKey) && newState[idKey] !== oldEntity[idKey];
                var newEntity = void 0;
                idToUpdate = id;
                if (isIdChanged) {
                    isUpdatingIdKey = true;
                    idToUpdate = newState[idKey];
                }
                var merged = __assign({}, oldEntity, newState);
                if (isPlainObject(oldEntity)) {
                    newEntity = merged;
                }
                else {
                    /**
                     * In case that new state is class of it's own, there's
                     * a possibility that it will be different than the old
                     * class.
                     * For example, Old state is an instance of animal class
                     * and new state is instance of person class.
                     * To avoid run over new person class with the old animal
                     * class we check if the new state is a class of it's own.
                     * If so, use it. Otherwise, use the old state class
                     */
                    if (isPlainObject(newState)) {
                        newEntity = new oldEntity.constructor(merged);
                    }
                    else {
                        newEntity = new newState.constructor(merged);
                    }
                }
                updatedEntities[idToUpdate] = preUpdateEntity(oldEntity, newEntity);
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (ids_1_1 && !ids_1_1.done && (_b = ids_1.return)) _b.call(ids_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        var updatedIds = state.ids;
        var stateEntities = state.entities;
        if (isUpdatingIdKey) {
            var _c = __read(ids, 1), id_1 = _c[0];
            var _d = state.entities, _e = id_1, deletedEntity = _d[_e], rest = __rest(_d, [typeof _e === "symbol" ? _e : _e + ""]);
            stateEntities = rest;
            updatedIds = state.ids.map(function (current) { return (current === id_1 ? idToUpdate : current); });
        }
        return __assign({}, state, { entities: __assign({}, stateEntities, updatedEntities), ids: updatedIds });
    }

    /**
     *
     * Store for managing a collection of entities
     *
     * @example
     *
     * export interface WidgetsState extends EntityState<Widget> { }
     *
     * @StoreConfig({ name: 'widgets' })
     *  export class WidgetsStore extends EntityStore<WidgetsState> {
     *   constructor() {
     *     super();
     *   }
     * }
     *
     *
     */
    var EntityStore = /** @class */ (function (_super) {
        __extends(EntityStore, _super);
        function EntityStore(initialState, options) {
            if (initialState === void 0) { initialState = {}; }
            if (options === void 0) { options = {}; }
            var _this = _super.call(this, __assign({}, getInitialEntitiesState(), initialState), options) || this;
            _this.options = options;
            _this.entityActions = new Subject();
            return _this;
        }
        Object.defineProperty(EntityStore.prototype, "selectEntityAction$", {
            // @internal
            get: function () {
                return this.entityActions.asObservable();
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(EntityStore.prototype, "idKey", {
            // @internal
            get: function () {
                return this.config.idKey || this.options.idKey || DEFAULT_ID_KEY;
            },
            enumerable: true,
            configurable: true
        });
        /**
         *
         * Replace current collection with provided collection
         *
         * @example
         *
         * this.store.set([Entity, Entity])
         * this.store.set({ids: [], entities: {}})
         * this.store.set({ 1: {}, 2: {}})
         *
         */
        EntityStore.prototype.set = function (entities, options) {
            var _this = this;
            if (options === void 0) { options = {}; }
            if (isNil(entities))
                return;
             setAction('Set Entity');
            var isNativePreAdd = this.akitaPreAddEntity === EntityStore.prototype.akitaPreAddEntity;
            this.setHasCache(true, { restartTTL: true });
            this._setState(function (state) {
                var newState = setEntities({
                    state: state,
                    entities: entities,
                    idKey: _this.idKey,
                    preAddEntity: _this.akitaPreAddEntity,
                    isNativePreAdd: isNativePreAdd,
                });
                if (isUndefined(options.activeId) === false) {
                    newState.active = options.activeId;
                }
                return newState;
            });
            if (this.hasInitialUIState()) {
                this.handleUICreation();
            }
            this.entityActions.next({ type: EntityActions.Set, ids: this.ids });
        };
        /**
         * Add entities
         *
         * @example
         *
         * this.store.add([Entity, Entity])
         * this.store.add(Entity)
         * this.store.add(Entity, { prepend: true })
         *
         * this.store.add(Entity, { loading: false })
         */
        EntityStore.prototype.add = function (entities, options) {
            if (options === void 0) { options = { loading: false }; }
            var collection = coerceArray(entities);
            if (isEmpty(collection))
                return;
            var data = addEntities({
                state: this._value(),
                preAddEntity: this.akitaPreAddEntity,
                entities: collection,
                idKey: this.idKey,
                options: options,
            });
            if (data) {
                 setAction('Add Entity');
                data.newState.loading = options.loading;
                this._setState(function () { return data.newState; });
                if (this.hasInitialUIState()) {
                    this.handleUICreation(true);
                }
                this.entityActions.next({ type: EntityActions.Add, ids: data.newIds });
            }
        };
        EntityStore.prototype.update = function (idsOrFnOrState, newStateOrFn) {
            var _this = this;
            if (isUndefined(newStateOrFn)) {
                _super.prototype.update.call(this, idsOrFnOrState);
                return;
            }
            var ids = [];
            if (isFunction$1(idsOrFnOrState)) {
                // We need to filter according the predicate function
                ids = this.ids.filter(function (id) { return idsOrFnOrState(_this.entities[id]); });
            }
            else {
                // If it's nil we want all of them
                ids = isNil(idsOrFnOrState) ? this.ids : coerceArray(idsOrFnOrState);
            }
            if (isEmpty(ids))
                return;
             setAction('Update Entity', ids);
            this._setState(function (state) {
                return updateEntities({
                    idKey: _this.idKey,
                    ids: ids,
                    preUpdateEntity: _this.akitaPreUpdateEntity,
                    state: state,
                    newStateOrFn: newStateOrFn,
                    producerFn: _this._producerFn,
                });
            });
            this.entityActions.next({ type: EntityActions.Update, ids: ids });
        };
        EntityStore.prototype.upsert = function (ids, newState, onCreate, options) {
            var _this = this;
            if (options === void 0) { options = {}; }
            var toArray = coerceArray(ids);
            var predicate = function (isUpdate) { return function (id) { return hasEntity(_this.entities, id) === isUpdate; }; };
            var baseClass = isFunction$1(onCreate) ? options.baseClass : onCreate ? onCreate.baseClass : undefined;
            var isClassBased = isFunction$1(baseClass);
            var updateIds = toArray.filter(predicate(true));
            var newEntities = toArray.filter(predicate(false)).map(function (id) {
                var _a;
                var newStateObj = typeof newState === 'function' ? newState({}) : newState;
                var entity = isFunction$1(onCreate) ? onCreate(id, newStateObj) : newStateObj;
                var withId = __assign({}, entity, (_a = {}, _a[_this.idKey] = id, _a));
                if (isClassBased) {
                    return new baseClass(withId);
                }
                return withId;
            });
            // it can be any of the three types
            this.update(updateIds, newState);
            this.add(newEntities);
             logAction('Upsert Entity');
        };
        /**
         *
         * Upsert entity collection (idKey must be present)
         *
         * @example
         *
         * store.upsertMany([ { id: 1 }, { id: 2 }]);
         *
         * store.upsertMany([ { id: 1 }, { id: 2 }], { loading: true  });
         * store.upsertMany([ { id: 1 }, { id: 2 }], { baseClass: Todo  });
         *
         */
        EntityStore.prototype.upsertMany = function (entities, options) {
            if (options === void 0) { options = {}; }
            var e_1, _a;
            var addedIds = [];
            var updatedIds = [];
            var updatedEntities = {};
            try {
                // Update the state directly to optimize performance
                for (var entities_1 = __values(entities), entities_1_1 = entities_1.next(); !entities_1_1.done; entities_1_1 = entities_1.next()) {
                    var entity = entities_1_1.value;
                    var withPreCheckHook = this.akitaPreCheckEntity(entity);
                    var id = withPreCheckHook[this.idKey];
                    if (hasEntity(this.entities, id)) {
                        var prev = this._value().entities[id];
                        var merged = __assign({}, this._value().entities[id], withPreCheckHook);
                        var next = options.baseClass ? new options.baseClass(merged) : merged;
                        var withHook = this.akitaPreUpdateEntity(prev, next);
                        var nextId = withHook[this.idKey];
                        updatedEntities[nextId] = withHook;
                        updatedIds.push(nextId);
                    }
                    else {
                        var newEntity = options.baseClass ? new options.baseClass(withPreCheckHook) : withPreCheckHook;
                        var withHook = this.akitaPreAddEntity(newEntity);
                        var nextId = withHook[this.idKey];
                        addedIds.push(nextId);
                        updatedEntities[nextId] = withHook;
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (entities_1_1 && !entities_1_1.done && (_a = entities_1.return)) _a.call(entities_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
             logAction('Upsert Many');
            this._setState(function (state) { return (__assign({}, state, { ids: addedIds.length ? __spread(state.ids, addedIds) : state.ids, entities: __assign({}, state.entities, updatedEntities), loading: !!options.loading })); });
            updatedIds.length && this.entityActions.next({ type: EntityActions.Update, ids: updatedIds });
            addedIds.length && this.entityActions.next({ type: EntityActions.Add, ids: addedIds });
            if (addedIds.length && this.hasUIStore()) {
                this.handleUICreation(true);
            }
        };
        /**
         *
         * Replace one or more entities (except the id property)
         *
         *
         * @example
         *
         * this.store.replace(5, newEntity)
         * this.store.replace([1,2,3], newEntity)
         */
        EntityStore.prototype.replace = function (ids, newState) {
            var e_2, _a;
            var toArray = coerceArray(ids);
            if (isEmpty(toArray))
                return;
            var replaced = {};
            try {
                for (var toArray_1 = __values(toArray), toArray_1_1 = toArray_1.next(); !toArray_1_1.done; toArray_1_1 = toArray_1.next()) {
                    var id = toArray_1_1.value;
                    newState[this.idKey] = id;
                    replaced[id] = newState;
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (toArray_1_1 && !toArray_1_1.done && (_a = toArray_1.return)) _a.call(toArray_1);
                }
                finally { if (e_2) throw e_2.error; }
            }
             setAction('Replace Entity', ids);
            this._setState(function (state) { return (__assign({}, state, { entities: __assign({}, state.entities, replaced) })); });
        };
        /**
         *
         * Move entity inside the collection
         *
         *
         * @example
         *
         * this.store.move(fromIndex, toIndex)
         */
        EntityStore.prototype.move = function (from, to) {
            var ids = this.ids.slice();
            ids.splice(to < 0 ? ids.length + to : to, 0, ids.splice(from, 1)[0]);
             setAction('Move Entity');
            this._setState(function (state) { return (__assign({}, state, { 
                // Change the entities reference so that selectAll emit
                entities: __assign({}, state.entities), ids: ids })); });
        };
        EntityStore.prototype.remove = function (idsOrFn) {
            var _this = this;
            if (isEmpty(this.ids))
                return;
            var idPassed = isDefined(idsOrFn);
            // null means remove all
            var ids = [];
            if (isFunction$1(idsOrFn)) {
                ids = this.ids.filter(function (entityId) { return idsOrFn(_this.entities[entityId]); });
            }
            else {
                ids = idPassed ? coerceArray(idsOrFn) : null;
            }
            if (isEmpty(ids))
                return;
             setAction('Remove Entity', ids);
            this._setState(function (state) { return removeEntities({ state: state, ids: ids }); });
            if (ids === null) {
                this.setHasCache(false);
            }
            this.handleUIRemove(ids);
            this.entityActions.next({ type: EntityActions.Remove, ids: ids });
        };
        /**
         *
         * Update the active entity
         *
         * @example
         *
         * this.store.updateActive({ completed: true })
         * this.store.updateActive(active => {
         *   return {
         *     config: {
         *      ..active.config,
         *      date
         *     }
         *   }
         * })
         */
        EntityStore.prototype.updateActive = function (newStateOrCallback) {
            var ids = coerceArray(this.active);
             setAction('Update Active', ids);
            this.update(ids, newStateOrCallback);
        };
        EntityStore.prototype.setActive = function (idOrOptions) {
            var active = getActiveEntities(idOrOptions, this.ids, this.active);
            if (active === undefined) {
                return;
            }
             setAction('Set Active', active);
            this._setActive(active);
        };
        /**
         * Add active entities
         *
         * @example
         *
         * store.addActive(2);
         * store.addActive([3, 4, 5]);
         */
        EntityStore.prototype.addActive = function (ids) {
            var _this = this;
            var toArray = coerceArray(ids);
            if (isEmpty(toArray))
                return;
            var everyExist = toArray.every(function (id) { return _this.active.indexOf(id) > -1; });
            if (everyExist)
                return;
             setAction('Add Active', ids);
            this._setState(function (state) {
                /** Protect against case that one of the items in the array exist */
                var uniques = Array.from(new Set(__spread(state.active, toArray)));
                return __assign({}, state, { active: uniques });
            });
        };
        /**
         * Remove active entities
         *
         * @example
         *
         * store.removeActive(2)
         * store.removeActive([3, 4, 5])
         */
        EntityStore.prototype.removeActive = function (ids) {
            var _this = this;
            var toArray = coerceArray(ids);
            if (isEmpty(toArray))
                return;
            var someExist = toArray.some(function (id) { return _this.active.indexOf(id) > -1; });
            if (!someExist)
                return;
             setAction('Remove Active', ids);
            this._setState(function (state) {
                return __assign({}, state, { active: Array.isArray(state.active) ? state.active.filter(function (currentId) { return toArray.indexOf(currentId) === -1; }) : null });
            });
        };
        /**
         * Toggle active entities
         *
         * @example
         *
         * store.toggle(2)
         * store.toggle([3, 4, 5])
         */
        EntityStore.prototype.toggleActive = function (ids) {
            var _this = this;
            var toArray = coerceArray(ids);
            var filterExists = function (remove) { return function (id) { return _this.active.includes(id) === remove; }; };
            var remove = toArray.filter(filterExists(true));
            var add = toArray.filter(filterExists(false));
            this.removeActive(remove);
            this.addActive(add);
             logAction('Toggle Active');
        };
        /**
         *
         * Create sub UI store for managing Entity's UI state
         *
         * @example
         *
         * export type ProductUI = {
         *   isLoading: boolean;
         *   isOpen: boolean
         * }
         *
         * interface ProductsUIState extends EntityState<ProductUI> {}
         *
         * export class ProductsStore EntityStore<ProductsState, Product> {
         *   ui: EntityUIStore<ProductsUIState, ProductUI>;
         *
         *   constructor() {
         *     super();
         *     this.createUIStore();
         *   }
         *
         * }
         */
        EntityStore.prototype.createUIStore = function (initialState, storeConfig) {
            if (initialState === void 0) { initialState = {}; }
            if (storeConfig === void 0) { storeConfig = {}; }
            var defaults = { name: "UI/" + this.storeName, idKey: this.idKey };
            this.ui = new EntityUIStore(initialState, __assign({}, defaults, storeConfig));
            return this.ui;
        };
        // @internal
        EntityStore.prototype.destroy = function () {
            _super.prototype.destroy.call(this);
            if (this.ui instanceof EntityStore) {
                this.ui.destroy();
            }
            this.entityActions.complete();
        };
        // @internal
        EntityStore.prototype.akitaPreUpdateEntity = function (_, nextEntity) {
            return nextEntity;
        };
        // @internal
        EntityStore.prototype.akitaPreAddEntity = function (newEntity) {
            return newEntity;
        };
        // @internal
        EntityStore.prototype.akitaPreCheckEntity = function (newEntity) {
            return newEntity;
        };
        Object.defineProperty(EntityStore.prototype, "ids", {
            get: function () {
                return this._value().ids;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(EntityStore.prototype, "entities", {
            get: function () {
                return this._value().entities;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(EntityStore.prototype, "active", {
            get: function () {
                return this._value().active;
            },
            enumerable: true,
            configurable: true
        });
        EntityStore.prototype._setActive = function (ids) {
            this._setState(function (state) {
                return __assign({}, state, { active: ids });
            });
        };
        EntityStore.prototype.handleUICreation = function (add) {
            var _this = this;
            if (add === void 0) { add = false; }
            var ids = this.ids;
            var isFunc = isFunction$1(this.ui._akitaCreateEntityFn);
            var uiEntities;
            var createFn = function (id) {
                var _a;
                var current = _this.entities[id];
                var ui = isFunc ? _this.ui._akitaCreateEntityFn(current) : _this.ui._akitaCreateEntityFn;
                return __assign((_a = {}, _a[_this.idKey] = current[_this.idKey], _a), ui);
            };
            if (add) {
                uiEntities = this.ids.filter(function (id) { return isUndefined(_this.ui.entities[id]); }).map(createFn);
            }
            else {
                uiEntities = ids.map(createFn);
            }
            add ? this.ui.add(uiEntities) : this.ui.set(uiEntities);
        };
        EntityStore.prototype.hasInitialUIState = function () {
            return this.hasUIStore() && isUndefined(this.ui._akitaCreateEntityFn) === false;
        };
        EntityStore.prototype.handleUIRemove = function (ids) {
            if (this.hasUIStore()) {
                this.ui.remove(ids);
            }
        };
        EntityStore.prototype.hasUIStore = function () {
            return this.ui instanceof EntityUIStore;
        };
        var _b;
        __decorate([
            transaction(),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [Object, Object, Object, Object]),
            __metadata("design:returntype", void 0)
        ], EntityStore.prototype, "upsert", null);
        __decorate([
            transaction(),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [typeof (_b = typeof T !== "undefined" && T) === "function" ? _b : Object]),
            __metadata("design:returntype", void 0)
        ], EntityStore.prototype, "toggleActive", null);
        return EntityStore;
    }(Store));
    // @internal
    var EntityUIStore = /** @class */ (function (_super) {
        __extends(EntityUIStore, _super);
        function EntityUIStore(initialState, storeConfig) {
            if (initialState === void 0) { initialState = {}; }
            if (storeConfig === void 0) { storeConfig = {}; }
            return _super.call(this, initialState, storeConfig) || this;
        }
        /**
         *
         * Set the initial UI entity state. This function will determine the entity's
         * initial state when we call `set()` or `add()`.
         *
         * @example
         *
         * constructor() {
         *   super();
         *   this.createUIStore().setInitialEntityState(entity => ({ isLoading: false, isOpen: true }));
         *   this.createUIStore().setInitialEntityState({ isLoading: false, isOpen: true });
         * }
         *
         */
        EntityUIStore.prototype.setInitialEntityState = function (createFn) {
            this._akitaCreateEntityFn = createFn;
        };
        return EntityUIStore;
    }(EntityStore));
    // @internal
    function distinctUntilArrayItemChanged() {
        return distinctUntilChanged(function (prevCollection, currentCollection) {
            if (prevCollection === currentCollection) {
                return true;
            }
            if (isArray$1(prevCollection) === false || isArray$1(currentCollection) === false) {
                return false;
            }
            if (isEmpty(prevCollection) && isEmpty(currentCollection)) {
                return true;
            }
            // if item is new in the current collection but not exist in the prev collection
            var hasNewItem = hasChange(currentCollection, prevCollection);
            if (hasNewItem) {
                return false;
            }
            var isOneOfItemReferenceChanged = hasChange(prevCollection, currentCollection);
            // return false means there is a change and we want to call next()
            return isOneOfItemReferenceChanged === false;
        });
    }
    // @internal
    function hasChange(first, second) {
        var hasChange = second.some(function (currentItem) {
            var oldItem = first.find(function (prevItem) { return prevItem === currentItem; });
            return oldItem === undefined;
        });
        return hasChange;
    }

    var Order;
    (function (Order) {
        Order["ASC"] = "asc";
        Order["DESC"] = "desc";
    })(Order || (Order = {}));
    // @internal
    function compareValues(key, order) {
        if (order === void 0) { order = Order.ASC; }
        return function (a, b) {
            if (!a.hasOwnProperty(key) || !b.hasOwnProperty(key)) {
                return 0;
            }
            var varA = typeof a[key] === 'string' ? a[key].toUpperCase() : a[key];
            var varB = typeof b[key] === 'string' ? b[key].toUpperCase() : b[key];
            var comparison = 0;
            if (varA > varB) {
                comparison = 1;
            }
            else if (varA < varB) {
                comparison = -1;
            }
            return order == Order.DESC ? comparison * -1 : comparison;
        };
    }

    // @internal
    function entitiesToArray(state, options) {
        var arr = [];
        var ids = state.ids, entities = state.entities;
        var filterBy = options.filterBy, limitTo = options.limitTo, sortBy = options.sortBy, sortByOrder = options.sortByOrder;
        var _loop_1 = function (i) {
            var entity = entities[ids[i]];
            if (!filterBy) {
                arr.push(entity);
                return "continue";
            }
            var toArray = coerceArray(filterBy);
            var allPass = toArray.every(function (fn) { return fn(entity, i); });
            if (allPass) {
                arr.push(entity);
            }
        };
        for (var i = 0; i < ids.length; i++) {
            _loop_1(i);
        }
        if (sortBy) {
            var _sortBy_1 = isFunction$1(sortBy) ? sortBy : compareValues(sortBy, sortByOrder);
            arr = arr.sort(function (a, b) { return _sortBy_1(a, b, state); });
        }
        var length = Math.min(limitTo || arr.length, arr.length);
        return length === arr.length ? arr : arr.slice(0, length);
    }

    // @internal
    function entitiesToMap(state, options) {
        var map = {};
        var filterBy = options.filterBy, limitTo = options.limitTo;
        var ids = state.ids, entities = state.entities;
        if (!filterBy && !limitTo) {
            return entities;
        }
        var hasLimit = isNil(limitTo) === false;
        if (filterBy && hasLimit) {
            var count = 0;
            var _loop_1 = function (i, length_1) {
                if (count === limitTo)
                    return "break";
                var id = ids[i];
                var entity = entities[id];
                var allPass = coerceArray(filterBy).every(function (fn) { return fn(entity, i); });
                if (allPass) {
                    map[id] = entity;
                    count++;
                }
            };
            for (var i = 0, length_1 = ids.length; i < length_1; i++) {
                var state_1 = _loop_1(i, length_1);
                if (state_1 === "break")
                    break;
            }
        }
        else {
            var finalLength = Math.min(limitTo || ids.length, ids.length);
            var _loop_2 = function (i) {
                var id = ids[i];
                var entity = entities[id];
                if (!filterBy) {
                    map[id] = entity;
                    return "continue";
                }
                var allPass = coerceArray(filterBy).every(function (fn) { return fn(entity, i); });
                if (allPass) {
                    map[id] = entity;
                }
            };
            for (var i = 0; i < finalLength; i++) {
                _loop_2(i);
            }
        }
        return map;
    }

    // @internal
    function isString(value) {
        return typeof value === 'string';
    }

    // @internal
    function findEntityByPredicate(predicate, entities) {
        var e_1, _a;
        try {
            for (var _b = __values(Object.keys(entities)), _c = _b.next(); !_c.done; _c = _b.next()) {
                var entityId = _c.value;
                if (predicate(entities[entityId]) === true) {
                    return entityId;
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_1) throw e_1.error; }
        }
        return undefined;
    }
    // @internal
    function getEntity(id, project) {
        return function (entities) {
            var entity = entities[id];
            if (isUndefined(entity)) {
                return undefined;
            }
            if (!project) {
                return entity;
            }
            if (isString(project)) {
                return entity[project];
            }
            return project(entity);
        };
    }

    // @internal
    function mapSkipUndefined(arr, callbackFn) {
        return arr.reduce(function (result, value, index, array) {
            var val = callbackFn(value, index, array);
            if (val !== undefined) {
                result.push(val);
            }
            return result;
        }, []);
    }

    var queryConfigKey = 'akitaQueryConfig';

    function compareKeys(keysOrFuncs) {
        return function (prevState, currState) {
            var isFns = isFunction$1(keysOrFuncs[0]);
            // Return when they are NOT changed
            return keysOrFuncs.some(function (keyOrFunc) {
                if (isFns) {
                    return keyOrFunc(prevState) !== keyOrFunc(currState);
                }
                return prevState[keyOrFunc] !== currState[keyOrFunc];
            }) === false;
        };
    }

    var Query = /** @class */ (function () {
        function Query(store) {
            this.store = store;
            this.__store__ = store;
            {
                // @internal
                __queries__[store.storeName] = this;
            }
        }
        Query.prototype.select = function (project) {
            var mapFn;
            if (isFunction$1(project)) {
                mapFn = project;
            }
            else if (isString(project)) {
                mapFn = function (state) { return state[project]; };
            }
            else if (Array.isArray(project)) {
                return this.store
                    ._select(function (state) { return state; })
                    .pipe(distinctUntilChanged(compareKeys(project)), map(function (state) {
                    if (isFunction$1(project[0])) {
                        return project.map(function (func) { return func(state); });
                    }
                    return project.reduce(function (acc, k) {
                        acc[k] = state[k];
                        return acc;
                    }, {});
                }));
            }
            else {
                mapFn = function (state) { return state; };
            }
            return this.store._select(mapFn);
        };
        /**
         * Select the loading state
         *
         * @example
         *
         * this.query.selectLoading().subscribe(isLoading => {})
         */
        Query.prototype.selectLoading = function () {
            return this.select(function (state) { return state.loading; });
        };
        /**
         * Select the error state
         *
         * @example
         *
         * this.query.selectError().subscribe(error => {})
         */
        Query.prototype.selectError = function () {
            return this.select(function (state) { return state.error; });
        };
        /**
         * Get the store's value
         *
         * @example
         *
         * this.query.getValue()
         *
         */
        Query.prototype.getValue = function () {
            return this.store._value();
        };
        /**
         * Select the cache state
         *
         * @example
         *
         * this.query.selectHasCache().pipe(
         *   switchMap(hasCache => {
         *     return hasCache ? of() : http().pipe(res => store.set(res))
         *   })
         * )
         */
        Query.prototype.selectHasCache = function () {
            return this.store._cache().asObservable();
        };
        /**
         * Whether we've cached data
         *
         * @example
         *
         * this.query.getHasCache()
         *
         */
        Query.prototype.getHasCache = function () {
            return this.store._cache().value;
        };
        Object.defineProperty(Query.prototype, "config", {
            // @internal
            get: function () {
                return this.constructor[queryConfigKey];
            },
            enumerable: true,
            configurable: true
        });
        return Query;
    }());

    // @internal
    function sortByOptions(options, config) {
        options.sortBy = options.sortBy || (config && config.sortBy);
        options.sortByOrder = options.sortByOrder || (config && config.sortByOrder);
    }

    /**
     *
     *  The Entity Query is similar to the general Query, with additional functionality tailored for EntityStores.
     *
     *  class WidgetsQuery extends QueryEntity<WidgetsState> {
     *     constructor(protected store: WidgetsStore) {
     *       super(store);
     *     }
     *  }
     *
     *
     *
     */
    var QueryEntity = /** @class */ (function (_super) {
        __extends(QueryEntity, _super);
        function QueryEntity(store, options) {
            if (options === void 0) { options = {}; }
            var _this = _super.call(this, store) || this;
            _this.options = options;
            _this.__store__ = store;
            return _this;
        }
        QueryEntity.prototype.selectAll = function (options) {
            var _this = this;
            if (options === void 0) { options = {
                asObject: false,
            }; }
            return this.select(function (state) { return state.entities; }).pipe(map(function () { return _this.getAll(options); }));
        };
        QueryEntity.prototype.getAll = function (options) {
            if (options === void 0) { options = { asObject: false, filterBy: undefined, limitTo: undefined }; }
            if (options.asObject) {
                return entitiesToMap(this.getValue(), options);
            }
            sortByOptions(options, this.config || this.options);
            return entitiesToArray(this.getValue(), options);
        };
        QueryEntity.prototype.selectMany = function (ids, project) {
            if (!ids || !ids.length)
                return of([]);
            return this.select(function (state) { return state.entities; }).pipe(map(function (entities) { return mapSkipUndefined(ids, function (id) { return getEntity(id, project)(entities); }); }), distinctUntilArrayItemChanged());
        };
        QueryEntity.prototype.selectEntity = function (idOrPredicate, project) {
            var id = idOrPredicate;
            if (isFunction$1(idOrPredicate)) {
                // For performance reason we expect the entity to be in the store
                id = findEntityByPredicate(idOrPredicate, this.getValue().entities);
            }
            return this.select(function (state) { return state.entities; }).pipe(map(getEntity(id, project)), distinctUntilChanged());
        };
        /**
         * Get an entity by id
         *
         * @example
         *
         * this.query.getEntity(1);
         */
        QueryEntity.prototype.getEntity = function (id) {
            return this.getValue().entities[id];
        };
        /**
         * Select the active entity's id
         *
         * @example
         *
         * this.query.selectActiveId()
         */
        QueryEntity.prototype.selectActiveId = function () {
            return this.select(function (state) { return state.active; });
        };
        /**
         * Get the active id
         *
         * @example
         *
         * this.query.getActiveId()
         */
        QueryEntity.prototype.getActiveId = function () {
            return this.getValue().active;
        };
        QueryEntity.prototype.selectActive = function (project) {
            var _this = this;
            if (isArray$1(this.getActive())) {
                return this.selectActiveId().pipe(switchMap(function (ids) { return _this.selectMany(ids, project); }));
            }
            return this.selectActiveId().pipe(switchMap(function (ids) { return _this.selectEntity(ids, project); }));
        };
        QueryEntity.prototype.getActive = function () {
            var _this = this;
            var activeId = this.getActiveId();
            if (isArray$1(activeId)) {
                return activeId.map(function (id) { return _this.getValue().entities[id]; });
            }
            return toBoolean(activeId) ? this.getEntity(activeId) : undefined;
        };
        /**
         * Select the store's entity collection length
         *
         * @example
         *
         * this.query.selectCount()
         * this.query.selectCount(entity => entity.completed)
         */
        QueryEntity.prototype.selectCount = function (predicate) {
            var _this = this;
            return this.select(function (state) { return state.entities; }).pipe(map(function () { return _this.getCount(predicate); }));
        };
        /**
         * Get the store's entity collection length
         *
         * @example
         *
         * this.query.getCount()
         * this.query.getCount(entity => entity.completed)
         */
        QueryEntity.prototype.getCount = function (predicate) {
            if (isFunction$1(predicate)) {
                return this.getAll().filter(predicate).length;
            }
            return this.getValue().ids.length;
        };
        QueryEntity.prototype.selectLast = function (project) {
            return this.selectAt(function (ids) { return ids[ids.length - 1]; }, project);
        };
        QueryEntity.prototype.selectFirst = function (project) {
            return this.selectAt(function (ids) { return ids[0]; }, project);
        };
        QueryEntity.prototype.selectEntityAction = function (action) {
            if (isUndefined(action)) {
                return this.store.selectEntityAction$;
            }
            return this.store.selectEntityAction$.pipe(filter(function (ac) { return ac.type === action; }), map(function (action) { return action.ids; }));
        };
        QueryEntity.prototype.hasEntity = function (projectOrIds) {
            var _this = this;
            if (isNil(projectOrIds)) {
                return this.getValue().ids.length > 0;
            }
            if (isFunction$1(projectOrIds)) {
                return this.getAll().some(projectOrIds);
            }
            if (isArray$1(projectOrIds)) {
                return projectOrIds.every(function (id) { return id in _this.getValue().entities; });
            }
            return projectOrIds in this.getValue().entities;
        };
        /**
         * Returns whether entity store has an active entity
         *
         * @example
         *
         * this.query.hasActive()
         * this.query.hasActive(3)
         *
         */
        QueryEntity.prototype.hasActive = function (id) {
            var active = this.getValue().active;
            var isIdProvided = isDefined(id);
            if (Array.isArray(active)) {
                if (isIdProvided) {
                    return active.includes(id);
                }
                return active.length > 0;
            }
            return isIdProvided ? active === id : isDefined(active);
        };
        /**
         *
         * Create sub UI query for querying Entity's UI state
         *
         * @example
         *
         *
         * export class ProductsQuery extends QueryEntity<ProductsState> {
         *   ui: EntityUIQuery<ProductsUIState>;
         *
         *   constructor(protected store: ProductsStore) {
         *     super(store);
         *     this.createUIQuery();
         *   }
         *
         * }
         */
        QueryEntity.prototype.createUIQuery = function () {
            this.ui = new EntityUIQuery(this.__store__.ui);
        };
        QueryEntity.prototype.selectAt = function (mapFn, project) {
            var _this = this;
            return this.select(function (state) { return state.ids; }).pipe(map(mapFn), distinctUntilChanged(), switchMap(function (id) { return _this.selectEntity(id, project); }));
        };
        return QueryEntity;
    }(Query));
    // @internal
    var EntityUIQuery = /** @class */ (function (_super) {
        __extends(EntityUIQuery, _super);
        function EntityUIQuery(store) {
            return _super.call(this, store) || this;
        }
        return EntityUIQuery;
    }(QueryEntity));

    /**
     * @example
     *
     * query.selectEntity(2).pipe(filterNil)
     */
    var filterNil = function (source) { return source.pipe(filter(function (value) { return value !== null && typeof value !== 'undefined'; })); };

    /**
     * @internal
     *
     * @example
     *
     * getValue(state, 'todos.ui')
     *
     */
    function getValue(obj, prop) {
        /** return the whole state  */
        if (prop.split('.').length === 1) {
            return obj;
        }
        var removeStoreName = prop
            .split('.')
            .slice(1)
            .join('.');
        return removeStoreName.split('.').reduce(function (acc, part) { return acc && acc[part]; }, obj);
    }

    /**
     * @internal
     *
     * @example
     * setValue(state, 'todos.ui', { filter: {} })
     */
    function setValue(obj, prop, val) {
        var split = prop.split('.');
        if (split.length === 1) {
            return __assign({}, obj, val);
        }
        obj = __assign({}, obj);
        var lastIndex = split.length - 2;
        var removeStoreName = prop.split('.').slice(1);
        removeStoreName.reduce(function (acc, part, index) {
            if (index === lastIndex) {
                if (isObject$1(acc[part])) {
                    acc[part] = __assign({}, acc[part], val);
                }
                else {
                    acc[part] = val;
                }
            }
            else {
                acc[part] = __assign({}, acc[part]);
            }
            return acc && acc[part];
        }, obj);
        return obj;
    }

    var skipStorageUpdate = false;
    var _persistStateInit = new ReplaySubject(1);
    function getSkipStorageUpdate() {
        return skipStorageUpdate;
    }
    function isPromise$1(v) {
        return v && isFunction$1(v.then);
    }
    function observify(asyncOrValue) {
        if (isPromise$1(asyncOrValue) || isObservable(asyncOrValue)) {
            return from(asyncOrValue);
        }
        return of(asyncOrValue);
    }
    function persistState(params) {
        var defaults = {
            key: 'AkitaStores',
            enableInNonBrowser: false,
            storage: !hasLocalStorage() ? params.storage : localStorage,
            deserialize: JSON.parse,
            serialize: JSON.stringify,
            include: [],
            select: [],
            persistOnDestroy: false,
            preStorageUpdate: function (storeName, state) {
                return state;
            },
            preStoreUpdate: function (storeName, state) {
                return state;
            },
            skipStorageUpdate: getSkipStorageUpdate,
            preStorageUpdateOperator: function () { return function (source) { return source; }; },
        };
        var _a = Object.assign({}, defaults, params), storage = _a.storage, enableInNonBrowser = _a.enableInNonBrowser, deserialize = _a.deserialize, serialize = _a.serialize, include = _a.include, select = _a.select, key = _a.key, preStorageUpdate = _a.preStorageUpdate, persistOnDestroy = _a.persistOnDestroy, preStorageUpdateOperator = _a.preStorageUpdateOperator, preStoreUpdate = _a.preStoreUpdate, skipStorageUpdate = _a.skipStorageUpdate;
        if (isNotBrowser && !enableInNonBrowser)
            return;
        var hasInclude = include.length > 0;
        var hasSelect = select.length > 0;
        var includeStores;
        var selectStores;
        if (hasInclude) {
            includeStores = include.reduce(function (acc, path) {
                if (isFunction$1(path)) {
                    acc.fns.push(path);
                }
                else {
                    var storeName = path.split('.')[0];
                    acc[storeName] = path;
                }
                return acc;
            }, { fns: [] });
        }
        if (hasSelect) {
            selectStores = select.reduce(function (acc, selectFn) {
                acc[selectFn.storeName] = selectFn;
                return acc;
            }, {});
        }
        var stores = {};
        var acc = {};
        var subscriptions = [];
        var buffer = [];
        function _save(v) {
            observify(v).subscribe(function () {
                var next = buffer.shift();
                next && _save(next);
            });
        }
        // when we use the local/session storage we perform the serialize, otherwise we let the passed storage implementation to do it
        var isLocalStorage = (hasLocalStorage() && storage === localStorage) || (hasSessionStorage() && storage === sessionStorage);
        observify(storage.getItem(key)).subscribe(function (value) {
            var storageState = isObject$1(value) ? value : deserialize(value || '{}');
            function save(storeCache) {
                storageState['$cache'] = __assign({}, (storageState['$cache'] || {}), storeCache);
                storageState = Object.assign({}, storageState, acc);
                buffer.push(storage.setItem(key, isLocalStorage ? serialize(storageState) : storageState));
                _save(buffer.shift());
            }
            function subscribe(storeName, path) {
                stores[storeName] = __stores__[storeName]
                    ._select(function (state) { return getValue(state, path); })
                    .pipe(skip(1), map(function (store) {
                    if (hasSelect && selectStores[storeName]) {
                        return selectStores[storeName](store);
                    }
                    return store;
                }), filter(function () { return skipStorageUpdate() === false; }), preStorageUpdateOperator())
                    .subscribe(function (data) {
                    acc[storeName] = preStorageUpdate(storeName, data);
                    Promise.resolve().then(function () {
                        var _a;
                        return save((_a = {}, _a[storeName] = __stores__[storeName]._cache().getValue(), _a));
                    });
                });
            }
            function setInitial(storeName, store, path) {
                if (storeName in storageState) {
                    setAction('@PersistState');
                    store._setState(function (state) {
                        return setValue(state, path, preStoreUpdate(storeName, storageState[storeName]));
                    });
                    var hasCache = storageState['$cache'] ? storageState['$cache'][storeName] : false;
                    __stores__[storeName].setHasCache(hasCache, { restartTTL: true });
                }
            }
            subscriptions.push($$deleteStore.subscribe(function (storeName) {
                var _a;
                if (stores[storeName]) {
                    if (persistOnDestroy === false) {
                        save((_a = {}, _a[storeName] = false, _a));
                    }
                    stores[storeName].unsubscribe();
                    delete stores[storeName];
                }
            }));
            subscriptions.push($$addStore.subscribe(function (storeName) {
                if (storeName === 'router') {
                    return;
                }
                var store = __stores__[storeName];
                if (hasInclude) {
                    var path = includeStores[storeName];
                    if (!path) {
                        var passPredicate = includeStores.fns.some(function (fn) { return fn(storeName); });
                        if (passPredicate) {
                            path = storeName;
                        }
                        else {
                            return;
                        }
                    }
                    setInitial(storeName, store, path);
                    subscribe(storeName, path);
                }
                else {
                    setInitial(storeName, store, storeName);
                    subscribe(storeName, storeName);
                }
            }));
            _persistStateInit.next();
        });
        return {
            destroy: function () {
                subscriptions.forEach(function (s) { return s.unsubscribe(); });
                for (var i = 0, keys = Object.keys(stores); i < keys.length; i++) {
                    var storeName = keys[i];
                    stores[storeName].unsubscribe();
                }
                stores = {};
            },
            clear: function () {
                storage.clear();
            },
            clearStore: function (storeName) {
                if (isNil(storeName)) {
                    var value_1 = observify(storage.setItem(key, '{}'));
                    value_1.subscribe();
                    return;
                }
                var value = storage.getItem(key);
                observify(value).subscribe(function (v) {
                    var storageState = deserialize(v || '{}');
                    if (storageState[storeName]) {
                        delete storageState[storeName];
                        var value_2 = observify(storage.setItem(key, serialize(storageState)));
                        value_2.subscribe();
                    }
                });
            },
        };
    }

    var AkitaPlugin = /** @class */ (function () {
        function AkitaPlugin(query, config) {
            this.query = query;
            if (config && config.resetFn) {
                if (getAkitaConfig().resettable) {
                    this.onReset(config.resetFn);
                }
            }
        }
        /** This method is responsible for getting access to the query. */
        AkitaPlugin.prototype.getQuery = function () {
            return this.query;
        };
        /** This method is responsible for getting access to the store. */
        AkitaPlugin.prototype.getStore = function () {
            return this.getQuery().__store__;
        };
        /** This method is responsible tells whether the plugin is entityBased or not.  */
        AkitaPlugin.prototype.isEntityBased = function (entityId) {
            return toBoolean(entityId);
        };
        /** This method is responsible for selecting the source; it can be the whole store or one entity. */
        AkitaPlugin.prototype.selectSource = function (entityId, property) {
            var _this = this;
            if (this.isEntityBased(entityId)) {
                return this.getQuery().selectEntity(entityId).pipe(filterNil);
            }
            if (property) {
                return this.getQuery().select(function (state) { return getValue(state, _this.withStoreName(property)); });
            }
            return this.getQuery().select();
        };
        AkitaPlugin.prototype.getSource = function (entityId, property) {
            if (this.isEntityBased(entityId)) {
                return this.getQuery().getEntity(entityId);
            }
            var state = this.getQuery().getValue();
            if (property) {
                return getValue(state, this.withStoreName(property));
            }
            return state;
        };
        AkitaPlugin.prototype.withStoreName = function (prop) {
            return this.storeName + "." + prop;
        };
        Object.defineProperty(AkitaPlugin.prototype, "storeName", {
            get: function () {
                return this.getStore().storeName;
            },
            enumerable: true,
            configurable: true
        });
        /** This method is responsible for updating the store or one entity; it can be the whole store or one entity. */
        AkitaPlugin.prototype.updateStore = function (newState, entityId, property) {
            var _this = this;
            if (this.isEntityBased(entityId)) {
                this.getStore().update(entityId, newState);
            }
            else {
                if (property) {
                    this.getStore()._setState(function (state) {
                        return setValue(state, _this.withStoreName(property), newState);
                    });
                    return;
                }
                this.getStore()._setState(function (state) { return (__assign({}, state, newState)); });
            }
        };
        /**
         * Function to invoke upon reset
         */
        AkitaPlugin.prototype.onReset = function (fn) {
            var _this = this;
            var original = this.getStore().reset;
            this.getStore().reset = function () {
                var params = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    params[_i] = arguments[_i];
                }
                /** It should run after the plugin destroy method */
                setTimeout(function () {
                    original.apply(_this.getStore(), params);
                    fn();
                });
            };
        };
        return AkitaPlugin;
    }());

    var paginatorDefaults = {
        pagesControls: false,
        range: false,
        startWith: 1,
        cacheTimeout: undefined,
        clearStoreWithCache: true
    };
    var PaginatorPlugin = /** @class */ (function (_super) {
        __extends(PaginatorPlugin, _super);
        function PaginatorPlugin(query, config) {
            if (config === void 0) { config = {}; }
            var _this = _super.call(this, query, {
                resetFn: function () {
                    _this.initial = false;
                    _this.destroy({ clearCache: true, currentPage: 1 });
                }
            }) || this;
            _this.query = query;
            _this.config = config;
            /** Save current filters, sorting, etc. in cache */
            _this.metadata = new Map();
            _this.pages = new Map();
            _this.pagination = {
                currentPage: 1,
                perPage: 0,
                total: 0,
                lastPage: 0,
                data: []
            };
            /**
             * When the user navigates to a different page and return
             * we don't want to call `clearCache` on first time.
             */
            _this.initial = true;
            /**
             * Proxy to the query loading
             */
            _this.isLoading$ = _this.query.selectLoading().pipe(delay(0));
            _this.config = Object.assign(paginatorDefaults, config);
            var _a = _this.config, startWith = _a.startWith, cacheTimeout = _a.cacheTimeout;
            _this.page = new BehaviorSubject(startWith);
            if (isObservable(cacheTimeout)) {
                _this.clearCacheSubscription = cacheTimeout.subscribe(function () { return _this.clearCache(); });
            }
            return _this;
        }
        Object.defineProperty(PaginatorPlugin.prototype, "pageChanges", {
            /**
             * Listen to page changes
             */
            get: function () {
                return this.page.asObservable();
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(PaginatorPlugin.prototype, "currentPage", {
            /**
             * Get the current page number
             */
            get: function () {
                return this.pagination.currentPage;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(PaginatorPlugin.prototype, "isFirst", {
            /**
             * Check if current page is the first one
             */
            get: function () {
                return this.currentPage === 1;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(PaginatorPlugin.prototype, "isLast", {
            /**
             * Check if current page is the last one
             */
            get: function () {
                return this.currentPage === this.pagination.lastPage;
            },
            enumerable: true,
            configurable: true
        });
        /**
         * Whether to generate an array of pages for *ngFor
         * [1, 2, 3, 4]
         */
        PaginatorPlugin.prototype.withControls = function () {
            this.config.pagesControls = true;
            return this;
        };
        /**
         * Whether to generate the `from` and `to` keys
         * [1, 2, 3, 4]
         */
        PaginatorPlugin.prototype.withRange = function () {
            this.config.range = true;
            return this;
        };
        /**
         * Set the loading state
         */
        PaginatorPlugin.prototype.setLoading = function (value) {
            if (value === void 0) { value = true; }
            this.getStore().setLoading(value);
        };
        /**
         * Update the pagination object and add the page
         */
        PaginatorPlugin.prototype.update = function (response) {
            this.pagination = response;
            this.addPage(response.data);
        };
        /**
         *
         * Set the ids and add the page to store
         */
        PaginatorPlugin.prototype.addPage = function (data) {
            var _this = this;
            this.pages.set(this.currentPage, { ids: data.map(function (entity) { return entity[_this.getStore().idKey]; }) });
            this.getStore().add(data);
        };
        /**
         * Clear the cache.
         */
        PaginatorPlugin.prototype.clearCache = function (options) {
            if (options === void 0) { options = {}; }
            if (!this.initial) {
                logAction('@Pagination - Clear Cache');
                if (options.clearStore !== false && (this.config.clearStoreWithCache || options.clearStore)) {
                    this.getStore().remove();
                }
                this.pages = new Map();
                this.metadata = new Map();
            }
            this.initial = false;
        };
        PaginatorPlugin.prototype.clearPage = function (page) {
            this.pages.delete(page);
        };
        /**
         * Clear the cache timeout and optionally the pages
         */
        PaginatorPlugin.prototype.destroy = function (_a) {
            var _b = _a === void 0 ? {} : _a, clearCache = _b.clearCache, currentPage = _b.currentPage;
            if (this.clearCacheSubscription) {
                this.clearCacheSubscription.unsubscribe();
            }
            if (clearCache) {
                this.clearCache();
            }
            if (!isUndefined(currentPage)) {
                this.setPage(currentPage);
            }
            this.initial = true;
        };
        /**
         * Whether the provided page is active
         */
        PaginatorPlugin.prototype.isPageActive = function (page) {
            return this.currentPage === page;
        };
        /**
         * Set the current page
         */
        PaginatorPlugin.prototype.setPage = function (page) {
            if (page !== this.currentPage || !this.hasPage(page)) {
                this.page.next((this.pagination.currentPage = page));
            }
        };
        /**
         * Increment current page
         */
        PaginatorPlugin.prototype.nextPage = function () {
            if (this.currentPage !== this.pagination.lastPage) {
                this.setPage(this.pagination.currentPage + 1);
            }
        };
        /**
         * Decrement current page
         */
        PaginatorPlugin.prototype.prevPage = function () {
            if (this.pagination.currentPage > 1) {
                this.setPage(this.pagination.currentPage - 1);
            }
        };
        /**
         * Set current page to last
         */
        PaginatorPlugin.prototype.setLastPage = function () {
            this.setPage(this.pagination.lastPage);
        };
        /**
         * Set current page to first
         */
        PaginatorPlugin.prototype.setFirstPage = function () {
            this.setPage(1);
        };
        /**
         * Check if page exists in cache
         */
        PaginatorPlugin.prototype.hasPage = function (page) {
            return this.pages.has(page);
        };
        /**
         * Get the current page if it's in cache, otherwise invoke the request
         */
        PaginatorPlugin.prototype.getPage = function (req) {
            var _this = this;
            var page = this.pagination.currentPage;
            if (this.hasPage(page)) {
                return this.selectPage(page);
            }
            else {
                this.setLoading(true);
                return from(req()).pipe(switchMap(function (config) {
                    page = config.currentPage;
                    applyTransaction(function () {
                        _this.setLoading(false);
                        _this.update(config);
                    });
                    return _this.selectPage(page);
                }));
            }
        };
        PaginatorPlugin.prototype.getQuery = function () {
            return this.query;
        };
        PaginatorPlugin.prototype.refreshCurrentPage = function () {
            if (isNil(this.currentPage) === false) {
                this.clearPage(this.currentPage);
                this.setPage(this.currentPage);
            }
        };
        PaginatorPlugin.prototype.getFrom = function () {
            if (this.isFirst) {
                return 1;
            }
            return (this.currentPage - 1) * this.pagination.perPage + 1;
        };
        PaginatorPlugin.prototype.getTo = function () {
            if (this.isLast) {
                return this.pagination.total;
            }
            return this.currentPage * this.pagination.perPage;
        };
        /**
         * Select the page
         */
        PaginatorPlugin.prototype.selectPage = function (page) {
            var _this = this;
            return this.query.selectAll({ asObject: true }).pipe(take(1), map(function (entities) {
                var response = __assign({}, _this.pagination, { data: _this.pages.get(page).ids.map(function (id) { return entities[id]; }) });
                var _a = _this.config, range = _a.range, pagesControls = _a.pagesControls;
                /** If no total - calc it */
                if (isNaN(_this.pagination.total)) {
                    if (response.lastPage === 1) {
                        response.total = response.data ? response.data.length : 0;
                    }
                    else {
                        response.total = response.perPage * response.lastPage;
                    }
                    _this.pagination.total = response.total;
                }
                if (range) {
                    response.from = _this.getFrom();
                    response.to = _this.getTo();
                }
                if (pagesControls) {
                    response.pageControls = generatePages(_this.pagination.total, _this.pagination.perPage);
                }
                return response;
            }));
        };
        __decorate([
            action('@Pagination - New Page'),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [Object]),
            __metadata("design:returntype", void 0)
        ], PaginatorPlugin.prototype, "update", null);
        return PaginatorPlugin;
    }(AkitaPlugin));
    /**
     * Generate an array so we can ngFor them to navigate between pages
     */
    function generatePages(total, perPage) {
        var len = Math.ceil(total / perPage);
        var arr = [];
        for (var i = 0; i < len; i++) {
            arr.push(i + 1);
        }
        return arr;
    }

    var PersistNgFormPlugin = /** @class */ (function (_super) {
        __extends(PersistNgFormPlugin, _super);
        function PersistNgFormPlugin(query, factoryFnOrPath, params) {
            if (params === void 0) { params = {}; }
            var _this = _super.call(this, query) || this;
            _this.query = query;
            _this.factoryFnOrPath = factoryFnOrPath;
            _this.params = params;
            _this.params = __assign({ debounceTime: 300, formKey: 'akitaForm', emitEvent: false, arrControlFactory: function (v) { return _this.builder.control(v); } }, params);
            _this.isRootKeys = toBoolean(factoryFnOrPath) === false;
            _this.isKeyBased = isString(factoryFnOrPath) || _this.isRootKeys;
            return _this;
        }
        PersistNgFormPlugin.prototype.setForm = function (form, builder) {
            this.form = form;
            this.builder = builder;
            this.activate();
            return this;
        };
        PersistNgFormPlugin.prototype.reset = function (initialState) {
            var _this = this;
            var _a;
            var value;
            if (initialState) {
                value = initialState;
            }
            else {
                value = this.isKeyBased ? this.initialValue : this.factoryFnOrPath();
            }
            if (this.isKeyBased) {
                Object.keys(this.initialValue).forEach(function (stateKey) {
                    var value = _this.initialValue[stateKey];
                    if (Array.isArray(value) && _this.builder) {
                        var formArray = _this.form.controls[stateKey];
                        _this.cleanArray(formArray);
                        value.forEach(function (v, i) {
                            _this.form.get(stateKey).insert(i, _this.params.arrControlFactory(v));
                        });
                    }
                });
            }
            this.form.patchValue(value, { emitEvent: this.params.emitEvent });
            var storeValue = this.isKeyBased ? setValue(this.getQuery().getValue(), this.getStore().storeName + "." + this.factoryFnOrPath, value) : (_a = {}, _a[this.params.formKey] = value, _a);
            this.updateStore(storeValue);
        };
        PersistNgFormPlugin.prototype.cleanArray = function (control) {
            while (control.length !== 0) {
                control.removeAt(0);
            }
        };
        PersistNgFormPlugin.prototype.resolveInitialValue = function (formValue, root) {
            var _this = this;
            if (!formValue)
                return;
            return Object.keys(formValue).reduce(function (acc, stateKey) {
                var value = root[stateKey];
                if (Array.isArray(value) && _this.builder) {
                    var factory_1 = _this.params.arrControlFactory;
                    _this.cleanArray(_this.form.get(stateKey));
                    value.forEach(function (v, i) {
                        _this.form.get(stateKey).insert(i, factory_1(v));
                    });
                }
                acc[stateKey] = root[stateKey];
                return acc;
            }, {});
        };
        PersistNgFormPlugin.prototype.activate = function () {
            var _this = this;
            var _a;
            var path;
            if (this.isKeyBased) {
                if (this.isRootKeys) {
                    this.initialValue = this.resolveInitialValue(this.form.value, this.getQuery().getValue());
                    this.form.patchValue(this.initialValue, { emitEvent: this.params.emitEvent });
                }
                else {
                    path = this.getStore().storeName + "." + this.factoryFnOrPath;
                    var root = getValue(this.getQuery().getValue(), path);
                    this.initialValue = this.resolveInitialValue(root, root);
                    this.form.patchValue(this.initialValue, { emitEvent: this.params.emitEvent });
                }
            }
            else {
                if (!this.getQuery().getValue()[this.params.formKey]) {
                    logAction('@PersistNgFormPlugin activate');
                    this.updateStore((_a = {}, _a[this.params.formKey] = this.factoryFnOrPath(), _a));
                }
                var value = this.getQuery().getValue()[this.params.formKey];
                this.form.patchValue(value);
            }
            this.formChanges = this.form.valueChanges.pipe(debounceTime(this.params.debounceTime)).subscribe(function (value) {
                logAction('@PersistForm - Update');
                var newState;
                if (_this.isKeyBased) {
                    if (_this.isRootKeys) {
                        newState = function (state) { return (__assign({}, state, value)); };
                    }
                    else {
                        newState = function (state) { return setValue(state, path, value); };
                    }
                }
                else {
                    newState = function () {
                        var _a;
                        return (_a = {}, _a[_this.params.formKey] = value, _a);
                    };
                }
                _this.updateStore(newState(_this.getQuery().getValue()));
            });
        };
        PersistNgFormPlugin.prototype.destroy = function () {
            this.formChanges && this.formChanges.unsubscribe();
            this.form = null;
            this.builder = null;
        };
        return PersistNgFormPlugin;
    }(AkitaPlugin));

    // @internal
    function capitalize(value) {
        return value && value.charAt(0).toUpperCase() + value.slice(1);
    }

    var subs = [];
    function akitaDevtools(ngZoneOrOptions, options) {
        if (options === void 0) { options = {}; }
        if (isNotBrowser)
            return;
        if (!window.__REDUX_DEVTOOLS_EXTENSION__) {
            return;
        }
        subs.length &&
            subs.forEach(function (s) {
                if (s.unsubscribe) {
                    s.unsubscribe();
                }
                else {
                    s && s();
                }
            });
        var isAngular = ngZoneOrOptions && ngZoneOrOptions['run'];
        if (!isAngular) {
            ngZoneOrOptions = ngZoneOrOptions || {};
            ngZoneOrOptions.run = function (cb) { return cb(); };
            options = ngZoneOrOptions;
        }
        var defaultOptions = { name: 'Akita', shallow: true, storesWhitelist: [] };
        var merged = Object.assign({}, defaultOptions, options);
        var storesWhitelist = merged.storesWhitelist;
        var devTools = window.__REDUX_DEVTOOLS_EXTENSION__.connect(merged);
        var appState = {};
        var isAllowed = function (storeName) {
            if (!storesWhitelist.length) {
                return true;
            }
            return storesWhitelist.indexOf(storeName) > -1;
        };
        subs.push($$addStore.subscribe(function (storeName) {
            var _a;
            if (isAllowed(storeName) === false)
                return;
            appState = __assign({}, appState, (_a = {}, _a[storeName] = __stores__[storeName]._value(), _a));
            devTools.send({ type: "[" + capitalize(storeName) + "] - @@INIT" }, appState);
        }));
        subs.push($$deleteStore.subscribe(function (storeName) {
            if (isAllowed(storeName) === false)
                return;
            delete appState[storeName];
            devTools.send({ type: "[" + storeName + "] - Delete Store" }, appState);
        }));
        subs.push($$updateStore.subscribe(function (_a) {
            var storeName = _a.storeName, action = _a.action;
            var _b;
            if (isAllowed(storeName) === false)
                return;
            var type = action.type, entityIds = action.entityIds, skip = action.skip;
            if (skip) {
                setSkipAction(false);
                return;
            }
            var store = __stores__[storeName];
            if (!store) {
                return;
            }
            if (options.shallow === false && appState[storeName]) {
                var isEqual = JSON.stringify(store._value()) === JSON.stringify(appState[storeName]);
                if (isEqual)
                    return;
            }
            appState = __assign({}, appState, (_b = {}, _b[storeName] = store._value(), _b));
            var normalize = capitalize(storeName);
            var msg = isDefined(entityIds) ? "[" + normalize + "] - " + type + " (ids: " + entityIds + ")" : "[" + normalize + "] - " + type;
            if (options.logTrace) {
                console.group(msg);
                console.trace();
                console.groupEnd();
            }
            if (options.sortAlphabetically) {
                var sortedAppState = Object.keys(appState)
                    .sort()
                    .reduce(function (acc, storeName) {
                    acc[storeName] = appState[storeName];
                    return acc;
                }, {});
                devTools.send({ type: msg }, sortedAppState);
                return;
            }
            devTools.send({ type: msg }, appState);
        }));
        subs.push(devTools.subscribe(function (message) {
            if (message.type === 'DISPATCH') {
                var payloadType = message.payload.type;
                if (payloadType === 'COMMIT') {
                    devTools.init(appState);
                    return;
                }
                if (message.state) {
                    var rootState_1 = JSON.parse(message.state);
                    var _loop_1 = function (i, keys) {
                        var storeName = keys[i];
                        if (__stores__[storeName]) {
                            ngZoneOrOptions.run(function () {
                                __stores__[storeName]._setState(function () { return rootState_1[storeName]; }, false);
                            });
                        }
                    };
                    for (var i = 0, keys = Object.keys(rootState_1); i < keys.length; i++) {
                        _loop_1(i, keys);
                    }
                }
            }
        }));
    }

    /**
     * Each plugin that wants to add support for entities should extend this interface.
     */
    var EntityCollectionPlugin = /** @class */ (function () {
        function EntityCollectionPlugin(query, entityIds) {
            this.query = query;
            this.entityIds = entityIds;
            this.entities = new Map();
        }
        /**
         * Get the entity plugin instance.
         */
        EntityCollectionPlugin.prototype.getEntity = function (id) {
            return this.entities.get(id);
        };
        /**
         * Whether the entity plugin exist.
         */
        EntityCollectionPlugin.prototype.hasEntity = function (id) {
            return this.entities.has(id);
        };
        /**
         * Remove the entity plugin instance.
         */
        EntityCollectionPlugin.prototype.removeEntity = function (id) {
            this.destroy(id);
            return this.entities.delete(id);
        };
        /**
         * Set the entity plugin instance.
         */
        EntityCollectionPlugin.prototype.createEntity = function (id, plugin) {
            return this.entities.set(id, plugin);
        };
        /**
         * If the user passes `entityIds` we take them; otherwise, we take all.
         */
        EntityCollectionPlugin.prototype.getIds = function () {
            return isUndefined(this.entityIds) ? this.query.getValue().ids : coerceArray(this.entityIds);
        };
        /**
         * When you call one of the plugin methods, you can pass id/ids or undefined which means all.
         */
        EntityCollectionPlugin.prototype.resolvedIds = function (ids) {
            return isUndefined(ids) ? this.getIds() : coerceArray(ids);
        };
        /**
         * Call this method when you want to activate the plugin on init or when you need to listen to add/remove of entities dynamically.
         *
         * For example in your plugin you may do the following:
         *
         * this.query.select(state => state.ids).pipe(skip(1)).subscribe(ids => this.activate(ids));
         */
        EntityCollectionPlugin.prototype.rebase = function (ids, actions) {
            var _this = this;
            if (actions === void 0) { actions = {}; }
            /**
             *
             * If the user passes `entityIds` & we have new ids check if we need to add/remove instances.
             *
             * This phase will be called only upon update.
             */
            if (toBoolean(ids)) {
                /**
                 * Which means all
                 */
                if (isUndefined(this.entityIds)) {
                    for (var i = 0, len = ids.length; i < len; i++) {
                        var entityId = ids[i];
                        if (this.hasEntity(entityId) === false) {
                            isFunction$1(actions.beforeAdd) && actions.beforeAdd(entityId);
                            var plugin = this.instantiatePlugin(entityId);
                            this.entities.set(entityId, plugin);
                            isFunction$1(actions.afterAdd) && actions.afterAdd(plugin);
                        }
                    }
                    this.entities.forEach(function (plugin, entityId) {
                        if (ids.indexOf(entityId) === -1) {
                            isFunction$1(actions.beforeRemove) && actions.beforeRemove(plugin);
                            _this.removeEntity(entityId);
                        }
                    });
                }
                else {
                    /**
                     * Which means the user passes specific ids
                     */
                    var _ids = coerceArray(this.entityIds);
                    for (var i = 0, len = _ids.length; i < len; i++) {
                        var entityId = _ids[i];
                        /** The Entity in current ids and doesn't exist, add it. */
                        if (ids.indexOf(entityId) > -1 && this.hasEntity(entityId) === false) {
                            isFunction$1(actions.beforeAdd) && actions.beforeAdd(entityId);
                            var plugin = this.instantiatePlugin(entityId);
                            this.entities.set(entityId, plugin);
                            isFunction$1(actions.afterAdd) && actions.afterAdd(plugin);
                        }
                        else {
                            this.entities.forEach(function (plugin, entityId) {
                                /** The Entity not in current ids and exists, remove it. */
                                if (ids.indexOf(entityId) === -1 && _this.hasEntity(entityId) === true) {
                                    isFunction$1(actions.beforeRemove) && actions.beforeRemove(plugin);
                                    _this.removeEntity(entityId);
                                }
                            });
                        }
                    }
                }
            }
            else {
                /**
                 * Otherwise, start with the provided ids or all.
                 */
                this.getIds().forEach(function (id) {
                    if (!_this.hasEntity(id))
                        _this.createEntity(id, _this.instantiatePlugin(id));
                });
            }
        };
        /**
         * Listen for add/remove entities.
         */
        EntityCollectionPlugin.prototype.selectIds = function () {
            return this.query.select(function (state) { return state.ids; });
        };
        /**
         * Base method for activation, you can override it if you need to.
         */
        EntityCollectionPlugin.prototype.activate = function (ids) {
            this.rebase(ids);
        };
        /**
         * Loop over each id and invoke the plugin method.
         */
        EntityCollectionPlugin.prototype.forEachId = function (ids, cb) {
            var _ids = this.resolvedIds(ids);
            for (var i = 0, len = _ids.length; i < len; i++) {
                var id = _ids[i];
                if (this.hasEntity(id)) {
                    cb(this.getEntity(id));
                }
            }
        };
        return EntityCollectionPlugin;
    }());

    var StateHistoryPlugin = /** @class */ (function (_super) {
        __extends(StateHistoryPlugin, _super);
        function StateHistoryPlugin(query, params, _entityId) {
            if (params === void 0) { params = {}; }
            var _this = _super.call(this, query, {
                resetFn: function () { return _this.clear(); }
            }) || this;
            _this.query = query;
            _this.params = params;
            _this._entityId = _entityId;
            /** Allow skipping an update from outside */
            _this.skip = false;
            _this.history = {
                past: [],
                present: null,
                future: []
            };
            /** Skip the update when redo/undo */
            _this.skipUpdate = false;
            params.maxAge = !!params.maxAge ? params.maxAge : 10;
            params.comparator = params.comparator || (function () { return true; });
            _this.activate();
            return _this;
        }
        Object.defineProperty(StateHistoryPlugin.prototype, "hasPast$", {
            /**
             * Observable stream representing whether the history plugin has an available past
             *
             */
            get: function () {
                return this._hasPast$;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(StateHistoryPlugin.prototype, "hasFuture$", {
            /**
             * Observable stream representing whether the history plugin has an available future
             *
             */
            get: function () {
                return this._hasFuture$;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(StateHistoryPlugin.prototype, "hasPast", {
            get: function () {
                return this.history.past.length > 0;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(StateHistoryPlugin.prototype, "hasFuture", {
            get: function () {
                return this.history.future.length > 0;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(StateHistoryPlugin.prototype, "property", {
            get: function () {
                return this.params.watchProperty;
            },
            enumerable: true,
            configurable: true
        });
        /* Updates the hasPast$ hasFuture$ observables*/
        StateHistoryPlugin.prototype.updateHasHistory = function () {
            this.hasFutureSubject.next(this.hasFuture);
            this.hasPastSubject.next(this.hasPast);
        };
        StateHistoryPlugin.prototype.activate = function () {
            var _this = this;
            this.hasPastSubject = new BehaviorSubject(false);
            this._hasPast$ = this.hasPastSubject.asObservable().pipe(distinctUntilChanged());
            this.hasFutureSubject = new BehaviorSubject(false);
            this._hasFuture$ = this.hasFutureSubject.asObservable().pipe(distinctUntilChanged());
            this.history.present = this.getSource(this._entityId, this.property);
            this.subscription = this
                .selectSource(this._entityId, this.property)
                .pipe(pairwise())
                .subscribe(function (_a) {
                var _b = __read(_a, 2), past = _b[0], present = _b[1];
                if (_this.skip) {
                    _this.skip = false;
                    return;
                }
                /**
                 *  comparator: (prev, current) => isEqual(prev, current) === false
                 */
                var shouldUpdate = _this.params.comparator(past, present);
                if (!_this.skipUpdate && shouldUpdate) {
                    if (_this.history.past.length === _this.params.maxAge) {
                        _this.history.past = _this.history.past.slice(1);
                    }
                    _this.history.past = __spread(_this.history.past, [past]);
                    _this.history.present = present;
                    _this.updateHasHistory();
                }
            });
        };
        StateHistoryPlugin.prototype.undo = function () {
            if (this.history.past.length > 0) {
                var _a = this.history, past = _a.past, present = _a.present;
                var previous = past[past.length - 1];
                this.history.past = past.slice(0, past.length - 1);
                this.history.present = previous;
                this.history.future = __spread([present], this.history.future);
                this.update();
            }
        };
        StateHistoryPlugin.prototype.redo = function () {
            if (this.history.future.length > 0) {
                var _a = this.history, past = _a.past, present = _a.present;
                var next = this.history.future[0];
                var newFuture = this.history.future.slice(1);
                this.history.past = __spread(past, [present]);
                this.history.present = next;
                this.history.future = newFuture;
                this.update('Redo');
            }
        };
        StateHistoryPlugin.prototype.jumpToPast = function (index) {
            if (index < 0 || index >= this.history.past.length)
                return;
            var _a = this.history, past = _a.past, future = _a.future, present = _a.present;
            /**
             *
             * const past = [1, 2, 3, 4, 5];
             * const present = 6;
             * const future = [7, 8, 9];
             * const index = 2;
             *
             * newPast = past.slice(0, index) = [1, 2];
             * newPresent = past[index] = 3;
             * newFuture = [...past.slice(index + 1),present, ...future] = [4, 5, 6, 7, 8, 9];
             *
             */
            var newPast = past.slice(0, index);
            var newFuture = __spread(past.slice(index + 1), [present], future);
            var newPresent = past[index];
            this.history.past = newPast;
            this.history.present = newPresent;
            this.history.future = newFuture;
            this.update();
        };
        StateHistoryPlugin.prototype.jumpToFuture = function (index) {
            if (index < 0 || index >= this.history.future.length)
                return;
            var _a = this.history, past = _a.past, future = _a.future, present = _a.present;
            /**
             *
             * const past = [1, 2, 3, 4, 5];
             * const present = 6;
             * const future = [7, 8, 9, 10]
             * const index = 1
             *
             * newPast = [...past, present, ...future.slice(0, index) = [1, 2, 3, 4, 5, 6, 7];
             * newPresent = future[index] = 8;
             * newFuture = futrue.slice(index+1) = [9, 10];
             *
             */
            var newPast = __spread(past, [present], future.slice(0, index));
            var newPresent = future[index];
            var newFuture = future.slice(index + 1);
            this.history.past = newPast;
            this.history.present = newPresent;
            this.history.future = newFuture;
            this.update('Redo');
        };
        /**
         *
         * jump n steps in the past or forward
         *
         */
        StateHistoryPlugin.prototype.jump = function (n) {
            if (n > 0)
                return this.jumpToFuture(n - 1);
            if (n < 0)
                return this.jumpToPast(this.history.past.length + n);
        };
        /**
         * Clear the history
         *
         * @param customUpdateFn Callback function for only clearing part of the history
         *
         * @example
         *
         * stateHistory.clear((history) => {
         *  return {
         *    past: history.past,
         *    present: history.present,
         *    future: []
         *  };
         * });
         */
        StateHistoryPlugin.prototype.clear = function (customUpdateFn) {
            this.history = isFunction$1(customUpdateFn)
                ? customUpdateFn(this.history)
                : {
                    past: [],
                    present: null,
                    future: []
                };
            this.updateHasHistory();
        };
        StateHistoryPlugin.prototype.destroy = function (clearHistory) {
            if (clearHistory === void 0) { clearHistory = false; }
            if (clearHistory) {
                this.clear();
            }
            this.subscription.unsubscribe();
        };
        StateHistoryPlugin.prototype.ignoreNext = function () {
            this.skip = true;
        };
        StateHistoryPlugin.prototype.update = function (action) {
            if (action === void 0) { action = 'Undo'; }
            this.skipUpdate = true;
            logAction("@StateHistory - " + action);
            this.updateStore(this.history.present, this._entityId, this.property);
            this.updateHasHistory();
            this.skipUpdate = false;
        };
        return StateHistoryPlugin;
    }(AkitaPlugin));

    var EntityStateHistoryPlugin = /** @class */ (function (_super) {
        __extends(EntityStateHistoryPlugin, _super);
        function EntityStateHistoryPlugin(query, params) {
            if (params === void 0) { params = {}; }
            var _this = _super.call(this, query, params.entityIds) || this;
            _this.query = query;
            _this.params = params;
            params.maxAge = toBoolean(params.maxAge) ? params.maxAge : 10;
            _this.activate();
            _this.selectIds()
                .pipe(skip(1))
                .subscribe(function (ids) { return _this.activate(ids); });
            return _this;
        }
        EntityStateHistoryPlugin.prototype.redo = function (ids) {
            this.forEachId(ids, function (e) { return e.redo(); });
        };
        EntityStateHistoryPlugin.prototype.undo = function (ids) {
            this.forEachId(ids, function (e) { return e.undo(); });
        };
        EntityStateHistoryPlugin.prototype.hasPast = function (id) {
            if (this.hasEntity(id)) {
                return this.getEntity(id).hasPast;
            }
        };
        EntityStateHistoryPlugin.prototype.hasFuture = function (id) {
            if (this.hasEntity(id)) {
                return this.getEntity(id).hasFuture;
            }
        };
        EntityStateHistoryPlugin.prototype.jumpToFuture = function (ids, index) {
            this.forEachId(ids, function (e) { return e.jumpToFuture(index); });
        };
        EntityStateHistoryPlugin.prototype.jumpToPast = function (ids, index) {
            this.forEachId(ids, function (e) { return e.jumpToPast(index); });
        };
        EntityStateHistoryPlugin.prototype.clear = function (ids) {
            this.forEachId(ids, function (e) { return e.clear(); });
        };
        EntityStateHistoryPlugin.prototype.destroy = function (ids, clearHistory) {
            if (clearHistory === void 0) { clearHistory = false; }
            this.forEachId(ids, function (e) { return e.destroy(clearHistory); });
        };
        EntityStateHistoryPlugin.prototype.ignoreNext = function (ids) {
            this.forEachId(ids, function (e) { return e.ignoreNext(); });
        };
        EntityStateHistoryPlugin.prototype.instantiatePlugin = function (id) {
            return new StateHistoryPlugin(this.query, this.params, id);
        };
        return EntityStateHistoryPlugin;
    }(EntityCollectionPlugin));

    var ɵ0 = function (head, current) { return JSON.stringify(head) !== JSON.stringify(current); };
    var dirtyCheckDefaultParams = {
        comparator: ɵ0
    };
    function getNestedPath(nestedObj, path) {
        var pathAsArray = path.split('.');
        return pathAsArray.reduce(function (obj, key) { return (obj && obj[key] !== 'undefined' ? obj[key] : undefined); }, nestedObj);
    }
    var DirtyCheckPlugin = /** @class */ (function (_super) {
        __extends(DirtyCheckPlugin, _super);
        function DirtyCheckPlugin(query, params, _entityId) {
            var _this = _super.call(this, query) || this;
            _this.query = query;
            _this.params = params;
            _this._entityId = _entityId;
            _this.dirty = new BehaviorSubject(false);
            _this.active = false;
            _this._reset = new Subject();
            _this.isDirty$ = _this.dirty.asObservable().pipe(distinctUntilChanged());
            _this.reset$ = _this._reset.asObservable();
            _this.params = __assign({}, dirtyCheckDefaultParams, params);
            if (_this.params.watchProperty) {
                var watchProp = coerceArray(_this.params.watchProperty);
                if (query instanceof QueryEntity && watchProp.includes('entities') && !watchProp.includes('ids')) {
                    watchProp.push('ids');
                }
                _this.params.watchProperty = watchProp;
            }
            return _this;
        }
        DirtyCheckPlugin.prototype.reset = function (params) {
            if (params === void 0) { params = {}; }
            var currentValue = this.head;
            if (isFunction$1(params.updateFn)) {
                if (this.isEntityBased(this._entityId)) {
                    currentValue = params.updateFn(this.head, this.getQuery().getEntity(this._entityId));
                }
                else {
                    currentValue = params.updateFn(this.head, this.getQuery().getValue());
                }
            }
            logAction("@DirtyCheck - Revert");
            this.updateStore(currentValue, this._entityId);
            this._reset.next();
        };
        DirtyCheckPlugin.prototype.setHead = function () {
            if (!this.active) {
                this.activate();
                this.active = true;
            }
            else {
                this.head = this._getHead();
            }
            this.updateDirtiness(false);
            return this;
        };
        DirtyCheckPlugin.prototype.isDirty = function () {
            return !!this.dirty.value;
        };
        DirtyCheckPlugin.prototype.hasHead = function () {
            return !!this.getHead();
        };
        DirtyCheckPlugin.prototype.destroy = function () {
            this.head = null;
            this.subscription && this.subscription.unsubscribe();
            this._reset && this._reset.complete();
        };
        DirtyCheckPlugin.prototype.isPathDirty = function (path) {
            var head = this.getHead();
            var current = this.getQuery().getValue();
            var currentPathValue = getNestedPath(current, path);
            var headPathValue = getNestedPath(head, path);
            return this.params.comparator(currentPathValue, headPathValue);
        };
        DirtyCheckPlugin.prototype.getHead = function () {
            return this.head;
        };
        DirtyCheckPlugin.prototype.activate = function () {
            var _this = this;
            this.head = this._getHead();
            /** if we are tracking specific properties select only the relevant ones */
            var source = this.params.watchProperty
                ? this.params.watchProperty.map(function (prop) {
                    return _this.query
                        .select(function (state) { return state[prop]; })
                        .pipe(map(function (val) { return ({
                        val: val,
                        __akitaKey: prop
                    }); }));
                })
                : [this.selectSource(this._entityId)];
            this.subscription = combineLatest.apply(void 0, __spread(source)).pipe(skip(1))
                .subscribe(function (currentState) {
                if (isUndefined(_this.head))
                    return;
                /** __akitaKey is used to determine if we are tracking a specific property or a store change */
                var isChange = currentState.some(function (state) {
                    var head = state.__akitaKey ? _this.head[state.__akitaKey] : _this.head;
                    var compareTo = state.__akitaKey ? state.val : state;
                    return _this.params.comparator(head, compareTo);
                });
                _this.updateDirtiness(isChange);
            });
        };
        DirtyCheckPlugin.prototype.updateDirtiness = function (isDirty) {
            this.dirty.next(isDirty);
        };
        DirtyCheckPlugin.prototype._getHead = function () {
            var head = this.getSource(this._entityId);
            if (this.params.watchProperty) {
                head = this.getWatchedValues(head);
            }
            return head;
        };
        DirtyCheckPlugin.prototype.getWatchedValues = function (source) {
            return this.params.watchProperty.reduce(function (watched, prop) {
                watched[prop] = source[prop];
                return watched;
            }, {});
        };
        return DirtyCheckPlugin;
    }(AkitaPlugin));

    var EntityDirtyCheckPlugin = /** @class */ (function (_super) {
        __extends(EntityDirtyCheckPlugin, _super);
        function EntityDirtyCheckPlugin(query, params) {
            if (params === void 0) { params = {}; }
            var _this = _super.call(this, query, params.entityIds) || this;
            _this.query = query;
            _this.params = params;
            _this._someDirty = new Subject();
            _this.someDirty$ = merge(_this.query.select(function (state) { return state.entities; }), _this._someDirty.asObservable()).pipe(auditTime(0), map(function () { return _this.checkSomeDirty(); }));
            _this.params = __assign({}, dirtyCheckDefaultParams, params);
            // TODO lazy activate?
            _this.activate();
            _this.selectIds()
                .pipe(skip(1))
                .subscribe(function (ids) {
                _super.prototype.rebase.call(_this, ids, { afterAdd: function (plugin) { return plugin.setHead(); } });
            });
            return _this;
        }
        EntityDirtyCheckPlugin.prototype.setHead = function (ids) {
            if (this.params.entityIds && ids) {
                var toArray_1 = coerceArray(ids);
                var someAreWatched = coerceArray(this.params.entityIds).some(function (id) { return toArray_1.indexOf(id) > -1; });
                if (someAreWatched === false) {
                    return this;
                }
            }
            this.forEachId(ids, function (e) { return e.setHead(); });
            this._someDirty.next();
            return this;
        };
        EntityDirtyCheckPlugin.prototype.hasHead = function (id) {
            if (this.entities.has(id)) {
                var entity = this.getEntity(id);
                return entity.hasHead();
            }
            return false;
        };
        EntityDirtyCheckPlugin.prototype.reset = function (ids, params) {
            if (params === void 0) { params = {}; }
            this.forEachId(ids, function (e) { return e.reset(params); });
        };
        EntityDirtyCheckPlugin.prototype.isDirty = function (id, asObservable) {
            if (asObservable === void 0) { asObservable = true; }
            if (this.entities.has(id)) {
                var entity = this.getEntity(id);
                return asObservable ? entity.isDirty$ : entity.isDirty();
            }
            return false;
        };
        EntityDirtyCheckPlugin.prototype.someDirty = function () {
            return this.checkSomeDirty();
        };
        EntityDirtyCheckPlugin.prototype.isPathDirty = function (id, path) {
            if (this.entities.has(id)) {
                var head = this.getEntity(id).getHead();
                var current = this.query.getEntity(id);
                var currentPathValue = getNestedPath(current, path);
                var headPathValue = getNestedPath(head, path);
                return this.params.comparator(currentPathValue, headPathValue);
            }
            return null;
        };
        EntityDirtyCheckPlugin.prototype.destroy = function (ids) {
            this.forEachId(ids, function (e) { return e.destroy(); });
            /** complete only when the plugin destroys */
            if (!ids) {
                this._someDirty.complete();
            }
        };
        EntityDirtyCheckPlugin.prototype.instantiatePlugin = function (id) {
            return new DirtyCheckPlugin(this.query, this.params, id);
        };
        EntityDirtyCheckPlugin.prototype.checkSomeDirty = function () {
            var e_1, _a;
            var entitiesIds = this.resolvedIds();
            try {
                for (var entitiesIds_1 = __values(entitiesIds), entitiesIds_1_1 = entitiesIds_1.next(); !entitiesIds_1_1.done; entitiesIds_1_1 = entitiesIds_1.next()) {
                    var id = entitiesIds_1_1.value;
                    if (this.getEntity(id).isDirty()) {
                        return true;
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (entitiesIds_1_1 && !entitiesIds_1_1.done && (_a = entitiesIds_1.return)) _a.call(entitiesIds_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
            return false;
        };
        return EntityDirtyCheckPlugin;
    }(EntityCollectionPlugin));

    var _a, _b;
    var StoreAction;
    (function (StoreAction) {
        StoreAction["Update"] = "UPDATE";
    })(StoreAction || (StoreAction = {}));
    var StoreActionMapping = (_a = {},
        _a[StoreAction.Update] = 'update',
        _a);
    var EntityStoreAction;
    (function (EntityStoreAction) {
        EntityStoreAction["Update"] = "UPDATE";
        EntityStoreAction["AddEntities"] = "ADD_ENTITIES";
        EntityStoreAction["SetEntities"] = "SET_ENTITIES";
        EntityStoreAction["UpdateEntities"] = "UPDATE_ENTITIES";
        EntityStoreAction["RemoveEntities"] = "REMOVE_ENTITIES";
        EntityStoreAction["UpsertEntities"] = "UPSERT_ENTITIES";
        EntityStoreAction["UpsertManyEntities"] = "UPSERT_MANY_ENTITIES";
    })(EntityStoreAction || (EntityStoreAction = {}));
    var EntityStoreActionMapping = (_b = {},
        _b[EntityStoreAction.Update] = 'update',
        _b[EntityStoreAction.AddEntities] = 'add',
        _b[EntityStoreAction.SetEntities] = 'set',
        _b[EntityStoreAction.UpdateEntities] = 'update',
        _b[EntityStoreAction.RemoveEntities] = 'remove',
        _b[EntityStoreAction.UpsertEntities] = 'upsert',
        _b[EntityStoreAction.UpsertManyEntities] = 'upsertMany',
        _b);

    akitaDevtools();
    persistState();

    const app = new App({
    	target: document.body,
    	props: {
    		name: "world"
    	}
    });

    return app;

}());
//# sourceMappingURL=site.js.map
