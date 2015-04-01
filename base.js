// TODO: move buffer support out of core?
var bops = require('bops')
var comparators = require('./comparators')

//
// base type system
//
var base = exports

//
// helper utilities
//

function _valueOf(source) {
  return source == null ? source : source.valueOf()
}

var _toString = Object.prototype.toString

function _isObject(source) {
  return source && _toString.call(source) === '[object Object]'
}

//
// base typewise compare implementation
//
base.compare = function (a, b) {
  //
  // test for invalid values
  //
  if (base.incomparable.is(a) || base.incomparable.is(b))
    return NaN

  //
  // short circuit for identical objects
  //
  if (a === b)
    return 0

  //
  // short circuit for boundary types
  //
  var result
  if (result = base.boundary.compare(a, b)) {
    return result
  }

  //
  // cache typeof and valueOf for both values
  //
  var aType = typeof a
  var bType = typeof b
  var aValueOf = _valueOf(a)
  var bValueOf = _valueOf(b)

  //
  // loop over type tags and attempt compare
  //
  var order = base.order
  var types = base.types
  var type
  for (var i = 0, length = order.length; i < length; ++i) {
    type = types[order[i]]

    //
    // if first arg is a member of this type we have an answer
    //
    if (type.is(a, aType))
      //
      // if b is the same as a then defer to type comparator, else a comes first
      //
      return type.is(b, bType) ? type.compare(aValueOf, bValueOf) : -1

    //
    // if b is this type but not a then b comes first
    //
    if (type.is(b, bType))
      return 1
  }

  //
  // values are incomparable as they didn't match against any registered types
  //
  return NaN
}

//
// type equality test
//
base.equal = function(a, b) {
  //
  // TOOD: optimize for certain types?
  //
  return base.compare(a, b) === 0
}

//
// definitions for explicitly invalid/incomparable types
//
base.incomparable = {}
base.incomparable.types = {}

base.incomparable.types.NAN = {
  is: function (source) {
    var valueOf = _valueOf(source)
    return valueOf !== valueOf
  }
}

base.incomparable.types.ERROR = {
  is: function (source) {
    return source && source instanceof Error
  }
}

//
// test for top-level incomparability using incomparable type definitions
//
base.incomparable.is = function (source) {
  var types = base.incomparable.types
  for (var key in types) {
    var type = types[key]
    if (type.is(source))
      return true
  }
  return false
}


//
// definitions for boundary types, unserializable as values
//
base.boundary = {}
base.boundary.types = {}

var TOP = base.boundary.types.TOP = {
  compare: function (a, b) {
    if (TOP.is(a))
      return this.is(b) ? 0 : 1
    if (TOP.is(b))
      return -1
  },
  is: function (source) {
    return source === TOP
  }
}

var BOTTOM = base.boundary.types.BOTTOM = {
  compare: function (a, b) {
    if (BOTTOM.is(a))
      return this.is(b) ? 0 : -1
    if (BOTTOM.is(b))
      return 1
  },
  is: function (source) {
    return source === BOTTOM
  }
}

base.boundary.is = function (source) {
  var types = base.boundaries
  for (var key in types) {
    if (type.is(source))
      return true
  }
  return false
}

base.boundary.compare = function (a, b) {
  var types = base.boundaries
  for (var key in types) {
    if (type.is(a))
      return type.compare(a, b)
    if (type.is(b))
      return type.compare(b, a)
  }
}

//
// value types
//
var types = base.types = {}

// TODO: move out of core?
types.UNDEFINED = {
  compare: comparators.inequality,
  is: function (source) {
    return source === void 0
  }
}

types.NULL = {
  compare: comparators.inequality,
  is: function (source) {
    return source === null
  }
}

types.BOOLEAN = {
  compare: comparators.inequality,
  is: function (source, typeOf) {
    return (typeOf || typeof source) === 'boolean'
  }
}

// TODO: move Infinity, -Infinity out of core?
types.NUMBER = {
  compare: comparators.difference,
  is: function (source, typeOf) {
    return (typeOf || typeof source) === 'number'
  }
}

// TODO: move out of core?
types.DATE = {
  compare: comparators.difference,
  is: function (source) {
    return source instanceof Date && source.valueOf() === source.valueOf()
  }
}

// TODO: move out of core?
types.BUFFER = {
  compare: comparators.bytewise,
  is: bops.is
}

types.STRING = {
  compare: comparators.inequality,
  is: function (source, typeOf) {
    return (typeOf || typeof source) === 'string'
  }
}

types.ARRAY = {
  compare: comparators.generic.elementwise(base.compare),
  is: function (source) {
    return Array.isArray(source)
  }
}

types.OBJECT = {
  compare: comparators.generic.fieldwise(base.compare),
  is: _isObject
}


//
// default order to for instance checking on value types
//
base.order = []
for (var key in types) {
  base.order.push(key)
}
