var noop = {value: () => {}};

function dispatch() {
  for (var i = 0, n = arguments.length, _ = {}, t; i < n; ++i) {
    if (!(t = arguments[i] + "") || (t in _) || /[\s.]/.test(t)) throw new Error("illegal type: " + t);
    _[t] = [];
  }
  return new Dispatch(_);
}

function Dispatch(_) {
  this._ = _;
}

function parseTypenames$1(typenames, types) {
  return typenames.trim().split(/^|\s+/).map(function(t) {
    var name = "", i = t.indexOf(".");
    if (i >= 0) name = t.slice(i + 1), t = t.slice(0, i);
    if (t && !types.hasOwnProperty(t)) throw new Error("unknown type: " + t);
    return {type: t, name: name};
  });
}

Dispatch.prototype = dispatch.prototype = {
  constructor: Dispatch,
  on: function(typename, callback) {
    var _ = this._,
        T = parseTypenames$1(typename + "", _),
        t,
        i = -1,
        n = T.length;

    // If no callback was specified, return the callback of the given type and name.
    if (arguments.length < 2) {
      while (++i < n) if ((t = (typename = T[i]).type) && (t = get$1(_[t], typename.name))) return t;
      return;
    }

    // If a type was specified, set the callback for the given type and name.
    // Otherwise, if a null callback was specified, remove callbacks of the given name.
    if (callback != null && typeof callback !== "function") throw new Error("invalid callback: " + callback);
    while (++i < n) {
      if (t = (typename = T[i]).type) _[t] = set$1(_[t], typename.name, callback);
      else if (callback == null) for (t in _) _[t] = set$1(_[t], typename.name, null);
    }

    return this;
  },
  copy: function() {
    var copy = {}, _ = this._;
    for (var t in _) copy[t] = _[t].slice();
    return new Dispatch(copy);
  },
  call: function(type, that) {
    if ((n = arguments.length - 2) > 0) for (var args = new Array(n), i = 0, n, t; i < n; ++i) args[i] = arguments[i + 2];
    if (!this._.hasOwnProperty(type)) throw new Error("unknown type: " + type);
    for (t = this._[type], i = 0, n = t.length; i < n; ++i) t[i].value.apply(that, args);
  },
  apply: function(type, that, args) {
    if (!this._.hasOwnProperty(type)) throw new Error("unknown type: " + type);
    for (var t = this._[type], i = 0, n = t.length; i < n; ++i) t[i].value.apply(that, args);
  }
};

function get$1(type, name) {
  for (var i = 0, n = type.length, c; i < n; ++i) {
    if ((c = type[i]).name === name) {
      return c.value;
    }
  }
}

function set$1(type, name, callback) {
  for (var i = 0, n = type.length; i < n; ++i) {
    if (type[i].name === name) {
      type[i] = noop, type = type.slice(0, i).concat(type.slice(i + 1));
      break;
    }
  }
  if (callback != null) type.push({name: name, value: callback});
  return type;
}

var xhtml = "http://www.w3.org/1999/xhtml";

var namespaces = {
  svg: "http://www.w3.org/2000/svg",
  xhtml: xhtml,
  xlink: "http://www.w3.org/1999/xlink",
  xml: "http://www.w3.org/XML/1998/namespace",
  xmlns: "http://www.w3.org/2000/xmlns/"
};

function namespace(name) {
  var prefix = name += "", i = prefix.indexOf(":");
  if (i >= 0 && (prefix = name.slice(0, i)) !== "xmlns") name = name.slice(i + 1);
  return namespaces.hasOwnProperty(prefix) ? {space: namespaces[prefix], local: name} : name; // eslint-disable-line no-prototype-builtins
}

function creatorInherit(name) {
  return function() {
    var document = this.ownerDocument,
        uri = this.namespaceURI;
    return uri === xhtml && document.documentElement.namespaceURI === xhtml
        ? document.createElement(name)
        : document.createElementNS(uri, name);
  };
}

function creatorFixed(fullname) {
  return function() {
    return this.ownerDocument.createElementNS(fullname.space, fullname.local);
  };
}

function creator(name) {
  var fullname = namespace(name);
  return (fullname.local
      ? creatorFixed
      : creatorInherit)(fullname);
}

function none() {}

function selector(selector) {
  return selector == null ? none : function() {
    return this.querySelector(selector);
  };
}

function selection_select(select) {
  if (typeof select !== "function") select = selector(select);

  for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) {
    for (var group = groups[j], n = group.length, subgroup = subgroups[j] = new Array(n), node, subnode, i = 0; i < n; ++i) {
      if ((node = group[i]) && (subnode = select.call(node, node.__data__, i, group))) {
        if ("__data__" in node) subnode.__data__ = node.__data__;
        subgroup[i] = subnode;
      }
    }
  }

  return new Selection$1(subgroups, this._parents);
}

// Given something array like (or null), returns something that is strictly an
// array. This is used to ensure that array-like objects passed to d3.selectAll
// or selection.selectAll are converted into proper arrays when creating a
// selection; we don’t ever want to create a selection backed by a live
// HTMLCollection or NodeList. However, note that selection.selectAll will use a
// static NodeList as a group, since it safely derived from querySelectorAll.
function array(x) {
  return x == null ? [] : Array.isArray(x) ? x : Array.from(x);
}

function empty() {
  return [];
}

function selectorAll(selector) {
  return selector == null ? empty : function() {
    return this.querySelectorAll(selector);
  };
}

function arrayAll(select) {
  return function() {
    return array(select.apply(this, arguments));
  };
}

function selection_selectAll(select) {
  if (typeof select === "function") select = arrayAll(select);
  else select = selectorAll(select);

  for (var groups = this._groups, m = groups.length, subgroups = [], parents = [], j = 0; j < m; ++j) {
    for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) {
      if (node = group[i]) {
        subgroups.push(select.call(node, node.__data__, i, group));
        parents.push(node);
      }
    }
  }

  return new Selection$1(subgroups, parents);
}

function matcher(selector) {
  return function() {
    return this.matches(selector);
  };
}

function childMatcher(selector) {
  return function(node) {
    return node.matches(selector);
  };
}

var find = Array.prototype.find;

function childFind(match) {
  return function() {
    return find.call(this.children, match);
  };
}

function childFirst() {
  return this.firstElementChild;
}

function selection_selectChild(match) {
  return this.select(match == null ? childFirst
      : childFind(typeof match === "function" ? match : childMatcher(match)));
}

var filter = Array.prototype.filter;

function children() {
  return Array.from(this.children);
}

function childrenFilter(match) {
  return function() {
    return filter.call(this.children, match);
  };
}

function selection_selectChildren(match) {
  return this.selectAll(match == null ? children
      : childrenFilter(typeof match === "function" ? match : childMatcher(match)));
}

function selection_filter(match) {
  if (typeof match !== "function") match = matcher(match);

  for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) {
    for (var group = groups[j], n = group.length, subgroup = subgroups[j] = [], node, i = 0; i < n; ++i) {
      if ((node = group[i]) && match.call(node, node.__data__, i, group)) {
        subgroup.push(node);
      }
    }
  }

  return new Selection$1(subgroups, this._parents);
}

function sparse(update) {
  return new Array(update.length);
}

function selection_enter() {
  return new Selection$1(this._enter || this._groups.map(sparse), this._parents);
}

function EnterNode(parent, datum) {
  this.ownerDocument = parent.ownerDocument;
  this.namespaceURI = parent.namespaceURI;
  this._next = null;
  this._parent = parent;
  this.__data__ = datum;
}

EnterNode.prototype = {
  constructor: EnterNode,
  appendChild: function(child) { return this._parent.insertBefore(child, this._next); },
  insertBefore: function(child, next) { return this._parent.insertBefore(child, next); },
  querySelector: function(selector) { return this._parent.querySelector(selector); },
  querySelectorAll: function(selector) { return this._parent.querySelectorAll(selector); }
};

function constant$3(x) {
  return function() {
    return x;
  };
}

function bindIndex(parent, group, enter, update, exit, data) {
  var i = 0,
      node,
      groupLength = group.length,
      dataLength = data.length;

  // Put any non-null nodes that fit into update.
  // Put any null nodes into enter.
  // Put any remaining data into enter.
  for (; i < dataLength; ++i) {
    if (node = group[i]) {
      node.__data__ = data[i];
      update[i] = node;
    } else {
      enter[i] = new EnterNode(parent, data[i]);
    }
  }

  // Put any non-null nodes that don’t fit into exit.
  for (; i < groupLength; ++i) {
    if (node = group[i]) {
      exit[i] = node;
    }
  }
}

function bindKey(parent, group, enter, update, exit, data, key) {
  var i,
      node,
      nodeByKeyValue = new Map,
      groupLength = group.length,
      dataLength = data.length,
      keyValues = new Array(groupLength),
      keyValue;

  // Compute the key for each node.
  // If multiple nodes have the same key, the duplicates are added to exit.
  for (i = 0; i < groupLength; ++i) {
    if (node = group[i]) {
      keyValues[i] = keyValue = key.call(node, node.__data__, i, group) + "";
      if (nodeByKeyValue.has(keyValue)) {
        exit[i] = node;
      } else {
        nodeByKeyValue.set(keyValue, node);
      }
    }
  }

  // Compute the key for each datum.
  // If there a node associated with this key, join and add it to update.
  // If there is not (or the key is a duplicate), add it to enter.
  for (i = 0; i < dataLength; ++i) {
    keyValue = key.call(parent, data[i], i, data) + "";
    if (node = nodeByKeyValue.get(keyValue)) {
      update[i] = node;
      node.__data__ = data[i];
      nodeByKeyValue.delete(keyValue);
    } else {
      enter[i] = new EnterNode(parent, data[i]);
    }
  }

  // Add any remaining nodes that were not bound to data to exit.
  for (i = 0; i < groupLength; ++i) {
    if ((node = group[i]) && (nodeByKeyValue.get(keyValues[i]) === node)) {
      exit[i] = node;
    }
  }
}

function datum(node) {
  return node.__data__;
}

function selection_data(value, key) {
  if (!arguments.length) return Array.from(this, datum);

  var bind = key ? bindKey : bindIndex,
      parents = this._parents,
      groups = this._groups;

  if (typeof value !== "function") value = constant$3(value);

  for (var m = groups.length, update = new Array(m), enter = new Array(m), exit = new Array(m), j = 0; j < m; ++j) {
    var parent = parents[j],
        group = groups[j],
        groupLength = group.length,
        data = arraylike(value.call(parent, parent && parent.__data__, j, parents)),
        dataLength = data.length,
        enterGroup = enter[j] = new Array(dataLength),
        updateGroup = update[j] = new Array(dataLength),
        exitGroup = exit[j] = new Array(groupLength);

    bind(parent, group, enterGroup, updateGroup, exitGroup, data, key);

    // Now connect the enter nodes to their following update node, such that
    // appendChild can insert the materialized enter node before this node,
    // rather than at the end of the parent node.
    for (var i0 = 0, i1 = 0, previous, next; i0 < dataLength; ++i0) {
      if (previous = enterGroup[i0]) {
        if (i0 >= i1) i1 = i0 + 1;
        while (!(next = updateGroup[i1]) && ++i1 < dataLength);
        previous._next = next || null;
      }
    }
  }

  update = new Selection$1(update, parents);
  update._enter = enter;
  update._exit = exit;
  return update;
}

// Given some data, this returns an array-like view of it: an object that
// exposes a length property and allows numeric indexing. Note that unlike
// selectAll, this isn’t worried about “live” collections because the resulting
// array will only be used briefly while data is being bound. (It is possible to
// cause the data to change while iterating by using a key function, but please
// don’t; we’d rather avoid a gratuitous copy.)
function arraylike(data) {
  return typeof data === "object" && "length" in data
    ? data // Array, TypedArray, NodeList, array-like
    : Array.from(data); // Map, Set, iterable, string, or anything else
}

function selection_exit() {
  return new Selection$1(this._exit || this._groups.map(sparse), this._parents);
}

function selection_join(onenter, onupdate, onexit) {
  var enter = this.enter(), update = this, exit = this.exit();
  if (typeof onenter === "function") {
    enter = onenter(enter);
    if (enter) enter = enter.selection();
  } else {
    enter = enter.append(onenter + "");
  }
  if (onupdate != null) {
    update = onupdate(update);
    if (update) update = update.selection();
  }
  if (onexit == null) exit.remove(); else onexit(exit);
  return enter && update ? enter.merge(update).order() : update;
}

function selection_merge(context) {
  var selection = context.selection ? context.selection() : context;

  for (var groups0 = this._groups, groups1 = selection._groups, m0 = groups0.length, m1 = groups1.length, m = Math.min(m0, m1), merges = new Array(m0), j = 0; j < m; ++j) {
    for (var group0 = groups0[j], group1 = groups1[j], n = group0.length, merge = merges[j] = new Array(n), node, i = 0; i < n; ++i) {
      if (node = group0[i] || group1[i]) {
        merge[i] = node;
      }
    }
  }

  for (; j < m0; ++j) {
    merges[j] = groups0[j];
  }

  return new Selection$1(merges, this._parents);
}

function selection_order() {

  for (var groups = this._groups, j = -1, m = groups.length; ++j < m;) {
    for (var group = groups[j], i = group.length - 1, next = group[i], node; --i >= 0;) {
      if (node = group[i]) {
        if (next && node.compareDocumentPosition(next) ^ 4) next.parentNode.insertBefore(node, next);
        next = node;
      }
    }
  }

  return this;
}

function selection_sort(compare) {
  if (!compare) compare = ascending;

  function compareNode(a, b) {
    return a && b ? compare(a.__data__, b.__data__) : !a - !b;
  }

  for (var groups = this._groups, m = groups.length, sortgroups = new Array(m), j = 0; j < m; ++j) {
    for (var group = groups[j], n = group.length, sortgroup = sortgroups[j] = new Array(n), node, i = 0; i < n; ++i) {
      if (node = group[i]) {
        sortgroup[i] = node;
      }
    }
    sortgroup.sort(compareNode);
  }

  return new Selection$1(sortgroups, this._parents).order();
}

function ascending(a, b) {
  return a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN;
}

function selection_call() {
  var callback = arguments[0];
  arguments[0] = this;
  callback.apply(null, arguments);
  return this;
}

function selection_nodes() {
  return Array.from(this);
}

function selection_node() {

  for (var groups = this._groups, j = 0, m = groups.length; j < m; ++j) {
    for (var group = groups[j], i = 0, n = group.length; i < n; ++i) {
      var node = group[i];
      if (node) return node;
    }
  }

  return null;
}

function selection_size() {
  let size = 0;
  for (const node of this) ++size; // eslint-disable-line no-unused-vars
  return size;
}

function selection_empty() {
  return !this.node();
}

function selection_each(callback) {

  for (var groups = this._groups, j = 0, m = groups.length; j < m; ++j) {
    for (var group = groups[j], i = 0, n = group.length, node; i < n; ++i) {
      if (node = group[i]) callback.call(node, node.__data__, i, group);
    }
  }

  return this;
}

function attrRemove$1(name) {
  return function() {
    this.removeAttribute(name);
  };
}

function attrRemoveNS$1(fullname) {
  return function() {
    this.removeAttributeNS(fullname.space, fullname.local);
  };
}

function attrConstant$1(name, value) {
  return function() {
    this.setAttribute(name, value);
  };
}

function attrConstantNS$1(fullname, value) {
  return function() {
    this.setAttributeNS(fullname.space, fullname.local, value);
  };
}

function attrFunction$1(name, value) {
  return function() {
    var v = value.apply(this, arguments);
    if (v == null) this.removeAttribute(name);
    else this.setAttribute(name, v);
  };
}

function attrFunctionNS$1(fullname, value) {
  return function() {
    var v = value.apply(this, arguments);
    if (v == null) this.removeAttributeNS(fullname.space, fullname.local);
    else this.setAttributeNS(fullname.space, fullname.local, v);
  };
}

function selection_attr(name, value) {
  var fullname = namespace(name);

  if (arguments.length < 2) {
    var node = this.node();
    return fullname.local
        ? node.getAttributeNS(fullname.space, fullname.local)
        : node.getAttribute(fullname);
  }

  return this.each((value == null
      ? (fullname.local ? attrRemoveNS$1 : attrRemove$1) : (typeof value === "function"
      ? (fullname.local ? attrFunctionNS$1 : attrFunction$1)
      : (fullname.local ? attrConstantNS$1 : attrConstant$1)))(fullname, value));
}

function defaultView(node) {
  return (node.ownerDocument && node.ownerDocument.defaultView) // node is a Node
      || (node.document && node) // node is a Window
      || node.defaultView; // node is a Document
}

function styleRemove$1(name) {
  return function() {
    this.style.removeProperty(name);
  };
}

function styleConstant$1(name, value, priority) {
  return function() {
    this.style.setProperty(name, value, priority);
  };
}

function styleFunction$1(name, value, priority) {
  return function() {
    var v = value.apply(this, arguments);
    if (v == null) this.style.removeProperty(name);
    else this.style.setProperty(name, v, priority);
  };
}

function selection_style(name, value, priority) {
  return arguments.length > 1
      ? this.each((value == null
            ? styleRemove$1 : typeof value === "function"
            ? styleFunction$1
            : styleConstant$1)(name, value, priority == null ? "" : priority))
      : styleValue(this.node(), name);
}

function styleValue(node, name) {
  return node.style.getPropertyValue(name)
      || defaultView(node).getComputedStyle(node, null).getPropertyValue(name);
}

function propertyRemove(name) {
  return function() {
    delete this[name];
  };
}

function propertyConstant(name, value) {
  return function() {
    this[name] = value;
  };
}

function propertyFunction(name, value) {
  return function() {
    var v = value.apply(this, arguments);
    if (v == null) delete this[name];
    else this[name] = v;
  };
}

function selection_property(name, value) {
  return arguments.length > 1
      ? this.each((value == null
          ? propertyRemove : typeof value === "function"
          ? propertyFunction
          : propertyConstant)(name, value))
      : this.node()[name];
}

function classArray(string) {
  return string.trim().split(/^|\s+/);
}

function classList(node) {
  return node.classList || new ClassList(node);
}

function ClassList(node) {
  this._node = node;
  this._names = classArray(node.getAttribute("class") || "");
}

ClassList.prototype = {
  add: function(name) {
    var i = this._names.indexOf(name);
    if (i < 0) {
      this._names.push(name);
      this._node.setAttribute("class", this._names.join(" "));
    }
  },
  remove: function(name) {
    var i = this._names.indexOf(name);
    if (i >= 0) {
      this._names.splice(i, 1);
      this._node.setAttribute("class", this._names.join(" "));
    }
  },
  contains: function(name) {
    return this._names.indexOf(name) >= 0;
  }
};

function classedAdd(node, names) {
  var list = classList(node), i = -1, n = names.length;
  while (++i < n) list.add(names[i]);
}

function classedRemove(node, names) {
  var list = classList(node), i = -1, n = names.length;
  while (++i < n) list.remove(names[i]);
}

function classedTrue(names) {
  return function() {
    classedAdd(this, names);
  };
}

function classedFalse(names) {
  return function() {
    classedRemove(this, names);
  };
}

function classedFunction(names, value) {
  return function() {
    (value.apply(this, arguments) ? classedAdd : classedRemove)(this, names);
  };
}

function selection_classed(name, value) {
  var names = classArray(name + "");

  if (arguments.length < 2) {
    var list = classList(this.node()), i = -1, n = names.length;
    while (++i < n) if (!list.contains(names[i])) return false;
    return true;
  }

  return this.each((typeof value === "function"
      ? classedFunction : value
      ? classedTrue
      : classedFalse)(names, value));
}

function textRemove() {
  this.textContent = "";
}

function textConstant$1(value) {
  return function() {
    this.textContent = value;
  };
}

function textFunction$1(value) {
  return function() {
    var v = value.apply(this, arguments);
    this.textContent = v == null ? "" : v;
  };
}

function selection_text(value) {
  return arguments.length
      ? this.each(value == null
          ? textRemove : (typeof value === "function"
          ? textFunction$1
          : textConstant$1)(value))
      : this.node().textContent;
}

function htmlRemove() {
  this.innerHTML = "";
}

function htmlConstant(value) {
  return function() {
    this.innerHTML = value;
  };
}

function htmlFunction(value) {
  return function() {
    var v = value.apply(this, arguments);
    this.innerHTML = v == null ? "" : v;
  };
}

function selection_html(value) {
  return arguments.length
      ? this.each(value == null
          ? htmlRemove : (typeof value === "function"
          ? htmlFunction
          : htmlConstant)(value))
      : this.node().innerHTML;
}

function raise() {
  if (this.nextSibling) this.parentNode.appendChild(this);
}

function selection_raise() {
  return this.each(raise);
}

function lower() {
  if (this.previousSibling) this.parentNode.insertBefore(this, this.parentNode.firstChild);
}

function selection_lower() {
  return this.each(lower);
}

function selection_append(name) {
  var create = typeof name === "function" ? name : creator(name);
  return this.select(function() {
    return this.appendChild(create.apply(this, arguments));
  });
}

function constantNull() {
  return null;
}

function selection_insert(name, before) {
  var create = typeof name === "function" ? name : creator(name),
      select = before == null ? constantNull : typeof before === "function" ? before : selector(before);
  return this.select(function() {
    return this.insertBefore(create.apply(this, arguments), select.apply(this, arguments) || null);
  });
}

function remove() {
  var parent = this.parentNode;
  if (parent) parent.removeChild(this);
}

function selection_remove() {
  return this.each(remove);
}

function selection_cloneShallow() {
  var clone = this.cloneNode(false), parent = this.parentNode;
  return parent ? parent.insertBefore(clone, this.nextSibling) : clone;
}

function selection_cloneDeep() {
  var clone = this.cloneNode(true), parent = this.parentNode;
  return parent ? parent.insertBefore(clone, this.nextSibling) : clone;
}

function selection_clone(deep) {
  return this.select(deep ? selection_cloneDeep : selection_cloneShallow);
}

function selection_datum(value) {
  return arguments.length
      ? this.property("__data__", value)
      : this.node().__data__;
}

function contextListener(listener) {
  return function(event) {
    listener.call(this, event, this.__data__);
  };
}

function parseTypenames(typenames) {
  return typenames.trim().split(/^|\s+/).map(function(t) {
    var name = "", i = t.indexOf(".");
    if (i >= 0) name = t.slice(i + 1), t = t.slice(0, i);
    return {type: t, name: name};
  });
}

function onRemove(typename) {
  return function() {
    var on = this.__on;
    if (!on) return;
    for (var j = 0, i = -1, m = on.length, o; j < m; ++j) {
      if (o = on[j], (!typename.type || o.type === typename.type) && o.name === typename.name) {
        this.removeEventListener(o.type, o.listener, o.options);
      } else {
        on[++i] = o;
      }
    }
    if (++i) on.length = i;
    else delete this.__on;
  };
}

function onAdd(typename, value, options) {
  return function() {
    var on = this.__on, o, listener = contextListener(value);
    if (on) for (var j = 0, m = on.length; j < m; ++j) {
      if ((o = on[j]).type === typename.type && o.name === typename.name) {
        this.removeEventListener(o.type, o.listener, o.options);
        this.addEventListener(o.type, o.listener = listener, o.options = options);
        o.value = value;
        return;
      }
    }
    this.addEventListener(typename.type, listener, options);
    o = {type: typename.type, name: typename.name, value: value, listener: listener, options: options};
    if (!on) this.__on = [o];
    else on.push(o);
  };
}

function selection_on(typename, value, options) {
  var typenames = parseTypenames(typename + ""), i, n = typenames.length, t;

  if (arguments.length < 2) {
    var on = this.node().__on;
    if (on) for (var j = 0, m = on.length, o; j < m; ++j) {
      for (i = 0, o = on[j]; i < n; ++i) {
        if ((t = typenames[i]).type === o.type && t.name === o.name) {
          return o.value;
        }
      }
    }
    return;
  }

  on = value ? onAdd : onRemove;
  for (i = 0; i < n; ++i) this.each(on(typenames[i], value, options));
  return this;
}

function dispatchEvent(node, type, params) {
  var window = defaultView(node),
      event = window.CustomEvent;

  if (typeof event === "function") {
    event = new event(type, params);
  } else {
    event = window.document.createEvent("Event");
    if (params) event.initEvent(type, params.bubbles, params.cancelable), event.detail = params.detail;
    else event.initEvent(type, false, false);
  }

  node.dispatchEvent(event);
}

function dispatchConstant(type, params) {
  return function() {
    return dispatchEvent(this, type, params);
  };
}

function dispatchFunction(type, params) {
  return function() {
    return dispatchEvent(this, type, params.apply(this, arguments));
  };
}

function selection_dispatch(type, params) {
  return this.each((typeof params === "function"
      ? dispatchFunction
      : dispatchConstant)(type, params));
}

function* selection_iterator() {
  for (var groups = this._groups, j = 0, m = groups.length; j < m; ++j) {
    for (var group = groups[j], i = 0, n = group.length, node; i < n; ++i) {
      if (node = group[i]) yield node;
    }
  }
}

var root = [null];

function Selection$1(groups, parents) {
  this._groups = groups;
  this._parents = parents;
}

function selection() {
  return new Selection$1([[document.documentElement]], root);
}

function selection_selection() {
  return this;
}

Selection$1.prototype = selection.prototype = {
  constructor: Selection$1,
  select: selection_select,
  selectAll: selection_selectAll,
  selectChild: selection_selectChild,
  selectChildren: selection_selectChildren,
  filter: selection_filter,
  data: selection_data,
  enter: selection_enter,
  exit: selection_exit,
  join: selection_join,
  merge: selection_merge,
  selection: selection_selection,
  order: selection_order,
  sort: selection_sort,
  call: selection_call,
  nodes: selection_nodes,
  node: selection_node,
  size: selection_size,
  empty: selection_empty,
  each: selection_each,
  attr: selection_attr,
  style: selection_style,
  property: selection_property,
  classed: selection_classed,
  text: selection_text,
  html: selection_html,
  raise: selection_raise,
  lower: selection_lower,
  append: selection_append,
  insert: selection_insert,
  remove: selection_remove,
  clone: selection_clone,
  datum: selection_datum,
  on: selection_on,
  dispatch: selection_dispatch,
  [Symbol.iterator]: selection_iterator
};

function select(selector) {
  return typeof selector === "string"
      ? new Selection$1([[document.querySelector(selector)]], [document.documentElement])
      : new Selection$1([[selector]], root);
}

function sourceEvent(event) {
  let sourceEvent;
  while (sourceEvent = event.sourceEvent) event = sourceEvent;
  return event;
}

function pointer(event, node) {
  event = sourceEvent(event);
  if (node === undefined) node = event.currentTarget;
  if (node) {
    var svg = node.ownerSVGElement || node;
    if (svg.createSVGPoint) {
      var point = svg.createSVGPoint();
      point.x = event.clientX, point.y = event.clientY;
      point = point.matrixTransform(node.getScreenCTM().inverse());
      return [point.x, point.y];
    }
    if (node.getBoundingClientRect) {
      var rect = node.getBoundingClientRect();
      return [event.clientX - rect.left - node.clientLeft, event.clientY - rect.top - node.clientTop];
    }
  }
  return [event.pageX, event.pageY];
}

function selectAll(selector) {
  return typeof selector === "string"
      ? new Selection$1([document.querySelectorAll(selector)], [document.documentElement])
      : new Selection$1([array(selector)], root);
}

// These are typically used in conjunction with noevent to ensure that we can
// preventDefault on the event.
const nonpassive = {passive: false};
const nonpassivecapture = {capture: true, passive: false};

function nopropagation$1(event) {
  event.stopImmediatePropagation();
}

function noevent$1(event) {
  event.preventDefault();
  event.stopImmediatePropagation();
}

function dragDisable(view) {
  var root = view.document.documentElement,
      selection = select(view).on("dragstart.drag", noevent$1, nonpassivecapture);
  if ("onselectstart" in root) {
    selection.on("selectstart.drag", noevent$1, nonpassivecapture);
  } else {
    root.__noselect = root.style.MozUserSelect;
    root.style.MozUserSelect = "none";
  }
}

function yesdrag(view, noclick) {
  var root = view.document.documentElement,
      selection = select(view).on("dragstart.drag", null);
  if (noclick) {
    selection.on("click.drag", noevent$1, nonpassivecapture);
    setTimeout(function() { selection.on("click.drag", null); }, 0);
  }
  if ("onselectstart" in root) {
    selection.on("selectstart.drag", null);
  } else {
    root.style.MozUserSelect = root.__noselect;
    delete root.__noselect;
  }
}

var constant$2 = x => () => x;

function DragEvent(type, {
  sourceEvent,
  subject,
  target,
  identifier,
  active,
  x, y, dx, dy,
  dispatch
}) {
  Object.defineProperties(this, {
    type: {value: type, enumerable: true, configurable: true},
    sourceEvent: {value: sourceEvent, enumerable: true, configurable: true},
    subject: {value: subject, enumerable: true, configurable: true},
    target: {value: target, enumerable: true, configurable: true},
    identifier: {value: identifier, enumerable: true, configurable: true},
    active: {value: active, enumerable: true, configurable: true},
    x: {value: x, enumerable: true, configurable: true},
    y: {value: y, enumerable: true, configurable: true},
    dx: {value: dx, enumerable: true, configurable: true},
    dy: {value: dy, enumerable: true, configurable: true},
    _: {value: dispatch}
  });
}

DragEvent.prototype.on = function() {
  var value = this._.on.apply(this._, arguments);
  return value === this._ ? this : value;
};

// Ignore right-click, since that should open the context menu.
function defaultFilter$1(event) {
  return !event.ctrlKey && !event.button;
}

function defaultContainer() {
  return this.parentNode;
}

function defaultSubject(event, d) {
  return d == null ? {x: event.x, y: event.y} : d;
}

function defaultTouchable$1() {
  return navigator.maxTouchPoints || ("ontouchstart" in this);
}

function drag() {
  var filter = defaultFilter$1,
      container = defaultContainer,
      subject = defaultSubject,
      touchable = defaultTouchable$1,
      gestures = {},
      listeners = dispatch("start", "drag", "end"),
      active = 0,
      mousedownx,
      mousedowny,
      mousemoving,
      touchending,
      clickDistance2 = 0;

  function drag(selection) {
    selection
        .on("mousedown.drag", mousedowned)
      .filter(touchable)
        .on("touchstart.drag", touchstarted)
        .on("touchmove.drag", touchmoved, nonpassive)
        .on("touchend.drag touchcancel.drag", touchended)
        .style("touch-action", "none")
        .style("-webkit-tap-highlight-color", "rgba(0,0,0,0)");
  }

  function mousedowned(event, d) {
    if (touchending || !filter.call(this, event, d)) return;
    var gesture = beforestart(this, container.call(this, event, d), event, d, "mouse");
    if (!gesture) return;
    select(event.view)
      .on("mousemove.drag", mousemoved, nonpassivecapture)
      .on("mouseup.drag", mouseupped, nonpassivecapture);
    dragDisable(event.view);
    nopropagation$1(event);
    mousemoving = false;
    mousedownx = event.clientX;
    mousedowny = event.clientY;
    gesture("start", event);
  }

  function mousemoved(event) {
    noevent$1(event);
    if (!mousemoving) {
      var dx = event.clientX - mousedownx, dy = event.clientY - mousedowny;
      mousemoving = dx * dx + dy * dy > clickDistance2;
    }
    gestures.mouse("drag", event);
  }

  function mouseupped(event) {
    select(event.view).on("mousemove.drag mouseup.drag", null);
    yesdrag(event.view, mousemoving);
    noevent$1(event);
    gestures.mouse("end", event);
  }

  function touchstarted(event, d) {
    if (!filter.call(this, event, d)) return;
    var touches = event.changedTouches,
        c = container.call(this, event, d),
        n = touches.length, i, gesture;

    for (i = 0; i < n; ++i) {
      if (gesture = beforestart(this, c, event, d, touches[i].identifier, touches[i])) {
        nopropagation$1(event);
        gesture("start", event, touches[i]);
      }
    }
  }

  function touchmoved(event) {
    var touches = event.changedTouches,
        n = touches.length, i, gesture;

    for (i = 0; i < n; ++i) {
      if (gesture = gestures[touches[i].identifier]) {
        noevent$1(event);
        gesture("drag", event, touches[i]);
      }
    }
  }

  function touchended(event) {
    var touches = event.changedTouches,
        n = touches.length, i, gesture;

    if (touchending) clearTimeout(touchending);
    touchending = setTimeout(function() { touchending = null; }, 500); // Ghost clicks are delayed!
    for (i = 0; i < n; ++i) {
      if (gesture = gestures[touches[i].identifier]) {
        nopropagation$1(event);
        gesture("end", event, touches[i]);
      }
    }
  }

  function beforestart(that, container, event, d, identifier, touch) {
    var dispatch = listeners.copy(),
        p = pointer(touch || event, container), dx, dy,
        s;

    if ((s = subject.call(that, new DragEvent("beforestart", {
        sourceEvent: event,
        target: drag,
        identifier,
        active,
        x: p[0],
        y: p[1],
        dx: 0,
        dy: 0,
        dispatch
      }), d)) == null) return;

    dx = s.x - p[0] || 0;
    dy = s.y - p[1] || 0;

    return function gesture(type, event, touch) {
      var p0 = p, n;
      switch (type) {
        case "start": gestures[identifier] = gesture, n = active++; break;
        case "end": delete gestures[identifier], --active; // falls through
        case "drag": p = pointer(touch || event, container), n = active; break;
      }
      dispatch.call(
        type,
        that,
        new DragEvent(type, {
          sourceEvent: event,
          subject: s,
          target: drag,
          identifier,
          active: n,
          x: p[0] + dx,
          y: p[1] + dy,
          dx: p[0] - p0[0],
          dy: p[1] - p0[1],
          dispatch
        }),
        d
      );
    };
  }

  drag.filter = function(_) {
    return arguments.length ? (filter = typeof _ === "function" ? _ : constant$2(!!_), drag) : filter;
  };

  drag.container = function(_) {
    return arguments.length ? (container = typeof _ === "function" ? _ : constant$2(_), drag) : container;
  };

  drag.subject = function(_) {
    return arguments.length ? (subject = typeof _ === "function" ? _ : constant$2(_), drag) : subject;
  };

  drag.touchable = function(_) {
    return arguments.length ? (touchable = typeof _ === "function" ? _ : constant$2(!!_), drag) : touchable;
  };

  drag.on = function() {
    var value = listeners.on.apply(listeners, arguments);
    return value === listeners ? drag : value;
  };

  drag.clickDistance = function(_) {
    return arguments.length ? (clickDistance2 = (_ = +_) * _, drag) : Math.sqrt(clickDistance2);
  };

  return drag;
}

function define(constructor, factory, prototype) {
  constructor.prototype = factory.prototype = prototype;
  prototype.constructor = constructor;
}

function extend(parent, definition) {
  var prototype = Object.create(parent.prototype);
  for (var key in definition) prototype[key] = definition[key];
  return prototype;
}

function Color() {}

var darker = 0.7;
var brighter = 1 / darker;

var reI = "\\s*([+-]?\\d+)\\s*",
    reN = "\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)\\s*",
    reP = "\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)%\\s*",
    reHex = /^#([0-9a-f]{3,8})$/,
    reRgbInteger = new RegExp(`^rgb\\(${reI},${reI},${reI}\\)$`),
    reRgbPercent = new RegExp(`^rgb\\(${reP},${reP},${reP}\\)$`),
    reRgbaInteger = new RegExp(`^rgba\\(${reI},${reI},${reI},${reN}\\)$`),
    reRgbaPercent = new RegExp(`^rgba\\(${reP},${reP},${reP},${reN}\\)$`),
    reHslPercent = new RegExp(`^hsl\\(${reN},${reP},${reP}\\)$`),
    reHslaPercent = new RegExp(`^hsla\\(${reN},${reP},${reP},${reN}\\)$`);

