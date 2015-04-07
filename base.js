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
  if (result = base.bound.compare(a, b))
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

base.bound = {}

var TOP = base.bound.upper = {}
TOP.compare = function (a, b) {
  if (TOP.is(a))
    return TOP.is(b) ? 0 : 1
  if (TOP.is(b))
    return -1
}
TOP.is = function (instance) {
  return instance === TOP
}

var BOTTOM = base.bound.lower = {}
BOTTOM.compare = function (a, b) {
  if (BOTTOM.is(a))
    return BOTTOM.is(b) ? 0 : -1
  if (BOTTOM.is(b))
    return 1
}
BOTTOM.is = function (instance) {
  return instance === BOTTOM
}

base.bound.is = function (instance) {
  return TOP.is(instance) || BOTTOM.is(instance)
}

//
// compare two values against top level boundaries (if one is a boundary)
//
base.bound.compare = function (a, b) {
  if (TOP.is(a) || TOP.is(b))
    return TOP.compare(a, b)
  if (BOTTOM.is(a) || BOTTOM.is(b))
    return BOTTOM.compare(a, b)
}

//
// helper to register fixed (nullary) types
//
function fixed(value) {
  return {
    is: function (instance) {
      return instance === value
    },
    value: value
  }
}

//
// value types defined as ordered map of "sorts"
//
var sorts = base.sorts = {}

sorts.void = fixed()
sorts.void.compare = collation.inequality

sorts.null = fixed(null)
sorts.null.compare = collation.inequality

var BOOLEAN = sorts.boolean = {}
BOOLEAN.compare = collation.inequality
BOOLEAN.is = function (instance, typeOf) {
  return (typeOf || typeof instance) === 'boolean'
}

BOOLEAN.sorts = {}
BOOLEAN.sorts.true = fixed(true)
BOOLEAN.sorts.false = fixed(false)

BOOLEAN.bound = {}
BOOLEAN.bound.lower = sorts.boolean.sorts.false,
BOOLEAN.bound.upper = sorts.boolean.sorts.true


var NUMBER = sorts.number = {}
NUMBER.compare = collation.difference
NUMBER.is = function (instance, typeOf) {
  return (typeOf || typeof instance) === 'number'
}

NUMBER.sorts = {}
NUMBER.sorts.max = fixed(Number.POSITIVE_INFINITY)
NUMBER.sorts.min = fixed(Number.NEGATIVE_INFINITY)

NUMBER.sorts.positive = {}
NUMBER.sorts.positive.is = function (instance) {
  return instance >= 0
}

NUMBER.sorts.negative = {}
NUMBER.sorts.negative.is = function (instance) {
  return instance < 0
}

NUMBER.bound = {}
NUMBER.bound.lower = NUMBER.sorts.min,
NUMBER.bound.upper = NUMBER.sorts.max


var DATE = sorts.date = {}
DATE.compare = collation.difference
DATE.is = function (instance) {
  return instance instanceof Date && instance.valueOf() === instance.valueOf()
}

DATE.sorts = {}
DATE.sorts.positive = {}
DATE.sorts.positive.is = function (instance) {
  return instance.valueOf() >= 0
}

DATE.sorts.negative = {}
DATE.sorts.negative.is = function (instance) {
  return instance.valueOf() < 0
}

DATE.bound = {}
DATE.bound.lower = {}
DATE.bound.upper = {}


var BINARY = sorts.binary = {}
BINARY.empty = bops.create([])
BINARY.compare = collation.bitwise
BINARY.is = bops.is

BINARY.bound = {}
BINARY.bound.lower = BINARY.empty
BINARY.bound.upper = {}


var STRING = sorts.string = {}
STRING.empty = ''
STRING.compare = collation.inequality
STRING.is = function (instance, typeOf) {
  return (typeOf || typeof instance) === 'string'
}

STRING.bound = {}
STRING.bound.lower = STRING.empty
STRING.bound.upper = {}


var ARRAY = sorts.array = {}
ARRAY.empty = []
ARRAY.compare = collation.recursive.elementwise(base.compare)
ARRAY.is = Array.isArray

ARRAY.bound = {}
ARRAY.bound.lower = ARRAY.empty
ARRAY.bound.upper = {}


var OBJECT = sorts.object = {}
OBJECT.empty = {}
OBJECT.compare = collation.recursive.fieldwise(base.compare)
OBJECT.is = _isObject

OBJECT.bound = {}
OBJECT.bound.lower = OBJECT.empty
OBJECT.bound.upper = {}

//
// default order for instance checking in compare operations
//
base.order = []
for (var key in sorts) {
  base.order.push(key)
}

module.exports = base
