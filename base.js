var bops = require('bops')
var collation = require('./collation')

//
// base type system
//
var base = {}

//
// helper utilities
//

function _valueOf(instance) {
  return instance == null ? instance : instance.valueOf()
}

var _toString = Object.prototype.toString

function _isObject(instance) {
  return instance && _toString.call(instance) === '[object Object]'
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
  is: function (instance) {
    var valueOf = _valueOf(instance)
    return valueOf !== valueOf
  }
}

base.invalid.ERROR = {
  is: function (instance) {
    return instance && instance instanceof Error
  }
}

//
// definitions for boundary types, unserializable as values
//

base.boundary = {}

var MAX = base.boundary.max = {
  compare: function (a, b) {
    if (MAX.is(a))
      return MAX.is(b) ? 0 : 1
    if (MAX.is(b))
      return -1
  },
  is: function (instance) {
    return instance === MAX
  }
}

var MIN = base.boundary.min = {
  compare: function (a, b) {
    if (MIN.is(a))
      return MIN.is(b) ? 0 : -1
    if (MIN.is(b))
      return 1
  },
  is: function (instance) {
    return instance === MIN
  }
}

//
// compare two values against top level boundaries (if one is a boundary)
//
base.boundary.compare = function (a, b) {
  if (MAX.is(a) || MAX.is(b))
    return MAX.compare(a, b)
  if (MIN.is(a) || MIN.is(b))
    return MIN.compare(a, b)
}

//
// value types defined as ordered map of "sorts"
//
var sorts = base.sorts = {}

sorts.void = {
  compare: collation.inequality,
  is: function (instance) {
    return instance === void 0
  },
  value: void 0
}

sorts.null = {
  compare: collation.inequality,
  is: function (instance) {
    return instance === null
  },
  value: null
}

sorts.boolean = {
  compare: collation.inequality,
  is: function (instance, typeOf) {
    return (typeOf || typeof instance) === 'boolean'
  }
}

sorts.number = {
  compare: collation.difference,
  is: function (instance, typeOf) {
    return (typeOf || typeof instance) === 'number'
  }
}

sorts.date = {
  compare: collation.difference,
  is: function (instance) {
    return instance instanceof Date && instance.valueOf() === instance.valueOf()
  }
}

sorts.binary = {
  compare: collation.bitwise,
  is: bops.is
}

sorts.string = {
  compare: collation.inequality,
  is: function (instance, typeOf) {
    return (typeOf || typeof instance) === 'string'
  }
}

sorts.array = {
  compare: collation.recursive.elementwise(base.compare),
  is: function (instance) {
    return Array.isArray(instance)
  }
}

sorts.object = {
  compare: collation.recursive.fieldwise(base.compare),
  is: _isObject
}


//
// default order for instance checking in compare operations
//
base.order = []
for (var key in sorts) {
  base.order.push(key)
}

module.exports = base
