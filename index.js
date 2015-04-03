var bops = require('bops')
var comparators = require('./comparators')

//
// base type system
//
var base = {}

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
  if (base.invalid(a, b))
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
  if (result = base.boundary.compare(a, b))
    return result

  //
  // cache typeof and valueOf for both values
  //
  var aTypeOf = typeof a
  var bTypeOf = typeof b
  var aValueOf = _valueOf(a)
  var bValueOf = _valueOf(b)

  //
  // loop over type tags and attempt compare
  //
  var order = base.order
  var sorts = base.sorts
  var sort
  for (var i = 0, length = order.length; i < length; ++i) {
    sort = sorts[order[i]]

    //
    // if first arg is a member of this sort we have an answer
    //
    if (sort.is(a, aTypeOf))
      //
      // if b is the same as a then defer to sort's comparator, else a comes first
      //
      return sort.is(b, bTypeOf) ? sort.compare(aValueOf, bValueOf) : -1

    //
    // if b is this type but not a then b comes first
    //
    if (sort.is(b, bTypeOf))
      return 1
  }

  //
  // values are incomparable as they didn't match against any registered types
  //
  return NaN
}

//
// sort equality test
//
base.equal = function(a, b) {
  //
  // TOOD: optimize for certain types?
  //
  return base.compare(a, b) === 0
}

//
// test for top-level incomparability using invalid sort definitions
//
base.invalid = function (a, b) {
  var types = base.invalid
  for (var key in types) {
    var type = types[key]
    if (type && type.is && (type.is(a) || type.is(b)))
      return true
  }
  return false
}

//
// definitions for explicitly invalid/incomparable types
//

base.invalid.NAN = {
  is: function (source) {
    var valueOf = _valueOf(source)
    return valueOf !== valueOf
  }
}

base.invalid.ERROR = {
  is: function (source) {
    return source && source instanceof Error
  }
}

//
// definitions for boundary types, unserializable as values
//

base.boundary = {}

var HIGH = base.boundary.HIGH = {
  compare: function (a, b) {
    if (HIGH.is(a))
      return HIGH.is(b) ? 0 : 1
    if (HIGH.is(b))
      return -1
  },
  is: function (source) {
    return source === HIGH
  }
}

var LOW = base.boundary.LOW = {
  compare: function (a, b) {
    if (LOW.is(a))
      return LOW.is(b) ? 0 : -1
    if (LOW.is(b))
      return 1
  },
  is: function (source) {
    return source === LOW
  }
}

//
// compare two values against top level boundary 1 is a top level boundary
//
base.boundary.compare = function (a, b) {
  if (HIGH.is(a) || HIGH.is(b))
    return HIGH.compare(a, b)
  if (LOW.is(a) || LOW.is(b))
    return LOW.compare(a, b)
}

//
// value types defined as ordered map of "sorts"
//
var sorts = base.sorts = {}

sorts.UNDEFINED = {
  compare: comparators.inequality,
  is: function (source) {
    return source === void 0
  }
}

sorts.NULL = {
  compare: comparators.inequality,
  is: function (source) {
    return source === null
  }
}

sorts.BOOLEAN = {
  compare: comparators.inequality,
  is: function (source, typeOf) {
    return (typeOf || typeof source) === 'boolean'
  }
}

sorts.NUMBER = {
  compare: comparators.difference,
  is: function (source, typeOf) {
    return (typeOf || typeof source) === 'number'
  }
}

sorts.DATE = {
  compare: comparators.difference,
  is: function (source) {
    return source instanceof Date && source.valueOf() === source.valueOf()
  }
}

sorts.BINARY = {
  compare: comparators.bytewise,
  is: bops.is
}

sorts.STRING = {
  compare: comparators.inequality,
  is: function (source, typeOf) {
    return (typeOf || typeof source) === 'string'
  }
}

sorts.ARRAY = {
  compare: comparators.generic.elementwise(base.compare),
  is: function (source) {
    return Array.isArray(source)
  }
}

sorts.OBJECT = {
  compare: comparators.generic.fieldwise(base.compare),
  is: _isObject
}


//
// default order to for instance checking in sorts
//
base.order = []
for (var key in sorts) {
  base.order.push(key)
}

module.exports = base