var named = {
  aliceblue: 0xf0f8ff,
  antiquewhite: 0xfaebd7,
  aqua: 0x00ffff,
  aquamarine: 0x7fffd4,
  azure: 0xf0ffff,
  beige: 0xf5f5dc,
  bisque: 0xffe4c4,
  black: 0x000000,
  blanchedalmond: 0xffebcd,
  blue: 0x0000ff,
  blueviolet: 0x8a2be2,
  brown: 0xa52a2a,
  burlywood: 0xdeb887,
  cadetblue: 0x5f9ea0,
  chartreuse: 0x7fff00,
  chocolate: 0xd2691e,
  coral: 0xff7f50,
  cornflowerblue: 0x6495ed,
  cornsilk: 0xfff8dc,
  crimson: 0xdc143c,
  cyan: 0x00ffff,
  darkblue: 0x00008b,
  darkcyan: 0x008b8b,
  darkgoldenrod: 0xb8860b,
  darkgray: 0xa9a9a9,
  darkgreen: 0x006400,
  darkgrey: 0xa9a9a9,
  darkkhaki: 0xbdb76b,
  darkmagenta: 0x8b008b,
  darkolivegreen: 0x556b2f,
  darkorange: 0xff8c00,
  darkorchid: 0x9932cc,
  darkred: 0x8b0000,
  darksalmon: 0xe9967a,
  darkseagreen: 0x8fbc8f,
  darkslateblue: 0x483d8b,
  darkslategray: 0x2f4f4f,
  darkslategrey: 0x2f4f4f,
  darkturquoise: 0x00ced1,
  darkviolet: 0x9400d3,
  deeppink: 0xff1493,
  deepskyblue: 0x00bfff,
  dimgray: 0x696969,
  dimgrey: 0x696969,
  dodgerblue: 0x1e90ff,
  firebrick: 0xb22222,
  floralwhite: 0xfffaf0,
  forestgreen: 0x228b22,
  fuchsia: 0xff00ff,
  gainsboro: 0xdcdcdc,
  ghostwhite: 0xf8f8ff,
  gold: 0xffd700,
  goldenrod: 0xdaa520,
  gray: 0x808080,
  green: 0x008000,
  greenyellow: 0xadff2f,
  grey: 0x808080,
  honeydew: 0xf0fff0,
  hotpink: 0xff69b4,
  indianred: 0xcd5c5c,
  indigo: 0x4b0082,
  ivory: 0xfffff0,
  khaki: 0xf0e68c,
  lavender: 0xe6e6fa,
  lavenderblush: 0xfff0f5,
  lawngreen: 0x7cfc00,
  lemonchiffon: 0xfffacd,
  lightblue: 0xadd8e6,
  lightcoral: 0xf08080,
  lightcyan: 0xe0ffff,
  lightgoldenrodyellow: 0xfafad2,
  lightgray: 0xd3d3d3,
  lightgreen: 0x90ee90,
  lightgrey: 0xd3d3d3,
  lightpink: 0xffb6c1,
  lightsalmon: 0xffa07a,
  lightseagreen: 0x20b2aa,
  lightskyblue: 0x87cefa,
  lightslategray: 0x778899,
  lightslategrey: 0x778899,
  lightsteelblue: 0xb0c4de,
  lightyellow: 0xffffe0,
  lime: 0x00ff00,
  limegreen: 0x32cd32,
  linen: 0xfaf0e6,
  magenta: 0xff00ff,
  maroon: 0x800000,
  mediumaquamarine: 0x66cdaa,
  mediumblue: 0x0000cd,
  mediumorchid: 0xba55d3,
  mediumpurple: 0x9370db,
  mediumseagreen: 0x3cb371,
  mediumslateblue: 0x7b68ee,
  mediumspringgreen: 0x00fa9a,
  mediumturquoise: 0x48d1cc,
  mediumvioletred: 0xc71585,
  midnightblue: 0x191970,
  mintcream: 0xf5fffa,
  mistyrose: 0xffe4e1,
  moccasin: 0xffe4b5,
  navajowhite: 0xffdead,
  navy: 0x000080,
  oldlace: 0xfdf5e6,
  olive: 0x808000,
  olivedrab: 0x6b8e23,
  orange: 0xffa500,
  orangered: 0xff4500,
  orchid: 0xda70d6,
  palegoldenrod: 0xeee8aa,
  palegreen: 0x98fb98,
  paleturquoise: 0xafeeee,
  palevioletred: 0xdb7093,
  papayawhip: 0xffefd5,
  peachpuff: 0xffdab9,
  peru: 0xcd853f,
  pink: 0xffc0cb,
  plum: 0xdda0dd,
  powderblue: 0xb0e0e6,
  purple: 0x800080,
  rebeccapurple: 0x663399,
  red: 0xff0000,
  rosybrown: 0xbc8f8f,
  royalblue: 0x4169e1,
  saddlebrown: 0x8b4513,
  salmon: 0xfa8072,
  sandybrown: 0xf4a460,
  seagreen: 0x2e8b57,
  seashell: 0xfff5ee,
  sienna: 0xa0522d,
  silver: 0xc0c0c0,
  skyblue: 0x87ceeb,
  slateblue: 0x6a5acd,
  slategray: 0x708090,
  slategrey: 0x708090,
  snow: 0xfffafa,
  springgreen: 0x00ff7f,
  steelblue: 0x4682b4,
  tan: 0xd2b48c,
  teal: 0x008080,
  thistle: 0xd8bfd8,
  tomato: 0xff6347,
  turquoise: 0x40e0d0,
  violet: 0xee82ee,
  wheat: 0xf5deb3,
  white: 0xffffff,
  whitesmoke: 0xf5f5f5,
  yellow: 0xffff00,
  yellowgreen: 0x9acd32
};

define(Color, color, {
  copy(channels) {
    return Object.assign(new this.constructor, this, channels);
  },
  displayable() {
    return this.rgb().displayable();
  },
  hex: color_formatHex, // Deprecated! Use color.formatHex.
  formatHex: color_formatHex,
  formatHex8: color_formatHex8,
  formatHsl: color_formatHsl,
  formatRgb: color_formatRgb,
  toString: color_formatRgb
});

function color_formatHex() {
  return this.rgb().formatHex();
}

function color_formatHex8() {
  return this.rgb().formatHex8();
}

function color_formatHsl() {
  return hslConvert(this).formatHsl();
}

function color_formatRgb() {
  return this.rgb().formatRgb();
}

function color(format) {
  var m, l;
  format = (format + "").trim().toLowerCase();
  return (m = reHex.exec(format)) ? (l = m[1].length, m = parseInt(m[1], 16), l === 6 ? rgbn(m) // #ff0000
      : l === 3 ? new Rgb((m >> 8 & 0xf) | (m >> 4 & 0xf0), (m >> 4 & 0xf) | (m & 0xf0), ((m & 0xf) << 4) | (m & 0xf), 1) // #f00
      : l === 8 ? rgba(m >> 24 & 0xff, m >> 16 & 0xff, m >> 8 & 0xff, (m & 0xff) / 0xff) // #ff000000
      : l === 4 ? rgba((m >> 12 & 0xf) | (m >> 8 & 0xf0), (m >> 8 & 0xf) | (m >> 4 & 0xf0), (m >> 4 & 0xf) | (m & 0xf0), (((m & 0xf) << 4) | (m & 0xf)) / 0xff) // #f000
      : null) // invalid hex
      : (m = reRgbInteger.exec(format)) ? new Rgb(m[1], m[2], m[3], 1) // rgb(255, 0, 0)
      : (m = reRgbPercent.exec(format)) ? new Rgb(m[1] * 255 / 100, m[2] * 255 / 100, m[3] * 255 / 100, 1) // rgb(100%, 0%, 0%)
      : (m = reRgbaInteger.exec(format)) ? rgba(m[1], m[2], m[3], m[4]) // rgba(255, 0, 0, 1)
      : (m = reRgbaPercent.exec(format)) ? rgba(m[1] * 255 / 100, m[2] * 255 / 100, m[3] * 255 / 100, m[4]) // rgb(100%, 0%, 0%, 1)
      : (m = reHslPercent.exec(format)) ? hsla(m[1], m[2] / 100, m[3] / 100, 1) // hsl(120, 50%, 50%)
      : (m = reHslaPercent.exec(format)) ? hsla(m[1], m[2] / 100, m[3] / 100, m[4]) // hsla(120, 50%, 50%, 1)
      : named.hasOwnProperty(format) ? rgbn(named[format]) // eslint-disable-line no-prototype-builtins
      : format === "transparent" ? new Rgb(NaN, NaN, NaN, 0)
      : null;
}

function rgbn(n) {
  return new Rgb(n >> 16 & 0xff, n >> 8 & 0xff, n & 0xff, 1);
}

function rgba(r, g, b, a) {
  if (a <= 0) r = g = b = NaN;
  return new Rgb(r, g, b, a);
}

function rgbConvert(o) {
  if (!(o instanceof Color)) o = color(o);
  if (!o) return new Rgb;
  o = o.rgb();
  return new Rgb(o.r, o.g, o.b, o.opacity);
}

function rgb(r, g, b, opacity) {
  return arguments.length === 1 ? rgbConvert(r) : new Rgb(r, g, b, opacity == null ? 1 : opacity);
}

function Rgb(r, g, b, opacity) {
  this.r = +r;
  this.g = +g;
  this.b = +b;
  this.opacity = +opacity;
}

define(Rgb, rgb, extend(Color, {
  brighter(k) {
    k = k == null ? brighter : Math.pow(brighter, k);
    return new Rgb(this.r * k, this.g * k, this.b * k, this.opacity);
  },
  darker(k) {
    k = k == null ? darker : Math.pow(darker, k);
    return new Rgb(this.r * k, this.g * k, this.b * k, this.opacity);
  },
  rgb() {
    return this;
  },
  clamp() {
    return new Rgb(clampi(this.r), clampi(this.g), clampi(this.b), clampa(this.opacity));
  },
  displayable() {
    return (-0.5 <= this.r && this.r < 255.5)
        && (-0.5 <= this.g && this.g < 255.5)
        && (-0.5 <= this.b && this.b < 255.5)
        && (0 <= this.opacity && this.opacity <= 1);
  },
  hex: rgb_formatHex, // Deprecated! Use color.formatHex.
  formatHex: rgb_formatHex,
  formatHex8: rgb_formatHex8,
  formatRgb: rgb_formatRgb,
  toString: rgb_formatRgb
}));

function rgb_formatHex() {
  return `#${hex(this.r)}${hex(this.g)}${hex(this.b)}`;
}

function rgb_formatHex8() {
  return `#${hex(this.r)}${hex(this.g)}${hex(this.b)}${hex((isNaN(this.opacity) ? 1 : this.opacity) * 255)}`;
}

function rgb_formatRgb() {
  const a = clampa(this.opacity);
  return `${a === 1 ? "rgb(" : "rgba("}${clampi(this.r)}, ${clampi(this.g)}, ${clampi(this.b)}${a === 1 ? ")" : `, ${a})`}`;
}

function clampa(opacity) {
  return isNaN(opacity) ? 1 : Math.max(0, Math.min(1, opacity));
}

function clampi(value) {
  return Math.max(0, Math.min(255, Math.round(value) || 0));
}

function hex(value) {
  value = clampi(value);
  return (value < 16 ? "0" : "") + value.toString(16);
}

function hsla(h, s, l, a) {
  if (a <= 0) h = s = l = NaN;
  else if (l <= 0 || l >= 1) h = s = NaN;
  else if (s <= 0) h = NaN;
  return new Hsl(h, s, l, a);
}

function hslConvert(o) {
  if (o instanceof Hsl) return new Hsl(o.h, o.s, o.l, o.opacity);
  if (!(o instanceof Color)) o = color(o);
  if (!o) return new Hsl;
  if (o instanceof Hsl) return o;
  o = o.rgb();
  var r = o.r / 255,
      g = o.g / 255,
      b = o.b / 255,
      min = Math.min(r, g, b),
      max = Math.max(r, g, b),
      h = NaN,
      s = max - min,
      l = (max + min) / 2;
  if (s) {
    if (r === max) h = (g - b) / s + (g < b) * 6;
    else if (g === max) h = (b - r) / s + 2;
    else h = (r - g) / s + 4;
    s /= l < 0.5 ? max + min : 2 - max - min;
    h *= 60;
  } else {
    s = l > 0 && l < 1 ? 0 : h;
  }
  return new Hsl(h, s, l, o.opacity);
}

function hsl(h, s, l, opacity) {
  return arguments.length === 1 ? hslConvert(h) : new Hsl(h, s, l, opacity == null ? 1 : opacity);
}

function Hsl(h, s, l, opacity) {
  this.h = +h;
  this.s = +s;
  this.l = +l;
  this.opacity = +opacity;
}

define(Hsl, hsl, extend(Color, {
  brighter(k) {
    k = k == null ? brighter : Math.pow(brighter, k);
    return new Hsl(this.h, this.s, this.l * k, this.opacity);
  },
  darker(k) {
    k = k == null ? darker : Math.pow(darker, k);
    return new Hsl(this.h, this.s, this.l * k, this.opacity);
  },
  rgb() {
    var h = this.h % 360 + (this.h < 0) * 360,
        s = isNaN(h) || isNaN(this.s) ? 0 : this.s,
        l = this.l,
        m2 = l + (l < 0.5 ? l : 1 - l) * s,
        m1 = 2 * l - m2;
    return new Rgb(
      hsl2rgb(h >= 240 ? h - 240 : h + 120, m1, m2),
      hsl2rgb(h, m1, m2),
      hsl2rgb(h < 120 ? h + 240 : h - 120, m1, m2),
      this.opacity
    );
  },
  clamp() {
    return new Hsl(clamph(this.h), clampt(this.s), clampt(this.l), clampa(this.opacity));
  },
  displayable() {
    return (0 <= this.s && this.s <= 1 || isNaN(this.s))
        && (0 <= this.l && this.l <= 1)
        && (0 <= this.opacity && this.opacity <= 1);
  },
  formatHsl() {
    const a = clampa(this.opacity);
    return `${a === 1 ? "hsl(" : "hsla("}${clamph(this.h)}, ${clampt(this.s) * 100}%, ${clampt(this.l) * 100}%${a === 1 ? ")" : `, ${a})`}`;
  }
}));

function clamph(value) {
  value = (value || 0) % 360;
  return value < 0 ? value + 360 : value;
}

function clampt(value) {
  return Math.max(0, Math.min(1, value || 0));
}

/* From FvD 13.37, CSS Color Module Level 3 */
function hsl2rgb(h, m1, m2) {
  return (h < 60 ? m1 + (m2 - m1) * h / 60
      : h < 180 ? m2
      : h < 240 ? m1 + (m2 - m1) * (240 - h) / 60
      : m1) * 255;
}

var constant$1 = x => () => x;

function linear(a, d) {
  return function(t) {
    return a + t * d;
  };
}

function exponential(a, b, y) {
  return a = Math.pow(a, y), b = Math.pow(b, y) - a, y = 1 / y, function(t) {
    return Math.pow(a + t * b, y);
  };
}

function gamma(y) {
  return (y = +y) === 1 ? nogamma : function(a, b) {
    return b - a ? exponential(a, b, y) : constant$1(isNaN(a) ? b : a);
  };
}

function nogamma(a, b) {
  var d = b - a;
  return d ? linear(a, d) : constant$1(isNaN(a) ? b : a);
}

var interpolateRgb = (function rgbGamma(y) {
  var color = gamma(y);

  function rgb$1(start, end) {
    var r = color((start = rgb(start)).r, (end = rgb(end)).r),
        g = color(start.g, end.g),
        b = color(start.b, end.b),
        opacity = nogamma(start.opacity, end.opacity);
    return function(t) {
      start.r = r(t);
      start.g = g(t);
      start.b = b(t);
      start.opacity = opacity(t);
      return start + "";
    };
  }

  rgb$1.gamma = rgbGamma;

  return rgb$1;
})(1);

function interpolateNumber(a, b) {
  return a = +a, b = +b, function(t) {
    return a * (1 - t) + b * t;
  };
}

var reA = /[-+]?(?:\d+\.?\d*|\.?\d+)(?:[eE][-+]?\d+)?/g,
    reB = new RegExp(reA.source, "g");

function zero(b) {
  return function() {
    return b;
  };
}

function one(b) {
  return function(t) {
    return b(t) + "";
  };
}

function interpolateString(a, b) {
  var bi = reA.lastIndex = reB.lastIndex = 0, // scan index for next number in b
      am, // current match in a
      bm, // current match in b
      bs, // string preceding current number in b, if any
      i = -1, // index in s
      s = [], // string constants and placeholders
      q = []; // number interpolators

  // Coerce inputs to strings.
  a = a + "", b = b + "";

  // Interpolate pairs of numbers in a & b.
  while ((am = reA.exec(a))
      && (bm = reB.exec(b))) {
    if ((bs = bm.index) > bi) { // a string precedes the next number in b
      bs = b.slice(bi, bs);
      if (s[i]) s[i] += bs; // coalesce with previous string
      else s[++i] = bs;
    }
    if ((am = am[0]) === (bm = bm[0])) { // numbers in a & b match
      if (s[i]) s[i] += bm; // coalesce with previous string
      else s[++i] = bm;
    } else { // interpolate non-matching numbers
      s[++i] = null;
      q.push({i: i, x: interpolateNumber(am, bm)});
    }
    bi = reB.lastIndex;
  }

  // Add remains of b.
  if (bi < b.length) {
    bs = b.slice(bi);
    if (s[i]) s[i] += bs; // coalesce with previous string
    else s[++i] = bs;
  }

  // Special optimization for only a single match.
  // Otherwise, interpolate each of the numbers and rejoin the string.
  return s.length < 2 ? (q[0]
      ? one(q[0].x)
      : zero(b))
      : (b = q.length, function(t) {
          for (var i = 0, o; i < b; ++i) s[(o = q[i]).i] = o.x(t);
          return s.join("");
        });
}

var degrees = 180 / Math.PI;

var identity$1 = {
  translateX: 0,
  translateY: 0,
  rotate: 0,
  skewX: 0,
  scaleX: 1,
  scaleY: 1
};

function decompose(a, b, c, d, e, f) {
  var scaleX, scaleY, skewX;
  if (scaleX = Math.sqrt(a * a + b * b)) a /= scaleX, b /= scaleX;
  if (skewX = a * c + b * d) c -= a * skewX, d -= b * skewX;
  if (scaleY = Math.sqrt(c * c + d * d)) c /= scaleY, d /= scaleY, skewX /= scaleY;
  if (a * d < b * c) a = -a, b = -b, skewX = -skewX, scaleX = -scaleX;
  return {
    translateX: e,
    translateY: f,
    rotate: Math.atan2(b, a) * degrees,
    skewX: Math.atan(skewX) * degrees,
    scaleX: scaleX,
    scaleY: scaleY
  };
}

var svgNode;

/* eslint-disable no-undef */
function parseCss(value) {
  const m = new (typeof DOMMatrix === "function" ? DOMMatrix : WebKitCSSMatrix)(value + "");
  return m.isIdentity ? identity$1 : decompose(m.a, m.b, m.c, m.d, m.e, m.f);
}

function parseSvg(value) {
  if (value == null) return identity$1;
  if (!svgNode) svgNode = document.createElementNS("http://www.w3.org/2000/svg", "g");
  svgNode.setAttribute("transform", value);
  if (!(value = svgNode.transform.baseVal.consolidate())) return identity$1;
  value = value.matrix;
  return decompose(value.a, value.b, value.c, value.d, value.e, value.f);
}

function interpolateTransform(parse, pxComma, pxParen, degParen) {

  function pop(s) {
    return s.length ? s.pop() + " " : "";
  }

  function translate(xa, ya, xb, yb, s, q) {
    if (xa !== xb || ya !== yb) {
      var i = s.push("translate(", null, pxComma, null, pxParen);
      q.push({i: i - 4, x: interpolateNumber(xa, xb)}, {i: i - 2, x: interpolateNumber(ya, yb)});
    } else if (xb || yb) {
      s.push("translate(" + xb + pxComma + yb + pxParen);
    }
  }

  function rotate(a, b, s, q) {
    if (a !== b) {
      if (a - b > 180) b += 360; else if (b - a > 180) a += 360; // shortest path
      q.push({i: s.push(pop(s) + "rotate(", null, degParen) - 2, x: interpolateNumber(a, b)});
    } else if (b) {
      s.push(pop(s) + "rotate(" + b + degParen);
    }
  }

  function skewX(a, b, s, q) {
    if (a !== b) {
      q.push({i: s.push(pop(s) + "skewX(", null, degParen) - 2, x: interpolateNumber(a, b)});
    } else if (b) {
      s.push(pop(s) + "skewX(" + b + degParen);
    }
  }

  function scale(xa, ya, xb, yb, s, q) {
    if (xa !== xb || ya !== yb) {
      var i = s.push(pop(s) + "scale(", null, ",", null, ")");
      q.push({i: i - 4, x: interpolateNumber(xa, xb)}, {i: i - 2, x: interpolateNumber(ya, yb)});
    } else if (xb !== 1 || yb !== 1) {
      s.push(pop(s) + "scale(" + xb + "," + yb + ")");
    }
  }

  return function(a, b) {
    var s = [], // string constants and placeholders
        q = []; // number interpolators
    a = parse(a), b = parse(b);
    translate(a.translateX, a.translateY, b.translateX, b.translateY, s, q);
    rotate(a.rotate, b.rotate, s, q);
    skewX(a.skewX, b.skewX, s, q);
    scale(a.scaleX, a.scaleY, b.scaleX, b.scaleY, s, q);
    a = b = null; // gc
    return function(t) {
      var i = -1, n = q.length, o;
      while (++i < n) s[(o = q[i]).i] = o.x(t);
      return s.join("");
    };
  };
}

var interpolateTransformCss = interpolateTransform(parseCss, "px, ", "px)", "deg)");
var interpolateTransformSvg = interpolateTransform(parseSvg, ", ", ")", ")");

var epsilon2 = 1e-12;

function cosh(x) {
  return ((x = Math.exp(x)) + 1 / x) / 2;
}

function sinh(x) {
  return ((x = Math.exp(x)) - 1 / x) / 2;
}

function tanh(x) {
  return ((x = Math.exp(2 * x)) - 1) / (x + 1);
}

var interpolateZoom = (function zoomRho(rho, rho2, rho4) {

  // p0 = [ux0, uy0, w0]
  // p1 = [ux1, uy1, w1]
  function zoom(p0, p1) {
    var ux0 = p0[0], uy0 = p0[1], w0 = p0[2],
        ux1 = p1[0], uy1 = p1[1], w1 = p1[2],
        dx = ux1 - ux0,
        dy = uy1 - uy0,
        d2 = dx * dx + dy * dy,
        i,
        S;

    // Special case for u0 ≅ u1.
    if (d2 < epsilon2) {
      S = Math.log(w1 / w0) / rho;
      i = function(t) {
        return [
          ux0 + t * dx,
          uy0 + t * dy,
          w0 * Math.exp(rho * t * S)
        ];
      };
    }

    // General case.
    else {
      var d1 = Math.sqrt(d2),
          b0 = (w1 * w1 - w0 * w0 + rho4 * d2) / (2 * w0 * rho2 * d1),
          b1 = (w1 * w1 - w0 * w0 - rho4 * d2) / (2 * w1 * rho2 * d1),
          r0 = Math.log(Math.sqrt(b0 * b0 + 1) - b0),
          r1 = Math.log(Math.sqrt(b1 * b1 + 1) - b1);
      S = (r1 - r0) / rho;
      i = function(t) {
        var s = t * S,
            coshr0 = cosh(r0),
            u = w0 / (rho2 * d1) * (coshr0 * tanh(rho * s + r0) - sinh(r0));
        return [
          ux0 + u * dx,
          uy0 + u * dy,
          w0 * coshr0 / cosh(rho * s + r0)
        ];
      };
    }

    i.duration = S * 1000 * rho / Math.SQRT2;

    return i;
  }

  zoom.rho = function(_) {
    var _1 = Math.max(1e-3, +_), _2 = _1 * _1, _4 = _2 * _2;
    return zoomRho(_1, _2, _4);
  };

  return zoom;
})(Math.SQRT2, 2, 4);

var frame = 0, // is an animation frame pending?
    timeout$1 = 0, // is a timeout pending?
    interval = 0, // are any timers active?
    pokeDelay = 1000, // how frequently we check for clock skew
    taskHead,
    taskTail,
    clockLast = 0,
    clockNow = 0,
    clockSkew = 0,
    clock = typeof performance === "object" && performance.now ? performance : Date,
    setFrame = typeof window === "object" && window.requestAnimationFrame ? window.requestAnimationFrame.bind(window) : function(f) { setTimeout(f, 17); };

function now() {
  return clockNow || (setFrame(clearNow), clockNow = clock.now() + clockSkew);
}

function clearNow() {
  clockNow = 0;
}

function Timer() {
  this._call =
  this._time =
  this._next = null;
}

Timer.prototype = timer.prototype = {
  constructor: Timer,
  restart: function(callback, delay, time) {
    if (typeof callback !== "function") throw new TypeError("callback is not a function");
    time = (time == null ? now() : +time) + (delay == null ? 0 : +delay);
    if (!this._next && taskTail !== this) {
      if (taskTail) taskTail._next = this;
      else taskHead = this;
      taskTail = this;
    }
    this._call = callback;
    this._time = time;
    sleep();
  },
  stop: function() {
    if (this._call) {
      this._call = null;
      this._time = Infinity;
      sleep();
    }
  }
};

function timer(callback, delay, time) {
  var t = new Timer;
  t.restart(callback, delay, time);
  return t;
}

function timerFlush() {
  now(); // Get the current time, if not already set.
  ++frame; // Pretend we’ve set an alarm, if we haven’t already.
  var t = taskHead, e;
  while (t) {
    if ((e = clockNow - t._time) >= 0) t._call.call(undefined, e);
    t = t._next;
  }
  --frame;
}

function wake() {
  clockNow = (clockLast = clock.now()) + clockSkew;
  frame = timeout$1 = 0;
  try {
    timerFlush();
  } finally {
    frame = 0;
    nap();
    clockNow = 0;
  }
}

function poke() {
  var now = clock.now(), delay = now - clockLast;
  if (delay > pokeDelay) clockSkew -= delay, clockLast = now;
}

function nap() {
  var t0, t1 = taskHead, t2, time = Infinity;
  while (t1) {
    if (t1._call) {
      if (time > t1._time) time = t1._time;
      t0 = t1, t1 = t1._next;
    } else {
      t2 = t1._next, t1._next = null;
      t1 = t0 ? t0._next = t2 : taskHead = t2;
    }
  }
  taskTail = t0;
  sleep(time);
}

function sleep(time) {
  if (frame) return; // Soonest alarm already set, or will be.
  if (timeout$1) timeout$1 = clearTimeout(timeout$1);
  var delay = time - clockNow; // Strictly less than if we recomputed clockNow.
  if (delay > 24) {
    if (time < Infinity) timeout$1 = setTimeout(wake, time - clock.now() - clockSkew);
    if (interval) interval = clearInterval(interval);
  } else {
    if (!interval) clockLast = clock.now(), interval = setInterval(poke, pokeDelay);
    frame = 1, setFrame(wake);
  }
}

function timeout(callback, delay, time) {
  var t = new Timer;
  delay = delay == null ? 0 : +delay;
  t.restart(elapsed => {
    t.stop();
    callback(elapsed + delay);
  }, delay, time);
  return t;
}

var emptyOn = dispatch("start", "end", "cancel", "interrupt");
var emptyTween = [];

var CREATED = 0;
var SCHEDULED = 1;
var STARTING = 2;
var STARTED = 3;
var RUNNING = 4;
var ENDING = 5;
var ENDED = 6;

function schedule(node, name, id, index, group, timing) {
  var schedules = node.__transition;
  if (!schedules) node.__transition = {};
  else if (id in schedules) return;
  create(node, id, {
    name: name,
    index: index, // For context during callback.
    group: group, // For context during callback.
    on: emptyOn,
    tween: emptyTween,
    time: timing.time,
    delay: timing.delay,
    duration: timing.duration,
    ease: timing.ease,
    timer: null,
    state: CREATED
  });
}

function init(node, id) {
  var schedule = get(node, id);
  if (schedule.state > CREATED) throw new Error("too late; already scheduled");
  return schedule;
}

function set(node, id) {
  var schedule = get(node, id);
  if (schedule.state > STARTED) throw new Error("too late; already running");
  return schedule;
}

function get(node, id) {
  var schedule = node.__transition;
  if (!schedule || !(schedule = schedule[id])) throw new Error("transition not found");
  return schedule;
}

function create(node, id, self) {
  var schedules = node.__transition,
      tween;

  // Initialize the self timer when the transition is created.
  // Note the actual delay is not known until the first callback!
  schedules[id] = self;
  self.timer = timer(schedule, 0, self.time);

  function schedule(elapsed) {
    self.state = SCHEDULED;
    self.timer.restart(start, self.delay, self.time);

    // If the elapsed delay is less than our first sleep, start immediately.
    if (self.delay <= elapsed) start(elapsed - self.delay);
  }

  function start(elapsed) {
    var i, j, n, o;

    // If the state is not SCHEDULED, then we previously errored on start.
    if (self.state !== SCHEDULED) return stop();

    for (i in schedules) {
      o = schedules[i];
      if (o.name !== self.name) continue;

      // While this element already has a starting transition during this frame,
      // defer starting an interrupting transition until that transition has a
      // chance to tick (and possibly end); see d3/d3-transition#54!
      if (o.state === STARTED) return timeout(start);

      // Interrupt the active transition, if any.
      if (o.state === RUNNING) {
        o.state = ENDED;
        o.timer.stop();
        o.on.call("interrupt", node, node.__data__, o.index, o.group);
        delete schedules[i];
      }

      // Cancel any pre-empted transitions.
      else if (+i < id) {
        o.state = ENDED;
        o.timer.stop();
        o.on.call("cancel", node, node.__data__, o.index, o.group);
        delete schedules[i];
      }
    }

    // Defer the first tick to end of the current frame; see d3/d3#1576.
    // Note the transition may be canceled after start and before the first tick!
    // Note this must be scheduled before the start event; see d3/d3-transition#16!
    // Assuming this is successful, subsequent callbacks go straight to tick.
    timeout(function() {
      if (self.state === STARTED) {
        self.state = RUNNING;
        self.timer.restart(tick, self.delay, self.time);
        tick(elapsed);
      }
    });

    // Dispatch the start event.
    // Note this must be done before the tween are initialized.
    self.state = STARTING;
    self.on.call("start", node, node.__data__, self.index, self.group);
    if (self.state !== STARTING) return; // interrupted
    self.state = STARTED;

    // Initialize the tween, deleting null tween.
    tween = new Array(n = self.tween.length);
    for (i = 0, j = -1; i < n; ++i) {
      if (o = self.tween[i].value.call(node, node.__data__, self.index, self.group)) {
        tween[++j] = o;
      }
    }
    tween.length = j + 1;
  }

  function tick(elapsed) {
    var t = elapsed < self.duration ? self.ease.call(null, elapsed / self.duration) : (self.timer.restart(stop), self.state = ENDING, 1),
        i = -1,
        n = tween.length;

    while (++i < n) {
      tween[i].call(node, t);
    }

    // Dispatch the end event.
    if (self.state === ENDING) {
      self.on.call("end", node, node.__data__, self.index, self.group);
      stop();
    }
  }

  function stop() {
    self.state = ENDED;
    self.timer.stop();
    delete schedules[id];
    for (var i in schedules) return; // eslint-disable-line no-unused-vars
    delete node.__transition;
  }
}

function interrupt(node, name) {
  var schedules = node.__transition,
      schedule,
      active,
      empty = true,
      i;

  if (!schedules) return;

  name = name == null ? null : name + "";

  for (i in schedules) {
    if ((schedule = schedules[i]).name !== name) { empty = false; continue; }
    active = schedule.state > STARTING && schedule.state < ENDING;
    schedule.state = ENDED;
    schedule.timer.stop();
    schedule.on.call(active ? "interrupt" : "cancel", node, node.__data__, schedule.index, schedule.group);
    delete schedules[i];
  }

  if (empty) delete node.__transition;
}

function selection_interrupt(name) {
  return this.each(function() {
    interrupt(this, name);
  });
}

function tweenRemove(id, name) {
  var tween0, tween1;
  return function() {
    var schedule = set(this, id),
        tween = schedule.tween;

    // If this node shared tween with the previous node,
    // just assign the updated shared tween and we’re done!
    // Otherwise, copy-on-write.
    if (tween !== tween0) {
      tween1 = tween0 = tween;
      for (var i = 0, n = tween1.length; i < n; ++i) {
        if (tween1[i].name === name) {
          tween1 = tween1.slice();
          tween1.splice(i, 1);
          break;
        }
      }
    }

    schedule.tween = tween1;
  };
}

function tweenFunction(id, name, value) {
  var tween0, tween1;
  if (typeof value !== "function") throw new Error;
  return function() {
    var schedule = set(this, id),
        tween = schedule.tween;

    // If this node shared tween with the previous node,
    // just assign the updated shared tween and we’re done!
    // Otherwise, copy-on-write.
    if (tween !== tween0) {
      tween1 = (tween0 = tween).slice();
      for (var t = {name: name, value: value}, i = 0, n = tween1.length; i < n; ++i) {
        if (tween1[i].name === name) {
          tween1[i] = t;
          break;
        }
      }
      if (i === n) tween1.push(t);
    }

    schedule.tween = tween1;
  };
}

function transition_tween(name, value) {
  var id = this._id;

  name += "";

  if (arguments.length < 2) {
    var tween = get(this.node(), id).tween;
    for (var i = 0, n = tween.length, t; i < n; ++i) {
      if ((t = tween[i]).name === name) {
        return t.value;
      }
    }
    return null;
  }

  return this.each((value == null ? tweenRemove : tweenFunction)(id, name, value));
}

function tweenValue(transition, name, value) {
  var id = transition._id;

  transition.each(function() {
    var schedule = set(this, id);
    (schedule.value || (schedule.value = {}))[name] = value.apply(this, arguments);
  });

  return function(node) {
    return get(node, id).value[name];
  };
}

function interpolate(a, b) {
  var c;
  return (typeof b === "number" ? interpolateNumber
      : b instanceof color ? interpolateRgb
      : (c = color(b)) ? (b = c, interpolateRgb)
      : interpolateString)(a, b);
}

function attrRemove(name) {
  return function() {
    this.removeAttribute(name);
  };
}

function attrRemoveNS(fullname) {
  return function() {
    this.removeAttributeNS(fullname.space, fullname.local);
  };
}

function attrConstant(name, interpolate, value1) {
  var string00,
      string1 = value1 + "",
      interpolate0;
  return function() {
    var string0 = this.getAttribute(name);
    return string0 === string1 ? null
        : string0 === string00 ? interpolate0
        : interpolate0 = interpolate(string00 = string0, value1);
  };
}

function attrConstantNS(fullname, interpolate, value1) {
  var string00,
      string1 = value1 + "",
      interpolate0;
  return function() {
    var string0 = this.getAttributeNS(fullname.space, fullname.local);
    return string0 === string1 ? null
        : string0 === string00 ? interpolate0
        : interpolate0 = interpolate(string00 = string0, value1);
  };
}

function attrFunction(name, interpolate, value) {
  var string00,
      string10,
      interpolate0;
  return function() {
    var string0, value1 = value(this), string1;
    if (value1 == null) return void this.removeAttribute(name);
    string0 = this.getAttribute(name);
    string1 = value1 + "";
    return string0 === string1 ? null
        : string0 === string00 && string1 === string10 ? interpolate0
        : (string10 = string1, interpolate0 = interpolate(string00 = string0, value1));
  };
}

function attrFunctionNS(fullname, interpolate, value) {
  var string00,
      string10,
      interpolate0;
  return function() {
    var string0, value1 = value(this), string1;
    if (value1 == null) return void this.removeAttributeNS(fullname.space, fullname.local);
    string0 = this.getAttributeNS(fullname.space, fullname.local);
    string1 = value1 + "";
    return string0 === string1 ? null
        : string0 === string00 && string1 === string10 ? interpolate0
        : (string10 = string1, interpolate0 = interpolate(string00 = string0, value1));
  };
}

function transition_attr(name, value) {
  var fullname = namespace(name), i = fullname === "transform" ? interpolateTransformSvg : interpolate;
  return this.attrTween(name, typeof value === "function"
      ? (fullname.local ? attrFunctionNS : attrFunction)(fullname, i, tweenValue(this, "attr." + name, value))
      : value == null ? (fullname.local ? attrRemoveNS : attrRemove)(fullname)
      : (fullname.local ? attrConstantNS : attrConstant)(fullname, i, value));
}

