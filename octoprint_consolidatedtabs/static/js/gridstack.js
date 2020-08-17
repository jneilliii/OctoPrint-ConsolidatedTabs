"use strict";
// gridstack.ts 2.0.0-rc @preserve
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * https://gridstackjs.com/
 * (c) 2014-2020 Alain Dumesny, Dylan Weiss, Pavel Reznikov
 * gridstack.js may be freely distributed under the MIT license.
*/
require("./gridstack-poly.js");
const gridstack_engine_1 = require("./gridstack-engine");
const utils_1 = require("./utils");
const gridstack_dd_1 = require("./gridstack-dd");
__export(require("./utils"));
__export(require("./gridstack-engine"));
__export(require("./gridstack-dd"));
// TEMPORARY import the jquery-ui drag&drop since we don't have alternative yet and don't expect users to create their own yet
require("./jq/gridstack-dd-jqueryui");
__export(require("./jq/gridstack-dd-jqueryui"));
/**
 * Main gridstack class - you will need to call `GridStack.init()` first to initialize your grid.
 * Note: your grid elements MUST have the following classes for the CSS layout to work:
 * @example
 * <div class="grid-stack">
 *   <div class="grid-stack-item">
 *     <div class="grid-stack-item-content">Item 1</div>
 *   </div>
 * </div>
 */