function attrInterpolate(name, i) {
  return function(t) {
    this.setAttribute(name, i.call(this, t));
  };
}

function attrInterpolateNS(fullname, i) {
  return function(t) {
    this.setAttributeNS(fullname.space, fullname.local, i.call(this, t));
  };
}

function attrTweenNS(fullname, value) {
  var t0, i0;
  function tween() {
    var i = value.apply(this, arguments);
    if (i !== i0) t0 = (i0 = i) && attrInterpolateNS(fullname, i);
    return t0;
  }
  tween._value = value;
  return tween;
}

function attrTween(name, value) {
  var t0, i0;
  function tween() {
    var i = value.apply(this, arguments);
    if (i !== i0) t0 = (i0 = i) && attrInterpolate(name, i);
    return t0;
  }
  tween._value = value;
  return tween;
}

function transition_attrTween(name, value) {
  var key = "attr." + name;
  if (arguments.length < 2) return (key = this.tween(key)) && key._value;
  if (value == null) return this.tween(key, null);
  if (typeof value !== "function") throw new Error;
  var fullname = namespace(name);
  return this.tween(key, (fullname.local ? attrTweenNS : attrTween)(fullname, value));
}

function delayFunction(id, value) {
  return function() {
    init(this, id).delay = +value.apply(this, arguments);
  };
}

function delayConstant(id, value) {
  return value = +value, function() {
    init(this, id).delay = value;
  };
}

function transition_delay(value) {
  var id = this._id;

  return arguments.length
      ? this.each((typeof value === "function"
          ? delayFunction
          : delayConstant)(id, value))
      : get(this.node(), id).delay;
}

function durationFunction(id, value) {
  return function() {
    set(this, id).duration = +value.apply(this, arguments);
  };
}

function durationConstant(id, value) {
  return value = +value, function() {
    set(this, id).duration = value;
  };
}

function transition_duration(value) {
  var id = this._id;

  return arguments.length
      ? this.each((typeof value === "function"
          ? durationFunction
          : durationConstant)(id, value))
      : get(this.node(), id).duration;
}

function easeConstant(id, value) {
  if (typeof value !== "function") throw new Error;
  return function() {
    set(this, id).ease = value;
  };
}

function transition_ease(value) {
  var id = this._id;

  return arguments.length
      ? this.each(easeConstant(id, value))
      : get(this.node(), id).ease;
}

function easeVarying(id, value) {
  return function() {
    var v = value.apply(this, arguments);
    if (typeof v !== "function") throw new Error;
    set(this, id).ease = v;
  };
}

function transition_easeVarying(value) {
  if (typeof value !== "function") throw new Error;
  return this.each(easeVarying(this._id, value));
}

function transition_filter(match) {
  if (typeof match !== "function") match = matcher(match);

  for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) {
    for (var group = groups[j], n = group.length, subgroup = subgroups[j] = [], node, i = 0; i < n; ++i) {
      if ((node = group[i]) && match.call(node, node.__data__, i, group)) {
        subgroup.push(node);
      }
    }
  }

  return new Transition(subgroups, this._parents, this._name, this._id);
}

function transition_merge(transition) {
  if (transition._id !== this._id) throw new Error;

  for (var groups0 = this._groups, groups1 = transition._groups, m0 = groups0.length, m1 = groups1.length, m = Math.min(m0, m1), merges = new Array(m0), j = 0; j < m; ++j) {
    for (var group0 = groups0[j], group1 = groups1[j], n = group0.length, merge = merges[j] = new Array(n), node, i = 0; i < n; ++i) {
      if (node = group0[i] || group1[i]) {
        merge[i] = node;
      }
    }
  }

  for (; j < m0; ++j) {
    merges[j] = groups0[j];
  }

  return new Transition(merges, this._parents, this._name, this._id);
}

function start(name) {
  return (name + "").trim().split(/^|\s+/).every(function(t) {
    var i = t.indexOf(".");
    if (i >= 0) t = t.slice(0, i);
    return !t || t === "start";
  });
}

function onFunction(id, name, listener) {
  var on0, on1, sit = start(name) ? init : set;
  return function() {
    var schedule = sit(this, id),
        on = schedule.on;

    // If this node shared a dispatch with the previous node,
    // just assign the updated shared dispatch and we’re done!
    // Otherwise, copy-on-write.
    if (on !== on0) (on1 = (on0 = on).copy()).on(name, listener);

    schedule.on = on1;
  };
}

function transition_on(name, listener) {
  var id = this._id;

  return arguments.length < 2
      ? get(this.node(), id).on.on(name)
      : this.each(onFunction(id, name, listener));
}

function removeFunction(id) {
  return function() {
    var parent = this.parentNode;
    for (var i in this.__transition) if (+i !== id) return;
    if (parent) parent.removeChild(this);
  };
}

function transition_remove() {
  return this.on("end.remove", removeFunction(this._id));
}

function transition_select(select) {
  var name = this._name,
      id = this._id;

  if (typeof select !== "function") select = selector(select);

  for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) {
    for (var group = groups[j], n = group.length, subgroup = subgroups[j] = new Array(n), node, subnode, i = 0; i < n; ++i) {
      if ((node = group[i]) && (subnode = select.call(node, node.__data__, i, group))) {
        if ("__data__" in node) subnode.__data__ = node.__data__;
        subgroup[i] = subnode;
        schedule(subgroup[i], name, id, i, subgroup, get(node, id));
      }
    }
  }

  return new Transition(subgroups, this._parents, name, id);
}

function transition_selectAll(select) {
  var name = this._name,
      id = this._id;

  if (typeof select !== "function") select = selectorAll(select);

  for (var groups = this._groups, m = groups.length, subgroups = [], parents = [], j = 0; j < m; ++j) {
    for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) {
      if (node = group[i]) {
        for (var children = select.call(node, node.__data__, i, group), child, inherit = get(node, id), k = 0, l = children.length; k < l; ++k) {
          if (child = children[k]) {
            schedule(child, name, id, k, children, inherit);
          }
        }
        subgroups.push(children);
        parents.push(node);
      }
    }
  }

  return new Transition(subgroups, parents, name, id);
}

var Selection = selection.prototype.constructor;

function transition_selection() {
  return new Selection(this._groups, this._parents);
}

function styleNull(name, interpolate) {
  var string00,
      string10,
      interpolate0;
  return function() {
    var string0 = styleValue(this, name),
        string1 = (this.style.removeProperty(name), styleValue(this, name));
    return string0 === string1 ? null
        : string0 === string00 && string1 === string10 ? interpolate0
        : interpolate0 = interpolate(string00 = string0, string10 = string1);
  };
}

function styleRemove(name) {
  return function() {
    this.style.removeProperty(name);
  };
}

function styleConstant(name, interpolate, value1) {
  var string00,
      string1 = value1 + "",
      interpolate0;
  return function() {
    var string0 = styleValue(this, name);
    return string0 === string1 ? null
        : string0 === string00 ? interpolate0
        : interpolate0 = interpolate(string00 = string0, value1);
  };
}

function styleFunction(name, interpolate, value) {
  var string00,
      string10,
      interpolate0;
  return function() {
    var string0 = styleValue(this, name),
        value1 = value(this),
        string1 = value1 + "";
    if (value1 == null) string1 = value1 = (this.style.removeProperty(name), styleValue(this, name));
    return string0 === string1 ? null
        : string0 === string00 && string1 === string10 ? interpolate0
        : (string10 = string1, interpolate0 = interpolate(string00 = string0, value1));
  };
}

function styleMaybeRemove(id, name) {
  var on0, on1, listener0, key = "style." + name, event = "end." + key, remove;
  return function() {
    var schedule = set(this, id),
        on = schedule.on,
        listener = schedule.value[key] == null ? remove || (remove = styleRemove(name)) : undefined;

    // If this node shared a dispatch with the previous node,
    // just assign the updated shared dispatch and we’re done!
    // Otherwise, copy-on-write.
    if (on !== on0 || listener0 !== listener) (on1 = (on0 = on).copy()).on(event, listener0 = listener);

    schedule.on = on1;
  };
}

function transition_style(name, value, priority) {
  var i = (name += "") === "transform" ? interpolateTransformCss : interpolate;
  return value == null ? this
      .styleTween(name, styleNull(name, i))
      .on("end.style." + name, styleRemove(name))
    : typeof value === "function" ? this
      .styleTween(name, styleFunction(name, i, tweenValue(this, "style." + name, value)))
      .each(styleMaybeRemove(this._id, name))
    : this
      .styleTween(name, styleConstant(name, i, value), priority)
      .on("end.style." + name, null);
}

function styleInterpolate(name, i, priority) {
  return function(t) {
    this.style.setProperty(name, i.call(this, t), priority);
  };
}

function styleTween(name, value, priority) {
  var t, i0;
  function tween() {
    var i = value.apply(this, arguments);
    if (i !== i0) t = (i0 = i) && styleInterpolate(name, i, priority);
    return t;
  }
  tween._value = value;
  return tween;
}

function transition_styleTween(name, value, priority) {
  var key = "style." + (name += "");
  if (arguments.length < 2) return (key = this.tween(key)) && key._value;
  if (value == null) return this.tween(key, null);
  if (typeof value !== "function") throw new Error;
  return this.tween(key, styleTween(name, value, priority == null ? "" : priority));
}

function textConstant(value) {
  return function() {
    this.textContent = value;
  };
}

function textFunction(value) {
  return function() {
    var value1 = value(this);
    this.textContent = value1 == null ? "" : value1;
  };
}

function transition_text(value) {
  return this.tween("text", typeof value === "function"
      ? textFunction(tweenValue(this, "text", value))
      : textConstant(value == null ? "" : value + ""));
}

function textInterpolate(i) {
  return function(t) {
    this.textContent = i.call(this, t);
  };
}

function textTween(value) {
  var t0, i0;
  function tween() {
    var i = value.apply(this, arguments);
    if (i !== i0) t0 = (i0 = i) && textInterpolate(i);
    return t0;
  }
  tween._value = value;
  return tween;
}

function transition_textTween(value) {
  var key = "text";
  if (arguments.length < 1) return (key = this.tween(key)) && key._value;
  if (value == null) return this.tween(key, null);
  if (typeof value !== "function") throw new Error;
  return this.tween(key, textTween(value));
}

function transition_transition() {
  var name = this._name,
      id0 = this._id,
      id1 = newId();

  for (var groups = this._groups, m = groups.length, j = 0; j < m; ++j) {
    for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) {
      if (node = group[i]) {
        var inherit = get(node, id0);
        schedule(node, name, id1, i, group, {
          time: inherit.time + inherit.delay + inherit.duration,
          delay: 0,
          duration: inherit.duration,
          ease: inherit.ease
        });
      }
    }
  }

  return new Transition(groups, this._parents, name, id1);
}

function transition_end() {
  var on0, on1, that = this, id = that._id, size = that.size();
  return new Promise(function(resolve, reject) {
    var cancel = {value: reject},
        end = {value: function() { if (--size === 0) resolve(); }};

    that.each(function() {
      var schedule = set(this, id),
          on = schedule.on;

      // If this node shared a dispatch with the previous node,
      // just assign the updated shared dispatch and we’re done!
      // Otherwise, copy-on-write.
      if (on !== on0) {
        on1 = (on0 = on).copy();
        on1._.cancel.push(cancel);
        on1._.interrupt.push(cancel);
        on1._.end.push(end);
      }

      schedule.on = on1;
    });

    // The selection was empty, resolve end immediately
    if (size === 0) resolve();
  });
}

var id = 0;

function Transition(groups, parents, name, id) {
  this._groups = groups;
  this._parents = parents;
  this._name = name;
  this._id = id;
}

function newId() {
  return ++id;
}

var selection_prototype = selection.prototype;

Transition.prototype = {
  constructor: Transition,
  select: transition_select,
  selectAll: transition_selectAll,
  selectChild: selection_prototype.selectChild,
  selectChildren: selection_prototype.selectChildren,
  filter: transition_filter,
  merge: transition_merge,
  selection: transition_selection,
  transition: transition_transition,
  call: selection_prototype.call,
  nodes: selection_prototype.nodes,
  node: selection_prototype.node,
  size: selection_prototype.size,
  empty: selection_prototype.empty,
  each: selection_prototype.each,
  on: transition_on,
  attr: transition_attr,
  attrTween: transition_attrTween,
  style: transition_style,
  styleTween: transition_styleTween,
  text: transition_text,
  textTween: transition_textTween,
  remove: transition_remove,
  tween: transition_tween,
  delay: transition_delay,
  duration: transition_duration,
  ease: transition_ease,
  easeVarying: transition_easeVarying,
  end: transition_end,
  [Symbol.iterator]: selection_prototype[Symbol.iterator]
};

function cubicInOut(t) {
  return ((t *= 2) <= 1 ? t * t * t : (t -= 2) * t * t + 2) / 2;
}

var defaultTiming = {
  time: null, // Set on use.
  delay: 0,
  duration: 250,
  ease: cubicInOut
};

function inherit(node, id) {
  var timing;
  while (!(timing = node.__transition) || !(timing = timing[id])) {
    if (!(node = node.parentNode)) {
      throw new Error(`transition ${id} not found`);
    }
  }
  return timing;
}

function selection_transition(name) {
  var id,
      timing;

  if (name instanceof Transition) {
    id = name._id, name = name._name;
  } else {
    id = newId(), (timing = defaultTiming).time = now(), name = name == null ? null : name + "";
  }

  for (var groups = this._groups, m = groups.length, j = 0; j < m; ++j) {
    for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) {
      if (node = group[i]) {
        schedule(node, name, id, i, group, timing || inherit(node, id));
      }
    }
  }

  return new Transition(groups, this._parents, name, id);
}

selection.prototype.interrupt = selection_interrupt;
selection.prototype.transition = selection_transition;

var constant = x => () => x;

function ZoomEvent(type, {
  sourceEvent,
  target,
  transform,
  dispatch
}) {
  Object.defineProperties(this, {
    type: {value: type, enumerable: true, configurable: true},
    sourceEvent: {value: sourceEvent, enumerable: true, configurable: true},
    target: {value: target, enumerable: true, configurable: true},
    transform: {value: transform, enumerable: true, configurable: true},
    _: {value: dispatch}
  });
}

function Transform(k, x, y) {
  this.k = k;
  this.x = x;
  this.y = y;
}

Transform.prototype = {
  constructor: Transform,
  scale: function(k) {
    return k === 1 ? this : new Transform(this.k * k, this.x, this.y);
  },
  translate: function(x, y) {
    return x === 0 & y === 0 ? this : new Transform(this.k, this.x + this.k * x, this.y + this.k * y);
  },
  apply: function(point) {
    return [point[0] * this.k + this.x, point[1] * this.k + this.y];
  },
  applyX: function(x) {
    return x * this.k + this.x;
  },
  applyY: function(y) {
    return y * this.k + this.y;
  },
  invert: function(location) {
    return [(location[0] - this.x) / this.k, (location[1] - this.y) / this.k];
  },
  invertX: function(x) {
    return (x - this.x) / this.k;
  },
  invertY: function(y) {
    return (y - this.y) / this.k;
  },
  rescaleX: function(x) {
    return x.copy().domain(x.range().map(this.invertX, this).map(x.invert, x));
  },
  rescaleY: function(y) {
    return y.copy().domain(y.range().map(this.invertY, this).map(y.invert, y));
  },
  toString: function() {
    return "translate(" + this.x + "," + this.y + ") scale(" + this.k + ")";
  }
};

var identity = new Transform(1, 0, 0);

Transform.prototype;

function nopropagation(event) {
  event.stopImmediatePropagation();
}

function noevent(event) {
  event.preventDefault();
  event.stopImmediatePropagation();
}

// Ignore right-click, since that should open the context menu.
// except for pinch-to-zoom, which is sent as a wheel+ctrlKey event
function defaultFilter(event) {
  return (!event.ctrlKey || event.type === 'wheel') && !event.button;
}

function defaultExtent() {
  var e = this;
  if (e instanceof SVGElement) {
    e = e.ownerSVGElement || e;
    if (e.hasAttribute("viewBox")) {
      e = e.viewBox.baseVal;
      return [[e.x, e.y], [e.x + e.width, e.y + e.height]];
    }
    return [[0, 0], [e.width.baseVal.value, e.height.baseVal.value]];
  }
  return [[0, 0], [e.clientWidth, e.clientHeight]];
}

function defaultTransform() {
  return this.__zoom || identity;
}

function defaultWheelDelta(event) {
  return -event.deltaY * (event.deltaMode === 1 ? 0.05 : event.deltaMode ? 1 : 0.002) * (event.ctrlKey ? 10 : 1);
}

function defaultTouchable() {
  return navigator.maxTouchPoints || ("ontouchstart" in this);
}

function defaultConstrain(transform, extent, translateExtent) {
  var dx0 = transform.invertX(extent[0][0]) - translateExtent[0][0],
      dx1 = transform.invertX(extent[1][0]) - translateExtent[1][0],
      dy0 = transform.invertY(extent[0][1]) - translateExtent[0][1],
      dy1 = transform.invertY(extent[1][1]) - translateExtent[1][1];
  return transform.translate(
    dx1 > dx0 ? (dx0 + dx1) / 2 : Math.min(0, dx0) || Math.max(0, dx1),
    dy1 > dy0 ? (dy0 + dy1) / 2 : Math.min(0, dy0) || Math.max(0, dy1)
  );
}

function zoom() {
  var filter = defaultFilter,
      extent = defaultExtent,
      constrain = defaultConstrain,
      wheelDelta = defaultWheelDelta,
      touchable = defaultTouchable,
      scaleExtent = [0, Infinity],
      translateExtent = [[-Infinity, -Infinity], [Infinity, Infinity]],
      duration = 250,
      interpolate = interpolateZoom,
      listeners = dispatch("start", "zoom", "end"),
      touchstarting,
      touchfirst,
      touchending,
      touchDelay = 500,
      wheelDelay = 150,
      clickDistance2 = 0,
      tapDistance = 10;

  function zoom(selection) {
    selection
        .property("__zoom", defaultTransform)
        .on("wheel.zoom", wheeled, {passive: false})
        .on("mousedown.zoom", mousedowned)
        .on("dblclick.zoom", dblclicked)
      .filter(touchable)
        .on("touchstart.zoom", touchstarted)
        .on("touchmove.zoom", touchmoved)
        .on("touchend.zoom touchcancel.zoom", touchended)
        .style("-webkit-tap-highlight-color", "rgba(0,0,0,0)");
  }

  zoom.transform = function(collection, transform, point, event) {
    var selection = collection.selection ? collection.selection() : collection;
    selection.property("__zoom", defaultTransform);
    if (collection !== selection) {
      schedule(collection, transform, point, event);
    } else {
      selection.interrupt().each(function() {
        gesture(this, arguments)
          .event(event)
          .start()
          .zoom(null, typeof transform === "function" ? transform.apply(this, arguments) : transform)
          .end();
      });
    }
  };

  zoom.scaleBy = function(selection, k, p, event) {
    zoom.scaleTo(selection, function() {
      var k0 = this.__zoom.k,
          k1 = typeof k === "function" ? k.apply(this, arguments) : k;
      return k0 * k1;
    }, p, event);
  };

  zoom.scaleTo = function(selection, k, p, event) {
    zoom.transform(selection, function() {
      var e = extent.apply(this, arguments),
          t0 = this.__zoom,
          p0 = p == null ? centroid(e) : typeof p === "function" ? p.apply(this, arguments) : p,
          p1 = t0.invert(p0),
          k1 = typeof k === "function" ? k.apply(this, arguments) : k;
      return constrain(translate(scale(t0, k1), p0, p1), e, translateExtent);
    }, p, event);
  };

  zoom.translateBy = function(selection, x, y, event) {
    zoom.transform(selection, function() {
      return constrain(this.__zoom.translate(
        typeof x === "function" ? x.apply(this, arguments) : x,
        typeof y === "function" ? y.apply(this, arguments) : y
      ), extent.apply(this, arguments), translateExtent);
    }, null, event);
  };

  zoom.translateTo = function(selection, x, y, p, event) {
    zoom.transform(selection, function() {
      var e = extent.apply(this, arguments),
          t = this.__zoom,
          p0 = p == null ? centroid(e) : typeof p === "function" ? p.apply(this, arguments) : p;
      return constrain(identity.translate(p0[0], p0[1]).scale(t.k).translate(
        typeof x === "function" ? -x.apply(this, arguments) : -x,
        typeof y === "function" ? -y.apply(this, arguments) : -y
      ), e, translateExtent);
    }, p, event);
  };

  function scale(transform, k) {
    k = Math.max(scaleExtent[0], Math.min(scaleExtent[1], k));
    return k === transform.k ? transform : new Transform(k, transform.x, transform.y);
  }

  function translate(transform, p0, p1) {
    var x = p0[0] - p1[0] * transform.k, y = p0[1] - p1[1] * transform.k;
    return x === transform.x && y === transform.y ? transform : new Transform(transform.k, x, y);
  }

  function centroid(extent) {
    return [(+extent[0][0] + +extent[1][0]) / 2, (+extent[0][1] + +extent[1][1]) / 2];
  }

  function schedule(transition, transform, point, event) {
    transition
        .on("start.zoom", function() { gesture(this, arguments).event(event).start(); })
        .on("interrupt.zoom end.zoom", function() { gesture(this, arguments).event(event).end(); })
        .tween("zoom", function() {
          var that = this,
              args = arguments,
              g = gesture(that, args).event(event),
              e = extent.apply(that, args),
              p = point == null ? centroid(e) : typeof point === "function" ? point.apply(that, args) : point,
              w = Math.max(e[1][0] - e[0][0], e[1][1] - e[0][1]),
              a = that.__zoom,
              b = typeof transform === "function" ? transform.apply(that, args) : transform,
              i = interpolate(a.invert(p).concat(w / a.k), b.invert(p).concat(w / b.k));
          return function(t) {
            if (t === 1) t = b; // Avoid rounding error on end.
            else { var l = i(t), k = w / l[2]; t = new Transform(k, p[0] - l[0] * k, p[1] - l[1] * k); }
            g.zoom(null, t);
          };
        });
  }

  function gesture(that, args, clean) {
    return (!clean && that.__zooming) || new Gesture(that, args);
  }

  function Gesture(that, args) {
    this.that = that;
    this.args = args;
    this.active = 0;
    this.sourceEvent = null;
    this.extent = extent.apply(that, args);
    this.taps = 0;
  }

  Gesture.prototype = {
    event: function(event) {
      if (event) this.sourceEvent = event;
      return this;
    },
    start: function() {
      if (++this.active === 1) {
        this.that.__zooming = this;
        this.emit("start");
      }
      return this;
    },
    zoom: function(key, transform) {
      if (this.mouse && key !== "mouse") this.mouse[1] = transform.invert(this.mouse[0]);
      if (this.touch0 && key !== "touch") this.touch0[1] = transform.invert(this.touch0[0]);
      if (this.touch1 && key !== "touch") this.touch1[1] = transform.invert(this.touch1[0]);
      this.that.__zoom = transform;
      this.emit("zoom");
      return this;
    },
    end: function() {
      if (--this.active === 0) {
        delete this.that.__zooming;
        this.emit("end");
      }
      return this;
    },
    emit: function(type) {
      var d = select(this.that).datum();
      listeners.call(
        type,
        this.that,
        new ZoomEvent(type, {
          sourceEvent: this.sourceEvent,
          target: zoom,
          transform: this.that.__zoom,
          dispatch: listeners
        }),
        d
      );
    }
  };

  function wheeled(event, ...args) {
    if (!filter.apply(this, arguments)) return;
    var g = gesture(this, args).event(event),
        t = this.__zoom,
        k = Math.max(scaleExtent[0], Math.min(scaleExtent[1], t.k * Math.pow(2, wheelDelta.apply(this, arguments)))),
        p = pointer(event);

    // If the mouse is in the same location as before, reuse it.
    // If there were recent wheel events, reset the wheel idle timeout.
    if (g.wheel) {
      if (g.mouse[0][0] !== p[0] || g.mouse[0][1] !== p[1]) {
        g.mouse[1] = t.invert(g.mouse[0] = p);
      }
      clearTimeout(g.wheel);
    }

    // If this wheel event won’t trigger a transform change, ignore it.
    else if (t.k === k) return;

    // Otherwise, capture the mouse point and location at the start.
    else {
      g.mouse = [p, t.invert(p)];
      interrupt(this);
      g.start();
    }

    noevent(event);
    g.wheel = setTimeout(wheelidled, wheelDelay);
    g.zoom("mouse", constrain(translate(scale(t, k), g.mouse[0], g.mouse[1]), g.extent, translateExtent));

    function wheelidled() {
      g.wheel = null;
      g.end();
    }
  }

  function mousedowned(event, ...args) {
    if (touchending || !filter.apply(this, arguments)) return;
    var currentTarget = event.currentTarget,
        g = gesture(this, args, true).event(event),
        v = select(event.view).on("mousemove.zoom", mousemoved, true).on("mouseup.zoom", mouseupped, true),
        p = pointer(event, currentTarget),
        x0 = event.clientX,
        y0 = event.clientY;

    dragDisable(event.view);
    nopropagation(event);
    g.mouse = [p, this.__zoom.invert(p)];
    interrupt(this);
    g.start();

    function mousemoved(event) {
      noevent(event);
      if (!g.moved) {
        var dx = event.clientX - x0, dy = event.clientY - y0;
        g.moved = dx * dx + dy * dy > clickDistance2;
      }
      g.event(event)
       .zoom("mouse", constrain(translate(g.that.__zoom, g.mouse[0] = pointer(event, currentTarget), g.mouse[1]), g.extent, translateExtent));
    }

    function mouseupped(event) {
      v.on("mousemove.zoom mouseup.zoom", null);
      yesdrag(event.view, g.moved);
      noevent(event);
      g.event(event).end();
    }
  }

  function dblclicked(event, ...args) {
    if (!filter.apply(this, arguments)) return;
    var t0 = this.__zoom,
        p0 = pointer(event.changedTouches ? event.changedTouches[0] : event, this),
        p1 = t0.invert(p0),
        k1 = t0.k * (event.shiftKey ? 0.5 : 2),
        t1 = constrain(translate(scale(t0, k1), p0, p1), extent.apply(this, args), translateExtent);

    noevent(event);
    if (duration > 0) select(this).transition().duration(duration).call(schedule, t1, p0, event);
    else select(this).call(zoom.transform, t1, p0, event);
  }

  function touchstarted(event, ...args) {
    if (!filter.apply(this, arguments)) return;
    var touches = event.touches,
        n = touches.length,
        g = gesture(this, args, event.changedTouches.length === n).event(event),
        started, i, t, p;

    nopropagation(event);
    for (i = 0; i < n; ++i) {
      t = touches[i], p = pointer(t, this);
      p = [p, this.__zoom.invert(p), t.identifier];
      if (!g.touch0) g.touch0 = p, started = true, g.taps = 1 + !!touchstarting;
      else if (!g.touch1 && g.touch0[2] !== p[2]) g.touch1 = p, g.taps = 0;
    }

    if (touchstarting) touchstarting = clearTimeout(touchstarting);

    if (started) {
      if (g.taps < 2) touchfirst = p[0], touchstarting = setTimeout(function() { touchstarting = null; }, touchDelay);
      interrupt(this);
      g.start();
    }
  }

  function touchmoved(event, ...args) {
    if (!this.__zooming) return;
    var g = gesture(this, args).event(event),
        touches = event.changedTouches,
        n = touches.length, i, t, p, l;

    noevent(event);
    for (i = 0; i < n; ++i) {
      t = touches[i], p = pointer(t, this);
      if (g.touch0 && g.touch0[2] === t.identifier) g.touch0[0] = p;
      else if (g.touch1 && g.touch1[2] === t.identifier) g.touch1[0] = p;
    }
    t = g.that.__zoom;
    if (g.touch1) {
      var p0 = g.touch0[0], l0 = g.touch0[1],
          p1 = g.touch1[0], l1 = g.touch1[1],
          dp = (dp = p1[0] - p0[0]) * dp + (dp = p1[1] - p0[1]) * dp,
          dl = (dl = l1[0] - l0[0]) * dl + (dl = l1[1] - l0[1]) * dl;
      t = scale(t, Math.sqrt(dp / dl));
      p = [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2];
      l = [(l0[0] + l1[0]) / 2, (l0[1] + l1[1]) / 2];
    }
    else if (g.touch0) p = g.touch0[0], l = g.touch0[1];
    else return;

    g.zoom("touch", constrain(translate(t, p, l), g.extent, translateExtent));
  }

  function touchended(event, ...args) {
    if (!this.__zooming) return;
    var g = gesture(this, args).event(event),
        touches = event.changedTouches,
        n = touches.length, i, t;

    nopropagation(event);
    if (touchending) clearTimeout(touchending);
    touchending = setTimeout(function() { touchending = null; }, touchDelay);
    for (i = 0; i < n; ++i) {
      t = touches[i];
      if (g.touch0 && g.touch0[2] === t.identifier) delete g.touch0;
      else if (g.touch1 && g.touch1[2] === t.identifier) delete g.touch1;
    }
    if (g.touch1 && !g.touch0) g.touch0 = g.touch1, delete g.touch1;
    if (g.touch0) g.touch0[1] = this.__zoom.invert(g.touch0[0]);
    else {
      g.end();
      // If this was a dbltap, reroute to the (optional) dblclick.zoom handler.
      if (g.taps === 2) {
        t = pointer(t, this);
        if (Math.hypot(touchfirst[0] - t[0], touchfirst[1] - t[1]) < tapDistance) {
          var p = select(this).on("dblclick.zoom");
          if (p) p.apply(this, arguments);
        }
      }
    }
  }

  zoom.wheelDelta = function(_) {
    return arguments.length ? (wheelDelta = typeof _ === "function" ? _ : constant(+_), zoom) : wheelDelta;
  };

  zoom.filter = function(_) {
    return arguments.length ? (filter = typeof _ === "function" ? _ : constant(!!_), zoom) : filter;
  };

  zoom.touchable = function(_) {
    return arguments.length ? (touchable = typeof _ === "function" ? _ : constant(!!_), zoom) : touchable;
  };

  zoom.extent = function(_) {
    return arguments.length ? (extent = typeof _ === "function" ? _ : constant([[+_[0][0], +_[0][1]], [+_[1][0], +_[1][1]]]), zoom) : extent;
  };

  zoom.scaleExtent = function(_) {
    return arguments.length ? (scaleExtent[0] = +_[0], scaleExtent[1] = +_[1], zoom) : [scaleExtent[0], scaleExtent[1]];
  };

  zoom.translateExtent = function(_) {
    return arguments.length ? (translateExtent[0][0] = +_[0][0], translateExtent[1][0] = +_[1][0], translateExtent[0][1] = +_[0][1], translateExtent[1][1] = +_[1][1], zoom) : [[translateExtent[0][0], translateExtent[0][1]], [translateExtent[1][0], translateExtent[1][1]]];
  };

  zoom.constrain = function(_) {
    return arguments.length ? (constrain = _, zoom) : constrain;
  };

  zoom.duration = function(_) {
    return arguments.length ? (duration = +_, zoom) : duration;
  };

  zoom.interpolate = function(_) {
    return arguments.length ? (interpolate = _, zoom) : interpolate;
  };

  zoom.on = function() {
    var value = listeners.on.apply(listeners, arguments);
    return value === listeners ? zoom : value;
  };

  zoom.clickDistance = function(_) {
    return arguments.length ? (clickDistance2 = (_ = +_) * _, zoom) : Math.sqrt(clickDistance2);
  };

  zoom.tapDistance = function(_) {
    return arguments.length ? (tapDistance = +_, zoom) : tapDistance;
  };

  return zoom;
}

// src/lattice/config.js
// Central configuration file to avoid hardcoding

const GRAPH_CONFIG = {
    dimensions: {
      width: 800, // Default width of the graph (change later to 1600)
      height: 600, // Default height of the graph (change later to 800)
      padding: 50, // Padding around the graph
    },
    node: {
      maxRadius: 10, // Max radius for small graphs (change later to 15)
      color: 'blue', // Default node color
      selectedColor: 'red'},
    link: {
      color: 'black', // Default color for links
      thickness: 2, // Default thickness of links
      connectedColor: 'red', 
      highlightedColor: 'orange', // Color for highlighted links
      connectedThickness: 4,
      highlightedThickness: 5
    }};

// src/lattice/metrics.js

/**
 * Calculates metrics for the concept lattice.
 * @param {Object} graphData - The graph data containing nodes and links.
 * @param {Object} formalContext - The formal context containing objects and attributes.
 * @returns {Object} - The calculated metrics (number of concepts, objects, attributes).
 */
// Exporting a function to calculate metrics (concepts, objects, attributes).
function calculateMetrics(graphData) {

     // Check if the graph data is valid (should include nodes and links).
    if (!graphData || !graphData.nodes || !graphData.links) {
      throw new Error('Invalid input: Ensure graphData includes nodes and links.');
    }
  
     // **Global Metrics**
    const totalConcepts = graphData.nodes.length;// Number of concepts is the number of nodes in the graph
    const totalLinks = graphData.links.length; // Total number of links between concepts
    const maxPossibleLinks = (totalConcepts * (totalConcepts - 1)) / 2; // Maximum possible links in a complete graph
    const density = maxPossibleLinks > 0 ? (totalLinks / maxPossibleLinks).toFixed(4) : 0; // Ratio of actual links to possible links
  
    // Calculate the total number of unique objects across all nodes.
  // Each node's label contains an "Extent" block that specifies the objects it represents.
  // Extract and count unique objects
  new Set(
    graphData.nodes.flatMap((node) => {
      // Extract the "Extent" part from the node's label using a regular expression.
      const match = node.label.match(/Extent\s*\{([^}]*)\}/);
      // If a match is found, split the contents of the "Extent" by commas and trim whitespace.
      return match 
      ? match[1]
        .split(',')
        .map((item) => item.trim()) 
        .filter((item) => item !== '') // Exclude empty strings
      : [];
    })
  ).size; // Use a Set to ensure unique objects are counted.

  // Calculate the total number of unique attributes across all nodes.
  // Each node's label contains an "Intent" block that specifies the attributes it represents.
  // Extract and count unique attributes
  const uniqueAttributes = new Set();
  const uniqueObjects = new Set();

  // Compute concept-specific metrics
    graphData.nodes.forEach((node) => {

      // Extract the "Extent" (objects) from the node's label using a regular expression
      const extentMatch = node.label.match(/Extent\s*\{([^}]*)\}/);
      
      // Extract the "Intent" part from the node's label using a regular expression.
      const intentMatch = node.label.match(/Intent\s*\{([^}]*)\}/);
      
      // Parse the extent and intent into arrays, trimming whitespace and filtering out empty values
      const extent = extentMatch ? extentMatch[1].split(',').map(e => e.trim()).filter(Boolean) : [];
      const intent = intentMatch ? intentMatch[1].split(',').map(a => a.trim()).filter(Boolean) : [];

      // Add each unique object and attribute to the respective sets
      extent.forEach(obj => uniqueObjects.add(obj));
      intent.forEach(attr => uniqueAttributes.add(attr));

      // **Concept-level Metrics**
      // Stability: Proportion of the extent size to the sum of extent and intent sizes
      const stability = (extent.length + intent.length) > 0
          ? (extent.length / (extent.length + intent.length)).toFixed(4)
          : 0;

      // Neighborhood size: Number of direct links (edges) connected to the node
      const neighborhoodSize = graphData.links.filter(link =>
          link.source.id === node.id || link.target.id === node.id
      ).length;

      // Attach the calculated metrics to the node object for later use
      node.metrics = {
          stability, // The stability of the concept
          neighborhoodSize, // Number of connections for this concept
          extentSize: extent.length, // Number of objects in the extent
          intentSize: intent.length, // Number of attributes in the intent
      };
  });

  // Return global metrics for the entire lattice

      /* If a match is found, split the contents of the "Intent" by commas and trim whitespace.
      return match 
      ? match[1]
        .split(',')
        .map((item) => item.trim()) 
        .filter((item) => item !== '') // Exclude empty strings
      : [];
    })
  ).size; // Use a Set to ensure unique attributes are counted.
*/
  // Return an object containing the calculated metrics.
    return {
      totalConcepts,
      totalObjects: uniqueObjects.size,
      totalAttributes: uniqueAttributes.size,
      density, // Density of the lattice (global connectivity)
      averageStability: (
        // Calculate the average stability of all concepts
          graphData.nodes.reduce((sum, node) => sum + parseFloat(node.metrics.stability || 0), 0) /
          totalConcepts
      ).toFixed(4),
    };
  }

let zoomBehavior; // Global zoom behavior
let selectedNodes = []; // Track selected nodes for shortest path

/**
 * Computes and assigns superconcepts and subconcepts based on graph links.
 * @param {Object} graphData - The graph data containing nodes and links.
 */
function computeSuperSubConcepts(graphData) {
  if (!graphData || !Array.isArray(graphData.nodes) || !Array.isArray(graphData.links)) {
      console.error("❌ computeSuperSubConcepts received invalid graphData:", graphData);
      return;
  }

  console.log("✅ computeSuperSubConcepts received:", graphData.nodes.length, "nodes and", graphData.links.length, "links");

  // Reset superconcepts and subconcepts
  graphData.nodes.forEach(node => {
      node.superconcepts = [];
      node.subconcepts = [];
  });

  // Assign relationships based on links
  graphData.links.forEach(link => {
      let parentNode = graphData.nodes.find(n => String(n.id) === String(link.source.id || link.source));
      let childNode = graphData.nodes.find(n => String(n.id) === String(link.target.id || link.target));

      if (!parentNode || !childNode) {
          console.warn(`⚠️ Link references invalid nodes:`, link);
          return;
      }

      // Avoid duplicates
      if (!parentNode.subconcepts.some(n => n.id === childNode.id)) {
          parentNode.subconcepts.push(childNode);
      }
      if (!childNode.superconcepts.some(n => n.id === parentNode.id)) {
          childNode.superconcepts.push(parentNode);
      }
  });

  //console.log("✅ Superconcepts and subconcepts assigned correctly.");

  // Log computed super/subconcepts
  console.log("✅ Final Node Assignments:");
  graphData.nodes.forEach(node => {
      console.log(`🔍 Node ${node.id}: Superconcepts ->`, node.superconcepts.map(n => n.id));
      console.log(`🔍 Node ${node.id}: Subconcepts ->`, node.subconcepts.map(n => n.id));
  });

}

/**
 * Updates link positions when nodes move.
 * @param {Object} graphData - The graph data containing nodes and links.
 */
function updateLinks(graphData) {
  
  selectAll('.link')
    .data(graphData.links)
    .join('line')
    .attr('class', 'link')
    .attr('x1', d => d.source.x)
    .attr('y1', d => d.source.y)
    .attr('x2', d => d.target.x)
    .attr('y2', d => d.target.y)
    .attr('stroke', d => 
      d.highlighted 
        ? GRAPH_CONFIG.link.highlightedColor 
        : d.__isConnected
          ? GRAPH_CONFIG.link.connectedColor
          : GRAPH_CONFIG.link.color)
    .attr('stroke-width', d => 
      d.highlighted 
        ? GRAPH_CONFIG.link.highlightedThickness 
        : d.__isConnected
          ? GRAPH_CONFIG.link.connectedThickness
          : GRAPH_CONFIG.link.thickness
      );

}

/**
 * Adds zooming and panning to the graph.
 * @param {Object} svg - The SVG element containing the graph.
 * @param {Object} graphData - The graph data containing nodes and links.
 */
function addInteractivity(svg, graphData) {
  if (!graphData || !Array.isArray(graphData.nodes) || !Array.isArray(graphData.links)) {
    console.error("❌ addInteractivity() received invalid graphData:", graphData);
    return;
  }

  // Ensure graphData has metrics before interactivity is added
  calculateMetrics(graphData);

  const g = svg.select('.graph-transform');
  if (g.empty()) {
    console.error("❌ Graph transform group `.graph-transform` not found!");
    return;
  }

  zoomBehavior = zoom()
    .scaleExtent([0.1, 5])
    .on('zoom', (event) => {
      g.attr('transform', event.transform);
    });

  svg.call(zoomBehavior);
}

/**
 * Adds node interactivity: dragging, selection, highlighting, and tooltips.
 * @param {Object} nodeGroup - D3 selection of nodes.
 * @param {Object} linkGroup - D3 selection of links.
 * @param {Object} graphData - Graph data with nodes and links.
 */
function addNodeInteractivity(nodeGroup, linkGroup, graphData) {
  if (!nodeGroup || nodeGroup.empty()) {
    console.error("❌ addNodeInteractivity() received an invalid nodeGroup:", nodeGroup);
    return;
  }

  // Drag Behavior
  nodeGroup.call(drag()
   .on("start", function(event, d) {
      select(this).raise();// Bring the dragged node to the front
    })
    .on("drag",function(event, d){
    
    // Compute movement constraints (node cannot move beyond its parents or children in y-axis)
    let minY = d.superconcepts.length > 0 ? Math.max(...d.superconcepts.map(n => n.y)) : 0;
    let maxY = d.subconcepts.length > 0 ? Math.min(...d.subconcepts.map(n => n.y)) : Infinity;
        
      d.x = event.x;
      d.y = Math.max(minY + 20, Math.min(event.y, maxY -25)); // Add some padding for constrained y-axis movement
      
      // ✅ Ensure both attributes (`cx`, `cy`) and transformation (`translate()`) are updated
      select(this)
        .attr("transform", `translate(${d.x}, ${d.y})`);  // Move the node visually

      // ✅ Update edges dynamically
       updateLinks(graphData);
    })
    .on("end", (event, d) => {
        updateNodes(graphData);
    })
    
  );

  // **Click-to-Zoom & Highlight Node**
  nodeGroup.on('click', function (event, clickedNode) {
    
    event.stopPropagation();

    console.log(`📌 Node Clicked: ${clickedNode.id}`);

    // Ensure clickedNode exists
    if (!clickedNode) {
      console.error("❌ Click event fired but no node was found!");
      return;
  }


    const svg = select("svg");
    if (!svg) return;
   if (!zoomBehavior) {
      console.error("❌ zoomBehavior is not initialized!");
      return;
    }
  
    const newScale = 2.5;
    const newX = -clickedNode.x * newScale + svg.attr('width') / 2;
    const newY = -clickedNode.y * newScale + svg.attr('height') / 2;

    svg.transition()
      .duration(600)
      .call(zoomBehavior.transform, identity.translate(newX, newY).scale(newScale));

    // ✅ Highlight clicked node and reset others
    nodeGroup.selectAll("circle")
        .attr("fill", d => d.id === clickedNode.id 
          ? GRAPH_CONFIG.node.selectedColor 
          : GRAPH_CONFIG.node.color);
   
    // **Highlight Links connected to the Selected Node**
    if (!linkGroup || linkGroup.size() === 0) {
      console.error("❌ linkGroup is not initialized properly. Cannot update link styles.");
      return;
  }

  // Update selectedNodes
  selectedNodes.push(clickedNode.id);
  if (selectedNodes.length > 2) selectedNodes = [clickedNode.id]; // reset if over 2

    // Reset links before any state change
    graphData.links.forEach(link => {
      link.highlighted = false;
      link.__isConnected = false;
    });

    graphData.nodes.forEach(node => {
      node.color = GRAPH_CONFIG.node.color;
    });

    //selectedNodes.push(clickedNode.id);


  // If it's the first click: show connected edges
  if (selectedNodes.length === 1) {
  // ✅ Store highlight state directly in link data
    graphData.links.forEach(link => {
      const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
      const targetId = typeof link.target === 'object' ? link.target.id : link.target;
      
      if (sourceId === clickedNode.id || targetId === clickedNode.id) {
            link.__isConnected = true;
          }
    });

  // Highlight clicked node
  clickedNode.color = GRAPH_CONFIG.node.selectedColor;

  // ✅ Re-render link styles based on highlight state
  updateLinks(graphData);
  updateNodes(graphData);

    // **Ensure Node Metrics Exist**
    if (!clickedNode.metrics) {
      console.warn(`⚠️ Node ${clickedNode.id} has missing metrics. Recalculating...`);
      calculateMetrics(graphData);
    }

    // **Format Superconcepts & Subconcepts**
  const superconceptsInfo = clickedNode.superconcepts && clickedNode.superconcepts.length > 0
    ? clickedNode.superconcepts.map(node => `${node.id} (${node.label || 'No Label'})`).join(', ')
    : 'None';

  const subconceptsInfo = clickedNode.subconcepts && clickedNode.subconcepts.length > 0
      ? clickedNode.subconcepts.map(node => `${node.id} (${node.label || 'No Label'})`).join(', ')
      : 'None';

    console.log("🔍 Superconcepts:", superconceptsInfo);
    console.log("🔍 Subconcepts:", subconceptsInfo);

    // **Display Node Details**
    select('#selected-node-info').html(`
      <strong>Selected Node</strong><br>
      ID: ${clickedNode.id}<br>
      Label: ${clickedNode.label || 'No Label'}<br>
      <strong>Extent Size:</strong> ${clickedNode.metrics.extentSize}<br>
      <strong>Intent Size:</strong> ${clickedNode.metrics.intentSize}<br>
      <strong>Stability:</strong> ${clickedNode.metrics.stability}<br>
      <strong>Neighborhood Size:</strong> ${clickedNode.metrics.neighborhoodSize}<br>
      <strong>Superconcepts:</strong> ${superconceptsInfo || 'None'}<br>
      <strong>Subconcepts:</strong> ${subconceptsInfo || 'None'}
    `);

    return; // Prevent shortest path logic
  }

    // ** Second Click:Shortest Path Selection**
    //selectedNodes.push(clickedNode.id);
    /*
    if (selectedNodes.length === 2) {
      //const path = findShortestPath(graphData, selectedNodes[0], selectedNodes[1]);
      const [sourceId, targetId] = selectedNodes;
      const path = findShortestPath(graphData, sourceId, targetId);
      console.log('Shortest Path:', path);

    if (!path || path.length === 0) {
      alert('No path found between the selected nodes.');
      d3.select('#shortest-path-display').html('No path found between the selected nodes.');
      selectedNodes = [];
      return;
    }

    if (path.length > 0) {
    graphData.links.forEach(link => {
      link.highlighted = false;
      link.__isConnected = false;
    });

  graphData.nodes.forEach(node => {
    node.color = path.includes(node.id) ? "orange" : GRAPH_CONFIG.node.color;
  });

  const pathEdges = new Set();
  for (let i = 0; i < path.length - 1; i++) {
    const a = String(path[i]);
    const b = String(path[i + 1]);
    pathEdges.add(`${a}-${b}`);
    pathEdges.add(`${b}-${a}`);
  }

  const formatNode = (id) => {
    const node = graphData.nodes.find(n => n.id === id);
    if (!node) return id;
    if (!node.label || node.label === `Concept ${id}`) return id;
    return `${node.id} (${node.label})`;
  };

  const pathContext = {
    from: path[0],
    to: path[path.length - 1],
    fullPath: path
  };

  setTimeout(() => {
    updateLinks(graphData);
    updateNodes(graphData);

    d3.selectAll("circle")
      .attr("fill", d => path.includes(d.id) ? "orange" : GRAPH_CONFIG.node.color);

    d3.selectAll(".link")
      .attr("stroke", d => {
        const sourceId = String(d.source.id ?? d.source);
        const targetId = String(d.target.id ?? d.target);
        const key1 = `${sourceId}-${targetId}`;
        const key2 = `${targetId}-${sourceId}`;
        return (pathEdges.has(key1) || pathEdges.has(key2))
          ? GRAPH_CONFIG.link.highlightedColor
          : GRAPH_CONFIG.link.color;
      })
      .attr("stroke-width", d => {
        const sourceId = String(d.source.id ?? d.source);
        const targetId = String(d.target.id ?? d.target);
        const key1 = `${sourceId}-${targetId}`;
        const key2 = `${targetId}-${sourceId}`;
        return (pathEdges.has(key1) || pathEdges.has(key2))
          ? GRAPH_CONFIG.link.highlightedThickness
          : GRAPH_CONFIG.link.thickness;
      });

    d3.select('#shortest-path-display').html(`
      Shortest path between <strong>${pathContext.from}</strong> and <strong>${pathContext.to}</strong>: 
      ${pathContext.fullPath.join(' → ')} <br>
      ${pathContext.fullPath.map(formatNode).join(' → ')}
    `);

    selectedNodes = [];
  }, 0);

} else {
  alert('No path found between the selected nodes.');
  d3.select('#shortest-path-display').html('No path found between the selected nodes.');
}

  }
*/

});

  // **Hover Tooltip**
  nodeGroup
    .on('mouseover', function (event, d) {
      select('#tooltip')
        .style('left', `${event.pageX + 10}px`)
        .style('top', `${event.pageY + 10}px`)
        .style('display', 'inline-block')
        .html(`
          <strong>ID:</strong> ${d.id}<br>
          <strong>Label:</strong> ${d.label || 'No Label'}<br>
          <strong>Level:</strong> ${d.level || 'N/A'}
        `);
    })
    .on('mouseout', () => {
      select('#tooltip').style('display', 'none');
    });

  // **Reset Graph on Double-click**
 /* nodeGroup.on('dblclick', () => {
    nodeGroup.selectAll("circle").attr('fill', GRAPH_CONFIG.node.color);
    linkGroup.attr('stroke', GRAPH_CONFIG.link.color).attr('stroke-width', GRAPH_CONFIG.link.thickness);
    d3.select('#selected-node-info').html('Click a node to see its details.');
    d3.select('#shortest-path-display').html('Click two nodes to calculate the shortest path.');
  });
  */
  // **Reset Graph on Double-click**
nodeGroup.on('dblclick', () => {
  // Reset node colors
  //nodeGroup.selectAll("circle").attr('fill', GRAPH_CONFIG.node.color);

  selectedNodes = [];

  // Reset link state
  graphData.links.forEach(link => {
    link.highlighted = false;
    link.__isConnected = false;
  });

  graphData.nodes.forEach(node => node.color = GRAPH_CONFIG.node.color);

  // Redraw links with default styles
  updateLinks(graphData);
  updateNodes(graphData);

  // Clear node info and path text
  select('#selected-node-info').html('Click a node to see its details.');
  select('#shortest-path-display').html('Click two nodes to calculate the shortest path.');
});

}

// src/lattice/reducedLabeling.js 


/**
 * Extracts extent and intent from the node label.
 * @param {Object} node - The node object containing the `label`.
 * @returns {Object} - An object containing `extent` and `intent` arrays.
 */
function parseNodeLabel(node) {
    if (!node.label) {
        console.warn(`⚠️ Missing label for node ${node.id}. Defaulting to empty extent/intent.`);
        return { extent: [], intent: [] };
    }

    // Extract Full Extent
    const extentMatch = node.label.match(/Extent\s*\{([^}]*)\}/);
    const extent = extentMatch
        ? extentMatch[1].split(',').map(e => e.trim()).filter(e => e !== '')
        : [];

    // Extract Full Intent
    const intentMatch = node.label.match(/Intent\s*\{([^}]*)\}/);
    const intent = intentMatch
        ? intentMatch[1].split(',').map(i => i.trim()).filter(i => i !== '')
        : [];

    return { extent, intent };
}

/**
 * Computes reduced labels for nodes based on their superconcepts and subconcepts.
 * Ensures intents and extents are only assigned once to their valid concepts.
 * @param {Array} nodes - The array of nodes in the concept lattice.
 * @param {Array} links - The array of links connecting nodes.
 */
function computeReducedLabels(nodes, links) {
    console.log(`✅ computeReducedLabels received: ${nodes?.length || 0} nodes, ${links?.length || 0} links`);

    if (!Array.isArray(nodes) || !Array.isArray(links)) {
        console.error("❌ computeReducedLabels received invalid data!", { nodes, links });
        return;
    }

    // Identify the top concept (⊤) -> has no superconcepts
    const topConcept = nodes.find(node => node.superconcepts.length === 0);
    if (!topConcept) {
        console.error("❌ No top concept found! Check your graph data.");
    } else {
        console.log("✅ Top Concept Identified:", topConcept.id);
    }

    // Identify the bottom concept (⊥) -> has no subconcepts
    const bottomConcept = nodes.find(node => node.subconcepts.length === 0);
    if (!bottomConcept) {
        console.error("❌ No bottom concept found! Check your graph data.");
    } else {
        console.log("✅ Bottom Concept Identified:", bottomConcept.id);
    }


    // Step 1: Ensure every node has necessary properties
    nodes.forEach(node => {
        if (!node || typeof node !== "object" || !node.id) {
            console.warn(`⚠️ Skipping invalid node:`, node);
            return;
        }

        const { extent, intent } = parseNodeLabel(node);
        node.extent = extent || [];
        node.intent = intent || [];

        node.superconcepts = [];
        node.subconcepts = [];
        node.fullExtent = new Set(node.extent);
        node.fullIntent = new Set(node.intent);
        node.reducedExtent = [];
        node.reducedIntent = [];
    });

    console.log("✅ Nodes after extent/intent processing:", nodes);

    // Step 2: Compute superconcepts & subconcepts
    computeSuperSubConcepts({ nodes, links });

    // Step 3: Compute full intent (top-down propagation) and full extent (bottom-up propagation)
    nodes.forEach(node => {
        // Initialize intent and extent properties
        node.fullIntent = new Set(node.intent || []);
        node.fullExtent = new Set(node.extent || []);

        // Propagate intent from superconcepts
         // Ensure intent propagation starts from the correct top concept
        if (node !== topConcept) {
        node.superconcepts?.forEach(superconcept => {
            if (superconcept.fullIntent) {
                superconcept.fullIntent.forEach(attr => node.fullIntent.add(attr));
            }
        });
    }
        // Ensure extent propagation starts from the correct bottom concept
        if (node !== bottomConcept) {
        node.subconcepts?.forEach(subconcept => {
            if (subconcept.fullExtent) {
                subconcept.fullExtent.forEach(obj => node.fullExtent.add(obj));
            }
        });
    }
        // Convert sets to arrays before storing
        node.fullIntent = [...node.fullIntent];
        node.fullExtent = [...node.fullExtent];
    });

    console.log("✅ Nodes after full extent/intent computation:", nodes);

    // Step 4: Compute reduced labels
   /* nodes.forEach(node => {
        // Compute reducedExtent by excluding objects inherited from subconcepts
        node.reducedExtent = node.fullExtent.filter(obj => 
            !node.subconcepts.some(sub => sub.fullExtent.includes(obj))
        );

        // Compute reducedIntent by excluding attributes inherited from superconcepts
        node.reducedIntent = node.fullIntent.filter(attr => 
            !node.superconcepts.some(sup => sup.fullIntent.includes(attr))
        );

        console.log(`✅ Node ${node.id} Updated Reduced Label:`, {
            reducedExtent: node.reducedExtent,
            reducedIntent: node.reducedIntent
        });
    });
    */ 
   
 // Step 4: Compute reduced labels
    nodes.forEach(node => {
        if (!node) {
            console.warn("⚠️ Skipping undefined node in computeReducedLabels.");
            return;
        }

    // Compute reducedExtent by excluding inherited objects
node.reducedExtent = node.fullExtent.filter(obj => {
    return !node.subconcepts.some(sub => 
        sub.fullExtent.includes(obj) || sub.reducedExtent.includes(obj)
    );
});

// Compute reducedIntent by excluding inherited attributes
node.reducedIntent = node.fullIntent.filter(attr => {
    return !node.superconcepts.some(sup => 
        sup.fullIntent.includes(attr) || sup.reducedIntent.includes(attr)
    );
});

console.log(`✅ Node ${node.id}:`, {
    reducedExtent: node.reducedExtent,
    reducedIntent: node.reducedIntent
});
});
    console.log("�� Final Reduced Labels Computed:", nodes);    

}

// src/lattice/layering.js


/**
 * Assigns nodes to hierarchical layers.
 * Use predefined `level` values from the JSON if available.
 * If no levels exist, it computes layers dynamically using the Coffman-Graham algorithm.
 * @param {Object} graphData - The graph data containing nodes and links.
 * @returns {Array} - An array of layers, each containing nodes.
 * @throws {Error} - If the graph data is invalid or malformed.
 */
function assignLayers(graphData) {
    // Check if graph data is valid and has a nodes array
    if (!graphData || !Array.isArray(graphData.nodes)) {
        throw new Error("Invalid graph data: 'nodes' must be an array.");
    }

    // Log the level info of all nodes before processing
     console.log("📌 Node Levels Before Layer Assignment:", graphData.nodes.map(n => ({ id: n.id, level: n.level }))); //Check for missing or incorrect layer assignments
    
    // ✅ Ensure  relationships between concepts (Super/Subconcepts) are computed first
    computeSuperSubConcepts(graphData);

    const layers = [];
    const { width, height, padding } = GRAPH_CONFIG.dimensions;// Canvas adjustable

    // Check if all nodes have a `level` property (predefined layering)
    const usePredefinedLevels = graphData.nodes.every(node => node.hasOwnProperty("level"));

    if (usePredefinedLevels) {
        // Group nodes by their `level` property. Calculate layer spacing dynamically
        graphData.nodes.forEach((node) => {
            if (node.level === undefined) node.level = 1; // Level 1 corresponds to layer 0
            const layerIndex = node.level - 1;
            if (!layers[layerIndex]) layers[layerIndex] = [];
            layers[layerIndex].push(node);
        });
    } else {
        // If no predefined levels, use Coffman-Graham to compute layers
        console.log("⚠️ Computing layers dynamically using Coffman-Graham algorithm...");

        return computeCoffmanGrahamLayers(graphData);
    }

    // === Post-processing steps ===

        // Assign vertical positions to nodes within each layer
        adjustLayerSpacing(layers, { height, padding });

        // Sort nodes horizontally within each layer to reduce edge crossings
        orderVerticesWithinLayers(layers, graphData);

        // Fine-tune horizontal positions to align with parent nodes
        adjustNodePositions(layers, width);

        // Improve alignment for nodes that are in between chains of concepts
        straightenMidpoints(layers);

        // Avoid visual overlap between nodes and unrelated edges
        disambiguateEdgeProximity(layers, graphData);

        // Return the processed layered structure

    return layers;
}

/**
 * Computes layers using the Coffman-Graham algorithm for topological sorting.
 * Each node is placed in the lowest possible layer where all parents are already assigned.
 * @param {Object} graphData - Input graph with node hierarchy
 * @returns {Array} layers - Computed layering
 */
function computeCoffmanGrahamLayers(graphData) {
    const layers = [];
    const placedNodes = new Set();
    
     // Step 1: Topological sort of the graph
    const sortedNodes = topologicalSort(graphData);

    // Step 2: Place each node in the first valid layer
    sortedNodes.forEach((node) => {
        let layer = 0;

        // Find the lowest layer where all parent nodes have already been placed
        while (true) {
            const parents = node.superconcepts || [];

            const allParentsPlaced = parents.every(parent =>
                layers.slice(0, layer).some(l => l.some(n => n.id === parent.id))
            );

            if (allParentsPlaced) break;
            layer++;
        }

        // Initialize new layer if needed and assign the node
        if (!layers[layer]) layers[layer] = [];
        
        // Place node and mark it as placed
        layers[layer].push(node);
        placedNodes.add(node.id);

        // Estimate Y-position of the node within the layout
        //node.y = (layer + 1) * (height / (layers.length + 1));
    });

    return layers;
}

/**
 * Performs a topological sort on the graph using DFS.
 * Ensures parents are visited before children.
 * @param {Object} graphData - The graph containing nodes with superconcepts
 * @returns {Array} - Topologically sorted nodes
 */
function topologicalSort(graphData) {
    const visited = new Set();
    const result = [];

    function dfs(node) {
        if (visited.has(node.id)) return;
        visited.add(node.id);
        (node.superconcepts || []).forEach(dfs);
        result.push(node);
    }

    graphData.nodes.forEach(dfs);
    return result.reverse(); // Post-order reversed gives topological sort
}

/**
 * Orders nodes in each layer by computing barycenters to reduce crossings.
 * Alternates between downward and upward passes.
 * @param {Array} layers - Grouped node layers
 * @param {Object} graphData - Graph structure including links
 */
function orderVerticesWithinLayers(layers, graphData) {
    const numPasses = 4;
    for (let pass = 0; pass < numPasses; pass++) {
        // Alternate direction each pass
        const downward = pass % 2 === 0;
        const indices = downward
            ? [...Array(layers.length).keys()] // top-down pass
            : [...Array(layers.length).keys()].reverse(); // bottom-up pass

        indices.forEach(layerIndex => {
            const layer = layers[layerIndex];

            // Compute barycenter for each node based on neighbors
            layer.forEach((node) => {
                node.barycenter = computeBarycenterFromNeighbors(node, graphData, downward);
            });

            // Sort nodes by barycenter or fallback to x
            layer.sort((a, b) => {
                const aVal = a.barycenter !== undefined ? a.barycenter : a.x;
                const bVal = b.barycenter !== undefined ? b.barycenter : b.x;
                return aVal - bVal;
            });

            // Reassign horizontal positions evenly
            const layerWidth = GRAPH_CONFIG.dimensions.width - 2 * GRAPH_CONFIG.dimensions.padding;
            const xSpacing = layerWidth / (layer.length + 1);

            layer.forEach((node, index) => {
                node.x = GRAPH_CONFIG.dimensions.padding + (index + 1) * xSpacing;
            });
        });
    }
}

/**
 * Computes the average x-position of neighboring nodes for alignment.
 * Used in ordering nodes within a layer.
 * @param {Object} node - Current node
 * @param {Object} graphData - Full graph structure
 * @param {boolean} downward - Direction of neighbor lookup
 * @returns {number} barycenter - Mean x-value of neighbors
 */
function computeBarycenterFromNeighbors(node, graphData, downward) {
    const links = graphData.links;

    // Select either parent or child nodes depending on pass direction
    const neighbors = links
        .filter(link => downward ? link.target.id === node.id : link.source.id === node.id)
        .map(link => downward ? link.source : link.target);

     // Return average x if neighbors exist, else use current position
    if (neighbors.length === 0) return node.x;
    return neighbors.reduce((sum, n) => sum + n.x, 0) / neighbors.length;
}

/**
 * Adjusts vertical spacing between layers using a fixed or dynamic approach.
 * @param {Array} layers - Array of layer groups
 * @param {Object} dimensions - Graph height and padding
 */

function adjustLayerSpacing(layers, { height, padding }) {
    const numLayers = layers.length;
    if (numLayers === 0) return;
    const minSpacing = 80;
    const maxSpacing = 300;

    const pressures = layers.map((layer, i) => {
        let fanIn = 0;
        let fanOut = 0;

        layer.forEach(node => {
            fanIn += (node.superconcepts || []).length;
            fanOut += (node.subconcepts || []).length;
        });

        return fanIn + fanOut; // total connections
    });

    // Normalize pressures
    const maxPressure = Math.max(...pressures);
    const minPressure = Math.min(...pressures);
    const pressureRange = maxPressure - minPressure || 1;

    const layerSpacings = pressures.map(p => {
        const normalized = (p - minPressure) / pressureRange; // 0..1
        return minSpacing + normalized * (maxSpacing - minSpacing);
    });

    // Compute cumulative y position
    let currentY = padding;
    for (let i = 0; i < layers.length; i++) {
        const layer = layers[i];
        layer.forEach(node => {
            node.y = currentY;
        });
        currentY += layerSpacings[i];
    }

    console.log("✅ Adaptive vertical layer spacing based on structural pressure.");
}

/**
 * Distributes X positions of nodes within each layer.
 * Anchors positions based on average parent x-coordinates.
 * Prevents horizontal overlap and false alignment with unrelated edges.
 * Special care is taken for layers with only one node to avoid misleading vertical stacking.
 * @param {Array} layers - Grouped layer nodes
 * @param {number} width - Canvas width
 * @param {number} padding - Padding to preserve margins
 */
/*
export function adjustNodePositions(layers, width, padding) {
    const maxShiftRatio = 0.4;
    const minSpacing = 150;
    const minGap = 50; // Min space between nodes
    const collisionThreshold = 25;

    layers.forEach((layer, layerIndex) => {
        const layerSize = layer.length;
        if (layerSize === 0) return;

        // 🔹 Handle single-node layer (top node)
        if (layerSize === 1) {
            const node = layer[0];
            const parents = node.superconcepts || [];
            const children = node.subconcepts || [];

            let baseX = width / 2;
            if (parents.length > 0) {
                baseX = parents.reduce((sum, p) => sum + p.x, 0) / parents.length;
            }

            const parentSpread = Math.max(...parents.map(p => p.x), 0) - Math.min(...parents.map(p => p.x), 0);
            const childSpread = Math.max(...children.map(c => c.x), 0) - Math.min(...children.map(c => c.x), 0);

            const needsNudge = (parents.length && children.length && parentSpread < 10 && childSpread < 10);
            node.x = needsNudge ? baseX + (layerIndex % 2 === 0 ? -50 : 50) : baseX;
            return;
        }

        // Check for shared parents
        const allParents = layer.map(n => n.superconcepts?.[0]?.id).filter(Boolean);
        const sharedParentId = allParents.every(id => id === allParents[0]) ? allParents[0] : null;

        // More spacing for upper layers
        const baseFactor = 1.2 + (1 - layerIndex / layers.length) * 1.2;
        const nodeFactor = Math.min(1.0 + (layerSize / 10), 3.0);
        
        // Enforce minimum spacing between nodes
        const xSpacing = minSpacing * baseFactor * nodeFactor;

        // Compute total width of the layer based on that spacing
        const layerWidth = (layerSize - 1) * xSpacing;
        const startX = (width - layerWidth) / 2;


        // 🎯 Step 1: Default spacing
        layer.forEach((node, i) => {
            node.x = startX + (i + 1) * xSpacing;
        });

        // 🧭 Step 2:Refine based on parents (barycenter shift)
        if (sharedParentId) {
            // All nodes share one parent → spread evenly around that parent
            const sharedParent = layer[0].superconcepts.find(p => p.id === sharedParentId);
            const centerX = sharedParent?.x ?? (width / 2);
            const spreadWidth = Math.max(minSpacing * (layerSize - 1), 200);
            const newSpacing = spreadWidth / (layerSize - 1);
            const spreadStartX = centerX - spreadWidth / 2;

            layer.forEach((node, i) => {
                node.x = spreadStartX + i * newSpacing;
            });

            console.log(`📐 Layer ${layerIndex}: Spread evenly (1 common parent: ${sharedParentId})`);
        } else {
            // Standard barycenter shift
            layer.forEach((node) => {
                const parents = node.superconcepts || [];
                if (!parents.length) return;

                const avgParentX = parents.reduce((sum, p) => sum + p.x, 0) / parents.length;
                const shift = node.x - avgParentX;
                const maxShift = xSpacing * maxShiftRatio;
                const clamped = Math.max(-maxShift, Math.min(shift, maxShift));
                node.x = avgParentX + clamped;
            });
        }

        // 🚫 Step 3: Collision resolution
        let hasOverlap = true;
        let iteration = 0;
        const maxIterations = 10;

        while (hasOverlap && iteration < maxIterations) {
            hasOverlap = false;
            for (let i = 1; i < layer.length; i++) {
                const left = layer[i - 1];
                const right = layer[i];
                const dx = right.x - left.x;

                if (dx < minGap) {
                    const shift = (minGap - dx) / 2;
                    left.x -= shift;
                    right.x += shift;
                    hasOverlap = true;
                }
            }
            iteration++;
        }

        // 🎯 Step 4: Recentering the entire layer
        const minX = Math.min(...layer.map(n => n.x));
        const maxX = Math.max(...layer.map(n => n.x));
        const layerMid = (minX + maxX) / 2;
        const viewMid = width / 2;
        const offset = viewMid - layerMid;

        layer.forEach(n => {
            n.x += offset;
        });
    });

    console.log("✅ Final node positions assigned with alignment, spacing, and centering.");
}
*/

function adjustNodePositions(layers, width, padding) {
    const maxShiftRatio = 0.4;
    const minSpacing = 100;
    const minGap = 50;

    layers.forEach((layer, layerIndex) => {
        const layerSize = layer.length;
        if (layerSize === 0) return;

        // 🔹 Special case: Top or Bottom node alone
        if (layerSize === 1) {
            const node = layer[0];
            const parents = node.superconcepts || [];
            const children = node.subconcepts || [];

            let baseX = width / 2;

            if (parents.length > 0) {
                baseX = parents.reduce((sum, p) => sum + p.x, 0) / parents.length;
            }

            const parentSpread = Math.max(...parents.map(p => p.x), 0) - Math.min(...parents.map(p => p.x), 0);
            const childSpread = Math.max(...children.map(c => c.x), 0) - Math.min(...children.map(c => c.x), 0);

            const needsNudge = (parents.length && children.length && parentSpread < 10 && childSpread < 10);
            node.x = needsNudge ? baseX + (layerIndex % 2 === 0 ? -50 : 50) : baseX;
            return;
        }

        // 🔄 Step 1: Default x-spacing based on layer width
        const nodeFactor = Math.min(1.0 + (layerSize / 12), 3.5);
        const baseFactor = 1.3 + (1 - layerIndex / layers.length) * 1.2;
        const xSpacing = minSpacing * nodeFactor * baseFactor;

        const layerWidth = (layerSize - 1) * xSpacing;
        const startX = (width - layerWidth) / 2;

        layer.forEach((node, i) => {
            node.x = startX + i * xSpacing;
        });

        // 🧠 Step 2: Parent-based barycenter adjustment
        const allParents = layer.map(n => n.superconcepts?.[0]?.id).filter(Boolean);
        const sharedParentId = allParents.every(id => id === allParents[0]) ? allParents[0] : null;

        if (sharedParentId) {
            const sharedParent = layer[0].superconcepts.find(p => p.id === sharedParentId);
            const centerX = sharedParent?.x ?? (width / 2);
            const spreadWidth = Math.max(minSpacing * (layerSize - 1), 200);
            const newSpacing = spreadWidth / (layerSize - 1);
            const spreadStartX = centerX - spreadWidth / 2;

            layer.forEach((node, i) => {
                node.x = spreadStartX + i * newSpacing;
            });

            console.log(`📐 Layer ${layerIndex}: Centered under shared parent ${sharedParentId}`);
        } else {
            layer.forEach(node => {
                const parents = node.superconcepts || [];
                if (!parents.length) return;

                const avgParentX = parents.reduce((sum, p) => sum + p.x, 0) / parents.length;
                const shift = node.x - avgParentX;
                const maxShift = xSpacing * maxShiftRatio;
                const clamped = Math.max(-maxShift, Math.min(shift, maxShift));
                node.x = avgParentX + clamped;
            });
        }

        // 🚫 Step 3: Resolve overlaps
        let hasOverlap = true;
        let iteration = 0;
        const maxIterations = 10;

        while (hasOverlap && iteration < maxIterations) {
            hasOverlap = false;
            for (let i = 1; i < layer.length; i++) {
                const left = layer[i - 1];
                const right = layer[i];
                const dx = right.x - left.x;

                if (dx < minGap) {
                    const shift = (minGap - dx) / 2;
                    left.x -= shift;
                    right.x += shift;
                    hasOverlap = true;
                }
            }
            iteration++;
        }

        // 🎯 Step 4: Recenter layer
        const minX = Math.min(...layer.map(n => n.x));
        const maxX = Math.max(...layer.map(n => n.x));
        const layerMid = (minX + maxX) / 2;
        const viewMid = width / 2;
        const offset = viewMid - layerMid;

        layer.forEach(n => {
            n.x += offset;
        });
    });

    console.log("✅ Final node positions adjusted for alignment and symmetry.");
}

/**
 * Straightens nodes that fall between aligned parent and child chains.
 * Only adjusts if deviation is small to preserve layout stability.
 * @param {Array} layers - All layered nodes
 */