class GridStack {
    /**
     * Construct a grid item from the given element and options
     * @param el
     * @param opts
     */
    constructor(el, opts = {}) {
        /** @internal */
        this._gsEventHandler = {};
        // legacy method renames
        /** @internal */
        this.setGridWidth = utils_1.obsolete(this, GridStack.prototype.column, 'setGridWidth', 'column', 'v0.5.3');
        /** @internal */
        this.setColumn = utils_1.obsolete(this, GridStack.prototype.column, 'setColumn', 'column', 'v0.6.4');
        /** @internal */
        this.getGridHeight = utils_1.obsolete(this, gridstack_engine_1.GridStackEngine.prototype.getRow, 'getGridHeight', 'getRow', 'v1.0.0');
        this.el = el; // exposed HTML element to the user
        opts = opts || {}; // handles null/undefined/0
        utils_1.obsoleteOpts(opts, 'width', 'column', 'v0.5.3');
        utils_1.obsoleteOpts(opts, 'height', 'maxRow', 'v0.5.3');
        utils_1.obsoleteOpts(opts, 'verticalMargin', 'margin', 'v2.0');
        utils_1.obsoleteOptsDel(opts, 'oneColumnModeClass', 'v0.6.3', '. Use class `.grid-stack-1` instead');
        // container attributes
        utils_1.obsoleteAttr(this.el, 'data-gs-width', 'data-gs-column', 'v0.5.3');
        utils_1.obsoleteAttr(this.el, 'data-gs-height', 'data-gs-max-row', 'v0.5.3');
        utils_1.obsoleteAttr(this.el, 'data-gs-current-height', 'data-gs-current-row', 'v1.0.0');
        // if row property exists, replace minRow and maxRow instead
        if (opts.row) {
            opts.minRow = opts.maxRow = opts.row;
            delete opts.row;
        }
        let rowAttr = utils_1.Utils.toNumber(el.getAttribute('data-gs-row'));
        // elements attributes override any passed options (like CSS style) - merge the two together
        let defaults = {
            column: utils_1.Utils.toNumber(el.getAttribute('data-gs-column')) || 12,
            minRow: rowAttr ? rowAttr : utils_1.Utils.toNumber(el.getAttribute('data-gs-min-row')) || 0,
            maxRow: rowAttr ? rowAttr : utils_1.Utils.toNumber(el.getAttribute('data-gs-max-row')) || 0,
            itemClass: 'grid-stack-item',
            placeholderClass: 'grid-stack-placeholder',
            placeholderText: '',
            handle: '.grid-stack-item-content',
            handleClass: null,
            styleInHead: false,
            cellHeight: 'auto',
            margin: 10,
            auto: true,
            minWidth: 768,
            float: false,
            staticGrid: false,
            _class: 'grid-stack-instance-' + (Math.random() * 10000).toFixed(0),
            animate: utils_1.Utils.toBool(el.getAttribute('data-gs-animate')) || false,
            alwaysShowResizeHandle: false,
            resizable: {
                autoHide: !(opts.alwaysShowResizeHandle || false),
                handles: 'se'
            },
            draggable: {
                handle: (opts.handleClass ? '.' + opts.handleClass : (opts.handle ? opts.handle : '')) || '.grid-stack-item-content',
                scroll: false,
                appendTo: 'body'
            },
            dragIn: undefined,
            dragInOptions: {
                revert: 'invalid',
                handle: '.grid-stack-item-content',
                scroll: false,
                appendTo: 'body'
            },
            disableDrag: false,
            disableResize: false,
            rtl: 'auto',
            removable: false,
            removableOptions: {
                accept: '.' + (opts.itemClass || 'grid-stack-item')
            },
            removeTimeout: 2000,
            marginUnit: 'px',
            cellHeightUnit: 'px',
            disableOneColumnMode: false,
            oneColumnModeDomSort: false
        };
        this.opts = utils_1.Utils.defaults(opts, defaults);
        this.initMargin();
        if (this.opts.ddPlugin === false) {
            this.opts.ddPlugin = gridstack_dd_1.GridStackDD;
        }
        else if (this.opts.ddPlugin === undefined) {
            this.opts.ddPlugin = gridstack_dd_1.GridStackDD.get();
        }
        this.dd = new this.opts.ddPlugin(this);
        if (this.opts.rtl === 'auto') {
            this.opts.rtl = el.style.direction === 'rtl';
        }
        if (this.opts.rtl) {
            this.el.classList.add('grid-stack-rtl');
        }
        this.opts._isNested = utils_1.Utils.closestByClass(this.el, opts.itemClass) !== null;
        if (this.opts._isNested) {
            this.el.classList.add('grid-stack-nested');
        }
        this._isAutoCellHeight = (this.opts.cellHeight === 'auto');
        if (this._isAutoCellHeight) {
            // make the cell content square initially (will use resize event to keep it square)
            let marginDiff = -this.opts.marginRight - this.opts.marginLeft
                + this.opts.marginTop + this.opts.marginBottom;
            this.cellHeight(this.cellWidth() + marginDiff, false);
        }
        else {
            this.cellHeight(this.opts.cellHeight, false);
        }
        this.el.classList.add(this.opts._class);
        this._setStaticClass();
        this._initStyles();
        this.engine = new gridstack_engine_1.GridStackEngine(this.opts.column, (cbNodes, removeDOM = true) => {
            let maxHeight = 0;
            this.engine.nodes.forEach(n => { maxHeight = Math.max(maxHeight, n.y + n.height); });
            cbNodes.forEach(n => {
                let el = n.el;
                if (removeDOM && n._id === null) {
                    if (el && el.parentNode) {
                        el.parentNode.removeChild(el);
                    }
                }
                else {
                    this._writeAttrs(el, n.x, n.y, n.width, n.height);
                }
            });
            this._updateStyles(maxHeight + 10);
        }, this.opts.float, this.opts.maxRow);
        if (this.opts.auto) {
            let elements = [];
            this.getGridItems().forEach(el => {
                let x = parseInt(el.getAttribute('data-gs-x'));
                let y = parseInt(el.getAttribute('data-gs-y'));
                elements.push({
                    el,
                    // if x,y are missing (autoPosition) add them to end of list - but keep their respective DOM order
                    i: (Number.isNaN(x) ? 1000 : x) + (Number.isNaN(y) ? 1000 : y) * this.opts.column
                });
            });
            elements.sort(e => e.i).forEach(item => { this._prepareElement(item.el); });
        }
        this.engine.saveInitial(); // initial start of items
        this.setAnimation(this.opts.animate);
        let placeholderChild = document.createElement('div');
        placeholderChild.className = 'placeholder-content';
        placeholderChild.innerHTML = this.opts.placeholderText;
        this.placeholder = document.createElement('div');
        this.placeholder.classList.add(this.opts.placeholderClass, this.opts.itemClass);
        this.placeholder.appendChild(placeholderChild);
        this._updateContainerHeight();
        window.addEventListener('resize', this._onResizeHandler.bind(this));
        this._onResizeHandler();
        this._setupDragIn();
        this._setupRemoveDrop();
        this._setupAcceptWidget();
    }
    /**
     * initializing the HTML element, or selector string, into a grid will return the grid. Calling it again will
     * simply return the existing instance (ignore any passed options). There is also an initAll() version that support
     * multiple grids initialization at once.
     * @param options grid options (optional)
     * @param elOrString element or CSS selector (first one used) to convert to a grid (default to '.grid-stack' class selector)
     *
     * @example
     * let grid = GridStack.init();
     *
     * Note: the HTMLElement (of type GridHTMLElement) will store a `gridstack: GridStack` value that can be retrieve later
     * let grid = document.querySelector('.grid-stack').gridstack;
     */
    static init(options = {}, elOrString = '.grid-stack') {
        let el = GridStack.getGridElement(elOrString);
        if (!el) {
            if (typeof elOrString === 'string') {
                console.log('gridstack.js: init() no grid was found. Did you forget class ' + elOrString + ' on your element ?' +
                    '\n".grid-stack" is required for proper CSS styling and drag/drop.');
            }
            else {
                console.log('gridstack.js: init() no grid element was passed.');
            }
            return null;
        }
        if (!el.gridstack) {
            el.gridstack = new GridStack(el, utils_1.Utils.clone(options));
        }
        return el.gridstack;
    }
    /**
     * Will initialize a list of elements (given a selector) and return an array of grids.
     * @param options grid options (optional)
     * @param selector elements selector to convert to grids (default to '.grid-stack' class selector)
     *
     * @example
     * let grids = GridStack.initAll();
     * grids.forEach(...)
     */
    static initAll(options = {}, selector = '.grid-stack') {
        let grids = [];
        GridStack.getGridElements(selector).forEach(el => {
            if (!el.gridstack) {
                el.gridstack = new GridStack(el, utils_1.Utils.clone(options));
            }
            grids.push(el.gridstack);
        });
        if (grids.length === 0) {
            console.log('gridstack.js: initAll() no grid was found. Did you forget class ' + selector + ' on your element ?' +
                '\n".grid-stack" is required for proper CSS styling and drag/drop.');
        }
        return grids;
    }
    ;
    /**
     * add a new widget and returns it.
     *
     * Widget will be always placed even if result height is more than actual grid height.
     * You need to use willItFit method before calling addWidget for additional check.
     * See also `makeWidget()`.
     *
     * @example
     * let grid = GridStack.init();
     * grid.addWidget('<div><div class="grid-stack-item-content">hello</div></div>', {width: 3});
     *
     * @param el html element or string definition to add
     * @param options widget position/size options (optional) - see GridStackWidget
     */
    addWidget(el, options) {
        // support legacy call for now ?
        if (arguments.length > 2) {
            console.warn('gridstack.ts: `addWidget(el, x, y, width...)` is deprecated. Use `addWidget(el, {x, y, width,...})`. It will be removed soon');
            // eslint-disable-next-line prefer-rest-params
            let a = arguments, i = 1, opt = { x: a[i++], y: a[i++], width: a[i++], height: a[i++], autoPosition: a[i++],
                minWidth: a[i++], maxWidth: a[i++], minHeight: a[i++], maxHeight: a[i++], id: a[i++] };
            return this.addWidget(el, opt);
        }
        if (typeof el === 'string') {
            let doc = document.implementation.createHTMLDocument();
            doc.body.innerHTML = el;
            el = doc.body.children[0];
        }
        // Tempting to initialize the passed in opt with default and valid values, but this break knockout demos
        // as the actual value are filled in when _prepareElement() calls el.getAttribute('data-gs-xyz) before adding the node.
        if (options) {
            // make sure we load any DOM attributes that are not specified in passed in options (which override)
            let domAttr = this._readAttr(el);
            utils_1.Utils.defaults(options, domAttr);
            this.engine.prepareNode(options);
            this._writeAttr(el, options);
        }
        this.el.appendChild(el);
        return this.makeWidget(el);
    }
    /** saves the current layout returning a list of widgets for serialization */
    save() { return this.engine.save(); }
    /**
     * load the widgets from a list. This will call update() on each (matching by id) or add/remove widgets that are not there.
     *
     * @param layout list of widgets definition to update/create
     * @param addAndRemove boolean (default true) or callback method can be passed to control if and how missing widgets can be added/removed, giving
     * the user control of insertion.
     *
     * @example
     * see http://gridstackjs.com/demo/serialization.html
     **/
    load(layout, addAndRemove = true) {
        let items = GridStack.Utils.sort(layout);
        this.batchUpdate();
        // see if any items are missing from new layout and need to be removed first
        if (addAndRemove) {
            this.engine.nodes.forEach(n => {
                let item = items.find(w => n.id === w.id);
                if (!item) {
                    if (typeof (addAndRemove) === 'function') {
                        addAndRemove(n, false);
                    }
                    else {
                        this.removeWidget(n.el);
                    }
                }
            });
        }
        // now add/update the widgets
        items.forEach(w => {
            let item = this.engine.nodes.find(n => n.id === w.id);
            if (item) {
                this.update(item.el, w.x, w.y, w.width, w.height); // TODO: full update
            }
            else if (addAndRemove) {
                if (typeof (addAndRemove) === 'function') {
                    addAndRemove(w, true);
                }
                else {
                    this.addWidget('<div><div class="grid-stack-item-content"></div></div>', w);
                }
            }
        });
        this.commit();
    }
    /**
     * Initializes batch updates. You will see no changes until `commit()` method is called.
     */
    batchUpdate() {
        this.engine.batchUpdate();
        return this;
    }
    /**
     * Gets current cell height.
     */
    getCellHeight() {
        if (this.opts.cellHeight && this.opts.cellHeight !== 'auto') {
            return this.opts.cellHeight;
        }
        // else get first cell height
        // or do entire grid and # of rows ? (this.el.getBoundingClientRect().height) / parseInt(this.el.getAttribute('data-gs-current-row'))
        let el = this.el.querySelector('.' + this.opts.itemClass);
        let height = utils_1.Utils.toNumber(el.getAttribute('data-gs-height'));
        return Math.round(el.offsetHeight / height);
    }
    /**
     * Update current cell height - see `GridstackOptions.cellHeight` for format.
     * This method rebuilds an internal CSS style sheet.
     * Note: You can expect performance issues if call this method too often.
     *
     * @param val the cell height
     * @param update (Optional) if false, styles will not be updated
     *
     * @example
     * grid.cellHeight(grid.cellWidth() * 1.2);
     */
    cellHeight(val, update = true) {
        let data = utils_1.Utils.parseHeight(val);
        if (this.opts.cellHeightUnit === data.unit && this.opts.cellHeight === data.height) {
            return this;
        }
        this.opts.cellHeightUnit = data.unit;
        this.opts.cellHeight = data.height;
        if (update) {
            this._updateStyles();
        }
        return this;
    }
    /**
     * Gets current cell width.
     */
    cellWidth() {
        return this.el.offsetWidth / this.opts.column;
    }
    /**
     * Finishes batch updates. Updates DOM nodes. You must call it after batchUpdate.
     */
    commit() {
        this.engine.commit();
        this._triggerRemoveEvent();
        this._triggerAddEvent();
        this._triggerChangeEvent();
        return this;
    }
    ;
    /** re-layout grid items to reclaim any empty space */
    compact() {
        this.engine.compact();
        this._triggerChangeEvent();
        return this;
    }
    /**
     * set the number of columns in the grid. Will update existing widgets to conform to new number of columns,
     * as well as cache the original layout so you can revert back to previous positions without loss.
     * Requires `gridstack-extra.css` or `gridstack-extra.min.css` for [1-11],
     * else you will need to generate correct CSS (see https://github.com/gridstack/gridstack.js#change-grid-columns)
     * @param column - Integer > 0 (default 12).
     * @param doNotPropagate if true existing widgets will not be updated (optional)
     */
    column(column, doNotPropagate) {
        if (this.opts.column === column) {
            return this;
        }
        let oldColumn = this.opts.column;
        // if we go into 1 column mode (which happens if we're sized less than minWidth unless disableOneColumnMode is on)
        // then remember the original columns so we can restore.
        if (column === 1) {
            this._prevColumn = oldColumn;
        }
        else {
            delete this._prevColumn;
        }
        this.el.classList.remove('grid-stack-' + oldColumn);
        this.el.classList.add('grid-stack-' + column);
        this.opts.column = this.engine.column = column;
        if (doNotPropagate === true) {
            return this;
        }
        // update the items now - see if the dom order nodes should be passed instead (else default to current list)
        let domNodes = undefined; // explicitly leave not defined
        if (column === 1 && this.opts.oneColumnModeDomSort) {
            domNodes = [];
            this.getGridItems().forEach(el => {
                if (el.gridstackNode) {
                    domNodes.push(el.gridstackNode);
                }
            });
            if (!domNodes.length) {
                domNodes = undefined;
            }
        }
        this.engine.updateNodeWidths(oldColumn, column, domNodes);
        // and trigger our event last...
        this._triggerChangeEvent(true); // skip layout update
        return this;
    }
    /**
     * get the number of columns in the grid (default 12)
     */
    getColumn() {
        return this.opts.column;
    }
    /** returns an array of grid HTML elements (no placeholder) - used to iterate through our children */
    getGridItems() {
        return Array.from(this.el.children)
            .filter((el) => el.matches('.' + this.opts.itemClass) && !el.matches('.' + this.opts.placeholderClass));
    }
    /**
     * Destroys a grid instance.
     * @param removeDOM if `false` grid and items elements will not be removed from the DOM (Optional. Default `true`).
     */
    destroy(removeDOM = true) {
        window.removeEventListener('resize', this._onResizeHandler);
        this.disable();
        if (!removeDOM) {
            this.removeAll(removeDOM);
            this.el.classList.remove(this.opts._class);
            delete this.el.gridstack;
        }
        else {
            this.el.parentNode.removeChild(this.el);
        }
        utils_1.Utils.removeStylesheet(this._stylesId);
        delete this.engine;
        return this;
    }
    /**
     * Disables widgets moving/resizing. This is a shortcut for:
     * @example
     *  grid.enableMove(false);
     *  grid.enableResize(false);
     */
    disable() {
        this.enableMove(false);
        this.enableResize(false);
        this._triggerEvent('disable');
        return this;
    }
    /**
     * Enables widgets moving/resizing. This is a shortcut for:
     * @example
     *  grid.enableMove(true);
     *  grid.enableResize(true);
     */
    enable() {
        this.enableMove(true);
        this.enableResize(true);
        this._triggerEvent('enable');
        return this;
    }
    /**
     * Enables/disables widget moving.
     *
     * @param doEnable
     * @param includeNewWidgets will force new widgets to be draggable as per
     * doEnable`s value by changing the disableDrag grid option (default: true).
     */
    enableMove(doEnable, includeNewWidgets = true) {
        this.getGridItems().forEach(el => this.movable(el, doEnable));
        if (includeNewWidgets) {
            this.opts.disableDrag = !doEnable;
        }
        return this;
    }
    /**
     * Enables/disables widget resizing
     * @param doEnable
     * @param includeNewWidgets will force new widgets to be draggable as per
     * doEnable`s value by changing the disableResize grid option (default: true).
     */
    enableResize(doEnable, includeNewWidgets = true) {
        this.getGridItems().forEach(el => this.resizable(el, doEnable));
        if (includeNewWidgets) {
            this.opts.disableResize = !doEnable;
        }
        return this;
    }
    /**
     * enable/disable floating widgets (default: `false`) See [example](http://gridstackjs.com/demo/float.html)
     */
    float(val) {
        /*
        if (val === undefined) {
          // TODO: should we support and/or change signature ? figure this soon...
          console.warn('gridstack.ts: getter `float()` is deprecated in 2.x and has been replaced by `getFloat()`. It will be **completely** removed soon');
          return this.getFloat();
        }
        */
        this.engine.float = val;
        this._triggerChangeEvent();
        return this;
    }
    /**
     * get the current float mode
     */
    getFloat() {
        return this.engine.float;
    }
    /**
     * Get the position of the cell under a pixel on screen.
     * @param position the position of the pixel to resolve in
     * absolute coordinates, as an object with top and left properties
     * @param useDocRelative if true, value will be based on document position vs parent position (Optional. Default false).
     * Useful when grid is within `position: relative` element
     *
     * Returns an object with properties `x` and `y` i.e. the column and row in the grid.
     */
    getCellFromPixel(position, useDocRelative = false) {
        let box = this.el.getBoundingClientRect();
        // console.log(`getBoundingClientRect left: ${box.left} top: ${box.top} w: ${box.width} h: ${box.height}`)
        let containerPos;
        if (useDocRelative) {
            containerPos = { top: box.top + document.documentElement.scrollTop, left: box.left };
            // console.log(`getCellFromPixel scrollTop: ${document.documentElement.scrollTop}`)
        }
        else {
            containerPos = { top: this.el.offsetTop, left: this.el.offsetLeft };
            // console.log(`getCellFromPixel offsetTop: ${containerPos.left} offsetLeft: ${containerPos.top}`)
        }
        let relativeLeft = position.left - containerPos.left;
        let relativeTop = position.top - containerPos.top;
        let columnWidth = (box.width / this.opts.column);
        let rowHeight = (box.height / parseInt(this.el.getAttribute('data-gs-current-row')));
        return { x: Math.floor(relativeLeft / columnWidth), y: Math.floor(relativeTop / rowHeight) };
    }
    /** returns the current number of rows, which will be at least `minRow` if set */
    getRow() {
        return Math.max(this.engine.getRow(), this.opts.minRow);
    }
    /**
     * Checks if specified area is empty.
     * @param x the position x.
     * @param y the position y.
     * @param width the width of to check
     * @param height the height of to check
     */
    isAreaEmpty(x, y, width, height) {
        return this.engine.isAreaEmpty(x, y, width, height);
    }
    /**
     * Locks/unlocks widget.
     * @param el element or selector to modify.
     * @param val if true widget will be locked.
     */
    locked(els, val) {
        this.getElements(els).forEach(el => {
            let node = el.gridstackNode;
            if (!node)
                return;
            node.locked = (val || false);
            if (node.locked) {
                el.setAttribute('data-gs-locked', 'yes');
            }
            else {
                el.removeAttribute('data-gs-locked');
            }
        });
        return this;
    }
    /**
     * If you add elements to your grid by hand, you have to tell gridstack afterwards to make them widgets.
     * If you want gridstack to add the elements for you, use `addWidget()` instead.
     * Makes the given element a widget and returns it.
     * @param els widget or single selector to convert.
     *
     * @example
     * let grid = GridStack.init();
     * grid.el.appendChild('<div id="gsi-1" data-gs-width="3"></div>');
     * grid.makeWidget('gsi-1');
     */
    makeWidget(els) {
        let el = this.getElement(els);
        this._prepareElement(el, true);
        this._updateContainerHeight();
        this._triggerAddEvent();
        this._triggerChangeEvent();
        return el;
    }
    /**
     * Set the maxWidth for a widget.
     * @param els widget or selector to modify.
     * @param val A numeric value of the number of columns
     */
    maxWidth(els, val) {
        this.getElements(els).forEach(el => {
            let node = el.gridstackNode;
            if (!node) {
                return;
            }
            node.maxWidth = (val || undefined);
            if (val) {
                el.setAttribute('data-gs-max-width', String(val));
            }
            else {
                el.removeAttribute('data-gs-max-width');
            }
        });
        return this;
    }
    /**
     * Set the minWidth for a widget.
     * @param els widget or selector to modify.
     * @param val A numeric value of the number of columns
     */
    minWidth(els, val) {
        this.getElements(els).forEach(el => {
            let node = el.gridstackNode;
            if (!node) {
                return;
            }
            if (val) {
                el.setAttribute('data-gs-min-width', String(val));
            }
            else {
                el.removeAttribute('data-gs-min-width');
            }
        });
        return this;
    }
    /**
     * Set the maxHeight for a widget.
     * @param els widget or selector to modify.
     * @param val A numeric value of the number of rows
     */
    maxHeight(els, val) {
        this.getElements(els).forEach(el => {
            let node = el.gridstackNode;
            if (!node) {
                return;
            }
            if (val) {
                el.setAttribute('data-gs-max-height', String(val));
            }
            else {
                el.removeAttribute('data-gs-max-height');
            }
        });
        return this;
    }
    /**
     * Set the minHeight for a widget.
     * @param els widget or selector to modify.
     * @param val A numeric value of the number of rows
     */
    minHeight(els, val) {
        this.getElements(els).forEach(el => {
            let node = el.gridstackNode;
            if (!node) {
                return;
            }
            if (val) {
                el.setAttribute('data-gs-min-height', String(val));
            }
            else {
                el.removeAttribute('data-gs-min-height');
            }
        });
        return this;
    }
    /**
     * Enables/Disables moving.
     * @param els widget or selector to modify.
     * @param val if true widget will be draggable.
     */
    movable(els, val) {
        this.getElements(els).forEach(el => {
            let node = el.gridstackNode;
            if (!node) {
                return;
            }
            node.noMove = !(val || false);
            if (node.noMove) {
                this.dd.draggable(el, 'disable');
                el.classList.remove('ui-draggable-handle');
            }
            else {
                this.dd.draggable(el, 'enable');
                el.classList.remove('ui-draggable-handle');
            }
        });
        return this;
    }
    /**
     * Changes widget position
     * @param els  widget or singular selector to modify
     * @param x new position x. If value is null or undefined it will be ignored.
     * @param y new position y. If value is null or undefined it will be ignored.
     */
    move(els, x, y) {
        this._updateElement(els, (el, node) => {
            x = (x !== undefined) ? x : node.x;
            y = (y !== undefined) ? y : node.y;
            this.engine.moveNode(node, x, y, node.width, node.height);
        });
        return this;
    }
    /**
     * Event handler that extracts our CustomEvent data out automatically for receiving custom
     * notifications (see doc for supported events)
     * @param name of the event (see possible values) or list of names space separated
     * @param callback function called with event and optional second/third param
     * (see README documentation for each signature).
     *
     * @example
     * grid.on('added', function(e, items) { log('added ', items)} );
     * or
     * grid.on('added removed change', function(e, items) { log(e.type, items)} );
     *
     * Note: in some cases it is the same as calling native handler and parsing the event.
     * grid.el.addEventListener('added', function(event) { log('added ', event.detail)} );
     *
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    on(name, callback) {
        // check for array of names being passed instead
        if (name.indexOf(' ') !== -1) {
            let names = name.split(' ');
            names.forEach(name => this.on(name, callback));
            return this;
        }
        if (name === 'change' || name === 'added' || name === 'removed' || name === 'enable' || name === 'disable') {
            // native CustomEvent handlers - cash the generic handlers so we can easily remove
            let noData = (name === 'enable' || name === 'disable');
            if (noData) {
                this._gsEventHandler[name] = (event) => callback(event);
            }
            else {
                this._gsEventHandler[name] = (event) => callback(event, event.detail);
            }
            this.el.addEventListener(name, this._gsEventHandler[name]);
        }
        else if (name === 'dragstart' || name === 'dragstop' || name === 'resizestart' || name === 'resizestop' || name === 'dropped') {
            // drag&drop stop events NEED to be call them AFTER we update node attributes so handle them ourself.
            // do same for start event to make it easier...
            this._gsEventHandler[name] = callback;
        }
        else {
            console.log('gridstack.on(' + name + ') event not supported');
        }
        return this;
    }
    /**
     * unsubscribe from the 'on' event below
     * @param name of the event (see possible values)
     */
    off(name) {
        // check for array of names being passed instead
        if (name.indexOf(' ') !== -1) {
            let names = name.split(' ');
            names.forEach(name => this.off(name));
            return this;
        }
        if (name === 'change' || name === 'added' || name === 'removed' || name === 'enable' || name === 'disable') {
            // remove native CustomEvent handlers
            if (this._gsEventHandler[name]) {
                this.el.removeEventListener(name, this._gsEventHandler[name]);
            }
        }
        delete this._gsEventHandler[name];
        return this;
    }
    /**
     * Removes widget from the grid.
     * @param el  widget or selector to modify
     * @param removeDOM if `false` DOM element won't be removed from the tree (Default? true).
     */
    removeWidget(els, removeDOM = true) {
        this.getElements(els).forEach(el => {
            if (el.parentElement !== this.el)
                return; // not our child!
            let node = el.gridstackNode;
            // For Meteor support: https://github.com/gridstack/gridstack.js/pull/272
            if (!node) {
                node = this.engine.nodes.find(n => el === n.el);
            }
            if (!node)
                return;
            // remove our DOM data (circular link) and drag&drop permanently
            delete el.gridstackNode;
            this.dd.draggable(el, 'destroy').resizable(el, 'destroy');
            this.engine.removeNode(node, removeDOM, true); // true for trigger event
        });
        this._triggerRemoveEvent();
        this._triggerChangeEvent();
        return this;
    }
    /**
     * Removes all widgets from the grid.
     * @param removeDOM if `false` DOM elements won't be removed from the tree (Default? `true`).
     */
    removeAll(removeDOM = true) {
        // always remove our DOM data (circular link) before list gets emptied and drag&drop permanently
        this.engine.nodes.forEach(n => {
            delete n.el.gridstackNode;
            this.dd.draggable(n.el, 'destroy').resizable(n.el, 'destroy');
        });
        this.engine.removeAll(removeDOM);
        this._triggerRemoveEvent();
        return this;
    }
    /**
     * Changes widget size
     * @param els  widget or singular selector to modify
     * @param width new dimensions width. If value is null or undefined it will be ignored.
     * @param height  new dimensions height. If value is null or undefined it will be ignored.
     */
    resize(els, width, height) {
        this._updateElement(els, (el, node) => {
            width = (width || node.width);
            height = (height || node.height);
            this.engine.moveNode(node, node.x, node.y, width, height);
        });
        return this;
    }
    /**
     * Enables/Disables resizing.
     * @param els  widget or selector to modify
     * @param val  if true widget will be resizable.
     */
    resizable(els, val) {
        this.getElements(els).forEach(el => {
            let node = el.gridstackNode;
            if (!node) {
                return;
            }
            node.noResize = !(val || false);
            if (node.noResize) {
                this.dd.resizable(el, 'disable');
            }
            else {
                this.dd.resizable(el, 'enable');
            }
        });
        return this;
    }
    /**
     * Toggle the grid animation state.  Toggles the `grid-stack-animate` class.
     * @param doAnimate if true the grid will animate.
     */
    setAnimation(doAnimate) {
        if (doAnimate) {
            this.el.classList.add('grid-stack-animate');
        }
        else {
            this.el.classList.remove('grid-stack-animate');
        }
        return this;
    }
    /**
     * Toggle the grid static state. Also toggle the grid-stack-static class.
     * @param staticValue if true the grid become static.
     */
    setStatic(staticValue) {
        this.opts.staticGrid = (staticValue === true);
        this.enableMove(!staticValue);
        this.enableResize(!staticValue);
        this._setStaticClass();
        return this;
    }
    /**
     * Updates widget position/size.
     * @param els  widget or singular selector to modify
     * @param x new position x. If value is null or undefined it will be ignored.
     * @param y new position y. If value is null or undefined it will be ignored.
     * @param width new dimensions width. If value is null or undefined it will be ignored.
     * @param height  new dimensions height. If value is null or undefined it will be ignored.
     */
    update(els, x, y, width, height) {
        this._updateElement(els, (el, node) => {
            x = (x !== undefined) ? x : node.x;
            y = (y !== undefined) ? y : node.y;
            width = (width || node.width);
            height = (height || node.height);
            this.engine.moveNode(node, x, y, width, height);
        });
        return this;
    }
    /**
     * Updates the margins which will set all 4 sides at once - see `GridstackOptions.margin` for format options.
     * @param value new vertical margin value
     * Note: you can instead use `marginTop | marginBottom | marginLeft | marginRight` GridstackOptions to set the sides separately.
     */
    margin(value) {
        let data = utils_1.Utils.parseHeight(value);
        if (this.opts.marginUnit === data.unit && this.opts.margin === data.height) {
            return;
        }
        this.opts.marginUnit = data.unit;
        this.opts.marginTop =
            this.opts.marginBottom =
                this.opts.marginLeft =
                    this.opts.marginRight =
                        this.opts.margin = data.height;
        this._updateStyles();
        return this;
    }
    /** returns current vertical margin value */
    getMargin() { return this.opts.margin; }
    /**
     * Returns true if the height of the grid will be less the vertical
     * constraint. Always returns true if grid doesn't have height constraint.
     * @param x new position x. If value is null or undefined it will be ignored.
     * @param y new position y. If value is null or undefined it will be ignored.
     * @param width new dimensions width. If value is null or undefined it will be ignored.
     * @param height new dimensions height. If value is null or undefined it will be ignored.
     * @param autoPosition if true then x, y parameters will be ignored and widget
     * will be places on the first available position
     *
     * @example
     * if (grid.willItFit(newNode.x, newNode.y, newNode.width, newNode.height, newNode.autoPosition)) {
     *   grid.addWidget(newNode.el, newNode);
     * } else {
     *   alert('Not enough free space to place the widget');
     * }
     */
    willItFit(x, y, width, height, autoPosition) {
        return this.engine.canBePlacedWithRespectToHeight({ x, y, width, height, autoPosition });
    }
    /** @internal */
    _triggerChangeEvent(skipLayoutChange) {
        if (this.engine.batchMode) {
            return this;
        }
        let elements = this.engine.getDirtyNodes(true); // verify they really changed
        if (elements && elements.length) {
            if (!skipLayoutChange) {
                this.engine.layoutsNodesChange(elements);
            }
            this._triggerEvent('change', elements);
        }
        this.engine.saveInitial(); // we called, now reset initial values & dirty flags
        return this;
    }
    /** @internal */
    _triggerAddEvent() {
        if (this.engine.batchMode) {
            return this;
        }
        if (this.engine.addedNodes && this.engine.addedNodes.length > 0) {
            this.engine.layoutsNodesChange(this.engine.addedNodes);
            // prevent added nodes from also triggering 'change' event (which is called next)
            this.engine.addedNodes.forEach(n => { delete n._dirty; });
            this._triggerEvent('added', this.engine.addedNodes);
            this.engine.addedNodes = [];
        }
        return this;
    }
    /** @internal */
    _triggerRemoveEvent() {
        if (this.engine.batchMode) {
            return this;
        }
        if (this.engine.removedNodes && this.engine.removedNodes.length > 0) {
            this._triggerEvent('removed', this.engine.removedNodes);
            this.engine.removedNodes = [];
        }
        return this;
    }
    /** @internal */
    _triggerEvent(name, data) {
        let event = data ? new CustomEvent(name, { bubbles: false, detail: data }) : new Event(name);
        this.el.dispatchEvent(event);
        return this;
    }
    /** @internal */
    _initStyles() {
        if (this._stylesId) {
            utils_1.Utils.removeStylesheet(this._stylesId);
        }
        this._stylesId = 'gridstack-style-' + (Math.random() * 100000).toFixed();
        // insert style to parent (instead of 'head' by default) to support WebComponent
        let styleLocation = this.opts.styleInHead ? undefined : this.el.parentNode;
        this._styles = utils_1.Utils.createStylesheet(this._stylesId, styleLocation);
        if (this._styles !== null) {
            this._styles._max = 0;
        }
        return this;
    }
    /** @internal updated the CSS styles for row based layout and initial margin setting */
    _updateStyles(maxHeight) {
        if (!this._styles) {
            return this;
        }
        if (maxHeight === undefined) {
            maxHeight = this._styles._max;
        }
        this._initStyles();
        this._updateContainerHeight();
        if (!this.opts.cellHeight) { // The rest will be handled by CSS
            return this;
        }
        if (this._styles._max !== 0 && maxHeight <= this._styles._max) { // Keep it increasing
            return this;
        }
        let cellHeight = this.opts.cellHeight;
        let cellHeightUnit = this.opts.cellHeightUnit;
        let prefix = `.${this.opts._class} > .${this.opts.itemClass}`;
        // these are done once only
        if (this._styles._max === 0) {
            utils_1.Utils.addCSSRule(this._styles, prefix, `min-height: ${cellHeight}${cellHeightUnit}`);
            // content margins
            let top = this.opts.marginTop + this.opts.marginUnit;
            let bottom = this.opts.marginBottom + this.opts.marginUnit;
            let right = this.opts.marginRight + this.opts.marginUnit;
            let left = this.opts.marginLeft + this.opts.marginUnit;
            let content = `${prefix} > .grid-stack-item-content`;
            let placeholder = `.${this.opts._class} > .grid-stack-placeholder > .placeholder-content`;
            utils_1.Utils.addCSSRule(this._styles, content, `top: ${top}; right: ${right}; bottom: ${bottom}; left: ${left};`);
            utils_1.Utils.addCSSRule(this._styles, placeholder, `top: ${top}; right: ${right}; bottom: ${bottom}; left: ${left};`);
            // resize handles offset (to match margin)
            utils_1.Utils.addCSSRule(this._styles, `${prefix} > .ui-resizable-ne`, `right: ${right}`);
            utils_1.Utils.addCSSRule(this._styles, `${prefix} > .ui-resizable-e`, `right: ${right}`);
            utils_1.Utils.addCSSRule(this._styles, `${prefix} > .ui-resizable-se`, `right: ${right}; bottom: ${bottom}`);
            utils_1.Utils.addCSSRule(this._styles, `${prefix} > .ui-resizable-nw`, `left: ${left}`);
            utils_1.Utils.addCSSRule(this._styles, `${prefix} > .ui-resizable-w`, `left: ${left}`);
            utils_1.Utils.addCSSRule(this._styles, `${prefix} > .ui-resizable-sw`, `left: ${left}; bottom: ${bottom}`);
        }
        if (maxHeight > this._styles._max) {
            let getHeight = (rows) => (cellHeight * rows) + cellHeightUnit;
            for (let i = this._styles._max + 1; i <= maxHeight; i++) { // start at 1
                let height = getHeight(i);
                utils_1.Utils.addCSSRule(this._styles, `${prefix}[data-gs-y="${i - 1}"]`, `top: ${getHeight(i - 1)}`); // start at 0
                utils_1.Utils.addCSSRule(this._styles, `${prefix}[data-gs-height="${i}"]`, `height: ${height}`);
                utils_1.Utils.addCSSRule(this._styles, `${prefix}[data-gs-min-height="${i}"]`, `min-height: ${height}`);
                utils_1.Utils.addCSSRule(this._styles, `${prefix}[data-gs-max-height="${i}"]`, `max-height: ${height}`);
            }
            this._styles._max = maxHeight;
        }
        return this;
    }
    /** @internal */
    _updateContainerHeight() {
        if (this.engine.batchMode) {
            return this;
        }
        let row = this.getRow(); // checks for minRow already
        // check for css min height
        let cssMinHeight = parseInt(getComputedStyle(this.el)['min-height']);
        if (cssMinHeight > 0) {
            let minRow = Math.round(cssMinHeight / this.getCellHeight());
            if (row < minRow) {
                row = minRow;
            }
        }
        this.el.setAttribute('data-gs-current-row', String(row));
        if (row === 0) {
            this.el.style.removeProperty('height');
            return this;
        }
        let cellHeight = this.opts.cellHeight;
        let unit = this.opts.cellHeightUnit;
        if (!cellHeight) {
            return this;
        }
        this.el.style.height = row * cellHeight + unit;
        return this;
    }
    /** @internal */
    _setupRemovingTimeout(el) {
        let node = el.gridstackNode;
        if (!node || node._removeTimeout || !this.opts.removable)
            return this;
        node._removeTimeout = setTimeout(() => {
            el.classList.add('grid-stack-item-removing');
            node._isAboutToRemove = true;
        }, this.opts.removeTimeout);
        return this;
    }
    /** @internal */
    _clearRemovingTimeout(el) {
        let node = el.gridstackNode;
        if (!node || !node._removeTimeout)
            return this;
        clearTimeout(node._removeTimeout);
        delete node._removeTimeout;
        el.classList.remove('grid-stack-item-removing');
        delete node._isAboutToRemove;
        return this;
    }
    /** @internal prepares the element for drag&drop **/
    _prepareElementsByNode(el, node) {
        // variables used/cashed between the 3 start/move/end methods, in addition to node passed above
        let cellWidth;
        let cellHeight;
        /** called when item starts moving/resizing */
        let onStartMoving = (event, ui) => {
            // trigger any 'dragstart' / 'resizestart' manually
            if (this._gsEventHandler[event.type]) {
                this._gsEventHandler[event.type](event, event.target);
            }
            this.engine.cleanNodes();
            this.engine.beginUpdate(node);
            cellWidth = this.cellWidth();
            cellHeight = this.getCellHeight();
            let { target } = event;
            this.placeholder.setAttribute('data-gs-x', target.getAttribute('data-gs-x'));
            this.placeholder.setAttribute('data-gs-y', target.getAttribute('data-gs-y'));
            this.placeholder.setAttribute('data-gs-width', target.getAttribute('data-gs-width'));
            this.placeholder.setAttribute('data-gs-height', target.getAttribute('data-gs-height'));
            this.el.append(this.placeholder);
            node.el = this.placeholder;
            node._beforeDragX = node.x;
            node._beforeDragY = node.y;
            node._prevYPix = ui.position.top;
            let minHeight = (node.minHeight || 1);
            // mineHeight - Each row is cellHeight + margin
            this.dd.resizable(el, 'option', 'minWidth', cellWidth * (node.minWidth || 1));
            this.dd.resizable(el, 'option', 'minHeight', cellHeight * minHeight);
            if (event.type === 'resizestart') {
                let itemElement = target.querySelector('.grid-stack-item');
                if (itemElement) {
                    let ev = document.createEvent('HTMLEvents');
                    ev.initEvent('resizestart', true, false);
                    itemElement.dispatchEvent(event);
                }
            }
        };
        /** called when item is being dragged/resized */
        let dragOrResize = (event, ui) => {
            let x = Math.round(ui.position.left / cellWidth);
            let y = Math.floor((ui.position.top + cellHeight / 2) / cellHeight);
            let width;
            let height;
            if (event.type === 'drag') {
                let distance = ui.position.top - node._prevYPix;
                node._prevYPix = ui.position.top;
                utils_1.Utils.updateScrollPosition(el, ui.position, distance);
                if (el.dataset.inTrashZone || x < 0 || x >= this.engine.column || y < 0 ||
                    (!this.engine.float && y > this.engine.getRow())) {
                    if (!node._temporaryRemoved) {
                        if (this.opts.removable === true) {
                            this._setupRemovingTimeout(el);
                        }
                        x = node._beforeDragX;
                        y = node._beforeDragY;
                        if (this.placeholder.parentNode === this.el) {
                            this.el.removeChild(this.placeholder);
                        }
                        this.engine.removeNode(node);
                        this._updateContainerHeight();
                        node._temporaryRemoved = true;
                    }
                    else {
                        return;
                    }
                }
                else {
                    this._clearRemovingTimeout(el);
                    if (node._temporaryRemoved) {
                        this.engine.addNode(node);
                        this._writeAttrs(this.placeholder, x, y, width, height);
                        this.el.appendChild(this.placeholder);
                        node.el = this.placeholder;
                        delete node._temporaryRemoved;
                    }
                }
            }
            else if (event.type === 'resize') {
                if (x < 0)
                    return;
                width = Math.round(ui.size.width / cellWidth);
                height = Math.round((ui.size.height + this.getMargin()) / cellHeight);
            }
            // width and height are undefined if not resizing
            let _lastTriedWidth = (width || node._lastTriedWidth);
            let _lastTriedHeight = (height || node._lastTriedHeight);
            if (!this.engine.canMoveNode(node, x, y, width, height) ||
                (node._lastTriedX === x && node._lastTriedY === y &&
                    node._lastTriedWidth === _lastTriedWidth && node._lastTriedHeight === _lastTriedHeight)) {
                return;
            }
            node._lastTriedX = x;
            node._lastTriedY = y;
            node._lastTriedWidth = width;
            node._lastTriedHeight = height;
            this.engine.moveNode(node, x, y, width, height);
            this._updateContainerHeight();
        };
        /** called when the item stops moving/resizing */
        let onEndMoving = (event) => {
            let target = event.target;
            if (!target.gridstackNode)
                return;
            // let forceNotify = false; what is the point of calling 'change' event with no data, when the 'removed' event is already called ?
            if (this.placeholder.parentNode === this.el) {
                this.el.removeChild(this.placeholder);
            }
            node.el = target;
            if (node._isAboutToRemove) {
                let gridToNotify = el.gridstackNode.grid;
                if (gridToNotify._gsEventHandler[event.type]) {
                    gridToNotify._gsEventHandler[event.type](event, target);
                }
                gridToNotify.engine.removedNodes.push(node);
                gridToNotify._triggerRemoveEvent();
                delete el.gridstackNode;
                el.remove();
            }
            else {
                this._clearRemovingTimeout(el);
                if (!node._temporaryRemoved) {
                    utils_1.Utils.removePositioningStyles(target);
                    this._writeAttrs(target, node.x, node.y, node.width, node.height);
                }
                else {
                    utils_1.Utils.removePositioningStyles(target);
                    this._writeAttrs(target, node._beforeDragX, node._beforeDragY, node.width, node.height);
                    node.x = node._beforeDragX;
                    node.y = node._beforeDragY;
                    delete node._temporaryRemoved;
                    this.engine.addNode(node);
                }
                if (this._gsEventHandler[event.type]) {
                    this._gsEventHandler[event.type](event, target);
                }
            }
            this._updateContainerHeight();
            this._triggerChangeEvent();
            this.engine.endUpdate();
            // if we re-sized a nested grid item, let the children resize as well
            if (event.type === 'resizestop') {
                target.querySelectorAll('.grid-stack').forEach((el) => el.gridstack._onResizeHandler());
            }
        };
        this.dd
            .draggable(el, {
            start: onStartMoving,
            stop: onEndMoving,
            drag: dragOrResize
        })
            .resizable(el, {
            start: onStartMoving,
            stop: onEndMoving,
            resize: dragOrResize
        });
        if (node.noMove || this.opts.disableDrag || this.opts.staticGrid) {
            this.dd.draggable(el, 'disable');
        }
        if (node.noResize || this.opts.disableResize || this.opts.staticGrid) {
            this.dd.resizable(el, 'disable');
        }
        this._writeAttr(el, node);
        return this;
    }
    /** @internal */
    _prepareElement(el, triggerAddEvent = false) {
        el.classList.add(this.opts.itemClass);
        let node = this._readAttr(el, { el: el, grid: this });
        node = this.engine.addNode(node, triggerAddEvent);
        el.gridstackNode = node;
        this._prepareElementsByNode(el, node);
        return this;
    }
    /** @internal call to write x,y,w,h attributes back to element */
    _writeAttrs(el, x, y, width, height) {
        if (x !== undefined && x !== null) {
            el.setAttribute('data-gs-x', String(x));
        }
        if (y !== undefined && y !== null) {
            el.setAttribute('data-gs-y', String(y));
        }
        if (width) {
            el.setAttribute('data-gs-width', String(width));
        }
        if (height) {
            el.setAttribute('data-gs-height', String(height));
        }
        return this;
    }
    /** @internal call to write any default attributes back to element */
    _writeAttr(el, node) {
        if (!node)
            return this;
        this._writeAttrs(el, node.x, node.y, node.width, node.height);
        if (node.autoPosition) {
            el.setAttribute('data-gs-auto-position', 'true');
        }
        else {
            el.removeAttribute('data-gs-auto-position');
        }
        if (node.minWidth) {
            el.setAttribute('data-gs-min-width', String(node.minWidth));
        }
        if (node.maxWidth) {
            el.setAttribute('data-gs-max-width', String(node.maxWidth));
        }
        if (node.minHeight) {
            el.setAttribute('data-gs-min-height', String(node.minHeight));
        }
        if (node.maxHeight) {
            el.setAttribute('data-gs-max-height', String(node.maxHeight));
        }
        if (node.noResize) {
            el.setAttribute('data-gs-no-resize', 'true');
        }
        else {
            el.removeAttribute('data-gs-no-resize');
        }
        if (node.noMove) {
            el.setAttribute('data-gs-no-move', 'true');
        }
        else {
            el.removeAttribute('data-gs-no-move');
        }
        if (node.locked) {
            el.setAttribute('data-gs-locked', 'true');
        }
        else {
            el.removeAttribute('data-gs-locked');
        }
        if (node.resizeHandles) {
            el.setAttribute('data-gs-resize-handles', node.resizeHandles);
        }
        if (node.id) {
            el.setAttribute('data-gs-id', String(node.id));
        }
        return this;
    }
    /** @internal call to read any default attributes from element */
    _readAttr(el, node = {}) {
        node.x = utils_1.Utils.toNumber(el.getAttribute('data-gs-x'));
        node.y = utils_1.Utils.toNumber(el.getAttribute('data-gs-y'));
        node.width = utils_1.Utils.toNumber(el.getAttribute('data-gs-width'));
        node.height = utils_1.Utils.toNumber(el.getAttribute('data-gs-height'));
        node.maxWidth = utils_1.Utils.toNumber(el.getAttribute('data-gs-max-width'));
        node.minWidth = utils_1.Utils.toNumber(el.getAttribute('data-gs-min-width'));
        node.maxHeight = utils_1.Utils.toNumber(el.getAttribute('data-gs-max-height'));
        node.minHeight = utils_1.Utils.toNumber(el.getAttribute('data-gs-min-height'));
        node.autoPosition = utils_1.Utils.toBool(el.getAttribute('data-gs-auto-position'));
        node.noResize = utils_1.Utils.toBool(el.getAttribute('data-gs-no-resize'));
        node.noMove = utils_1.Utils.toBool(el.getAttribute('data-gs-no-move'));
        node.locked = utils_1.Utils.toBool(el.getAttribute('data-gs-locked'));
        node.resizeHandles = el.getAttribute('data-gs-resize-handles');
        node.id = el.getAttribute('data-gs-id');
        return node;
    }
    /** @internal */
    _updateElement(els, callback) {
        let el = this.getElement(els);
        if (!el) {
            return this;
        }
        let node = el.gridstackNode;
        if (!node) {
            return this;
        }
        this.engine.cleanNodes();
        this.engine.beginUpdate(node);
        callback.call(this, el, node);
        this._updateContainerHeight();
        this._triggerChangeEvent();
        this.engine.endUpdate();
        return this;
    }
    /** @internal */
    _setStaticClass() {
        let staticClassName = 'grid-stack-static';
        if (this.opts.staticGrid === true) {
            this.el.classList.add(staticClassName);
        }
        else {
            this.el.classList.remove(staticClassName);
        }
        return this;
    }
    /**
     * @internal called when we are being resized - check if the one Column Mode needs to be turned on/off
     * and remember the prev columns we used.
     */
    _onResizeHandler() {
        // make the cells content (minus margin) square again
        if (this._isAutoCellHeight) {
            utils_1.Utils.throttle(() => {
                let marginDiff = -this.opts.marginRight - this.opts.marginLeft
                    + this.opts.marginTop + this.opts.marginBottom;
                this.cellHeight(this.cellWidth() + marginDiff);
            }, 100);
        }
        if (!this.opts.disableOneColumnMode && this.el.clientWidth <= this.opts.minWidth) {
            if (this._oneColumnMode) {
                return this;
            }
            this._oneColumnMode = true;
            this.column(1);
        }
        else {
            if (!this._oneColumnMode) {
                return this;
            }
            delete this._oneColumnMode;
            this.column(this._prevColumn);
        }
        return this;
    }
    /** @internal call to setup dragging in from the outside (say toolbar), with options */
    _setupDragIn() {
        if (!this.opts.staticGrid && typeof this.opts.dragIn === 'string') {
            if (!this.dd.isDraggable(this.opts.dragIn)) {
                this.dd.dragIn(this.opts.dragIn, this.opts.dragInOptions);
            }
        }
        return this;
    }
    /** @internal called to setup a trash drop zone if the user specifies it */
    _setupRemoveDrop() {
        if (!this.opts.staticGrid && typeof this.opts.removable === 'string') {
            let trashZone = document.querySelector(this.opts.removable);
            if (!trashZone)
                return this;
            if (!this.dd.isDroppable(trashZone)) {
                this.dd.droppable(trashZone, this.opts.removableOptions);
            }
            this.dd
                .on(trashZone, 'dropover', (event, el) => {
                let node = el.gridstackNode;
                if (!node || node.grid !== this)
                    return;
                el.dataset.inTrashZone = 'true';
                this._setupRemovingTimeout(el);
            })
                .on(trashZone, 'dropout', (event, el) => {
                let node = el.gridstackNode;
                if (!node || node.grid !== this)
                    return;
                delete el.dataset.inTrashZone;
                this._clearRemovingTimeout(el);
            });
        }
        return this;
    }
    /** @internal called to add drag over support to support widgets */
    _setupAcceptWidget() {
        if (this.opts.staticGrid || !this.opts.acceptWidgets)
            return this;
        let onDrag = (event, el) => {
            let node = el.gridstackNode;
            let pos = this.getCellFromPixel({ left: event.pageX, top: event.pageY }, true);
            let x = Math.max(0, pos.x);
            let y = Math.max(0, pos.y);
            if (!node._added) {
                node._added = true;
                node.el = el;
                node.x = x;
                node.y = y;
                delete node.autoPosition;
                this.engine.cleanNodes();
                this.engine.beginUpdate(node);
                this.engine.addNode(node);
                this._writeAttrs(this.placeholder, node.x, node.y, node.width, node.height);
                this.el.appendChild(this.placeholder);
                node.el = this.placeholder; // dom we update while dragging...
                node._beforeDragX = node.x;
                node._beforeDragY = node.y;
                this._updateContainerHeight();
            }
            else if ((x !== node.x || y !== node.y) && this.engine.canMoveNode(node, x, y)) {
                this.engine.moveNode(node, x, y);
                this._updateContainerHeight();
            }
        };
        this.dd
            .droppable(this.el, {
            accept: (el) => {
                let node = el.gridstackNode;
                if (node && node.grid === this) {
                    return false;
                }
                if (typeof this.opts.acceptWidgets === 'function') {
                    return this.opts.acceptWidgets(el);
                }
                let selector = (this.opts.acceptWidgets === true ? '.grid-stack-item' : this.opts.acceptWidgets);
                return el.matches(selector);
            }
        })
            .on(this.el, 'dropover', (event, el) => {
            let width, height;
            // see if we already have a node with widget/height and check for attributes
            let node = el.gridstackNode;
            if (!node || !node.width || !node.height) {
                let w = parseInt(el.getAttribute('data-gs-width'));
                if (w > 0) {
                    node = node || {};
                    node.width = w;
                }
                let h = parseInt(el.getAttribute('data-gs-height'));
                if (h > 0) {
                    node = node || {};
                    node.height = h;
                }
            }
            // if not calculate the grid size based on element outer size
            let cellWidth = this.cellWidth();
            let cellHeight = this.getCellHeight();
            width = node && node.width ? node.width : Math.ceil(el.offsetWidth / cellWidth);
            height = node && node.height ? node.height : Math.round(el.offsetHeight / cellHeight);
            let newNode = this.engine.prepareNode({ width, height, _added: false, _temporary: true });
            newNode._isOutOfGrid = true;
            el.gridstackNode = newNode;
            el._gridstackNodeOrig = node;
            this.dd.on(el, 'drag', onDrag);
            return false; // prevent parent from receiving msg (which may be grid as well)
        })
            .on(this.el, 'dropout', (event, el) => {
            // jquery-ui bug. Must verify widget is being dropped out
            // check node variable that gets set when widget is out of grid
            let node = el.gridstackNode;
            if (!node || !node._isOutOfGrid) {
                return;
            }
            this.dd.off(el, 'drag');
            node.el = null;
            this.engine.removeNode(node);
            if (this.placeholder.parentNode === this.el) {
                this.el.removeChild(this.placeholder);
            }
            this._updateContainerHeight();
            el.gridstackNode = el._gridstackNodeOrig;
            return false; // prevent parent from receiving msg (which may be grid as well)
        })
            .on(this.el, 'drop', (event, _el) => {
            if (this.placeholder.parentNode === this.el) {
                this.el.removeChild(this.placeholder);
            }
            let node = _el.gridstackNode;
            this.engine.cleanupNode(node);
            node.grid = this;
            let originalNode = _el._gridstackNodeOrig;
            delete _el.gridstackNode;
            delete _el._gridstackNodeOrig;
            this.dd
                .off(_el, 'drag')
                .draggable(_el, 'destroy')
                .resizable(_el, 'destroy');
            let el = _el.cloneNode(true);
            el.gridstackNode = node;
            if (originalNode && originalNode.grid) {
                originalNode.grid._triggerRemoveEvent();
            }
            _el.remove();
            node.el = el;
            utils_1.Utils.removePositioningStyles(el);
            this._writeAttr(el, node);
            this.el.appendChild(el);
            this._prepareElementsByNode(el, node);
            this._updateContainerHeight();
            this.engine.addedNodes.push(node);
            this._triggerAddEvent();
            this._triggerChangeEvent();
            this.engine.endUpdate();
            if (this._gsEventHandler['dropped']) {
                this._gsEventHandler['dropped']({ type: 'dropped' }, originalNode, node);
            }
            return false; // prevent parent from receiving msg (which may be grid as well)
        });
        return this;
    }
    /** @internal */
    getElement(els = '.grid-stack-item') {
        return (typeof els === 'string' ?
            (document.querySelector(els) || document.querySelector('#' + els) || document.querySelector('.' + els)) : els);
    }
    /** @internal */
    getElements(els = '.grid-stack-item') {
        if (typeof els === 'string') {
            let list = document.querySelectorAll(els);
            if (!list.length) {
                list = document.querySelectorAll('.' + els);
            }
            if (!list.length) {
                list = document.querySelectorAll('#' + els);
            }
            return Array.from(list);
        }
        return [els];
    }
    /** @internal */
    static getGridElement(els = '.grid-stack') {
        return (typeof els === 'string' ?
            (document.querySelector(els) || document.querySelector('#' + els) || document.querySelector('.' + els)) : els);
    }
    /** @internal */
    static getGridElements(els = '.grid-stack') {
        if (typeof els === 'string') {
            let list = document.querySelectorAll(els);
            if (!list.length) {
                list = document.querySelectorAll('.' + els);
            }
            if (!list.length) {
                list = document.querySelectorAll('#' + els);
            }
            return Array.from(list);
        }
        return [els];
    }
    /** @internal initialize margin top/bottom/left/right and units */
    initMargin() {
        let data = utils_1.Utils.parseHeight(this.opts.margin);
        this.opts.marginUnit = data.unit;
        let margin = this.opts.margin = data.height;
        // see if top/bottom/left/right need to be set as well
        if (this.opts.marginTop === undefined) {
            this.opts.marginTop = margin;
        }
        else {
            data = utils_1.Utils.parseHeight(this.opts.marginTop);
            this.opts.marginTop = data.height;
            delete this.opts.margin;
        }
        if (this.opts.marginBottom === undefined) {
            this.opts.marginBottom = margin;
        }
        else {
            data = utils_1.Utils.parseHeight(this.opts.marginBottom);
            this.opts.marginBottom = data.height;
            delete this.opts.margin;
        }
        if (this.opts.marginRight === undefined) {
            this.opts.marginRight = margin;
        }
        else {
            data = utils_1.Utils.parseHeight(this.opts.marginRight);
            this.opts.marginRight = data.height;
            delete this.opts.margin;
        }
        if (this.opts.marginLeft === undefined) {
            this.opts.marginLeft = margin;
        }
        else {
            data = utils_1.Utils.parseHeight(this.opts.marginLeft);
            this.opts.marginLeft = data.height;
            delete this.opts.margin;
        }
        this.opts.marginUnit = data.unit; // in case side were spelled out, use those units instead...
        return this;
    }
}
/** scoping so users can call GridStack.Utils.sort() for example */
GridStack.Utils = utils_1.Utils;
/** scoping so users can call new GridStack.Engine(12) for example */
GridStack.Engine = gridstack_engine_1.GridStackEngine;
exports.GridStack = GridStack;
//# sourceMappingURL=gridstack.js.map