/*
export function straightenMidpoints(layers) {
    const alignmentThreshold = 30; // Max horizontal spread allowed among parents/children to be considered aligned
    const correctionThreshold = 100; // Max distance a node can deviate from the average before adjustment is skipped

    for (let i = 1; i < layers.length - 1; i++) {
        const layer = layers[i];

        layer.forEach(node => {
            const parents = node.superconcepts || []; // Collect parent nodes (previous layer)
            const children = node.subconcepts || []; // Collect child nodes (next layer)

            // Extract x positions for all parents and children
            const allParentX = parents.map(p => p.x);
            const allChildX = children.map(c => c.x);

            // Compute horizontal spread of parents and children
            const parentSpread = Math.max(...allParentX) - Math.min(...allParentX);
            const childSpread = Math.max(...allChildX) - Math.min(...allChildX);

            // Check if both parents and children are roughly aligned horizontally
            if ((parents.length >= 1 && children.length >= 1) && parentSpread < alignmentThreshold && childSpread < alignmentThreshold) {
                // Calculate the average x position of parents and children
                const avgParentX = parents.reduce((sum, p) => sum + p.x, 0) / parents.length;
                const avgChildX = children.reduce((sum, c) => sum + c.x, 0) / children.length;
                
                // Use the midpoint between parent and child average as the target x
                const avgX = (avgParentX + avgChildX) / 2;
                const deviation = Math.abs(avgX - node.x);
                
                 // Apply adjustment only if deviation is within safe bounds
                if (deviation < correctionThreshold) {
                    node.x = avgX;
                }
            }
        });
    }

    console.log("✅ Applied refined midpoint straightening for nearly aligned chains.");
}
*/
function straightenMidpoints(layers) {
    const alignmentSpreadThreshold = 40;     // Allow some horizontal deviation
    const correctionThreshold = 120;         // Only adjust if node isn't too far off
    const minConnected = 2;                  // Minimum parents/children to consider

    for (let i = 1; i < layers.length - 1; i++) {
        const layer = layers[i];

        layer.forEach(node => {
            const parents = node.superconcepts || [];
            const children = node.subconcepts || [];

            if (parents.length < minConnected || children.length < minConnected) return;

            const parentXs = parents.map(p => p.x);
            const childXs = children.map(c => c.x);

            const parentSpread = Math.max(...parentXs) - Math.min(...parentXs);
            const childSpread = Math.max(...childXs) - Math.min(...childXs);

            // Check if this node is structurally centered
            const alignedParents = parentSpread < alignmentSpreadThreshold;
            const alignedChildren = childSpread < alignmentSpreadThreshold;

            if (alignedParents && alignedChildren) {
                const avgParentX = parentXs.reduce((a, b) => a + b, 0) / parentXs.length;
                const avgChildX = childXs.reduce((a, b) => a + b, 0) / childXs.length;
                const avgX = (avgParentX + avgChildX) / 2;

                const deviation = Math.abs(node.x - avgX);

                if (deviation < correctionThreshold) {
                    node.x = avgX;
                }
            }
        });
    }

    console.log("✅ Improved midpoint straightening for aligned concept chains.");
}

/**
 * Detects and resolves visual conflicts between unrelated links and nearby nodes.
 * Prevents ambiguous overlaps by nudging interfering nodes.
 * @param {Array} layers - All node layers
 * @param {Object} graphData - Graph structure including links
 */

function disambiguateEdgeProximity(layers, graphData) {
    const disambiguationThreshold = 20; // Distance at which overlap is considered problematic
    const nudgeAmount = 25;  // Horizontal offset applied to separate conflicting node

    const links = graphData.links;
    const allNodes = layers.flat(); // Flatten layers into a single array of nodes

    // Perform two passes for better spacing correction
    for (let pass = 0; pass < 2; pass++) {
    allNodes.forEach(node => {
        // Build a set of node IDs that are connected (directly related)
        const connectedIds = new Set([
            ...node.superconcepts.map(n => n.id),
            ...node.subconcepts.map(n => n.id),
            node.id
        ]);

        links.forEach(link => {
            // Skip this link if it is directly related to the node
            if (connectedIds.has(link.source.id) || connectedIds.has(link.target.id)) return;

            // Project node onto the line segment and measure distance
            const x1 = link.source.x;
            const y1 = link.source.y;
            const x2 = link.target.x;
            const y2 = link.target.y;
            const x0 = node.x;
            const y0 = node.y;

            // Compute projection of node onto the edge
            const dx = x2 - x1;
            const dy = y2 - y1;
            const lenSq = dx * dx + dy * dy;
            if (lenSq === 0) return; // Avoid division by zero for degenerate edge

            const t = ((x0 - x1) * dx + (y0 - y1) * dy) / lenSq; // projection scalar
            const tClamped = Math.max(0, Math.min(1, t)); // restrict projection to edge segment
            const projX = x1 + tClamped * dx;
            const projY = y1 + tClamped * dy;

            const dxProj = projX - x0;
            const dyProj = projY - y0;
            // Compute distance between node and projected point
            const dist = Math.sqrt(dxProj ** 2 + dyProj ** 2);

            // Additional criteria: if vertical distance is small, increase repulsion
            const verticalBias = Math.abs(dyProj) < 40 ? 1.5 : 1.0;

            // Push node horizontally if too close to unrelated edge
            if (dist < disambiguationThreshold * verticalBias) {
                const offset = (x0 < projX ? -1 : 1);
                node.x += offset * nudgeAmount ;
            }
        });
    });
   
    }
    console.log("✅ Disambiguated visual overlap between nodes and unrelated edges.");
}

// src/lattice/rendering.js

/**
 * Estimates the memory usage of a JavaScript object by serializing it to JSON.
 * Skips circular references like 'superconcepts' and 'subconcepts'.
 *
 * @param {Object} obj - The object to estimate memory usage for.
 * @returns {Object} - Estimated memory in bytes, kilobytes, and megabytes.
 */
function estimateMemoryUsage(obj) {
  // Remove circular references before serialization
  const cleaned = JSON.parse(JSON.stringify(obj, (key, value) => {
    if (key === 'superconcepts' || key === 'subconcepts') {
      return undefined;
    }
    return value;
  }));

  // Serialize cleaned object
  const json = JSON.stringify(cleaned);  // ✅ Use cleaned object here
  const bytes = new Blob([json]).size;
  const kb = bytes / 1024;
  const mb = kb / 1024;

  return {
    bytes,
    kb: kb.toFixed(2),
    mb: mb.toFixed(2)
  };
}


/**
 * Renders the graph with nodes and links.
 * @param {string} container - The CSS selector for the container
 * @param {Object} graphData - The graph data containing nodes and links
 * @param {Object} options - Options for width and height of the SVG
 * @returns {Object} - References to the SVG and groups created
 */

let nodeGroup, labelGroup, linkGroup;

function renderGraph$1(container, graphData, options) {
    const renderStartTime = performance.now();  // ⏱️ Start timing
    console.log("🚀 renderGraph() started! Graph Data:", graphData);

    const { width, height, padding } = { ...GRAPH_CONFIG.dimensions, ...options };

    if (!graphData || !graphData.nodes || !graphData.links) {
        console.error("Error: graphData is missing nodes or links!", graphData);
        return;
    }

    console.log("✅ Valid graphData detected, proceeding with rendering...");
    
    // Compute relationships and labels
    // Ensure superconcepts and subconcepts are computed first
    console.log("📌 Computing superconcepts and subconcepts...");
    computeSuperSubConcepts(graphData);

    console.log("📌 Computing reduced labels...");
    computeReducedLabels(graphData.nodes, graphData.links);

    // Assign layers and node positions
    console.log("📌 Assigning hierarchical layers...");
    const layers = assignLayers(graphData);
    if (!layers || layers.length === 0) {
        console.error("❌ Layer assignment failed.");
        return;
    }
    console.log("✅ Layers assigned successfully");

    // Adjust spacing dynamically based on density
    adjustLayerSpacing(layers, { height, padding });
    console.log("✅ Layer spacing adjusted.");

    // Order vertices within layers to minimize edge crossings
    console.log("📌 Ordering vertices within layers...");
    orderVerticesWithinLayers(layers, graphData);

    adjustNodePositions(layers, width);

    // Assign the computed positions to nodes
    layers.forEach(layer => {
        layer.forEach(node => {
            node.x = node.x || 0;
            node.y = node.y || 0;
        });
    });

    console.log("📌 Assigning X & Y positions...");
   
    layers.forEach((layer, layerIndex) => {
        const xSpacing = (width - 2 * padding) / (layer.length + 1);
        layer.forEach((node, nodeIndex) => {
            node.x = padding + (nodeIndex + 1) * xSpacing;
            node.y = padding + layerIndex * (height / layers.length);
        });
    });
    
    //Ensure Links Reference Nodes Correctly
       graphData.links.forEach(link => {
        if (typeof link.source === "string" || typeof link.source === "number") {
            link.source = graphData.nodes.find(n => n.id == link.source);
        }
        if (typeof link.target === "string" || typeof link.target === "number") {
            link.target = graphData.nodes.find(n => n.id == link.target);
        }

        if (!link.source || !link.target) {
            console.error("❌ Link has missing source or target:", link);
        }

    });

    graphData.links.forEach(link => {
        if (!link.source || !link.target) {
            console.error("❌ Link has missing source or target:", link);
        }
    });
    

    // Debugging Logs
    console.log("🔍 Node Positions:", graphData.nodes.map(n => ({ id: n.id, x: n.x, y: n.y })));
    console.log("🔗 Link Connections:", graphData.links.map(l => ({ source: l.source.id, target: l.target.id })));

    // Create SVG container
    const svg = select(container)
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .style('overflow', 'visible');

    // Create a <g> group element to center and transform the graph
    const g = svg.append('g')
        .attr('class', 'graph-transform');

    console.log("📌 Drawing Links...");
    const linkContainer = g.append("g").attr("class", "link-group");
    //linkGroup = g.append("g")
    linkGroup = linkContainer
        .selectAll('line')
        .data(graphData.links)
        .join("line")
        .attr('class', 'link')
        .attr('stroke', GRAPH_CONFIG.link.color)
        //.attr('stroke', d => d.highlighted ? GRAPH_CONFIG.link.highlightedColor : GRAPH_CONFIG.link.color)
        //.attr('stroke-width', d => d.weight)
        .attr('stroke-width', d => GRAPH_CONFIG.link.thickness)
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);

    console.log("📌 Drawing Nodes...");
    nodeGroup = g.selectAll('.node-group')
        .data(graphData.nodes)
        .enter()
        .append("g")
        .attr("class", "node-label-group")
        .attr("transform", d => `translate(${d.x}, ${d.y})`);

    nodeGroup.append("circle")
        .attr("r", GRAPH_CONFIG.node.maxRadius)
        .attr("fill", d => d.color || GRAPH_CONFIG.node.color);
    

    labelGroup = selectAll(".node-label-group");

    // Apply currently selected label mode from dropdown
    const selectedMode = document.getElementById("labeling-mode")?.value || "id";
    updateLabels(selectedMode);

    console.log("📌 Adjusting Graph Centering...");
    setTimeout(() => {
        //Before calling .getBBox(), verify that g.node() exists
        if (!g.node()) {
            console.error("❌ Graph group (`g.node()`) is undefined. Skipping centering.");
            return;
        }

        const bbox = g.node().getBBox();
        centerGraph(svg, { width, height, padding, bbox });
    }, 100);

    // ✅ Pass updateLinks to ensure edges move with nodes

    if (graphData && graphData.nodes && graphData.links) {
        addNodeInteractivity(nodeGroup, linkGroup, graphData);
    } else {
        console.error("❌ addNodeInteractivity() received invalid graphData:", graphData);
    }
    
    const renderEndTime = performance.now();    // ⏱️ End timing
    console.log(`🕒 Rendering completed in ${(renderEndTime - renderStartTime).toFixed(2)} ms`);
    

    // ✅ Estimate memory usage
    const memoryStats = estimateMemoryUsage(graphData);
    console.log(`🧠 Estimated memory usage: ${memoryStats.kb} KB (${memoryStats.mb} MB)`);
    
    const memoryLabel = document.getElementById('memory-usage');
    if (memoryLabel) {
        memoryLabel.textContent = `${memoryStats.mb} MB`;
    }
    return { svg, linkGroup, nodeGroup, labelGroup };
}

function updateNodes(graphData) {
    if (!graphData || !graphData.nodes) {
        console.error("❌ updateNodes() called without valid graphData!");
        return;
    }

    if (!nodeGroup || !labelGroup) {
        console.error("❌ updateNodes() called before nodeGroup or labelGroup was initialized!");
        return;
    }
       
     // ✅ Ensure nodes visually move
     nodeGroup.attr("transform", d => `translate(${d.x}, ${d.y})`);
    
    // ✅ Also update links to match new node positions
    updateLinks(graphData);
    }

/**
 * Wraps long text into multiple lines to prevent overlap.
 * @param {string} text - The input text to wrap.
 * @param {number} maxCharsPerLine - Maximum characters allowed per line.
 * @returns {string} - Wrapped text with line breaks.
 */

function wrapText(text, maxCharsPerLine) {
    const words = text.split(" ");
    let lines = [];
    let currentLine = [];

    words.forEach(word => {
        if (currentLine.join(" ").length + word.length > maxCharsPerLine) {
            lines.push(currentLine.join(" ")); // Add the current line to the array
            currentLine = [word];  // Start a new line
        } else {
            currentLine.push(word); // Continue adding words to the current line
        }
    });

    if (currentLine.length) {
        lines.push(currentLine.join(" "));
    }

    return lines.join("<br>"); // Add line breaks for better display
}

/**
 * Updates node labels based on the selected labeling mode.
 * @param {string} mode - The selected labeling mode ("default", "full", "reduced").
 * @param {Object} labelGroup - The D3 selection of node labels.
 */
function updateLabels(mode, labelGroup) {
    console.log(`🔄 Updating Labels: Mode = ${mode}`);

    // Select all nodes with labels
    selectAll(".node-label-group").each(function (d, i) {
        if (!d || !d.id) {
            console.warn("⚠️ Skipping undefined node.");
            return;
    }

     // Select node group
    const nodeGroup = select(this);

    // Clear existing labels
    nodeGroup.selectAll("foreignObject").remove();

    // Extract the extent and intent text based on the mode
    const extentText = (mode === "full" ? d.fullExtent : d.reducedExtent).join(", ");
    const intentText = (mode === "full" ? d.fullIntent : d.reducedIntent).join(", ");

    // Wrap long labels for better display
    wrapText(extentText, 20); // Wrap every 20 characters
    wrapText(intentText, 20);

    // Compute dynamic width based on text size
    const maxTextWidth = Math.max(extentText.length, intentText.length) * 8;
    const extentWidth = Math.max(150, maxTextWidth);// Minimum width of 120px

    const intentWidth = extentWidth; // Use the same width for both labels
    const labelHeight = 15; // Each label's height
    const ySpacing = 2; // Extra space to separate labels

    // Adjust positioning based on node's height
    const nodeRadius = GRAPH_CONFIG.node.maxRadius;

    // Stagger label positions to reduce X-axis overlap
    const staggerOffset = (i % 2 === 0) ? 10 : -10; // Shift every second node


    if (mode === "full" || mode === "reduced") {
        // Extent Label (Above Node)
        if (extentText.trim() !== "") {
        nodeGroup.append("foreignObject")
            .attr("width", extentWidth)
            .attr("height", labelHeight)
            .attr("x", -extentWidth / 2 + staggerOffset) // Center horizontally
            .attr("y", -27) // Position above node
            .html(() => `<div style="text-align:center; font-weight:bold; white-space:nowrap;">${extentText}</div>`);
        }
        // Intent Label (Below Node)
        if (intentText.trim() !== "") {
        nodeGroup.append("foreignObject")
            .attr("width", intentWidth)
            .attr("height", labelHeight)
            .attr("x", -intentWidth / 2 + staggerOffset) // Center horizontally
            .attr("y", nodeRadius + ySpacing) // Position below node
            .html(() => `<div style="text-align:center; font-style:italic; white-space:nowrap;">${intentText}</div>`);
            }
        } else {
        // Default Mode (Node ID Only)
        nodeGroup.append("foreignObject")
            .attr("width", 100)
            .attr("height", labelHeight)
            .attr("x", -50) // Center horizontally
            .attr("y", -labelHeight - ySpacing) // Above node
            .html(() => `<div style="text-align:center;">${d.id}</div>`);
    }
    });
}

window.updateLabels = updateLabels; // Make it globally available

/**
 * Centers the graph dynamically within the SVG.
 * @param {Object} svg - The SVG element containing the graph.
 * @param {Object} options - Configuration options for dimensions and padding.
 */
function centerGraph(svg, { width, height, padding, bbox }) {
    const g = svg.select('.graph-transform');
    //const bbox = g.node()?.getBBox();  // Safe access

    // Check for invalid bounding box values
    if (!bbox || isNaN(bbox.width) || isNaN(bbox.height)) {
        console.error('Invalid bounding box:', bbox);
        return;
    }

    // Calculate the center of the graph
    const graphCenterX = bbox.x + bbox.width / 2;
    const graphCenterY = bbox.y + bbox.height / 2;

    // Calculate the center of the SVG container with padding applied
    const svgCenterX = width / 2;
    const svgCenterY = height / 2;

    // Calculate translation needed to center the graph
    const translateX = svgCenterX - graphCenterX;
    const translateY = svgCenterY - graphCenterY;

    // Apply translation to center the graph
    g.attr('transform', `translate(${translateX}, ${translateY})`);

    console.log('✅ Graph centered with translation:', { translateX, translateY });
}

// src/features/legend.js

/**
 * Updates the legend dynamically based on the color coding of the nodes.
 */
function updateLegend() {
    const legendContainer = document.getElementById('legend');
  
    // Clear the existing legend
    legendContainer.innerHTML = '';
  
    // Define the color mapping for the legend
    const legendItems = [
      { color: 'orange', label: 'Matches both extent and intent' },
      { color: 'green', label: 'Matches extent' },
      { color: 'gray', label: 'Matches intent' },
      { color: 'blue', label: 'No match' },
    ];
  
    // Dynamically create legend items
    legendItems.forEach((item) => {
      const legendItem = document.createElement('li');
  
      // Create the color indicator
      const colorIndicator = document.createElement('span');
      colorIndicator.style.backgroundColor = item.color;
  
      // Create the label text
      const label = document.createTextNode(item.label);
  
      // Append color indicator and label to the legend item
      legendItem.appendChild(colorIndicator);
      legendItem.appendChild(label);
  
      // Append the legend item to the legend container
      legendContainer.appendChild(legendItem);
    });
  }

// src/features/setupFilters.js


/**
 * Sets up the filtering controls and handles the filtering process.
 * 
 * @param {Object} originalGraphData - The original unfiltered graph data.
 */
function setupFilterControls(originalGraphData) {
  // Ensure the required elements exist in the DOM
  const objectFilterInput = document.getElementById('object-filter');
  const attributeFilterInput = document.getElementById('attribute-filter');
  const applyFiltersButton = document.getElementById('apply-filters');
  const labelingModeSelector = document.getElementById('labeling-mode');

  if (!objectFilterInput || !attributeFilterInput || !applyFiltersButton || !labelingModeSelector) {
    console.error('Filter controls or labeling mode selector are missing in the DOM.');
    return;
  }

  // Add event listener to the "Apply Filters" button
  applyFiltersButton.addEventListener('click', () => {
    // Get the object filter values from the input field
    const objectFilter = objectFilterInput.value
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item !== '');

    // Get the attribute filter values from the input field
    const attributeFilter = attributeFilterInput.value
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item !== '');

    const selectedLabelingMode = labelingModeSelector.value;
    
    console.log('Filter Criteria:', { objectFilter, attributeFilter, selectedLabelingMode });

    try {
      // Highlight nodes based on the specified filters
      const updatedData = filterLattice(originalGraphData, {
        objectFilter,
        attributeFilter,
      });

      // Re-render the lattice visualization with the updated colors
      createLattice(updatedData, { container: '#graph-container' });

       // After graph created, update labels according to mode
       if (typeof window.updateLabels === "function") {
        window.updateLabels(selectedLabelingMode);
      } else {
        console.error('updateLabels function is not defined.');
      }

      // Update the legend
      updateLegend();
      
    } catch (error) {
      console.error('Error during filtering:', error);
    }
  });
}
  
  // Programmatically add the filter UI
  //createFilterUI();

//import { jsPDF } from "jspdf";

/**
 * Disable the dropdown while exporting to prevent multiple clicks.
 */
function disableExportDropdown() {
    const saveAsDropdown = document.getElementById('save-as');
    if (saveAsDropdown) saveAsDropdown.disabled = true;
}

/**
 * Enable the dropdown after exporting with a small delay.
 * This ensures users cannot trigger multiple downloads at once.
 */
function enableExportDropdown() {
    setTimeout(() => {
        const saveAsDropdown = document.getElementById('save-as');
        if (saveAsDropdown) 
            saveAsDropdown.disabled = false;
            //saveAsDropdown.value = ""; // ✅ Reset dropdown after re-enabling
    }, 500); // 500ms delay to prevent accidental multiple clicks
}

/**
 * Export the lattice visualization as a PNG image.
 * @param {SVGElement} svgElement - The SVG element representing the lattice.
 */
function exportAsPNG(svgElement) {
    if (!svgElement) {
        console.error("❌ exportAsPNG: No SVG element found!");
        alert("Error: No lattice visualization to export.");
        return;
    }

    disableExportDropdown(); // Prevent multiple clicks while exporting

    console.log("📌 Running exportAsPNG function...");

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    // Get SVG dimensions
    const { width, height } = svgElement.getBoundingClientRect();
    console.log(`📌 SVG Dimensions - Width: ${width}, Height: ${height}`);

    // Prevent exporting if SVG has zero dimensions
    if (width === 0 || height === 0) {
        console.error("❌ SVG has zero width or height! Cannot export.");
        alert("Error: Lattice visualization is not properly rendered.");
        enableExportDropdown();
        return;
    }

    canvas.width = width || 800;
    canvas.height = height || 600;

    // Clone the SVG to avoid modifying the original one
    const clonedSvg = svgElement.cloneNode(true);

    // Create a white background rectangle to prevent transparent or black background
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", "0");
    rect.setAttribute("y", "0");
    rect.setAttribute("width", width);
    rect.setAttribute("height", height);
    rect.setAttribute("fill", "white");

    // Insert the white background at the beginning of the SVG
    clonedSvg.insertBefore(rect, clonedSvg.firstChild);

    // Convert SVG to a string
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(clonedSvg);

    // Encode the SVG as a Base64 image
    const encodedSvgString = btoa(unescape(encodeURIComponent(svgString)));
    const img = new Image();

    img.onload = function () {
        console.log("✅ Image loaded, drawing on canvas...");

        // Fill canvas background with white before drawing the image
        context.fillStyle = "white";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(img, 0, 0);

        // Generate PNG and trigger download
        const pngUrl = canvas.toDataURL("image/png");
        const downloadLink = document.createElement("a");
        downloadLink.href = pngUrl;
        downloadLink.download = "concept_lattice.png";
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);

        console.log("✅ PNG downloaded successfully with white background!");
        enableExportDropdown(); // Re-enable dropdown after export
    };

    img.onerror = function () {
        console.error("❌ Error loading SVG as an image.");
        alert("Error: Unable to export SVG as PNG.");
        enableExportDropdown();
    };

    img.src = "data:image/svg+xml;base64," + encodedSvgString;
}

/**
 * Export the lattice data as a minimal JSON file.
 * Only includes ID, Label, and Level.
 * @param {Object} graphData - The data of the lattice graph.
 */

function exportAsJSON(graphData) {
    if (!graphData) {
        console.error("❌ exportAsJSON: No graph data found!");
        alert("Error: No lattice data to export.");
        return;
    }

    disableExportDropdown(); // Prevent multiple downloads at once

    console.log("📌 Exporting minimal JSON (ID, Label, Level)...");

    // Function to remove circular references
    function removeCircularReferences(obj, seen = new WeakSet()) {
        if (obj !== null && typeof obj === "object") {
            if (seen.has(obj)) {
                return "[Circular]"; // Replace circular reference with a string
            }
            seen.add(obj);
            const newObj = Array.isArray(obj) ? [] : {};
            for (let key in obj) {
                newObj[key] = removeCircularReferences(obj[key], seen);
            }
            return newObj;
        }
        return obj;
    }

    // Extract only necessary fields (ID, Label, Level)
    function extractMinimalData(obj) {
        return obj.nodes.map(node => ({
            id: node.id,
            label: node.label || "",
            level: node.level || 0
        }));
    }

    const minimalData = extractMinimalData(graphData);
    const sanitizedData = removeCircularReferences(minimalData);

    // Convert data to a downloadable JSON file
    const jsonBlob = new Blob([JSON.stringify(sanitizedData, null, 2)], { type: "application/json" });
    const downloadLink = document.createElement("a");
    downloadLink.href = URL.createObjectURL(jsonBlob);
    downloadLink.download = "concept_lattice_minimal.json";

    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);

    console.log("✅ Minimal JSON exported successfully!");
    enableExportDropdown(); // Re-enable dropdown after export
}

/**
 * Converts lattice data to CSV format and triggers a download.
 * @param {Object} graphData - The lattice graph data.
 */
function exportAsCSV(graphData) {
    if (!graphData) {
        console.error("❌ exportAsCSV: No graph data found!");
        alert("Error: No lattice data to export.");
        return;
    }

    disableExportDropdown(); // Prevent multiple triggers

    console.log("📌 Exporting lattice as CSV...");

    // Extract only ID, Label, and Level for CSV format
    function extractMinimalData(obj) {
        return obj.nodes.map(node => ({
            id: node.id,
            label: node.label || "",
            level: node.level || 0
        }));
    }

    const minimalData = extractMinimalData(graphData);

    // Convert data to CSV format
    const csvContent = [
        ["ID", "Label", "Level"], // Header row
        ...minimalData.map(node => [node.id, node.label, node.level]) // Data rows
    ]
    .map(row => row.join(",")) // Convert each row to CSV format
    .join("\n"); // Separate rows with new lines

    // Create a downloadable CSV file
    const csvBlob = new Blob([csvContent], { type: "text/csv" });
    const downloadLink = document.createElement("a");
    downloadLink.href = URL.createObjectURL(csvBlob);
    downloadLink.download = "concept_lattice.csv";

    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);

    console.log("✅ CSV exported successfully!");
    enableExportDropdown(); // Re-enable dropdown after export
}

/**
 * Export the lattice visualization as a PDF file.
 * @param {SVGElement} svgElement - The SVG element representing the lattice.
 */
const { jsPDF } = window.jspdf; // ✅ Use global jsPDF from CDN

function exportAsPDF(svgElement) {
    if (!svgElement) {
        console.error("❌ exportAsPDF: No SVG element found!");
        alert("Error: No lattice visualization to export.");
        return;
    }

    disableExportDropdown(); // Prevent multiple clicks

    console.log("📌 Running exportAsPDF function...");

    const { width, height } = svgElement.getBoundingClientRect();
    console.log(`📌 SVG Dimensions - Width: ${width}, Height: ${height}`);

    if (width === 0 || height === 0) {
        console.error("❌ SVG has zero width or height! Cannot export.");
        alert("Error: Lattice visualization is not properly rendered.");
        enableExportDropdown();
        return;
    }

    // ✅ Convert SVG to Canvas
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");

    // ✅ Clone SVG and add white background
    const clonedSvg = svgElement.cloneNode(true);
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", "0");
    rect.setAttribute("y", "0");
    rect.setAttribute("width", width);
    rect.setAttribute("height", height);
    rect.setAttribute("fill", "white");
    clonedSvg.insertBefore(rect, clonedSvg.firstChild);

    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(clonedSvg);
    const encodedSvgString = btoa(decodeURIComponent(encodeURIComponent(svgString)));
    const img = new Image();

    img.onload = function () {
        console.log("✅ Image loaded, drawing on canvas...");

        // ✅ Draw the image onto the canvas
        context.fillStyle = "white";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(img, 0, 0);

        // ✅ Convert Canvas to Image for PDF
        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF({
            orientation: width > height ? "landscape" : "portrait",
            unit: "px",
            format: [width, height] // Match the PDF size to the image
        });

        pdf.addImage(imgData, "PNG", 0, 0, width, height);
        pdf.save("concept_lattice.pdf");

        console.log("✅ PDF downloaded successfully!");
        enableExportDropdown();
    };

    img.onerror = function () {
        console.error("❌ Error loading SVG as an image.");
        alert("Error: Unable to export SVG as PDF.");
        enableExportDropdown();
    };

    img.src = "data:image/svg+xml;base64," + encodedSvgString;
}

/**
 * Export the concept lattice as an SLF (Simple Lattice Format) file.
 * SLF is a textual format commonly used in FCA tools like ConExp.
 * This function extracts objects, attributes, and concepts (extent/intent pairs).
 * 
 * @param {Object} graphData - The lattice graph data (should include extent and intent for nodes).
 */
function exportAsSLF(graphData) {
    if (!graphData) {
        console.error("❌ exportAsSLF: No graph data found!");
        alert("Error: No lattice data to export.");
        return;
    }

    disableExportDropdown(); // Prevent multiple export triggers

    console.log("📌 Exporting lattice as SLF...");

    // Header for the SLF file (starts with B section)
    const header = `B\n`;

    const objects = new Set();    // Collect all unique objects (extent elements)
    const attributes = new Set(); // Collect all unique attributes (intent elements)

    // Traverse all nodes to extract extents and intents
    graphData.nodes.forEach(node => {
        (node.extent || []).forEach(obj => objects.add(obj));
        (node.intent || []).forEach(attr => attributes.add(attr));
    });

    // Convert sets to arrays
    const objectList = Array.from(objects);
    const attributeList = Array.from(attributes);

    // Begin composing SLF content
    let slf = header;

    // Write object list
    slf += `# Objects\n`;
    slf += objectList.join("\n") + "\n\n";

    // Write attribute list
    slf += `# Attributes\n`;
    slf += attributeList.join("\n") + "\n\n";

    // Write L section: list of all concepts with extents and intents
    slf += `L\n# Concepts: extent and intent\n`;
    graphData.nodes.forEach((node, idx) => {
        const extent = (node.extent || []).join(", ");
        const intent = (node.intent || []).join(", ");
        slf += `Concept ${idx + 1}:\nE: ${extent}\nI: ${intent}\n\n`;
    });

    // Convert to downloadable plain text file
    const blob = new Blob([slf], { type: "text/plain" });
    const downloadLink = document.createElement("a");
    downloadLink.href = URL.createObjectURL(blob);
    downloadLink.download = "concept_lattice.slf";

    // Trigger download
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);

    console.log("✅ SLF exported successfully!");
    enableExportDropdown(); // Re-enable dropdown
}

/**
 * Export the visible formal context table as CSV format.
 * The function reads the HTML table rendered in the `.table-container` element,
 * extracts headers and data rows, and composes a CSV string which is then
 * downloaded as a `.csv` file named `formal_context.csv`.
 */
function exportFormalContextAsCSV() {
    const table = document.querySelector(".table-container table");
    if (!table) {
        alert("No formal context table found to export.");
        return;
    }

    let csv = [];
    const rows = table.querySelectorAll("tr"); // All table rows: headers + body

    rows.forEach(row => {
        // For each row, extract <th> and <td> cell content
        const cells = Array.from(row.querySelectorAll("th, td"))
            .map(cell => `"${cell.innerText}"`); // Wrap each cell content in quotes
        csv.push(cells.join(",")); // Join cells with commas for CSV
    });

    // Create a Blob with MIME type for CSV
    const csvBlob = new Blob([csv.join("\n")], { type: 'text/csv;charset=utf-8;' });

    // Create a temporary anchor element to trigger download
    const downloadLink = document.createElement("a");
    downloadLink.href = URL.createObjectURL(csvBlob);
    downloadLink.download = "formal_context.csv";
    downloadLink.click();
}

/**
 * Export the visible formal context table as .cxt format.
 * This is a special format used by FCA tools like ConExp and Galicia.
 * The function constructs a .cxt structure:
 *  - "B" as header
 *  - Number of objects
 *  - Number of attributes
 *  - Object names (rows)
 *  - Attribute names (columns)
 *  - Incidence matrix using 'X' for presence and '.' for absence
 */
function exportFormalContextAsCXT() {
    const table = document.querySelector(".table-container table");
    if (!table) {
        alert("No formal context table found to export.");
        return;
    }

    // Select all body rows (each corresponds to one object)
    const rows = Array.from(table.querySelectorAll("tbody tr"));

    // Select all attribute (column) headers, skip first (empty) top-left corner
    const headerCells = Array.from(table.querySelectorAll("thead th")).slice(1);

    // Extract object names from row headers
    const objectNames = rows.map(row => row.querySelector("th").innerText.trim());

    // Extract attribute names from column headers
    const attributeNames = headerCells.map(th => th.innerText.trim());

    // Build the binary matrix as strings of "X" (present) or "." (absent)
    const matrix = rows.map(row => {
        const cells = Array.from(row.querySelectorAll("td"));
        return cells.map(cell =>
            cell.innerText.trim().toLowerCase() === "x" ? "X" : "."
        ).join("");
    });

    // Construct .cxt lines according to specification
    const lines = [];
    lines.push("B");                                  // File format identifier
    lines.push(objectNames.length.toString());        // Number of objects
    lines.push(attributeNames.length.toString());     // Number of attributes
    lines.push(...objectNames);                       // List of object names
    lines.push(...attributeNames);                    // List of attribute names
    lines.push(...matrix);                            // Binary relation matrix

    // Create and trigger download as .cxt file
    const cxtBlob = new Blob([lines.join("\n")], { type: 'text/plain;charset=utf-8;' });
    const downloadLink = document.createElement("a");
    downloadLink.href = URL.createObjectURL(cxtBlob);
    downloadLink.download = "formal_context.cxt";
    downloadLink.click();
}

//src/lattice/lattice.js



/**
 * Attach the export functionality to the dropdown menu
 * Ensures only one event listener is active at a time.
 * @param {Object} graphData - The graph data containing nodes and links.
 * @param {SVGElement} svgElement - The SVG element representing the visualization.
 */

function addExportOptions(graphData, svgElement) {
const saveAsDropdown = document.getElementById('save-as');

// ✅ Remove any existing event listeners before adding a new one
saveAsDropdown.replaceWith(saveAsDropdown.cloneNode(true)); // **This removes all old event listeners**
    
const newSaveAsDropdown = document.getElementById('save-as'); // Re-fetch after replacing

// ✅ Add event listener with correct graphData reference
newSaveAsDropdown.addEventListener('change', (event) => handleExportSelection(event, graphData));

}


/**
 * Handles the dropdown selection and triggers the correct export function.
 * @param {Event} event - The dropdown selection event.
 * @param {Object} graphData - The lattice graph data.
 */

function handleExportSelection(event, graphData) {
    const selectedOption = document.getElementById('save-as').value;
    console.log(`🔹 Selected export option: ${selectedOption}`);

    if (selectedOption === "export-json") {
      console.log("✅ Exporting as JSON...");
      exportAsJSON(graphData);

  } else if (selectedOption === "export-png") {
        console.log("✅ Exporting as PNG...");
        const svgElement = document.querySelector("#graph-container svg");

        if (!svgElement) {
            console.error("❌ No SVG element found for export.");
            alert("Error: No lattice visualization found.");
            return;
        }

        exportAsPNG(svgElement);
    }
    else if (selectedOption === "export-csv") {
      console.log("✅ Exporting as CSV...");
      exportAsCSV(graphData);

  } else if (selectedOption === "export-pdf") {
    console.log("✅ Exporting as PDF...");
    const svgElement = document.querySelector("#graph-container svg");

    if (!svgElement) {
        console.error("❌ No SVG element found for export.");
        alert("Error: No lattice visualization found.");
        return;
    }

    exportAsPDF(svgElement);

}else if (selectedOption === "export-slf") {
    console.log("✅ Exporting as SLF...");
    exportAsSLF(graphData);

} else if (selectedOption === "export-context-csv") {
        console.log("✅ Exporting Formal Context as CSV...");
        exportFormalContextAsCSV();

    } else if (selectedOption === "export-context-cxt") {
        console.log("✅ Exporting Formal Context as CXT...");
        exportFormalContextAsCXT();
    }
    // ✅ Reset dropdown after an export is triggered (prevents double execution)
    //event.target.value = ""; // Reset selection to prevent re-triggering

}

/**
 * Creates a concept lattice based on the provided graph data.
 * @param {Object} graphData - The graph data containing nodes and links.
 * @param {Object} options - Configuration options for the graph.
 * @returns {Object} - The SVG and simulation instances for further use.
 */
function createLattice(graphData, options = {}) {
  console.log("🚀 Creating Lattice Visualization...");

  // Merge options with defaults from the config file
  const { container = 'body', width, height } = {
    ...GRAPH_CONFIG.dimensions,
    ...options,
};
   
  // Ensure graphData has valid nodes and links
   if (!graphData || !graphData.nodes || !graphData.links) {
    throw new Error('⚠️Invalid graphData. Ensure it includes nodes and links.');
  }

  // ✅ Modify links before rendering
  graphData.links.forEach(link => {
    if (typeof link.source === "string" || typeof link.source === "number") {
        link.source = graphData.nodes.find(n => n.id == link.source);
    }
    if (typeof link.target === "string" || typeof link.target === "number") {
        link.target = graphData.nodes.find(n => n.id == link.target);
    }
});

  // Step 1: Enrich nodes with hierarchical relationships
  computeSuperSubConcepts(graphData);

   // Step 2: Layer assignment
  console.log("📌 Assigning Layers...");
  const layers = assignLayers(graphData);
  graphData.layers = layers;  // Store layers inside graphData
 /* 
  // Step 3: Vertical spacing between layers
    console.log("📌 Adjusting Layer Spacing...");
    adjustLayerSpacing(layers, { width, height, padding: GRAPH_CONFIG.dimensions.padding });

   // Step 4: Horizontal ordering using barycenter heuristics
  console.log("📌 Ordering Nodes Within Layers...");
  orderVerticesWithinLayers(layers, graphData);  // Optimize horizontal positioning
*/
  // Step 5: Horizontal positioning
  console.log("📌 Assigning X Positions...");
  adjustNodePositions(layers, width);
  console.log("🔍 X positions after adjustNodePositions:", layers.flat().map(n => ({ id: n.id, x: n.x })));
/*
  // Step 6: Vertical positioning
  console.log("📌 Assigning X & Y positions...");
  // Set y-coordinates for nodes based on their assigned layers
  const layerSpacing = height / (layers.length + 1);

  layers.forEach((layer, layerIndex) => {
    //const xSpacing = (width - 2 * GRAPH_CONFIG.dimensions.padding) / (layer.length + 1);
      layer.forEach((node, nodeIndex) => {
          node.y = GRAPH_CONFIG.dimensions.padding + layerIndex * layerSpacing; // Assign vertical spacing based on layer index
          //node.x = GRAPH_CONFIG.dimensions.padding +(nodeIndex + 1) * xSpacing; // Horizontal spacing
          //node.layer = layerIndex; // Add layer information for constraints
      });
  });

  // Step 7: Sync computed x/y positions back into graphData.nodes
  const updatedNodes = layers.flat();
   for (const updatedNode of updatedNodes) {
        const originalNode = graphData.nodes.find(n => n.id === updatedNode.id);
        if (originalNode) {
            originalNode.x = updatedNode.x;
            originalNode.y = updatedNode.y;
        }
    }
/*
  console.log("📌 Computing Superconcepts and Subconcepts...");
  computeSuperSubConcepts(graphData);  // Ensure correct hierarchical relationships

  // ✅ Spread nodes horizontally based on parent alignment
adjustNodePositions(layers, width, GRAPH_CONFIG.dimensions.padding);
*/

  // ✅ Compute reduced labels before rendering
  computeReducedLabels(graphData.nodes, graphData.links);

   // ✅ Sync final layout to graphData.nodes
    layers.flat().forEach(updated => {
        const original = graphData.nodes.find(n => n.id === updated.id);
        if (original) {
            original.x = updated.x;
            original.y = updated.y;
        }
    });

  // Calculate metrics and log them
  const metrics = calculateMetrics(graphData);
  console.log('Metrics:', metrics);

  // Update metrics in the DOM
  updateMetricsInDOM(metrics);

  // Update Filtering
  setupFilterControls(graphData);

   // Clear existing graph content before rendering the new graph
   const containerElement = select(container);
   containerElement.selectAll('svg').remove();
  
  // Render the graph using dynamic dimensions and get the SVG elements
  const { svg, linkGroup, nodeGroup, labelGroup } = renderGraph$1(container, graphData, { width, height });
  
  // ✅ Ensure svg and nodeGroup exist before adding interactivity
  if (!svg || nodeGroup.empty()) {
    console.error("❌ SVG or nodeGroup is undefined! Cannot add interactivity.");
    return;
  }

  // ✅ Pass correct arguments to `addInteractivity` and `addNodeInteractivity`
  addInteractivity(svg, graphData);

  // Add node-specific interactivity (hover, click, shortest path, etc.)
  //addNodeInteractivity(nodeGroup, linkGroup, graphData, updateLinks);

 // Dynamically center the graph
 setTimeout(() => {
  const bbox = svg.select('.graph-transform').node().getBBox();
  if (bbox) {
    centerGraph(svg, { width, height, padding: GRAPH_CONFIG.dimensions.padding, bbox });
     }
  }, 100);

  // Add export options after rendering
  addExportOptions(graphData);

  // Return the SVG and metrics for further use
  return { svg, metrics };
}


/**
 * Updates the metrics in the DOM.
 * @param {Object} metrics - The metrics to display.
 */
// Function to update metrics in the DOM
function updateMetricsInDOM(metrics) {
  // Update the total count of concepts, objects, and attributes in the UI
  document.getElementById('total-concepts').textContent = metrics.totalConcepts;
  document.getElementById('total-objects').textContent = metrics.totalObjects;
  document.getElementById('total-attributes').textContent = metrics.totalAttributes;
  document.getElementById('lattice-density').textContent = metrics.density;
  document.getElementById('lattice-stability').textContent = metrics.averageStability;
}


/**
 * Finds the shortest path between two nodes using Breadth-First Search (BFS).
 * @param {Object} graphData - The graph data containing nodes and links.
 * @param {string} startNodeId - ID of the starting node.
 * @param {string} endNodeId - ID of the ending node.
 * @returns {Array} - The shortest path as an array of node IDs, or an empty array if no path exists.
 */
/*
export function findShortestPath(graphData, startNodeId, endNodeId) {
  const adjacencyList = new Map();

  // Build adjacency list
  graphData.links.forEach((link) => {
    if (!adjacencyList.has(link.source.id)) adjacencyList.set(link.source.id, []);
    if (!adjacencyList.has(link.target.id)) adjacencyList.set(link.target.id, []);
    adjacencyList.get(link.source.id).push(link.target.id);
    adjacencyList.get(link.target.id).push(link.source.id);
  });

  // BFS setup
  const visited = new Set();
  const queue = [[startNodeId]];

  while (queue.length > 0) {
    const path = queue.shift();
    const currentNode = path[path.length - 1];

    // Return the path if the end node is reached
    if (currentNode === endNodeId) return path;

    if (!visited.has(currentNode)) {
      visited.add(currentNode);

      // Add unvisited neighbors to the queue
      const neighbors = adjacencyList.get(currentNode) || [];
      neighbors.forEach((neighbor) => {
        if (!visited.has(neighbor)) queue.push([...path, neighbor]);
      });
    }
  }

  // Return an empty array if no path exists
  return [];
}
*/
/**
 * Filters the lattice graph data based on the provided filter criteria.
 * 
 * @param {Object} graphData - The graph data containing nodes and links.
 * @param {Object} filterCriteria - An object with `objectFilter` and `attributeFilter` arrays.
 * @returns {Object} - A filtered graph data object with updated nodes and links.
 */
function filterLattice(graphData, filterCriteria) {
  
  if (!graphData || !graphData.nodes || !graphData.links) {
    throw new Error('Invalid graphData: Ensure it includes nodes and links.');
  }
  // Destructure object and attribute filters from the filter criteria
  const { objectFilter, attributeFilter } = filterCriteria;

  console.log('Graph Data Before Filtering:', graphData); // Debugging log
  console.log('Filter Criteria:', filterCriteria); // Debugging log

   // Update node colors based on the filtering criteria
   graphData.nodes.forEach((node) => {
    const extentMatch = objectFilter
      ? objectFilter.some((obj) => node.label.includes(obj))
      : false;
    const intentMatch = attributeFilter
      ? attributeFilter.some((attr) => node.label.includes(attr))
      : false;

    // Set color based on matching extent or intent
    if (extentMatch && intentMatch) {
      node.color = 'orange'; // Highlight nodes matching both criteria
    } else if (extentMatch) {
      node.color = 'green'; // Highlight nodes matching extent
    } else if (intentMatch) {
      node.color = 'gray'; // Highlight nodes matching intent
    } else {
      node.color = 'blue'; // Default color for nodes not matching
    }
  });

  // Filter the nodes based on the extent (objects) and intent (attributes)
  const filteredNodes = graphData.nodes.filter((node) => {
    // Check if the node's extent matches all specified object filters
    objectFilter
      ? objectFilter.every(obj => node.label.includes(obj)) // Ensure every object in the filter is present in the node's label
      : true; // If no filter is provided, allow all nodes
    
    // Check if the node's intent matches all specified attribute filters
    attributeFilter
      ? attributeFilter.every(attr => node.label.includes(attr)) // Ensure every attribute in the filter is present in the node's label
      : true; // If no filter is provided, allow all nodes
   
   // Keep all nodes and links
  return { nodes: graphData.nodes, links: graphData.links };
  });

  // Create a set of IDs for the filtered nodes for easy lookup
  const filteredNodeIds = new Set(filteredNodes.map(node => node.id));

  // Filter the links to include only those that connect filtered nodes
  const filteredLinks = graphData.links.filter(
    link =>
      filteredNodeIds.has(link.source.id) && // Check if the source node is in the filtered set
      filteredNodeIds.has(link.target.id)   // Check if the target node is in the filtered set
  );
  
  console.log('Filtered Nodes:', filteredNodes); // Debugging log
  console.log('Filtered Links:', filteredLinks); // Debugging log
  
  // Return the filtered graph data with updated nodes and links
  return { nodes: filteredNodes, links: filteredLinks };
}

// src/core/latticeParser.js

/**
 * Parses a serialized formal concept lattice structure and extracts nodes and links.
 *
 * The function processes the given serialized data to generate a concept lattice,
 * ensuring correct node ordering and hierarchical relationships.
 * Nodes are assigned increasing IDs, and links are structured from superconcepts (parents) to subconcepts (children).
 *
 * @param {Object} SERIALIZED - The serialized lattice data containing objects, properties, context, and lattice structure.
 * @returns {Object} - An object containing the parsed nodes and links for visualization.
 */

function parseSerializedData(SERIALIZED) {
    if (!SERIALIZED || typeof SERIALIZED !== 'object') {
        throw new Error("Invalid input data");
    }

    const objects = SERIALIZED.objects || [];
    const properties = SERIALIZED.properties || [];
    SERIALIZED.context || [];
    const lattice = SERIALIZED.lattice || [];

    let nodes = [];
    let links = [];
    let levels = new Map();

    // Compute levels first for all nodes
    const computeLevels = () => {
        const computeLevel = (index) => {
            if (levels.has(index)) return levels.get(index);
            const [, , upperNeighbors] = lattice[index] || [];
            if (!upperNeighbors.length) {
                levels.set(index, 1);
                return 1;
            }
            const maxParentLevel = Math.max(...upperNeighbors.map(neighbor => computeLevel(neighbor)));
            levels.set(index, maxParentLevel + 1);
            return maxParentLevel + 1;
        };

        lattice.forEach((_, index) => computeLevel(index));
    };

    computeLevels();

    // Get the number of nodes
    const numNodes = lattice.length;

    // Step 1: Create nodes with reversed IDs and swapped content
    lattice.forEach((entry, index) => {
        if (!Array.isArray(entry) || entry.length < 3) return;
        const [extentIndices, intentIndices] = entry;
        const extent = extentIndices.map(i => objects[i] || 'Unknown');
        const intent = intentIndices.map(i => properties[i] || 'Unknown');
        const level = levels.get(index) || 1;

        // Reverse ID assignment
        const reversedId = numNodes - index;

        nodes.push({
            id: reversedId,
            label: `Intent\n{${intent.join(", ")}}\nExtent\n{${extent.join(", ")}}`,
            level: level
        });
    });

    // Step 2: Adjust links with reversed IDs and swap direction (parent to child)
    lattice.forEach((entry, index) => {
        if (!Array.isArray(entry) || entry.length < 4) return;
        const [, , upperNeighbors] = entry;
        const targetId = numNodes - index; // Reverse ID mapping

        if (upperNeighbors) {
            upperNeighbors.forEach(neighborIndex => {
                const sourceId = numNodes - neighborIndex; // Reverse ID mapping
                if (sourceId && targetId) {
                    links.push({ source: sourceId, target: targetId });
                }
            });
        }
    });

    return { nodes, links };
}

// src/features/fileUpload.js


/**
 * Sets up file upload handling and triggers concept lattice generation upon user interaction.
 */

function setupFileUpload() {

    console.log("Initializing file upload setup...");

    // Get references to the file input, compute button, and results container from the DOM
    const fileInput = document.getElementById('file-upload');
    const loadButton = document.getElementById('load-json-file');
    //const computeButton = document.getElementById('compute-canonical-base');
    //const resultsContainer = document.getElementById('results');
    const convertButton = document.getElementById("convert-download");


     // Debug: Log what elements exist
     console.log("🔍 Checking DOM elements...");
     console.log("📂 fileInput:", fileInput);
     console.log("📂 loadButton:", loadButton);
     //console.log("📂 computeButton:", computeButton);
     //console.log("📂 resultsContainer:", resultsContainer);
     console.log("📂 convertButton:", convertButton);

     // Debug: Log elements
    console.log("🔍 Checking DOM elements before setup...", {
        //fileInput, loadButton, computeButton, resultsContainer
        fileInput, loadButton
    });

    // Validate elements
    // if (!fileInput || !loadButton || !computeButton || !resultsContainer || !convertButton) {
    if (!fileInput || !loadButton || !convertButton) {
        console.error('File upload elements are missing in the DOM.');
        return;
    }

    console.log("✅ File upload elements exist. Running `setupFileUpload()` now...");

    let uploadedData = null; // Variable to store the uploaded JSON file data

    // File selection event
    fileInput.addEventListener('change', (event) => {
        const file = event.target.files[0]; // Get the selected file

        // Check if a file was selected
        if (!file) {
            console.warn("⚠️ No file selected. Waiting for a valid upload.");
            return;
        }

        console.log("📂 File selected:", file.name);

        const reader = new FileReader(); // Create a FileReader to read the file

        /**
         * Parses the JSON content from the uploaded file.
         * @param {ProgressEvent} event - The file read event containing the JSON data.
         */
        reader.onload = (event) => {
            try {
                // Parse the uploaded JSON file and store it
                uploadedData = JSON.parse(event.target.result);
                console.log('📂 Successfully loaded JSON Data:', uploadedData);
                
            } catch (error) {
                console.error('Error processing JSON file:', error);
                alert('Invalid JSON file. Please check your file.');
                uploadedData = null; // Reset the data in case of an error
            }
        };

        reader.readAsText(file); // Read the file as text
    });

    // When "Load JSON File" is clicked, load JSON and visualize lattice
    loadButton.addEventListener("click", () => {
        if (!uploadedData) {
            console.warn("⚠️ No file uploaded. Cannot proceed.");
            alert("⚠️ Please upload a JSON file first.");
            return;
        }

        console.log("📊 Computing metrics and visualizing lattice...");

        // Compute metrics and display metrics
        const metrics = calculateMetrics(uploadedData);
    
        // Update metrics in UI
        document.getElementById('total-concepts').textContent = metrics.totalConcepts;
        document.getElementById('total-objects').textContent = metrics.totalObjects;
        document.getElementById('total-attributes').textContent = metrics.totalAttributes;

        // Visualize lattice immediately after clicking load
        createLattice(uploadedData, { container: "#graph-container" });

        // Setup filters
        setupFilterControls(uploadedData);
    });


    /**
     * Compute Canonical Base. Handles the Compute button click event to process the uploaded data.
     */
    /*
    computeButton.addEventListener('click', () => {
        
       // const file = fileInput.files[0];

       // Ensure that a file has been uploaded before computing
       if (!uploadedData) {
        console.warn("⚠️ No file uploaded. Cannot compute canonical base.");
        alert('⚠️ Please upload a JSON file first.');
        return;
    }

    try {
        /**
         * Extracts concepts from the uploaded JSON data.
         * @returns {Array} List of extracted concepts (each with extent and intent).
         */
        /*
        const concepts = extractConceptsFromGraph(uploadedData);
        console.log('Extracted Concepts:', concepts);

        /**
         * Computes the canonical base (implication rules) for the extracted concepts.
         * @returns {Array} List of implications, each with a premise and conclusion.
         */
        /*
        const canonicalBase = computeCanonicalBase(concepts);
        console.log('Computed Canonical Base:', canonicalBase);
        

        /**
         * Displays the computed canonical base in the results section.
         * @param {Array} canonicalBase - The computed implications to display.
         */
        /*
        resultsContainer.textContent = JSON.stringify(canonicalBase, null, 2);

    } catch (error) {
        console.error('❌Error computing canonical base:', error);
        alert('❌Error in computation. Please check your file format.');
    }
});
*/

convertButton.addEventListener("click", () => {
    console.log("🟢 Convert button clicked!");
    
    if (!uploadedData) {
      console.warn("⚠️ No file uploaded. Cannot proceed with conversion.");
      alert("⚠️ Please upload a JSON file first.");
      return;
    }

    try {
      const parsedData = parseSerializedData(uploadedData);

       //Remove existing download links before creating a new one
       const existingDownloadLink = document.getElementById("download-link");
       if (existingDownloadLink) {
           existingDownloadLink.remove();
       }

       //Create a new download link and add it properly Trigger download for parsed data
      const blob = new Blob([JSON.stringify(parsedData, null, 2)], { type: 'application/json' });
      const downloadLink = document.createElement('a');
      downloadLink.href = URL.createObjectURL(blob);
      downloadLink.download = 'parsedLattice.json';
      downloadLink.id = "download-link"; // Assign an ID to track the download link

      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);

      console.log('✅ Parsed data downloaded successfully.');
    } catch (error) {
      console.error('❌ Error converting the file:', error);
      alert('❌ Conversion failed. Please ensure the file format is correct.');
    }
  });
}

function t(t,n){for(var e=0;e<n.length;e++){var r=n[e];r.enumerable=r.enumerable||false,r.configurable=true,"value"in r&&(r.writable=true),Object.defineProperty(t,"symbol"==typeof(o=function(t,n){if("object"!=typeof t||null===t)return t;var e=t[Symbol.toPrimitive];if(void 0!==e){var r=e.call(t,"string");if("object"!=typeof r)return r;throw new TypeError("@@toPrimitive must return a primitive value.")}return String(t)}(r.key))?o:String(o),r);}var o;}function n(n,e,r){return e&&t(n.prototype,e),Object.defineProperty(n,"prototype",{writable:false}),n}function e(){return e=Object.assign?Object.assign.bind():function(t){for(var n=1;n<arguments.length;n++){var e=arguments[n];for(var r in e)Object.prototype.hasOwnProperty.call(e,r)&&(t[r]=e[r]);}return t},e.apply(this,arguments)}function r(t,n){t.prototype=Object.create(n.prototype),t.prototype.constructor=t,o(t,n);}function o(t,n){return o=Object.setPrototypeOf?Object.setPrototypeOf.bind():function(t,n){return t.__proto__=n,t},o(t,n)}function i(t){if(void 0===t)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return t}function u(t,n){(null==n||n>t.length)&&(n=t.length);for(var e=0,r=new Array(n);e<n;e++)r[e]=t[e];return r}function s(t,n){var e="undefined"!=typeof Symbol&&t[Symbol.iterator]||t["@@iterator"];if(e)return (e=e.call(t)).next.bind(e);if(Array.isArray(t)||(e=function(t,n){if(t){if("string"==typeof t)return u(t,n);var e=Object.prototype.toString.call(t).slice(8,-1);return "Object"===e&&t.constructor&&(e=t.constructor.name),"Map"===e||"Set"===e?Array.from(t):"Arguments"===e||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(e)?u(t,n):void 0}}(t))||n){e&&(t=e);var r=0;return function(){return r>=t.length?{done:true}:{done:false,value:t[r++]}}}throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}var a;!function(t){t[t.Init=0]="Init",t[t.Loading=1]="Loading",t[t.Loaded=2]="Loaded",t[t.Rendered=3]="Rendered",t[t.Error=4]="Error";}(a||(a={}));var l,c,f,p,d,h,_,m={},v=[],y=/acit|ex(?:s|g|n|p|$)|rph|grid|ows|mnc|ntw|ine[ch]|zoo|^ord|itera/i;function g(t,n){for(var e in n)t[e]=n[e];return t}function b(t){var n=t.parentNode;n&&n.removeChild(t);}function w(t,n,e){var r,o,i,u={};for(i in n)"key"==i?r=n[i]:"ref"==i?o=n[i]:u[i]=n[i];if(arguments.length>2&&(u.children=arguments.length>3?l.call(arguments,2):e),"function"==typeof t&&null!=t.defaultProps)for(i in t.defaultProps) void 0===u[i]&&(u[i]=t.defaultProps[i]);return x(t,u,r,o,null)}function x(t,n,e,r,o){var i={type:t,props:n,key:e,ref:r,__k:null,__:null,__b:0,__e:null,__d:void 0,__c:null,__h:null,constructor:void 0,__v:null==o?++f:o};return null==o&&null!=c.vnode&&c.vnode(i),i}function S(t){return t.children}function N(t,n){this.props=t,this.context=n;}function P(t,n){if(null==n)return t.__?P(t.__,t.__.__k.indexOf(t)+1):null;for(var e;n<t.__k.length;n++)if(null!=(e=t.__k[n])&&null!=e.__e)return e.__e;return "function"==typeof t.type?P(t):null}function C(t){var n,e;if(null!=(t=t.__)&&null!=t.__c){for(t.__e=t.__c.base=null,n=0;n<t.__k.length;n++)if(null!=(e=t.__k[n])&&null!=e.__e){t.__e=t.__c.base=e.__e;break}return C(t)}}function E(t){(!t.__d&&(t.__d=true)&&d.push(t)&&!I.__r++||h!==c.debounceRendering)&&((h=c.debounceRendering)||setTimeout)(I);}function I(){for(var t;I.__r=d.length;)t=d.sort(function(t,n){return t.__v.__b-n.__v.__b}),d=[],t.some(function(t){var n,e,r,o,i,u;t.__d&&(i=(o=(n=t).__v).__e,(u=n.__P)&&(e=[],(r=g({},o)).__v=o.__v+1,M(u,o,r,n.__n,void 0!==u.ownerSVGElement,null!=o.__h?[i]:null,e,null==i?P(o):i,o.__h),F(e,o),o.__e!=i&&C(o)));});}function T(t,n,e,r,o,i,u,s,a,l){var c,f,p,d,h,_,y,g=r&&r.__k||v,b=g.length;for(e.__k=[],c=0;c<n.length;c++)if(null!=(d=e.__k[c]=null==(d=n[c])||"boolean"==typeof d?null:"string"==typeof d||"number"==typeof d||"bigint"==typeof d?x(null,d,null,null,d):Array.isArray(d)?x(S,{children:d},null,null,null):d.__b>0?x(d.type,d.props,d.key,d.ref?d.ref:null,d.__v):d)){if(d.__=e,d.__b=e.__b+1,null===(p=g[c])||p&&d.key==p.key&&d.type===p.type)g[c]=void 0;else for(f=0;f<b;f++){if((p=g[f])&&d.key==p.key&&d.type===p.type){g[f]=void 0;break}p=null;}M(t,d,p=p||m,o,i,u,s,a,l),h=d.__e,(f=d.ref)&&p.ref!=f&&(y||(y=[]),p.ref&&y.push(p.ref,null,d),y.push(f,d.__c||h,d)),null!=h?(null==_&&(_=h),"function"==typeof d.type&&d.__k===p.__k?d.__d=a=L(d,a,t):a=A(t,d,p,g,h,a),"function"==typeof e.type&&(e.__d=a)):a&&p.__e==a&&a.parentNode!=t&&(a=P(p));}for(e.__e=_,c=b;c--;)null!=g[c]&&W(g[c],g[c]);if(y)for(c=0;c<y.length;c++)U(y[c],y[++c],y[++c]);}function L(t,n,e){for(var r,o=t.__k,i=0;o&&i<o.length;i++)(r=o[i])&&(r.__=t,n="function"==typeof r.type?L(r,n,e):A(e,r,r,o,r.__e,n));return n}function A(t,n,e,r,o,i){var u,s,a;if(void 0!==n.__d)u=n.__d,n.__d=void 0;else if(null==e||o!=i||null==o.parentNode)t:if(null==i||i.parentNode!==t)t.appendChild(o),u=null;else {for(s=i,a=0;(s=s.nextSibling)&&a<r.length;a+=1)if(s==o)break t;t.insertBefore(o,i),u=i;}return void 0!==u?u:o.nextSibling}function O(t,n,e){"-"===n[0]?t.setProperty(n,e):t[n]=null==e?"":"number"!=typeof e||y.test(n)?e:e+"px";}function H(t,n,e,r,o){var i;t:if("style"===n)if("string"==typeof e)t.style.cssText=e;else {if("string"==typeof r&&(t.style.cssText=r=""),r)for(n in r)e&&n in e||O(t.style,n,"");if(e)for(n in e)r&&e[n]===r[n]||O(t.style,n,e[n]);}else if("o"===n[0]&&"n"===n[1])i=n!==(n=n.replace(/Capture$/,"")),n=n.toLowerCase()in t?n.toLowerCase().slice(2):n.slice(2),t.l||(t.l={}),t.l[n+i]=e,e?r||t.addEventListener(n,i?D:j,i):t.removeEventListener(n,i?D:j,i);else if("dangerouslySetInnerHTML"!==n){if(o)n=n.replace(/xlink(H|:h)/,"h").replace(/sName$/,"s");else if("href"!==n&&"list"!==n&&"form"!==n&&"tabIndex"!==n&&"download"!==n&&n in t)try{t[n]=null==e?"":e;break t}catch(t){}"function"==typeof e||(null==e||false===e&&-1==n.indexOf("-")?t.removeAttribute(n):t.setAttribute(n,e));}}function j(t){this.l[t.type+false](c.event?c.event(t):t);}function D(t){this.l[t.type+true](c.event?c.event(t):t);}function M(t,n,e,r,o,i,u,s,a){var l,f,p,d,h,_,m,v,y,b,w,x,k,P,C,E=n.type;if(void 0!==n.constructor)return null;null!=e.__h&&(a=e.__h,s=n.__e=e.__e,n.__h=null,i=[s]),(l=c.__b)&&l(n);try{t:if("function"==typeof E){if(v=n.props,y=(l=E.contextType)&&r[l.__c],b=l?y?y.props.value:l.__:r,e.__c?m=(f=n.__c=e.__c).__=f.__E:("prototype"in E&&E.prototype.render?n.__c=f=new E(v,b):(n.__c=f=new N(v,b),f.constructor=E,f.render=B),y&&y.sub(f),f.props=v,f.state||(f.state={}),f.context=b,f.__n=r,p=f.__d=!0,f.__h=[],f._sb=[]),null==f.__s&&(f.__s=f.state),null!=E.getDerivedStateFromProps&&(f.__s==f.state&&(f.__s=g({},f.__s)),g(f.__s,E.getDerivedStateFromProps(v,f.__s))),d=f.props,h=f.state,p)null==E.getDerivedStateFromProps&&null!=f.componentWillMount&&f.componentWillMount(),null!=f.componentDidMount&&f.__h.push(f.componentDidMount);else {if(null==E.getDerivedStateFromProps&&v!==d&&null!=f.componentWillReceiveProps&&f.componentWillReceiveProps(v,b),!f.__e&&null!=f.shouldComponentUpdate&&!1===f.shouldComponentUpdate(v,f.__s,b)||n.__v===e.__v){for(f.props=v,f.state=f.__s,n.__v!==e.__v&&(f.__d=!1),f.__v=n,n.__e=e.__e,n.__k=e.__k,n.__k.forEach(function(t){t&&(t.__=n);}),w=0;w<f._sb.length;w++)f.__h.push(f._sb[w]);f._sb=[],f.__h.length&&u.push(f);break t}null!=f.componentWillUpdate&&f.componentWillUpdate(v,f.__s,b),null!=f.componentDidUpdate&&f.__h.push(function(){f.componentDidUpdate(d,h,_);});}if(f.context=b,f.props=v,f.__v=n,f.__P=t,x=c.__r,k=0,"prototype"in E&&E.prototype.render){for(f.state=f.__s,f.__d=!1,x&&x(n),l=f.render(f.props,f.state,f.context),P=0;P<f._sb.length;P++)f.__h.push(f._sb[P]);f._sb=[];}else do{f.__d=!1,x&&x(n),l=f.render(f.props,f.state,f.context),f.state=f.__s;}while(f.__d&&++k<25);f.state=f.__s,null!=f.getChildContext&&(r=g(g({},r),f.getChildContext())),p||null==f.getSnapshotBeforeUpdate||(_=f.getSnapshotBeforeUpdate(d,h)),C=null!=l&&l.type===S&&null==l.key?l.props.children:l,T(t,Array.isArray(C)?C:[C],n,e,r,o,i,u,s,a),f.base=n.__e,n.__h=null,f.__h.length&&u.push(f),m&&(f.__E=f.__=null),f.__e=!1;}else null==i&&n.__v===e.__v?(n.__k=e.__k,n.__e=e.__e):n.__e=R(e.__e,n,e,r,o,i,u,a);(l=c.diffed)&&l(n);}catch(t){n.__v=null,(a||null!=i)&&(n.__e=s,n.__h=!!a,i[i.indexOf(s)]=null),c.__e(t,n,e);}}function F(t,n){c.__c&&c.__c(n,t),t.some(function(n){try{t=n.__h,n.__h=[],t.some(function(t){t.call(n);});}catch(t){c.__e(t,n.__v);}});}function R(t,n,e,r,o,i,u,s){var a,c,f,p=e.props,d=n.props,h=n.type,_=0;if("svg"===h&&(o=true),null!=i)for(;_<i.length;_++)if((a=i[_])&&"setAttribute"in a==!!h&&(h?a.localName===h:3===a.nodeType)){t=a,i[_]=null;break}if(null==t){if(null===h)return document.createTextNode(d);t=o?document.createElementNS("http://www.w3.org/2000/svg",h):document.createElement(h,d.is&&d),i=null,s=false;}if(null===h)p===d||s&&t.data===d||(t.data=d);else {if(i=i&&l.call(t.childNodes),c=(p=e.props||m).dangerouslySetInnerHTML,f=d.dangerouslySetInnerHTML,!s){if(null!=i)for(p={},_=0;_<t.attributes.length;_++)p[t.attributes[_].name]=t.attributes[_].value;(f||c)&&(f&&(c&&f.__html==c.__html||f.__html===t.innerHTML)||(t.innerHTML=f&&f.__html||""));}if(function(t,n,e,r,o){var i;for(i in e)"children"===i||"key"===i||i in n||H(t,i,null,e[i],r);for(i in n)o&&"function"!=typeof n[i]||"children"===i||"key"===i||"value"===i||"checked"===i||e[i]===n[i]||H(t,i,n[i],e[i],r);}(t,d,p,o,s),f)n.__k=[];else if(_=n.props.children,T(t,Array.isArray(_)?_:[_],n,e,r,o&&"foreignObject"!==h,i,u,i?i[0]:e.__k&&P(e,0),s),null!=i)for(_=i.length;_--;)null!=i[_]&&b(i[_]);s||("value"in d&&void 0!==(_=d.value)&&(_!==t.value||"progress"===h&&!_||"option"===h&&_!==p.value)&&H(t,"value",_,p.value,false),"checked"in d&&void 0!==(_=d.checked)&&_!==t.checked&&H(t,"checked",_,p.checked,false));}return t}function U(t,n,e){try{"function"==typeof t?t(n):t.current=n;}catch(t){c.__e(t,e);}}function W(t,n,e){var r,o;if(c.unmount&&c.unmount(t),(r=t.ref)&&(r.current&&r.current!==t.__e||U(r,null,n)),null!=(r=t.__c)){if(r.componentWillUnmount)try{r.componentWillUnmount();}catch(t){c.__e(t,n);}r.base=r.__P=null,t.__c=void 0;}if(r=t.__k)for(o=0;o<r.length;o++)r[o]&&W(r[o],n,e||"function"!=typeof t.type);e||null==t.__e||b(t.__e),t.__=t.__e=t.__d=void 0;}function B(t,n,e){return this.constructor(t,e)}function q(t,n,e){var r,o,i;c.__&&c.__(t,n),o=(r="function"=="undefined")?null:n.__k,i=[],M(n,t=(n).__k=w(S,null,[t]),o||m,m,void 0!==n.ownerSVGElement,o?null:n.firstChild?l.call(n.childNodes):null,i,o?o.__e:n.firstChild,r),F(i,t);}function z(){return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g,function(t){var n=16*Math.random()|0;return ("x"==t?n:3&n|8).toString(16)})}l=v.slice,c={__e:function(t,n,e,r){for(var o,i,u;n=n.__;)if((o=n.__c)&&!o.__)try{if((i=o.constructor)&&null!=i.getDerivedStateFromError&&(o.setState(i.getDerivedStateFromError(t)),u=o.__d),null!=o.componentDidCatch&&(o.componentDidCatch(t,r||{}),u=o.__d),u)return o.__E=o}catch(n){t=n;}throw t}},f=0,p=function(t){return null!=t&&void 0===t.constructor},N.prototype.setState=function(t,n){var e;e=null!=this.__s&&this.__s!==this.state?this.__s:this.__s=g({},this.state),"function"==typeof t&&(t=t(g({},e),this.props)),t&&g(e,t),null!=t&&this.__v&&(n&&this._sb.push(n),E(this));},N.prototype.forceUpdate=function(t){this.__v&&(this.__e=true,t&&this.__h.push(t),E(this));},N.prototype.render=S,d=[],I.__r=0,_=0;var V=/*#__PURE__*/function(){function t(t){this._id=void 0,this._id=t||z();}return n(t,[{key:"id",get:function(){return this._id}}]),t}();function $(t){return w(t.parentElement||"span",{dangerouslySetInnerHTML:{__html:t.content}})}function G(t,n){return w($,{content:t,parentElement:n})}var K,X=/*#__PURE__*/function(t){function n(n){var e;return (e=t.call(this)||this).data=void 0,e.update(n),e}r(n,t);var e=n.prototype;return e.cast=function(t){return t instanceof HTMLElement?G(t.outerHTML):t},e.update=function(t){return this.data=this.cast(t),this},n}(V),Z=/*#__PURE__*/function(t){function e(n){var e;return (e=t.call(this)||this)._cells=void 0,e.cells=n||[],e}r(e,t);var o=e.prototype;return o.cell=function(t){return this._cells[t]},o.toArray=function(){return this.cells.map(function(t){return t.data})},e.fromCells=function(t){return new e(t.map(function(t){return new X(t.data)}))},n(e,[{key:"cells",get:function(){return this._cells},set:function(t){this._cells=t;}},{key:"length",get:function(){return this.cells.length}}]),e}(V),J=/*#__PURE__*/function(t){function e(n){var e;return (e=t.call(this)||this)._rows=void 0,e._length=void 0,e.rows=n instanceof Array?n:n instanceof Z?[n]:[],e}return r(e,t),e.prototype.toArray=function(){return this.rows.map(function(t){return t.toArray()})},e.fromRows=function(t){return new e(t.map(function(t){return Z.fromCells(t.cells)}))},e.fromArray=function(t){return new e((t=function(t){return !t[0]||t[0]instanceof Array?t:[t]}(t)).map(function(t){return new Z(t.map(function(t){return new X(t)}))}))},n(e,[{key:"rows",get:function(){return this._rows},set:function(t){this._rows=t;}},{key:"length",get:function(){return this._length||this.rows.length},set:function(t){this._length=t;}}]),e}(V),Q=/*#__PURE__*/function(){function t(){this.callbacks=void 0;}var n=t.prototype;return n.init=function(t){this.callbacks||(this.callbacks={}),t&&!this.callbacks[t]&&(this.callbacks[t]=[]);},n.listeners=function(){return this.callbacks},n.on=function(t,n){return this.init(t),this.callbacks[t].push(n),this},n.off=function(t,n){var e=t;return this.init(),this.callbacks[e]&&0!==this.callbacks[e].length?(this.callbacks[e]=this.callbacks[e].filter(function(t){return t!=n}),this):this},n.emit=function(t){var n=arguments,e=t;return this.init(e),this.callbacks[e].length>0&&(this.callbacks[e].forEach(function(t){return t.apply(void 0,[].slice.call(n,1))}),true)},t}();function Y(t,n){if(typeof t!=typeof n)return  false;if(null===t&&null===n)return  true;if("object"!=typeof t)return t===n;if(Array.isArray(t)&&Array.isArray(n)){if(t.length!==n.length)return  false;for(var e=0;e<t.length;e++)if(!Y(t[e],n[e]))return  false;return  true}if(t.hasOwnProperty("constructor")&&n.hasOwnProperty("constructor")&&t.hasOwnProperty("props")&&n.hasOwnProperty("props")&&t.hasOwnProperty("key")&&n.hasOwnProperty("key")&&t.hasOwnProperty("ref")&&n.hasOwnProperty("ref")&&t.hasOwnProperty("type")&&n.hasOwnProperty("type"))return Y(t.props,n.props);var r=Object.keys(t),o=Object.keys(n);if(r.length!==o.length)return  false;for(var i=0,u=r;i<u.length;i++){var s=u[i];if(!n.hasOwnProperty(s)||!Y(t[s],n[s]))return  false}return  true}!function(t){t[t.Initiator=0]="Initiator",t[t.ServerFilter=1]="ServerFilter",t[t.ServerSort=2]="ServerSort",t[t.ServerLimit=3]="ServerLimit",t[t.Extractor=4]="Extractor",t[t.Transformer=5]="Transformer",t[t.Filter=6]="Filter",t[t.Sort=7]="Sort",t[t.Limit=8]="Limit";}(K||(K={}));var tt=/*#__PURE__*/function(t){function o(n){var e;return (e=t.call(this)||this).id=void 0,e._props=void 0,e._props={},e.id=z(),n&&e.setProps(n),e}r(o,t);var i=o.prototype;return i.process=function(){var t=[].slice.call(arguments);this.validateProps instanceof Function&&this.validateProps.apply(this,t),this.emit.apply(this,["beforeProcess"].concat(t));var n=this._process.apply(this,t);return this.emit.apply(this,["afterProcess"].concat(t)),n},i.setProps=function(t){var n=e({},this._props,t);return Y(n,this._props)||(this._props=n,this.emit("propsUpdated",this)),this},n(o,[{key:"props",get:function(){return this._props}}]),o}(Q),nt=/*#__PURE__*/function(t){function e(){return t.apply(this,arguments)||this}return r(e,t),e.prototype._process=function(t){return this.props.keyword?(n=String(this.props.keyword).trim(),e=this.props.columns,r=this.props.ignoreHiddenColumns,o=t,i=this.props.selector,n=n.replace(/[-[\]{}()*+?.,\\^$|#\s]/g,"\\$&"),new J(o.rows.filter(function(t,o){return t.cells.some(function(t,u){if(!t)return  false;if(r&&e&&e[u]&&"object"==typeof e[u]&&e[u].hidden)return  false;var s="";if("function"==typeof i)s=i(t.data,o,u);else if("object"==typeof t.data){var a=t.data;a&&a.props&&a.props.content&&(s=a.props.content);}else s=String(t.data);return new RegExp(n,"gi").test(s)})}))):t;var n,e,r,o,i;},n(e,[{key:"type",get:function(){return K.Filter}}]),e}(tt);function et(){var t="gridjs";return ""+t+[].slice.call(arguments).reduce(function(t,n){return t+"-"+n},"")}function rt(){return [].slice.call(arguments).map(function(t){return t?t.toString():""}).filter(function(t){return t}).reduce(function(t,n){return (t||"")+" "+n},"").trim()}var ot,it,ut,st,at=/*#__PURE__*/function(t){function o(){return t.apply(this,arguments)||this}return r(o,t),o.prototype._process=function(t){if(!this.props.keyword)return t;var n={};return this.props.url&&(n.url=this.props.url(t.url,this.props.keyword)),this.props.body&&(n.body=this.props.body(t.body,this.props.keyword)),e({},t,n)},n(o,[{key:"type",get:function(){return K.ServerFilter}}]),o}(tt),lt=0,ct=[],ft=[],pt=c.__b,dt=c.__r,ht=c.diffed,_t=c.__c,mt=c.unmount;function vt(t,n){c.__h&&c.__h(it,t,lt||n),lt=0;var e=it.__H||(it.__H={__:[],__h:[]});return t>=e.__.length&&e.__.push({__V:ft}),e.__[t]}function yt(t){return lt=1,function(t,n,e){var r=vt(ot++,2);if(r.t=t,!r.__c&&(r.__=[Et(void 0,n),function(t){var n=r.__N?r.__N[0]:r.__[0],e=r.t(n,t);n!==e&&(r.__N=[e,r.__[1]],r.__c.setState({}));}],r.__c=it,!it.u)){it.u=true;var o=it.shouldComponentUpdate;it.shouldComponentUpdate=function(t,n,e){if(!r.__c.__H)return  true;var i=r.__c.__H.__.filter(function(t){return t.__c});if(i.every(function(t){return !t.__N}))return !o||o.call(this,t,n,e);var u=false;return i.forEach(function(t){if(t.__N){var n=t.__[0];t.__=t.__N,t.__N=void 0,n!==t.__[0]&&(u=true);}}),!(!u&&r.__c.props===t)&&(!o||o.call(this,t,n,e))};}return r.__N||r.__}(Et,t)}function gt(t,n){var e=vt(ot++,3);!c.__s&&Ct(e.__H,n)&&(e.__=t,e.i=n,it.__H.__h.push(e));}function bt(t){return lt=5,wt(function(){return {current:t}},[])}function wt(t,n){var e=vt(ot++,7);return Ct(e.__H,n)?(e.__V=t(),e.i=n,e.__h=t,e.__V):e.__}function xt(){for(var t;t=ct.shift();)if(t.__P&&t.__H)try{t.__H.__h.forEach(Nt),t.__H.__h.forEach(Pt),t.__H.__h=[];}catch(n){t.__H.__h=[],c.__e(n,t.__v);}}c.__b=function(t){it=null,pt&&pt(t);},c.__r=function(t){dt&&dt(t),ot=0;var n=(it=t.__c).__H;n&&(ut===it?(n.__h=[],it.__h=[],n.__.forEach(function(t){t.__N&&(t.__=t.__N),t.__V=ft,t.__N=t.i=void 0;})):(n.__h.forEach(Nt),n.__h.forEach(Pt),n.__h=[])),ut=it;},c.diffed=function(t){ht&&ht(t);var n=t.__c;n&&n.__H&&(n.__H.__h.length&&(1!==ct.push(n)&&st===c.requestAnimationFrame||((st=c.requestAnimationFrame)||St)(xt)),n.__H.__.forEach(function(t){t.i&&(t.__H=t.i),t.__V!==ft&&(t.__=t.__V),t.i=void 0,t.__V=ft;})),ut=it=null;},c.__c=function(t,n){n.some(function(t){try{t.__h.forEach(Nt),t.__h=t.__h.filter(function(t){return !t.__||Pt(t)});}catch(e){n.some(function(t){t.__h&&(t.__h=[]);}),n=[],c.__e(e,t.__v);}}),_t&&_t(t,n);},c.unmount=function(t){mt&&mt(t);var n,e=t.__c;e&&e.__H&&(e.__H.__.forEach(function(t){try{Nt(t);}catch(t){n=t;}}),e.__H=void 0,n&&c.__e(n,e.__v));};var kt="function"==typeof requestAnimationFrame;function St(t){var n,e=function(){clearTimeout(r),kt&&cancelAnimationFrame(n),setTimeout(t);},r=setTimeout(e,100);kt&&(n=requestAnimationFrame(e));}function Nt(t){var n=it,e=t.__c;"function"==typeof e&&(t.__c=void 0,e()),it=n;}function Pt(t){var n=it;t.__c=t.__(),it=n;}function Ct(t,n){return !t||t.length!==n.length||n.some(function(n,e){return n!==t[e]})}function Et(t,n){return "function"==typeof n?n(t):n}function It(){return function(t){var n=it.context[t.__c],e=vt(ot++,9);return e.c=t,n?(null==e.__&&(e.__=true,n.sub(it)),n.props.value):t.__}(fn)}var Tt={search:{placeholder:"Type a keyword..."},sort:{sortAsc:"Sort column ascending",sortDesc:"Sort column descending"},pagination:{previous:"Previous",next:"Next",navigate:function(t,n){return "Page "+t+" of "+n},page:function(t){return "Page "+t},showing:"Showing",of:"of",to:"to",results:"results"},loading:"Loading...",noRecordsFound:"No matching records found",error:"An error happened while fetching the data"},Lt=/*#__PURE__*/function(){function t(t){this._language=void 0,this._defaultLanguage=void 0,this._language=t,this._defaultLanguage=Tt;}var n=t.prototype;return n.getString=function(t,n){if(!n||!t)return null;var e=t.split("."),r=e[0];if(n[r]){var o=n[r];return "string"==typeof o?function(){return o}:"function"==typeof o?o:this.getString(e.slice(1).join("."),o)}return null},n.translate=function(t){var n,e=this.getString(t,this._language);return (n=e||this.getString(t,this._defaultLanguage))?n.apply(void 0,[].slice.call(arguments,1)):t},t}();function At(){var t=It();return function(n){var e;return (e=t.translator).translate.apply(e,[n].concat([].slice.call(arguments,1)))}}var Ot=function(t){return function(n){return e({},n,{search:{keyword:t}})}};function Ht(){return It().store}function jt(t){var n=Ht(),e=yt(t(n.getState())),r=e[0],o=e[1];return gt(function(){return n.subscribe(function(){var e=t(n.getState());r!==e&&o(e);})},[]),r}function Dt(){var t,n=yt(void 0),e=n[0],r=n[1],o=It(),i=o.search,u=At(),s=Ht().dispatch,a=jt(function(t){return t.search});gt(function(){e&&e.setProps({keyword:null==a?void 0:a.keyword});},[a,e]),gt(function(){r(i.server?new at({keyword:i.keyword,url:i.server.url,body:i.server.body}):new nt({keyword:i.keyword,columns:o.header&&o.header.columns,ignoreHiddenColumns:i.ignoreHiddenColumns||void 0===i.ignoreHiddenColumns,selector:i.selector})),i.keyword&&s(Ot(i.keyword));},[i]),gt(function(){if(e)return o.pipeline.register(e),function(){return o.pipeline.unregister(e)}},[o,e]);var l,c,f,p=function(t,n){return lt=8,wt(function(){return t},n)}((l=function(t){t.target instanceof HTMLInputElement&&s(Ot(t.target.value));},c=e instanceof at?i.debounceTimeout||250:0,function(){var t=arguments;return new Promise(function(n){f&&clearTimeout(f),f=setTimeout(function(){return n(l.apply(void 0,[].slice.call(t)))},c);})}),[i,e]);return w("div",{className:et(rt("search",null==(t=o.className)?void 0:t.search))},w("input",{type:"search",placeholder:u("search.placeholder"),"aria-label":u("search.placeholder"),onInput:p,className:rt(et("input"),et("search","input")),defaultValue:(null==a?void 0:a.keyword)||""}))}var Mt=/*#__PURE__*/function(t){function e(){return t.apply(this,arguments)||this}r(e,t);var o=e.prototype;return o.validateProps=function(){if(isNaN(Number(this.props.limit))||isNaN(Number(this.props.page)))throw Error("Invalid parameters passed")},o._process=function(t){var n=this.props.page;return new J(t.rows.slice(n*this.props.limit,(n+1)*this.props.limit))},n(e,[{key:"type",get:function(){return K.Limit}}]),e}(tt),Ft=/*#__PURE__*/function(t){function o(){return t.apply(this,arguments)||this}return r(o,t),o.prototype._process=function(t){var n={};return this.props.url&&(n.url=this.props.url(t.url,this.props.page,this.props.limit)),this.props.body&&(n.body=this.props.body(t.body,this.props.page,this.props.limit)),e({},t,n)},n(o,[{key:"type",get:function(){return K.ServerLimit}}]),o}(tt);function Rt(){var t=It(),n=t.pagination,e=n.server,r=n.summary,o=void 0===r||r,i=n.nextButton,u=void 0===i||i,s=n.prevButton,a=void 0===s||s,l=n.buttonsCount,c=void 0===l?3:l,f=n.limit,p=void 0===f?10:f,d=n.page,h=void 0===d?0:d,_=n.resetPageOnUpdate,m=void 0===_||_,v=bt(null),y=yt(h),g=y[0],b=y[1],x=yt(0),k=x[0],N=x[1],P=At();gt(function(){return e?(v.current=new Ft({limit:p,page:g,url:e.url,body:e.body}),t.pipeline.register(v.current)):(v.current=new Mt({limit:p,page:g}),t.pipeline.register(v.current)),v.current instanceof Ft?t.pipeline.on("afterProcess",function(t){return N(t.length)}):v.current instanceof Mt&&v.current.on("beforeProcess",function(t){return N(t.length)}),t.pipeline.on("updated",C),t.pipeline.on("error",function(){N(0),b(0);}),function(){t.pipeline.unregister(v.current),t.pipeline.off("updated",C);}},[]);var C=function(t){m&&t!==v.current&&(b(0),0!==v.current.props.page&&v.current.setProps({page:0}));},E=function(){return Math.ceil(k/p)},I=function(t){if(t>=E()||t<0||t===g)return null;b(t),v.current.setProps({page:t});};return w("div",{className:rt(et("pagination"),t.className.pagination)},w(S,null,o&&k>0&&w("div",{role:"status","aria-live":"polite",className:rt(et("summary"),t.className.paginationSummary),title:P("pagination.navigate",g+1,E())},P("pagination.showing")," ",w("b",null,P(""+(g*p+1)))," ",P("pagination.to")," ",w("b",null,P(""+Math.min((g+1)*p,k)))," ",P("pagination.of")," ",w("b",null,P(""+k))," ",P("pagination.results"))),w("div",{className:et("pages")},a&&w("button",{tabIndex:0,role:"button",disabled:0===g,onClick:function(){return I(g-1)},title:P("pagination.previous"),"aria-label":P("pagination.previous"),className:rt(t.className.paginationButton,t.className.paginationButtonPrev)},P("pagination.previous")),function(){if(c<=0)return null;var n=Math.min(E(),c),e=Math.min(g,Math.floor(n/2));return g+Math.floor(n/2)>=E()&&(e=n-(E()-g)),w(S,null,E()>n&&g-e>0&&w(S,null,w("button",{tabIndex:0,role:"button",onClick:function(){return I(0)},title:P("pagination.firstPage"),"aria-label":P("pagination.firstPage"),className:t.className.paginationButton},P("1")),w("button",{tabIndex:-1,className:rt(et("spread"),t.className.paginationButton)},"...")),Array.from(Array(n).keys()).map(function(t){return g+(t-e)}).map(function(n){return w("button",{tabIndex:0,role:"button",onClick:function(){return I(n)},className:rt(g===n?rt(et("currentPage"),t.className.paginationButtonCurrent):null,t.className.paginationButton),title:P("pagination.page",n+1),"aria-label":P("pagination.page",n+1)},P(""+(n+1)))}),E()>n&&E()>g+e+1&&w(S,null,w("button",{tabIndex:-1,className:rt(et("spread"),t.className.paginationButton)},"..."),w("button",{tabIndex:0,role:"button",onClick:function(){return I(E()-1)},title:P("pagination.page",E()),"aria-label":P("pagination.page",E()),className:t.className.paginationButton},P(""+E()))))}(),u&&w("button",{tabIndex:0,role:"button",disabled:E()===g+1||0===E(),onClick:function(){return I(g+1)},title:P("pagination.next"),"aria-label":P("pagination.next"),className:rt(t.className.paginationButton,t.className.paginationButtonNext)},P("pagination.next"))))}function Ut(t,n){return "string"==typeof t?t.indexOf("%")>-1?n/100*parseInt(t,10):parseInt(t,10):t}function Wt(t){return t?Math.floor(t)+"px":""}function Bt(t){var n=t.tableRef.cloneNode(true);return n.style.position="absolute",n.style.width="100%",n.style.zIndex="-2147483640",n.style.visibility="hidden",w("div",{ref:function(t){t&&t.appendChild(n);}})}function qt(t){if(!t)return "";var n=t.split(" ");return 1===n.length&&/([a-z][A-Z])+/g.test(t)?t:n.map(function(t,n){return 0==n?t.toLowerCase():t.charAt(0).toUpperCase()+t.slice(1).toLowerCase()}).join("")}var zt,Vt=new(/*#__PURE__*/function(){function t(){}var n=t.prototype;return n.format=function(t,n){return "[Grid.js] ["+n.toUpperCase()+"]: "+t},n.error=function(t,n){ void 0===n&&(n=false);var e=this.format(t,"error");if(n)throw Error(e);console.error(e);},n.warn=function(t){console.warn(this.format(t,"warn"));},n.info=function(t){console.info(this.format(t,"info"));},t}());!function(t){t[t.Header=0]="Header",t[t.Footer=1]="Footer",t[t.Cell=2]="Cell";}(zt||(zt={}));var $t=/*#__PURE__*/function(){function t(){this.plugins=void 0,this.plugins=[];}var n=t.prototype;return n.get=function(t){return this.plugins.find(function(n){return n.id===t})},n.add=function(t){return t.id?this.get(t.id)?(Vt.error("Duplicate plugin ID: "+t.id),this):(this.plugins.push(t),this):(Vt.error("Plugin ID cannot be empty"),this)},n.remove=function(t){var n=this.get(t);return n&&this.plugins.splice(this.plugins.indexOf(n),1),this},n.list=function(t){var n;return n=null!=t||null!=t?this.plugins.filter(function(n){return n.position===t}):this.plugins,n.sort(function(t,n){return t.order&&n.order?t.order-n.order:1})},t}();function Gt(t){var n=this,r=It();if(t.pluginId){var o=r.plugin.get(t.pluginId);return o?w(S,{},w(o.component,e({plugin:o},t.props))):null}return void 0!==t.position?w(S,{},r.plugin.list(t.position).map(function(t){return w(t.component,e({plugin:t},n.props.props))})):null}var Kt=/*#__PURE__*/function(t){function o(){var n;return (n=t.call(this)||this)._columns=void 0,n._columns=[],n}r(o,t);var i=o.prototype;return i.adjustWidth=function(t,n,r){var i=t.container,u=t.autoWidth;if(!i)return this;var a=i.clientWidth,l={};n.current&&u&&(q(w(Bt,{tableRef:n.current}),r.current),l=function(t){var n=t.querySelector("table");if(!n)return {};var r=n.className,o=n.style.cssText;n.className=r+" "+et("shadowTable"),n.style.tableLayout="auto",n.style.width="auto",n.style.padding="0",n.style.margin="0",n.style.border="none",n.style.outline="none";var i=Array.from(n.parentNode.querySelectorAll("thead th")).reduce(function(t,n){var r;return n.style.width=n.clientWidth+"px",e(((r={})[n.getAttribute("data-column-id")]={minWidth:n.clientWidth},r),t)},{});return n.className=r,n.style.cssText=o,n.style.tableLayout="auto",Array.from(n.parentNode.querySelectorAll("thead th")).reduce(function(t,n){return t[n.getAttribute("data-column-id")].width=n.clientWidth,t},i)}(r.current));for(var c,f=s(o.tabularFormat(this.columns).reduce(function(t,n){return t.concat(n)},[]));!(c=f()).done;){var p=c.value;p.columns&&p.columns.length>0||(!p.width&&u?p.id in l&&(p.width=Wt(l[p.id].width),p.minWidth=Wt(l[p.id].minWidth)):p.width=Wt(Ut(p.width,a)));}return n.current&&u&&q(null,r.current),this},i.setSort=function(t,n){for(var r,o=s(n||this.columns||[]);!(r=o()).done;){var i=r.value;i.columns&&i.columns.length>0?i.sort=void 0:void 0===i.sort&&t?i.sort={}:i.sort?"object"==typeof i.sort&&(i.sort=e({},i.sort)):i.sort=void 0,i.columns&&this.setSort(t,i.columns);}},i.setResizable=function(t,n){for(var e,r=s(n||this.columns||[]);!(e=r()).done;){var o=e.value;void 0===o.resizable&&(o.resizable=t),o.columns&&this.setResizable(t,o.columns);}},i.setID=function(t){for(var n,e=s(t||this.columns||[]);!(n=e()).done;){var r=n.value;r.id||"string"!=typeof r.name||(r.id=qt(r.name)),r.id||Vt.error('Could not find a valid ID for one of the columns. Make sure a valid "id" is set for all columns.'),r.columns&&this.setID(r.columns);}},i.populatePlugins=function(t,n){for(var r,o=s(n);!(r=o()).done;){var i=r.value;void 0!==i.plugin&&t.add(e({id:i.id},i.plugin,{position:zt.Cell}));}},o.fromColumns=function(t){for(var n,e=new o,r=s(t);!(n=r()).done;){var i=n.value;if("string"==typeof i||p(i))e.columns.push({name:i});else if("object"==typeof i){var u=i;u.columns&&(u.columns=o.fromColumns(u.columns).columns),"object"==typeof u.plugin&&void 0===u.data&&(u.data=null),e.columns.push(i);}}return e},o.createFromConfig=function(t){var n=new o;return t.from?n.columns=o.fromHTMLTable(t.from).columns:t.columns?n.columns=o.fromColumns(t.columns).columns:!t.data||"object"!=typeof t.data[0]||t.data[0]instanceof Array||(n.columns=Object.keys(t.data[0]).map(function(t){return {name:t}})),n.columns.length?(n.setID(),n.setSort(t.sort),n.setResizable(t.resizable),n.populatePlugins(t.plugin,n.columns),n):null},o.fromHTMLTable=function(t){for(var n,e=new o,r=s(t.querySelector("thead").querySelectorAll("th"));!(n=r()).done;){var i=n.value;e.columns.push({name:i.innerHTML,width:i.width});}return e},o.tabularFormat=function(t){var n=[],e=t||[],r=[];if(e&&e.length){n.push(e);for(var o,i=s(e);!(o=i()).done;){var u=o.value;u.columns&&u.columns.length&&(r=r.concat(u.columns));}r.length&&(n=n.concat(this.tabularFormat(r)));}return n},o.leafColumns=function(t){var n=[],e=t||[];if(e&&e.length)for(var r,o=s(e);!(r=o()).done;){var i=r.value;i.columns&&0!==i.columns.length||n.push(i),i.columns&&(n=n.concat(this.leafColumns(i.columns)));}return n},o.maximumDepth=function(t){return this.tabularFormat([t]).length-1},n(o,[{key:"columns",get:function(){return this._columns},set:function(t){this._columns=t;}},{key:"visibleColumns",get:function(){return this._columns.filter(function(t){return !t.hidden})}}]),o}(V),Xt=function(){},Zt=/*#__PURE__*/function(t){function n(n){var e;return (e=t.call(this)||this).data=void 0,e.set(n),e}r(n,t);var e=n.prototype;return e.get=function(){try{return Promise.resolve(this.data()).then(function(t){return {data:t,total:t.length}})}catch(t){return Promise.reject(t)}},e.set=function(t){return t instanceof Array?this.data=function(){return t}:t instanceof Function&&(this.data=t),this},n}(Xt),Jt=/*#__PURE__*/function(t){function n(n){var e;return (e=t.call(this)||this).options=void 0,e.options=n,e}r(n,t);var o=n.prototype;return o.handler=function(t){return "function"==typeof this.options.handle?this.options.handle(t):t.ok?t.json():(Vt.error("Could not fetch data: "+t.status+" - "+t.statusText,true),null)},o.get=function(t){var n=e({},this.options,t);return "function"==typeof n.data?n.data(n):fetch(n.url,n).then(this.handler.bind(this)).then(function(t){return {data:n.then(t),total:"function"==typeof n.total?n.total(t):void 0}})},n}(Xt),Qt=/*#__PURE__*/function(){function t(){}return t.createFromConfig=function(t){var n=null;return t.data&&(n=new Zt(t.data)),t.from&&(n=new Zt(this.tableElementToArray(t.from)),t.from.style.display="none"),t.server&&(n=new Jt(t.server)),n||Vt.error("Could not determine the storage type",true),n},t.tableElementToArray=function(t){for(var n,e,r=[],o=s(t.querySelector("tbody").querySelectorAll("tr"));!(n=o()).done;){for(var i,u=[],a=s(n.value.querySelectorAll("td"));!(i=a()).done;){var l=i.value;1===l.childNodes.length&&l.childNodes[0].nodeType===Node.TEXT_NODE?u.push((e=l.innerHTML,(new DOMParser).parseFromString(e,"text/html").documentElement.textContent)):u.push(G(l.innerHTML));}r.push(u);}return r},t}(),Yt="undefined"!=typeof Symbol?Symbol.iterator||(Symbol.iterator=Symbol("Symbol.iterator")):"@@iterator";function tn(t,n,e){if(!t.s){if(e instanceof nn){if(!e.s)return void(e.o=tn.bind(null,t,n));1&n&&(n=e.s),e=e.v;}if(e&&e.then)return void e.then(tn.bind(null,t,n),tn.bind(null,t,2));t.s=n,t.v=e;var r=t.o;r&&r(t);}}var nn=/*#__PURE__*/function(){function t(){}return t.prototype.then=function(n,e){var r=new t,o=this.s;if(o){var i=1&o?n:e;if(i){try{tn(r,1,i(this.v));}catch(t){tn(r,2,t);}return r}return this}return this.o=function(t){try{var o=t.v;1&t.s?tn(r,1,n?n(o):o):e?tn(r,1,e(o)):tn(r,2,o);}catch(t){tn(r,2,t);}},r},t}();function en(t){return t instanceof nn&&1&t.s}var rn=/*#__PURE__*/function(t){function e(n){var e;return (e=t.call(this)||this)._steps=new Map,e.cache=new Map,e.lastProcessorIndexUpdated=-1,n&&n.forEach(function(t){return e.register(t)}),e}r(e,t);var o=e.prototype;return o.clearCache=function(){this.cache=new Map,this.lastProcessorIndexUpdated=-1;},o.register=function(t,n){if(void 0===n&&(n=null),!t)throw Error("Processor is not defined");if(null===t.type)throw Error("Processor type is not defined");if(this.findProcessorIndexByID(t.id)>-1)throw Error("Processor ID "+t.id+" is already defined");return t.on("propsUpdated",this.processorPropsUpdated.bind(this)),this.addProcessorByPriority(t,n),this.afterRegistered(t),t},o.tryRegister=function(t,n){ void 0===n&&(n=null);try{return this.register(t,n)}catch(t){}},o.unregister=function(t){if(t&&-1!==this.findProcessorIndexByID(t.id)){var n=this._steps.get(t.type);n&&n.length&&(this._steps.set(t.type,n.filter(function(n){return n!=t})),this.emit("updated",t));}},o.addProcessorByPriority=function(t,n){var e=this._steps.get(t.type);if(!e){var r=[];this._steps.set(t.type,r),e=r;}if(null===n||n<0)e.push(t);else if(e[n]){var o=e.slice(0,n-1),i=e.slice(n+1);this._steps.set(t.type,o.concat(t).concat(i));}else e[n]=t;},o.getStepsByType=function(t){return this.steps.filter(function(n){return n.type===t})},o.getSortedProcessorTypes=function(){return Object.keys(K).filter(function(t){return !isNaN(Number(t))}).map(function(t){return Number(t)})},o.process=function(t){try{var n=function(t){return e.lastProcessorIndexUpdated=o.length,e.emit("afterProcess",i),i},e=this,r=e.lastProcessorIndexUpdated,o=e.steps,i=t,u=function(t,n){try{var u=function(t,n,e){if("function"==typeof t[Yt]){var r,o,i,u=t[Yt]();if(function t(e){try{for(;!(r=u.next()).done;)if((e=n(r.value))&&e.then){if(!en(e))return void e.then(t,i||(i=tn.bind(null,o=new nn,2)));e=e.v;}o?tn(o,1,e):o=e;}catch(t){tn(o||(o=new nn),2,t);}}(),u.return){var s=function(t){try{r.done||u.return();}catch(t){}return t};if(o&&o.then)return o.then(s,function(t){throw s(t)});s();}return o}if(!("length"in t))throw new TypeError("Object is not iterable");for(var a=[],l=0;l<t.length;l++)a.push(t[l]);return function(t,n,e){var r,o,i=-1;return function e(u){try{for(;++i<t.length;)if((u=n(i))&&u.then){if(!en(u))return void u.then(e,o||(o=tn.bind(null,r=new nn,2)));u=u.v;}r?tn(r,1,u):r=u;}catch(t){tn(r||(r=new nn),2,t);}}(),r}(a,function(t){return n(a[t])})}(o,function(t){var n=e.findProcessorIndexByID(t.id),o=function(){if(n>=r)return Promise.resolve(t.process(i)).then(function(n){e.cache.set(t.id,i=n);});i=e.cache.get(t.id);}();if(o&&o.then)return o.then(function(){})});}catch(t){return n(t)}return u&&u.then?u.then(void 0,n):u}(0,function(t){throw Vt.error(t),e.emit("error",i),t});return Promise.resolve(u&&u.then?u.then(n):n())}catch(t){return Promise.reject(t)}},o.findProcessorIndexByID=function(t){return this.steps.findIndex(function(n){return n.id==t})},o.setLastProcessorIndex=function(t){var n=this.findProcessorIndexByID(t.id);this.lastProcessorIndexUpdated>n&&(this.lastProcessorIndexUpdated=n);},o.processorPropsUpdated=function(t){this.setLastProcessorIndex(t),this.emit("propsUpdated"),this.emit("updated",t);},o.afterRegistered=function(t){this.setLastProcessorIndex(t),this.emit("afterRegister"),this.emit("updated",t);},n(e,[{key:"steps",get:function(){for(var t,n=[],e=s(this.getSortedProcessorTypes());!(t=e()).done;){var r=this._steps.get(t.value);r&&r.length&&(n=n.concat(r));}return n.filter(function(t){return t})}}]),e}(Q),on=/*#__PURE__*/function(t){function e(){return t.apply(this,arguments)||this}return r(e,t),e.prototype._process=function(t){try{return Promise.resolve(this.props.storage.get(t))}catch(t){return Promise.reject(t)}},n(e,[{key:"type",get:function(){return K.Extractor}}]),e}(tt),un=/*#__PURE__*/function(t){function e(){return t.apply(this,arguments)||this}return r(e,t),e.prototype._process=function(t){var n=J.fromArray(t.data);return n.length=t.total,n},n(e,[{key:"type",get:function(){return K.Transformer}}]),e}(tt),sn=/*#__PURE__*/function(t){function o(){return t.apply(this,arguments)||this}return r(o,t),o.prototype._process=function(){return Object.entries(this.props.serverStorageOptions).filter(function(t){return "function"!=typeof t[1]}).reduce(function(t,n){var r;return e({},t,((r={})[n[0]]=n[1],r))},{})},n(o,[{key:"type",get:function(){return K.Initiator}}]),o}(tt),an=/*#__PURE__*/function(t){function e(){return t.apply(this,arguments)||this}r(e,t);var o=e.prototype;return o.castData=function(t){if(!t||!t.length)return [];if(!this.props.header||!this.props.header.columns)return t;var n=Kt.leafColumns(this.props.header.columns);return t[0]instanceof Array?t.map(function(t){var e=0;return n.map(function(n,r){return void 0!==n.data?(e++,"function"==typeof n.data?n.data(t):n.data):t[r-e]})}):"object"!=typeof t[0]||t[0]instanceof Array?[]:t.map(function(t){return n.map(function(n,e){return void 0!==n.data?"function"==typeof n.data?n.data(t):n.data:n.id?t[n.id]:(Vt.error("Could not find the correct cell for column at position "+e+".\n                          Make sure either 'id' or 'selector' is defined for all columns."),null)})})},o._process=function(t){return {data:this.castData(t.data),total:t.total}},n(e,[{key:"type",get:function(){return K.Transformer}}]),e}(tt),ln=/*#__PURE__*/function(){function t(){}return t.createFromConfig=function(t){var n=new rn;return t.storage instanceof Jt&&n.register(new sn({serverStorageOptions:t.server})),n.register(new on({storage:t.storage})),n.register(new an({header:t.header})),n.register(new un),n},t}(),cn=function(t){var n=this;this.state=void 0,this.listeners=[],this.isDispatching=false,this.getState=function(){return n.state},this.getListeners=function(){return n.listeners},this.dispatch=function(t){if("function"!=typeof t)throw new Error("Reducer is not a function");if(n.isDispatching)throw new Error("Reducers may not dispatch actions");n.isDispatching=true;var e=n.state;try{n.state=t(n.state);}finally{n.isDispatching=false;}for(var r,o=s(n.listeners);!(r=o()).done;)(0, r.value)(n.state,e);return n.state},this.subscribe=function(t){if("function"!=typeof t)throw new Error("Listener is not a function");return n.listeners=[].concat(n.listeners,[t]),function(){return n.listeners=n.listeners.filter(function(n){return n!==t})}},this.state=t;},fn=function(t,n){var e={__c:n="__cC"+_++,__:null,Consumer:function(t,n){return t.children(n)},Provider:function(t){var e,r;return this.getChildContext||(e=[],(r={})[n]=this,this.getChildContext=function(){return r},this.shouldComponentUpdate=function(t){this.props.value!==t.value&&e.some(E);},this.sub=function(t){e.push(t);var n=t.componentWillUnmount;t.componentWillUnmount=function(){e.splice(e.indexOf(t),1),n&&n.call(t);};}),t.children}};return e.Provider.__=e.Consumer.contextType=e}(),pn=/*#__PURE__*/function(){function t(){Object.assign(this,t.defaultConfig());}var n=t.prototype;return n.assign=function(t){return Object.assign(this,t)},n.update=function(n){return n?(this.assign(t.fromPartialConfig(e({},this,n))),this):this},t.defaultConfig=function(){return {store:new cn({status:a.Init,header:void 0,data:null}),plugin:new $t,tableRef:{current:null},width:"100%",height:"auto",processingThrottleMs:100,autoWidth:true,style:{},className:{}}},t.fromPartialConfig=function(n){var e=(new t).assign(n);return "boolean"==typeof n.sort&&n.sort&&e.assign({sort:{multiColumn:true}}),e.assign({header:Kt.createFromConfig(e)}),e.assign({storage:Qt.createFromConfig(e)}),e.assign({pipeline:ln.createFromConfig(e)}),e.assign({translator:new Lt(e.language)}),e.plugin=new $t,e.search&&e.plugin.add({id:"search",position:zt.Header,component:Dt}),e.pagination&&e.plugin.add({id:"pagination",position:zt.Footer,component:Rt}),e.plugins&&e.plugins.forEach(function(t){return e.plugin.add(t)}),e},t}();function dn(t){var n,r=It();return w("td",e({role:t.role,colSpan:t.colSpan,"data-column-id":t.column&&t.column.id,className:rt(et("td"),t.className,r.className.td),style:e({},t.style,r.style.td),onClick:function(n){t.messageCell||r.eventEmitter.emit("cellClick",n,t.cell,t.column,t.row);}},(n=t.column)?"function"==typeof n.attributes?n.attributes(t.cell.data,t.row,t.column):n.attributes:{}),t.column&&"function"==typeof t.column.formatter?t.column.formatter(t.cell.data,t.row,t.column):t.column&&t.column.plugin?w(Gt,{pluginId:t.column.id,props:{column:t.column,cell:t.cell,row:t.row}}):t.cell.data)}function hn(t){var n=It(),e=jt(function(t){return t.header});return w("tr",{className:rt(et("tr"),n.className.tr),onClick:function(e){t.messageRow||n.eventEmitter.emit("rowClick",e,t.row);}},t.children?t.children:t.row.cells.map(function(n,r){var o=function(t){if(e){var n=Kt.leafColumns(e.columns);if(n)return n[t]}return null}(r);return o&&o.hidden?null:w(dn,{key:n.id,cell:n,row:t.row,column:o})}))}function _n(t){return w(hn,{messageRow:true},w(dn,{role:"alert",colSpan:t.colSpan,messageCell:true,cell:new X(t.message),className:rt(et("message"),t.className?t.className:null)}))}function mn(){var t=It(),n=jt(function(t){return t.data}),e=jt(function(t){return t.status}),r=jt(function(t){return t.header}),o=At(),i=function(){return r?r.visibleColumns.length:0};return w("tbody",{className:rt(et("tbody"),t.className.tbody)},n&&n.rows.map(function(t){return w(hn,{key:t.id,row:t})}),e===a.Loading&&(!n||0===n.length)&&w(_n,{message:o("loading"),colSpan:i(),className:rt(et("loading"),t.className.loading)}),e===a.Rendered&&n&&0===n.length&&w(_n,{message:o("noRecordsFound"),colSpan:i(),className:rt(et("notfound"),t.className.notfound)}),e===a.Error&&w(_n,{message:o("error"),colSpan:i(),className:rt(et("error"),t.className.error)}))}var vn=/*#__PURE__*/function(t){function e(){return t.apply(this,arguments)||this}r(e,t);var o=e.prototype;return o.validateProps=function(){for(var t,n=s(this.props.columns);!(t=n()).done;){var e=t.value;void 0===e.direction&&(e.direction=1),1!==e.direction&&-1!==e.direction&&Vt.error("Invalid sort direction "+e.direction);}},o.compare=function(t,n){return t>n?1:t<n?-1:0},o.compareWrapper=function(t,n){for(var e,r=0,o=s(this.props.columns);!(e=o()).done;){var i=e.value;if(0!==r)break;var u=t.cells[i.index].data,a=n.cells[i.index].data;r|="function"==typeof i.compare?i.compare(u,a)*i.direction:this.compare(u,a)*i.direction;}return r},o._process=function(t){var n=[].concat(t.rows);n.sort(this.compareWrapper.bind(this));var e=new J(n);return e.length=t.length,e},n(e,[{key:"type",get:function(){return K.Sort}}]),e}(tt),yn=function(t,n,r,o){return function(i){var u,s=null!=(u=i.sort)&&u.columns?i.sort.columns.map(function(t){return e({},t)}):[],a=s.length,l=s.find(function(n){return n.index===t}),c=false,f=false,p=false,d=false;if(void 0!==l?r?-1===l.direction?p=true:d=true:1===a?d=true:a>1&&(f=true,c=true):0===a?c=true:a>0&&!r?(c=true,f=true):a>0&&r&&(c=true),f&&(s=[]),c)s.push({index:t,direction:n,compare:o});else if(d){var h=s.indexOf(l);s[h].direction=n;}else if(p){var _=s.indexOf(l);s.splice(_,1);}return e({},i,{sort:{columns:s}})}},gn=function(t,n,r){return function(o){var i=(o.sort?[].concat(o.sort.columns):[]).find(function(n){return n.index===t});return e({},o,i?yn(t,1===i.direction?-1:1,n,r)(o):yn(t,1,n,r)(o))}},bn=/*#__PURE__*/function(t){function o(){return t.apply(this,arguments)||this}return r(o,t),o.prototype._process=function(t){var n={};return this.props.url&&(n.url=this.props.url(t.url,this.props.columns)),this.props.body&&(n.body=this.props.body(t.body,this.props.columns)),e({},t,n)},n(o,[{key:"type",get:function(){return K.ServerSort}}]),o}(tt);function wn(t){var n=It(),r=Ht().dispatch,o=At(),i=yt(0),u=i[0],s=i[1],a=n.sort,l=jt(function(t){return t.sort}),c="object"==typeof(null==a?void 0:a.server)?K.ServerSort:K.Sort,f=function(){var t=n.pipeline.getStepsByType(c);if(t.length)return t[0]};return gt(function(){var t=f()||(c===K.ServerSort?new bn(e({columns:l?l.columns:[]},a.server)):new vn({columns:l?l.columns:[]}));return n.pipeline.tryRegister(t),function(){return n.pipeline.unregister(t)}},[n]),gt(function(){if(l){var n,e=l.columns.find(function(n){return n.index===t.index});e?(0===u&&(e.direction=null!=(n=t.direction)?n:1),s(e.direction)):s(0);}},[l]),gt(function(){var t=f();t&&l&&t.setProps({columns:l.columns});},[l]),w("button",{tabIndex:-1,"aria-label":o("sort.sort"+(1===u?"Desc":"Asc")),title:o("sort.sort"+(1===u?"Desc":"Asc")),className:rt(et("sort"),et("sort",function(t){return 1===t?"asc":-1===t?"desc":"neutral"}(u)),n.className.sort),onClick:function(n){n.preventDefault(),n.stopPropagation(),r(gn(t.index,true===n.shiftKey&&a.multiColumn,t.compare));}})}var xn=function(t,n){var e;void 0===n&&(n=100);var r=Date.now(),o=function(){r=Date.now(),t.apply(void 0,[].slice.call(arguments));};return function(){var t=[].slice.call(arguments),i=Date.now(),u=i-r;u>=n?o.apply(void 0,t):(e&&clearTimeout(e),e=setTimeout(function(){o.apply(void 0,t),e=null;},n-u));}};function kn(t){var n,e=function(t){return t instanceof MouseEvent?Math.floor(t.pageX):Math.floor(t.changedTouches[0].pageX)},r=function(r){r.stopPropagation();var u=parseInt(t.thRef.current.style.width,10)-e(r);n=xn(function(t){return o(t,u)},10),document.addEventListener("mouseup",i),document.addEventListener("touchend",i),document.addEventListener("mousemove",n),document.addEventListener("touchmove",n);},o=function(n,r){n.stopPropagation();var o=t.thRef.current;r+e(n)>=parseInt(o.style.minWidth,10)&&(o.style.width=r+e(n)+"px");},i=function t(e){e.stopPropagation(),document.removeEventListener("mouseup",t),document.removeEventListener("mousemove",n),document.removeEventListener("touchmove",n),document.removeEventListener("touchend",t);};return w("div",{className:rt(et("th"),et("resizable")),onMouseDown:r,onTouchStart:r,onClick:function(t){return t.stopPropagation()}})}function Sn(t){var n=It(),r=bt(null),o=yt({}),i=o[0],u=o[1],s=Ht().dispatch;gt(function(){if(n.fixedHeader&&r.current){var t=r.current.offsetTop;"number"==typeof t&&u({top:t});}},[r]);var a,l=function(){return null!=t.column.sort},c=function(e){e.stopPropagation(),l()&&s(gn(t.index,true===e.shiftKey&&n.sort.multiColumn,t.column.sort.compare));};return w("th",e({ref:r,"data-column-id":t.column&&t.column.id,className:rt(et("th"),l()?et("th","sort"):null,n.fixedHeader?et("th","fixed"):null,n.className.th),onClick:c,style:e({},n.style.th,{minWidth:t.column.minWidth,width:t.column.width},i,t.style),onKeyDown:function(t){l()&&13===t.which&&c(t);},rowSpan:t.rowSpan>1?t.rowSpan:void 0,colSpan:t.colSpan>1?t.colSpan:void 0},(a=t.column)?"function"==typeof a.attributes?a.attributes(null,null,t.column):a.attributes:{},l()?{tabIndex:0}:{}),w("div",{className:et("th","content")},void 0!==t.column.name?t.column.name:void 0!==t.column.plugin?w(Gt,{pluginId:t.column.plugin.id,props:{column:t.column}}):null),l()&&w(wn,e({index:t.index},t.column.sort)),t.column.resizable&&t.index<n.header.visibleColumns.length-1&&w(kn,{column:t.column,thRef:r}))}function Nn(){var t,n=It(),e=jt(function(t){return t.header});return e?w("thead",{key:e.id,className:rt(et("thead"),n.className.thead)},(t=Kt.tabularFormat(e.columns)).map(function(n,r){return function(t,n,r){var o=Kt.leafColumns(e.columns);return w(hn,null,t.map(function(t){return t.hidden?null:function(t,n,e,r){var o=function(t,n,e){var r=Kt.maximumDepth(t),o=e-n;return {rowSpan:Math.floor(o-r-r/o),colSpan:t.columns&&t.columns.length||1}}(t,n,r);return w(Sn,{column:t,index:e,colSpan:o.colSpan,rowSpan:o.rowSpan})}(t,n,o.indexOf(t),r)}))}(n,r,t.length)})):null}var Pn=function(t){return function(n){return e({},n,{header:t})}};function Cn(){var t=It(),n=bt(null),r=Ht().dispatch;return gt(function(){n&&r(function(t){return function(n){return e({},n,{tableRef:t})}}(n));},[n]),w("table",{ref:n,role:"grid",className:rt(et("table"),t.className.table),style:e({},t.style.table,{height:t.height})},w(Nn,null),w(mn,null))}function En(){var t=yt(true),n=t[0],r=t[1],o=bt(null),i=It();return gt(function(){0===o.current.children.length&&r(false);},[o]),n?w("div",{ref:o,className:rt(et("head"),i.className.header),style:e({},i.style.header)},w(Gt,{position:zt.Header})):null}function In(){var t=bt(null),n=yt(true),r=n[0],o=n[1],i=It();return gt(function(){0===t.current.children.length&&o(false);},[t]),r?w("div",{ref:t,className:rt(et("footer"),i.className.footer),style:e({},i.style.footer)},w(Gt,{position:zt.Footer})):null}function Tn(){var t=It(),n=Ht().dispatch,r=jt(function(t){return t.status}),o=jt(function(t){return t.data}),i=jt(function(t){return t.tableRef}),u={current:null},s=xn(function(){try{n(function(t){return e({},t,{status:a.Loading})});var r=function(r,o){try{var i=Promise.resolve(t.pipeline.process()).then(function(t){n(function(t){return function(n){return t?e({},n,{data:t,status:a.Loaded}):n}}(t)),setTimeout(function(){n(function(t){return t.status===a.Loaded?e({},t,{status:a.Rendered}):t});},0);});}catch(t){return o(t)}return i&&i.then?i.then(void 0,o):i}(0,function(t){Vt.error(t),n(function(t){return e({},t,{data:null,status:a.Error})});});return Promise.resolve(r&&r.then?r.then(function(){}):void 0)}catch(t){return Promise.reject(t)}},t.processingThrottleMs);return gt(function(){return n(Pn(t.header)),s(),t.pipeline.on("updated",s),function(){return t.pipeline.off("updated",s)}},[]),gt(function(){t.header&&r===a.Loaded&&null!=o&&o.length&&n(Pn(t.header.adjustWidth(t,i,u)));},[o,t,u]),w("div",{role:"complementary",className:rt("gridjs",et("container"),r===a.Loading?et("loading"):null,t.className.container),style:e({},t.style.container,{width:t.width})},r===a.Loading&&w("div",{className:et("loading-bar")}),w(En,null),w("div",{className:et("wrapper"),style:{height:t.height}},w(Cn,null)),w(In,null),w("div",{ref:u,id:"gridjs-temp",className:et("temp")}))}var Ln=/*#__PURE__*/function(t){function n(n){var e;return (e=t.call(this)||this).config=void 0,e.plugin=void 0,e.config=(new pn).assign({instance:i(e),eventEmitter:i(e)}).update(n),e.plugin=e.config.plugin,e}r(n,t);var e=n.prototype;return e.updateConfig=function(t){return this.config.update(t),this},e.createElement=function(){return w(fn.Provider,{value:this.config,children:w(Tn,{})})},e.forceRender=function(){return this.config&&this.config.container||Vt.error("Container is empty. Make sure you call render() before forceRender()",true),this.destroy(),q(this.createElement(),this.config.container),this},e.destroy=function(){this.config.pipeline.clearCache(),q(null,this.config.container);},e.render=function(t){return t||Vt.error("Container element cannot be null",true),t.childNodes.length>0?(Vt.error("The container element "+t+" is not empty. Make sure the container is empty and call render() again"),this):(this.config.container=t,q(this.createElement(),t),this)},n}(Q);

// src/context-editor/formalContext.js

/**
 * Initialize the Formal Context editor (Grid.js)
 * @param {Object} opts
 * @param {string} opts.tableContainer
 * @param {string} opts.actionsBar
 * @param {string} opts.uploadInput
 * @param {string} opts.showBtn
 * @param {string} opts.createBtn
 * @param {string} opts.addRowBtn
 * @param {string} opts.addColBtn
 * @param {string} opts.exportDropdown
 * @param {string} opts.visualizeBtn
 * @param {(graphData:Object)=>void} opts.onGraphReady
 */
function initContextEditor(opts = {}) {
  const {
    tableContainer = "#table-content",
    actionsBar = "#table-actions",
    uploadInput = "#upload-json",
    showBtn = "#show-formal-context",
    createBtn = "#create-formal-context",
    addRowBtn = "#add-row",
    addColBtn = "#add-column",
    exportDropdown = "#context-export-dropdown",
    visualizeBtn = "#visualize-lattice",
    onGraphReady = () => {}
  } = opts;

  // --- Demo defaults ---
  let defaultData = [
    ["boy", false, false, true, true],
    ["girl", false, true, true, false],
    ["man", true, false, false, true],
    ["woman", true, true, false, false],
  ];
  let defaultColumns = ["Object", "adult", "female", "juvenile", "male"];

  // --- State ---
  let data = [];
  let columns = [];
  let gridInstance = null;

  // uploaded (lazy)
  let uploadedData = null;
  let uploadedColumns = null;

  function initTable(d, c, opts2 = {}) {
    data = JSON.parse(JSON.stringify(d));
    columns = JSON.parse(JSON.stringify(c));

    if (gridInstance) {
      gridInstance.destroy();
      gridInstance = null;
    }

    const container = document.querySelector(tableContainer);
    if (!container) return;
    container.innerHTML = "";

    gridInstance = new Ln({
      columns: getColumns(),
      data: generateGridData(),
      search: true,
      sort: true,
      pagination: { limit: 10 }
    });

    gridInstance.render(container);
    const bar = document.querySelector(actionsBar);
    if (bar) bar.classList.remove("hidden");

    if (opts2.focus) setTimeout(() => {
      const input = container.querySelector("input");
      if (input) input.focus();
    }, 0);
  }

  function renderObjectName(value, rowIndex) {
    return G(`
      <div style="display:flex;align-items:center;">
        <input type="text" value="${value}" data-row="${rowIndex}" class="rename-object" />
        <button class="delete-row" data-row="${rowIndex}" style="margin-left:6px;color:red;">🗑️</button>
      </div>
    `);
  }

  function renderCheckbox(value, rowIndex, colIndex) {
    if (colIndex === 0) return renderObjectName(value, rowIndex);
    return G(`
      <input type="checkbox" ${value ? "checked" : ""} 
             data-row="${rowIndex}" data-col="${colIndex}" />
    `);
  }

  function generateGridData() {
    return data.map((row, rowIndex) =>
      row.map((value, colIndex) => renderCheckbox(value, rowIndex, colIndex))
    );
  }

  function getColumns() {
    return columns.map((col, index) => ({
      id: `col-${index}`,
      name: index === 0
        ? col
        : w("div", { style: "display:flex;align-items:center;" }, [
            w("input", {
              type: "text",
              value: col,
              "data-col": String(index),
              className: "rename-attribute",
              onkeydown: (event) => {
                if (event.key === "Enter") {
                  columns[index] = event.target.value;
                  updateTableData();
                }
              }
            }),
            w("button", {
              className: "delete-column",
              "data-col": String(index),
              style: "margin-left:6px;color:red;",
              onclick: (event) => handleDeleteColumn(event, index)
            }, "🗑️")
          ])
    }));
  }

  function updateTableData(opts2 = {}) {
    if (!gridInstance) return;
    gridInstance.updateConfig({
      columns: getColumns(),
      data: generateGridData(),
      search: true,
      sort: true,
      pagination: { limit: 10 }
    }).forceRender();

    if (opts2.focus) {
      const container = document.querySelector(tableContainer);
      if (!container) return;
      setTimeout(() => {
        const input = container.querySelector("input");
        if (input) input.focus();
      }, 0);
    }
  }

  function addRow() {
    const newRow = ["New Object", ...Array(columns.length - 1).fill(false)];
    data.push(newRow);
    updateTableData({ focus: true });
  }

  function addColumn() {
    const newAttributeName = `New Attribute ${columns.length}`;
    columns.push(newAttributeName);
    data.forEach(row => row.push(false));
    updateTableData({ focus: true });
  }

  function handleDeleteColumn(_event, colIndex) {
    if (colIndex > 0 && colIndex < columns.length) {
      columns.splice(colIndex, 1);
      data = data.map(row => row.filter((_, i) => i !== colIndex));
      updateTableData();
    }
  }

  // --- Upload context (two shapes supported) ---
  const uploadEl = document.querySelector(uploadInput);
  if (uploadEl) {
    uploadEl.addEventListener("change", (event) => {
      const input = event.target;
      const file = input && input.files && input.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const imported = JSON.parse(String(e.target.result));

          if (imported.objects && imported.properties && imported.context) {
            // Shape A
            uploadedColumns = ["Object", ...imported.properties];
            uploadedData = imported.objects.map((obj, rowIdx) => ([
              obj,
              ...imported.context[rowIdx].map(v => v === true || v === "true" || v === 1)
            ]));
          } else if (Array.isArray(imported.data) && Array.isArray(imported.columns)) {
            // Shape B
            uploadedColumns = imported.columns.slice();
            uploadedData = imported.data.map(row => ([
              row[0],
              ...row.slice(1).map(v => v === true || v === "true" || v === 1)
            ]));
          } else {
            alert("Invalid JSON format! Expected {objects, properties, context} or {data, columns}.");
            return;
          }
          alert("✅ Formal context uploaded. Click 'Show Formal Context' to view.");
        } catch (err) {
          alert("Error parsing JSON: " + err.message);
        }
      };
      reader.readAsText(file);
    });
  }

  // --- Show / Create buttons ---
  const showBtnEl = document.querySelector(showBtn);
  if (showBtnEl) {
    showBtnEl.addEventListener("click", () => {
      if (!uploadedData || !uploadedColumns) {
        alert("Please upload a formal context file first.");
        return;
      }
      initTable(uploadedData, uploadedColumns, { focus: true });
    });
  }

  const createBtnEl = document.querySelector(createBtn);
  if (createBtnEl) {
    createBtnEl.addEventListener("click", () => {
      initTable(defaultData, defaultColumns, { focus: true });
    });
  }

  // --- Row/col actions (delegation) ---
  document.addEventListener("click", (event) => {
    const el = event.target;
    if (!(el instanceof Element)) return;

    if (el.id === stripHash(addRowBtn)) addRow();
    if (el.id === stripHash(addColBtn)) addColumn();

    if (el.classList.contains("delete-row")) {
      const rowIndex = Number(el.getAttribute("data-row"));
      data.splice(rowIndex, 1);
      updateTableData();
    }
    if (el.classList.contains("delete-column")) {
      const colIndex = Number(el.getAttribute("data-col"));
      handleDeleteColumn(event, colIndex);
    }
  });

  document.addEventListener("keydown", (event) => {
    const el = event.target;
    if (!(el instanceof Element)) return;

    if (el.classList.contains("rename-object") && event.key === "Enter") {
      const rowIndex = Number(el.getAttribute("data-row"));
      data[rowIndex][0] = /** @type {HTMLInputElement} */(el).value;
      updateTableData();
    }
    if (el.classList.contains("rename-attribute") && event.key === "Enter") {
      const colIndex = Number(el.getAttribute("data-col"));
      columns[colIndex] = /** @type {HTMLInputElement} */(el).value;
      updateTableData();
    }
  });

  document.addEventListener("change", (event) => {
    const el = event.target;
    if (!(el instanceof Element)) return;
    if (el.matches('input[type="checkbox"]')) {
      const rowIndex = Number(el.getAttribute("data-row"));
      const colIndex = Number(el.getAttribute("data-col"));
      const checked = /** @type {HTMLInputElement} */(el).checked;
      data[rowIndex][colIndex] = checked;
    }
  });

  // --- Export dropdown ---
  const exportEl = document.querySelector(exportDropdown);
  if (exportEl) {
    exportEl.addEventListener("change", (event) => {
      const value = event.target && event.target.value;
      if (!value) return;

      const { objects, properties, contextMatrix } = currentContext();

      if (value === "export-context-json") {
        const serialized = { objects, properties, context: contextMatrix };
        downloadBlob(JSON.stringify(serialized, null, 2), "formal_context.json", "application/json");
      }

      if (value === "export-context-csv") {
        const header = columns.join(",");
        const rows = data.map(row => row.join(",")).join("\n");
        downloadBlob(header + "\n" + rows, "formal_context.csv", "text/csv");
      }

      if (value === "export-context-cxt") {
        const lines = [];
        lines.push("B");
        lines.push(String(objects.length));
        lines.push(String(properties.length));
        lines.push("");
        objects.forEach(o => lines.push(o));
        properties.forEach(p => lines.push(p));
        lines.push("");
        contextMatrix.forEach(row => lines.push(row.map(v => (v ? "X" : ".")).join("")));
        downloadBlob(lines.join("\n"), "formal_context.cxt", "text/plain");
      }

      event.target.value = "";
    });
  }

  // --- Visualize Lattice ---
  const visBtnEl = document.querySelector(visualizeBtn);
  if (visBtnEl) {
    visBtnEl.addEventListener("click", async () => {
      const { objects, properties, contextMatrix } = currentContext();
      const payload = { objects, properties, context: contextMatrix };

      try {
        const response = await fetch("http://localhost:3000/compute-lattice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        if (!response.ok) throw new Error(await response.text());
        const backendResult = await response.json();
        const graphData = parseSerializedData(backendResult);
        onGraphReady(graphData);
      } catch (err) {
        alert("Lattice computation failed: " + err.message);
        console.error(err);
      }
    });
  }

  // --- helpers ---
  function currentContext() {
    const objects = data.map(row => row[0]);
    const properties = columns.slice(1);
    const contextMatrix = data.map(row => row.slice(1));
    return { objects, properties, contextMatrix };
  }

  function downloadBlob(content, filename, type) {
    const blob = new Blob([content], { type });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  function stripHash(sel) {
    return sel && sel.charAt(0) === "#"
      ? sel.slice(1)
      : sel;
  }

  // small public API if you need it later
  return {
    getContext: () => currentContext(),
    setContext: ({ objects, properties, context }) => {
      uploadedColumns = ["Object", ...properties];
      uploadedData = objects.map((obj, i) => [obj, ...context[i]]);
      initTable(uploadedData, uploadedColumns, { focus: true });
    }
  };
}

// src/views/explorer.js


// === Utility: Update metrics in sidebar ===
function updateSidebarMetrics(metrics) {
  document.getElementById('total-concepts').textContent = metrics.totalConcepts;
  document.getElementById('total-objects').textContent = metrics.totalObjects;
  document.getElementById('total-attributes').textContent = metrics.totalAttributes;
  document.getElementById('lattice-density').textContent = metrics.density;
  document.getElementById('lattice-stability').textContent = metrics.averageStability;
}

// Small helper used in two places below
function renderGraph(graphData) {
  const container = document.getElementById('graph-container');
  container.innerHTML = '';
  const width = container.offsetWidth || 1000;
  const height = container.offsetHeight || 600;

  createLattice(graphData, { container: '#graph-container', width, height });
  const metrics = calculateMetrics(graphData);
  updateSidebarMetrics(metrics);
}

// === Wait until the DOM is ready ===
document.addEventListener('DOMContentLoaded', () => {
  // Setup event listeners and controls
  setupFileUpload();
  setupFilterControls();

  // Handle Labeling Mode Change
  document.getElementById('labeling-mode')?.addEventListener('change', (e) => {
    if (typeof window.updateLabels === 'function') {
      window.updateLabels(e.target.value);
    }
  });

  // Handle Load JSON button click (precomputed lattice JSON)
  document.getElementById('load-json-file')?.addEventListener('click', () => {
    const fileInput = document.getElementById('file-upload');
    const file = fileInput?.files[0];

    if (!file) {
      alert('Please select a JSON file first.');
      return;
    }

    const reader = new FileReader();
    reader.onload = function (event) {
      try {
        const json = JSON.parse(event.target.result);
        const graphData = json?.graph && Array.isArray(json.graph.nodes) ? json.graph : json;

        // Clear existing graph
        const container = document.getElementById('graph-container');
        container.innerHTML = '';
        const width = container.offsetWidth || 1000;
        const height = container.offsetHeight || 600;

        // Render lattice and update metrics
        createLattice(graphData, { container: '#graph-container', width, height });
        const metrics = calculateMetrics(graphData);
        updateSidebarMetrics(metrics);
      } catch (err) {
        console.error('Invalid JSON format:', err);
        alert('The selected file does not contain valid JSON.');
      }
    };
    reader.readAsText(file);
  });

  // Optional: Show modal on load (can be removed if undesired)
  setTimeout(() => {
    const modal = document.getElementById('modal');
    if (modal) modal.style.display = 'block';
  }, 1000);

  // Modal close handler
  document.getElementById('modal-close')?.addEventListener('click', () => {
    const modal = document.getElementById('modal');
    if (modal) modal.style.display = 'none';
  });

  // Maximize/minimize panel toggle logic
  document.querySelectorAll('.panel-header button').forEach(button => {
    button.addEventListener('click', (event) => {
      const panel = event.target.closest('.panel-area');
      const isFull = panel.classList.contains('fullscreen-panel');

      document.querySelectorAll('.panel-area').forEach(p => {
        p.classList.remove('fullscreen-panel');
        const btn = p.querySelector('button');
        if (btn) btn.textContent = '🗖';
      });

      if (!isFull) {
        panel.classList.add('fullscreen-panel');
        event.target.textContent = '🗕';
      }
    });
  });



/*FORMAL CONTEXT SECTION JS CODE*/

// --- Grid.js ---

// Default table data and columns
/*
let defaultData = [
    ["boy", false, false, true, true],
    ["girl", false, true, true, false],
    ["man", true, false, false, true],
    ["woman", true, true, false, false],
];
let defaultColumns = ["Object", "adult", "female", "juvenile", "male"];

let data = [];
let columns = [];
let gridInstance = null;

let uploadedData = null;
let uploadedColumns = null;


// Initialize and render the table with given data and columns
function initTable(d, c, { focus = false } = {}) {
    data = JSON.parse(JSON.stringify(d));
    columns = JSON.parse(JSON.stringify(c));

    if (gridInstance) {
        gridInstance.destroy();
        gridInstance = null;
    }

    const container = document.getElementById("table-content");
    container.innerHTML = "";

    gridInstance = new Grid({
        columns: getColumns(),
        data: generateGridData(),
        search: true,
        sort: true,
        pagination: { limit: 10 }
    });

    gridInstance.render(container);
    document.getElementById("table-actions").classList.remove("hidden");

    if (focus) {
        focusWhenReady(container);
    }
}

// --- Table rendering & helpers ---

// Render object name cell with editable input and delete button
function renderObjectName(value, rowIndex) {
    return html(`
        <div style="display: flex; align-items: center;">
            <input type="text" value="${value}" data-row="${rowIndex}" class="rename-object" />
            <button class="delete-row" data-row="${rowIndex}" style="margin-left: 5px; color: red;">🗑️</button>
        </div>
    `);
}

// Render checkbox cell or object name cell based on column index
function renderCheckbox(value, rowIndex, colIndex) {
    if (colIndex === 0) return renderObjectName(value, rowIndex);
    return html(`
        <input type="checkbox" ${value ? "checked" : ""} 
               data-row="${rowIndex}" data-col="${colIndex}" />
    `);
}

// Generate checkbox-rendered data from raw data array
function generateGridData() {
    return data.map((row, rowIndex) =>
        row.map((value, colIndex) => renderCheckbox(value, rowIndex, colIndex))
    );
}


// Generate column definitions including attribute rename and delete
function getColumns() {
    return columns.map((col, index) => ({
        id: `col-${index}`,
        name: index === 0 
            ? col 
            : h("div", { style: "display: flex; align-items: center;" }, [
              h("input", {
                type: "text",
                value: col,
                "data-col": index,
                className: "rename-attribute",
                onkeydown: (event) => {
                    if (event.key === "Enter") {
                        columns[index] = event.target.value;
                        updateTableData();
                    }
                }
              }),
              h("button", {
                  className: "delete-column",
                  "data-col": index,
                  style: "margin-left: 5px; color: red;",
                  onclick: (event) => handleDeleteColumn(event, index) 
              }, "🗑️")
            ])
    }));
}

// Re-render the table with current data and column configurations
function updateTableData({ focus = false } = {}) {
    if (gridInstance) {
        gridInstance.updateConfig({
            columns: getColumns(),
            data: generateGridData(),
            search: true,
            sort: true,
            pagination: { limit: 10 }
        }).forceRender();

        if (focus) {
            const container = document.getElementById("table-content");
            focusWhenReady(container);
        }
    }
}

// Add a new row to the table
function addRow() {
    let newRow = ["New Object", ...Array(columns.length - 1).fill(false)];
    data.push(newRow);
    updateTableData();
}

// Add a new column to the table
function addColumn() {
    let newAttributeName = `New Attribute ${columns.length}`;
    columns.push(newAttributeName);
    data.forEach(row => row.push(false));
    updateTableData();
}

// Handle delete column based on index
function handleDeleteColumn(event, colIndex) {
    if (colIndex > 0 && colIndex < columns.length) {
        columns.splice(colIndex, 1);
        data = data.map(row => row.filter((_, i) => i !== colIndex));
        updateTableData();
    }
}

// --- Event Listeners ---

// for "Show-Formal-Context" Button - Dsiplays uploaded data - Gets data from uploadeData and uploadedColumns
document.getElementById("show-formal-context").addEventListener("click", () => {
    if (!uploadedData || !uploadedColumns) {
        alert("Please upload a formal context file first.");
        return;
    }
    initTable(uploadedData, uploadedColumns, { focus: true });
});

// for "Create-formal-context" Button - Opens default table template
document.getElementById("create-formal-context").addEventListener("click", () => {
    initTable(defaultData, defaultColumns, { focus: true });
});

// Handle file input and convert uploaded JSON, if of format:{objects, properties, context}
// Supports two formats: {objects, properties, context} and {data, columns}
document.getElementById("upload-json").addEventListener("change", function (event) {
    let file = event.target.files[0];
    if (!file) return;

    let reader = new FileReader();
    reader.onload = function (e) {
        try {
            let importedData = JSON.parse(e.target.result);

     if (importedData.objects && importedData.properties && importedData.context) {
    uploadedColumns = ["Object", ...importedData.properties];
    uploadedData = importedData.objects.map((obj, rowIdx) => {
        return [
            obj,
            ...importedData.context[rowIdx].map(val => val === true || val === "true" || val === 1)
        ];
    });
} else if (Array.isArray(importedData.data) && Array.isArray(importedData.columns)) {
    uploadedColumns = importedData.columns.slice();
    uploadedData = importedData.data.map(row => [
        row[0],
        ...row.slice(1).map(val => val === true || val === "true" || val === 1)
    ]);
}

            
            else {
                alert("Invalid JSON format! Must include either {objects, properties, context} or {data, columns}.");
                return;
            }
            alert("✅ Formal context uploaded successfully. Click 'Show Formal Context' to view.");
        } catch (error) {
            alert("Error parsing JSON: " + error.message);
        }
    };
    reader.readAsText(file);
});

// Add or Delete row or column when respective button is clicked
document.addEventListener("click", function (event) {
    if (event.target.id === "add-row") addRow();
    if (event.target.id === "add-column") addColumn();

    if (event.target.classList.contains("delete-row")) {
        let rowIndex = Number(event.target.getAttribute("data-row"));
        data.splice(rowIndex, 1);
        updateTableData();
    }
    if (event.target.classList.contains("delete-column")) {
        let colIndex = Number(event.target.getAttribute("data-col"));
        handleDeleteColumn(event, colIndex);
    }
});

// Save renamed object/attribute when Enter is pressed
document.addEventListener("keydown", function (event) {
    if (event.target.classList.contains("rename-object") && event.key === "Enter") {
        let rowIndex = Number(event.target.getAttribute("data-row"));
        data[rowIndex][0] = event.target.value;
        updateTableData();
    }
    if (event.target.classList.contains("rename-attribute") && event.key === "Enter") {
        let colIndex = Number(event.target.getAttribute("data-col"));
        columns[colIndex] = event.target.value;
        updateTableData();
    }
});

// Toggle cell value when checkbox is changed
document.addEventListener("change", function (event) {
    if (event.target.type === "checkbox") {
        let rowIndex = Number(event.target.getAttribute("data-row"));
        let colIndex = Number(event.target.getAttribute("data-col"));
        data[rowIndex][colIndex] = event.target.checked;
    }
});

// --- Context Export Dropdown Choice ---
document.getElementById("context-export-dropdown").addEventListener("change", function (event) {
    const value = event.target.value;

    const objects = data.map(row => row[0]);
    const properties = columns.slice(1);
    const contextMatrix = data.map(row => row.slice(1));

    if (!value) return; // if no option selected
 
    // Export JSON
    if (value === "export-context-json") {
        const serialized = { objects, properties, context: contextMatrix };
        const jsonBlob = new Blob([JSON.stringify(serialized, null, 2)], { type: "application/json" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(jsonBlob);
        a.download = "formal_context.json";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    // Export CSV
    if (value === "export-context-csv") {
        const csvContent = columns.join(",") + "\n" + data.map(row => row.join(",")).join("\n");
        const csvBlob = new Blob([csvContent], { type: "text/csv" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(csvBlob);
        a.download = "formal_context.csv";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    //Export CXT
    if (value === "export-context-cxt") {
        const cxtLines = [];
        cxtLines.push("B"); // CXT header
        cxtLines.push(`${objects.length}`);
        cxtLines.push(`${properties.length}`);
        cxtLines.push("");
        objects.forEach(o => cxtLines.push(o));
        properties.forEach(p => cxtLines.push(p));
        cxtLines.push("");
        contextMatrix.forEach(row => {
            cxtLines.push(row.map(v => (v ? "X" : ".")).join(""));
        });
        const cxtBlob = new Blob([cxtLines.join("\n")], { type: "text/plain" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(cxtBlob);
        a.download = "formal_context.cxt";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    // Reset dropdown to placeholder
    event.target.value = "";
});

//"Visualize Lattice" Button - send current formal context to backend, render returned graph

document.getElementById("visualize-lattice").addEventListener("click", async () => {
      console.log("Visualize Lattice clicked"); // <--- for testing
  // Gather amd prepare formal context payload from current table state
  const objects = data.map(row => row[0]);
  const properties = columns.slice(1);
  const contextMatrix = data.map(row => row.slice(1));
  const payload = { objects, properties, context: contextMatrix };

  try {
    // POST to backend endpoint for lattice computation
    const response = await fetch("http://localhost:3000/compute-lattice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    // Get lattice result
    const backendResult = await response.json();

    // Parse nodes/links
    const graphData = parseSerializedData(backendResult);
      console.log('graphData for lattice:', graphData); // <--- Adding this to test output of nodes and  links


    // Clear and draw lattice
    const container = document.getElementById('graph-container');
    container.innerHTML = '';
    const width = container.offsetWidth || 1000;
    const height = container.offsetHeight || 600;

    // Render lattice
    createLattice(graphData, { container: '#graph-container', width, height });

    // Update metrics:
    const metrics = calculateMetrics(graphData);
    updateSidebarMetrics(metrics);

  } catch (error) {
    alert("Lattice computation failed: " + error.message);
    console.error(error);
  }
});
*/

initContextEditor({
    tableContainer : '#table-content',
    actionsBar     : '#table-actions',
    uploadInput    : '#upload-json',
    showBtn        : '#show-formal-context',
    createBtn      : '#create-formal-context',
    addRowBtn      : '#add-row',
    addColBtn      : '#add-column',
    exportDropdown : '#context-export-dropdown',
    visualizeBtn   : '#visualize-lattice',

    // When the backend returns a computed lattice from the current formal context:
    onGraphReady   : (graphData) => {
      renderGraph(graphData);
    }
  });
  
});
//# sourceMappingURL=bundle.js.map
